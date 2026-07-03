const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const GMAIL_USER = "bruno.queiroz37@enova.educacao.ba.gov.br";
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

const nodemailer = require('nodemailer');

// Mapeamento oficial de gestores e fiscais por email
const GESTORES_FISCAIS_OFICIAIS = {
  // Gestores
  'joao.santana@secti.ba.gov.br': { nome: 'JOÃO DOS SANTOS SANTANA JÚNIOR', tipo: 'gestor' },
  'micaele.diamantino@secti.ba.gov.br': { nome: 'MICAELE SANTOS DIAMANTINO', tipo: 'gestor' },
  'diana.melo@secti.ba.gov.br': { nome: 'DIANA SAMPAIO MELO', tipo: 'gestor' },
  'elisangela.reis@secti.ba.gov.br': { nome: 'ELISÂNGELA DOS REIS OLIVEIRA', tipo: 'gestor' },
  'caio.cerqueira@secti.ba.gov.br': { nome: 'CAIO DE JESUS CERQUEIRA', tipo: 'gestor' },
  'renato.cardozo@secti.ba.gov.br': { nome: 'RENATO GUIMARÃES CARDOZO', tipo: 'gestor' },
  // Fiscais
  'taisa.silva@secti.ba.gov.br': { nome: 'TAÍSA TELES DA SILVA', tipo: 'fiscal' },
  'janine.duarte@secti.ba.gov.br': { nome: 'JANINE BIDU DUARTE', tipo: 'fiscal' },
  'soane.madureira@secti.ba.gov.br': { nome: 'SOANE NAZARÉ DE ANDRADE HART MADUREIRA', tipo: 'fiscal' },
  'caio.cerqueira@secti.ba.gov.br': { nome: 'CAIO DE JESUS CERQUEIRA', tipo: 'fiscal' },
  'nathaly.nascimento@secti.ba.gov.br': { nome: 'NATHALY DA SILVA NASCIMENTO', tipo: 'fiscal' },
  'sueli.jesus@secti.ba.gov.br': { nome: 'SUELI DE JESUS SILVA', tipo: 'fiscal' },
  'valmir.ferreira@secti.ba.gov.br': { nome: 'VALMIR SANTOS FERREIRA FILHO', tipo: 'fiscal' },
  'jose.evelin@secti.ba.gov.br': { nome: 'JÔSE EVELIN TELES CANDEIAS', tipo: 'fiscal' },
  'ariadna.flores@secti.ba.gov.br': { nome: 'ARIADNA COSTA FLORES', tipo: 'fiscal' },
  'ricardo.cavalcanti@secti.ba.gov.br': { nome: 'RICARDO JORGE CAVALCANTI CAVALCANTI FILHO', tipo: 'fiscal' },
  'kleber.freitas@secti.ba.gov.br': { nome: 'KLEBER ALMEIDA FREITAS', tipo: 'fiscal' }
};

// Normaliza nome: remove acentos, espaços extras, deixa em maiúsculas
function normalizeName(name) {
  if (!name) return '';
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tenta encontrar um email pelo nome normalizado
function findEmailByNormalizedName(rawName) {
  if (!rawName) return null;
  const normalizedInput = normalizeName(rawName);
  
  for (const [email, data] of Object.entries(GESTORES_FISCAIS_OFICIAIS)) {
    const normalizedOfficial = normalizeName(data.nome);
    if (normalizedInput === normalizedOfficial || normalizedInput.includes(normalizedOfficial) || normalizedOfficial.includes(normalizedInput)) {
      return email;
    }
  }
  return null;
}

function createGmailTransporter(appPassword) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: appPassword,
    },
  });
}

function formatDate(date) {
  if (!date) return "N/A";
  const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// -----------------------------------------------------------------------------
// helpers for project code (adapted from original file)
// -----------------------------------------------------------------------------

function daysRemaining(vigenciaAtual) {
  if (!vigenciaAtual) return Infinity;
  const d = vigenciaAtual instanceof Date ? vigenciaAtual : vigenciaAtual.toDate?.() || new Date(vigenciaAtual);
  if (Number.isNaN(d.getTime())) return Infinity;
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((d.getTime() - now.getTime()) / msPerDay);
}

// returns the "highest" threshold that the contract currently fits (90,60,30,15 or null if >90)
function getExpiryThreshold(days) {
  if (days <= 15) return 15;
  if (days <= 30) return 30;
  if (days <= 60) return 60;
  if (days <= 90) return 90;
  return null;
}

async function getExpiringContracts() {
  const snap = await db.collection("contracts").get();
  const results = [];

  snap.forEach((doc) => {
    const data = doc.data();
    if (data.situacao === 'Vencido') return;

    const days = daysRemaining(data.vigenciaAtual);
    const threshold = getExpiryThreshold(days);
    if (threshold !== null) {
      // Usa emails diretos se estiverem presentes, senão busca pelo nome
      let gestorEmail = data.gestorEmail || null;
      let fiscalEmails = data.fiscalEmail ? (Array.isArray(data.fiscalEmail) ? data.fiscalEmail : [data.fiscalEmail]) : null;
      
      // Se não tiver email direto do gestor, tenta encontrar pelo nome
      if (!gestorEmail) {
        const gestorNome = data.gestor || data.nomeGestor;
        if (gestorNome && typeof gestorNome === 'string') {
          gestorEmail = findEmailByNormalizedName(gestorNome);
        }
      }
      
      // Se não tiver email direto do fiscal, tenta encontrar pelo nome
      if (!fiscalEmails || fiscalEmails.length === 0) {
        const fiscalNome = data.fiscal || data.nomeFiscal;
        if (fiscalNome) {
          const fiscais = Array.isArray(fiscalNome) ? fiscalNome : [fiscalNome];
          fiscalEmails = [];
          for (const fiscal of fiscais) {
            if (typeof fiscal === 'string') {
              const emailFiscal = findEmailByNormalizedName(fiscal);
              if (emailFiscal) fiscalEmails.push(emailFiscal);
            }
          }
          if (fiscalEmails.length === 0) fiscalEmails = null;
        }
      }
      
      results.push({ 
        id: doc.id, 
        ...data, 
        daysRemaining: days, 
        threshold,
        gestorEmail,
        fiscalEmail: fiscalEmails
      });
    }
  });

  return results;
}

function extractEmailsFromContract(contract) {
  const emails = new Set();

  // 1. Usa emails diretos se estiverem presentes (prioridade)
  if (contract.gestorEmail && typeof contract.gestorEmail === 'string') {
    emails.add(contract.gestorEmail.trim().toLowerCase());
  }
  
  if (contract.fiscalEmail) {
    const fiscais = Array.isArray(contract.fiscalEmail) ? contract.fiscalEmail : [contract.fiscalEmail];
    for (const fiscal of fiscais) {
      if (typeof fiscal === 'string' && fiscal.includes('@')) {
        emails.add(fiscal.trim().toLowerCase());
      }
    }
  }

  // 2. Extrai emails diretos de outros campos do contrato
  for (const key of Object.keys(contract)) {
    if (key === 'gestorEmail' || key === 'fiscalEmail') continue; // já processados
    
    const val = contract[key];
    if (typeof val === 'string' && val.includes('@')) {
      emails.add(val.trim().toLowerCase());
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string' && item.includes('@')) {
          emails.add(item.trim().toLowerCase());
        }
      }
    }
  }

  // 3. Se ainda não encontrou emails, tenta encontrar pelos nomes de gestor e fiscal
  if (!contract.gestorEmail) {
    const gestorNome = contract.gestor || contract.nomeGestor;
    if (gestorNome && typeof gestorNome === 'string') {
      const emailGestor = findEmailByNormalizedName(gestorNome);
      if (emailGestor) emails.add(emailGestor);
    }
  }
  
  if (!contract.fiscalEmail || (Array.isArray(contract.fiscalEmail) && contract.fiscalEmail.length === 0)) {
    const fiscalNome = contract.fiscal || contract.nomeFiscal;
    if (fiscalNome) {
      const fiscais = Array.isArray(fiscalNome) ? fiscalNome : [fiscalNome];
      for (const fiscal of fiscais) {
        if (typeof fiscal === 'string') {
          const emailFiscal = findEmailByNormalizedName(fiscal);
          if (emailFiscal) emails.add(emailFiscal);
        }
      }
    }
  }

  return [...emails];
}

function groupContractsByEmail(contracts) {
  const m = new Map();
  for (const c of contracts) {
    const emails = extractEmailsFromContract(c);
    if (emails.length === 0) {
      // fallback: record under "_unknown" so we can log later
      if (!m.has('_unknown')) m.set('_unknown', []);
      m.get('_unknown').push(c);
    } else {
      for (const email of emails) {
        if (!m.has(email)) m.set(email, []);
        m.get(email).push(c);
      }
    }
  }
  return m;
}

async function getUsersByEmails(emails) {
  const users = new Map();
  if (emails.length === 0) return users;

  // Firestore doesn't allow "in" queries with more than 10 entries, so batch
  const batchSize = 10;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const snap = await db.collection('users').where('email', 'in', batch).get();
    snap.forEach((d) => {
      users.set(d.data().email.toLowerCase(), { uid: d.id, ...d.data() });
    });
  }
  return users;
}

async function createExpiryNotification(uid, contract, threshold) {
  try {
    const key = `${contract.id}_${threshold}`;

    // avoid duplicate entries for the same contract/threshold
    const recent = await db
      .collection('users')
      .doc(uid)
      .collection('notifications')
      .where('meta.contractId', '==', contract.id)
      .where('meta.threshold', '==', threshold)
      .limit(1)
      .get();

    if (!recent.empty) {
      console.log(`🔕 notificação já existe for uid=${uid} contract=${contract.id} thresh=${threshold}`);
      return { created: false, reason: 'already_exists' };
    }

    const payload = {
      type: 'contract_expiry',
      title: `Contrato próximo do vencimento (<${threshold} dias)`,
      message: `O contrato "${contract.numeroContrato || contract.empresa || contract.id}" está abaixo de ${threshold} dias restantes.`,
      meta: { contractId: contract.id, threshold },
      read: false,
      createdAt: Timestamp.now(),
    };

    await db.collection('users').doc(uid).collection('notifications').add(payload);
    console.log(`🔔 notificação criada para uid=${uid} thresh=${threshold}`);
    return { created: true };
  } catch (err) {
    console.error('erro ao criar notificação', err);
    return { created: false, error: String(err) };
  }
}

function generateContractEmailHtml(userName, contracts) {
  const rows = contracts
    .map((c) => {
      // Tenta obter info do gestor - prioriza email direto, depois busca na lista
      let gestorNome = 'Não informado';
      let gestorEmail = c.gestorEmail;
      
      if (c.gestorEmail && GESTORES_FISCAIS_OFICIAIS[c.gestorEmail.toLowerCase()]) {
        gestorNome = GESTORES_FISCAIS_OFICIAIS[c.gestorEmail.toLowerCase()].nome;
      } else if (c.gestorEmail) {
        gestorNome = c.gestor || 'Gestor';
      } else if (c.gestor) {
        gestorNome = c.gestor;
        gestorEmail = findEmailByNormalizedName(c.gestor);
      }
      
      // Tenta obter info do fiscal - pode ser múltiplo
      let fiscalNomes = [];
      let fiscalEmailsLista = [];
      
      if (c.fiscalEmail && Array.isArray(c.fiscalEmail)) {
        fiscalEmailsLista = c.fiscalEmail;
        for (const email of c.fiscalEmail) {
          const info = GESTORES_FISCAIS_OFICIAIS[email.toLowerCase()];
          fiscalNomes.push(info ? info.nome : email);
        }
      } else if (c.fiscalEmail && typeof c.fiscalEmail === 'string') {
        fiscalEmailsLista = [c.fiscalEmail];
        const info = GESTORES_FISCAIS_OFICIAIS[c.fiscalEmail.toLowerCase()];
        fiscalNomes.push(info ? info.nome : c.fiscalEmail);
      } else if (c.fiscal) {
        const fiscais = Array.isArray(c.fiscal) ? c.fiscal : [c.fiscal];
        for (const fiscal of fiscais) {
          fiscalNomes.push(fiscal);
          const email = findEmailByNormalizedName(fiscal);
          if (email) fiscalEmailsLista.push(email);
        }
      }
      
      const fiscalDisplay = fiscalNomes.length > 0 ? fiscalNomes.join('; ') : 'Não informado';
      
      return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
          <strong>${c.empresa || 'Sem empresa'}</strong><br/>
          <small style="color: #64748b;">${c.numeroContrato || ''}</small>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">
          ${formatDate(c.vigenciaAtual)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">
          <span style="background-color: ${c.daysRemaining <= 15 ? '#fecaca' : c.daysRemaining <= 30 ? '#fed7aa' : '#fef3c7'}; padding: 2px 8px; border-radius: 4px; font-weight: bold;">
            ${c.daysRemaining} dias
          </span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
          <strong style="color: #1e3a5f;">${gestorNome}</strong><br/>
          ${gestorEmail ? `<small style="color: #64748b;">${gestorEmail}</small>` : ''}
          <small style="color: #64748b; text-transform: uppercase; display: block; margin-top: 2px;">Gestor</small>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
          <strong style="color: #1e3a5f;">${fiscalDisplay}</strong><br/>
          ${fiscalEmailsLista.length > 0 ? `<small style="color: #64748b;">${fiscalEmailsLista.join('; ')}</small>` : ''}
          <small style="color: #64748b; text-transform: uppercase; display: block; margin-top: 2px;">Fiscal</small>
        </td>
      </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aviso de Contratos - SECTI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <!-- Wrapper Principal -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 20px 0;">
    <tr>
      <td align="center">
        
        <!-- Container do E-mail -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin: 0 auto;">

          <!-- Cabeçalho Institucional -->
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px; background-color: #ffffff; border-bottom: 3px solid #1e3a5f;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Bras%C3%A3o_da_Bahia.png/120px-Bras%C3%A3o_da_Bahia.png" alt="Brasão do Estado da Bahia" width="80" style="display: block; margin-bottom: 15px;" />
              <h1 style="margin: 0; font-size: 18px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 1px;">Estado da Bahia</h1>
              <h2 style="margin: 4px 0 16px 0; font-size: 13px; color: #64748b; font-weight: normal; text-transform: uppercase;">Secretaria de Ciência, Tecnologia e Inovação</h2>
              
              <div style="background-color: #f0f4f8; border-left: 4px solid #1e3a5f; padding: 10px 20px; display: inline-block; border-radius: 0 4px 4px 0;">
                <h3 style="margin: 0; font-size: 15px; color: #1e3a5f;">🔔 AVISO DE VIGÊNCIA DE CONTRATOS</h3>
              </div>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 30px 24px; color: #334155; font-size: 15px; line-height: 1.6;">
              <p style="margin-top: 0;">Olá <strong>${userName || 'usuário'}</strong>,</p>
              <p>Os seguintes contratos registrados no <strong>Sistema SECTI</strong> estão se aproximando do fim da vigência e requerem sua atenção para análise de renovação ou encerramento.</p>

              <!-- Tabela de Dados -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                <thead>
                  <tr>
                    <th style="background-color: #f8fafc; padding: 12px 15px; text-align: left; font-size: 13px; color: #1e3a5f; border-bottom: 2px solid #cbd5e1;">Contrato / Empresa</th>
                    <th style="background-color: #f8fafc; padding: 12px 15px; text-align: center; font-size: 13px; color: #1e3a5f; border-bottom: 2px solid #cbd5e1;">Vigência Atual</th>
                    <th style="background-color: #f8fafc; padding: 12px 15px; text-align: center; font-size: 13px; color: #b91c1c; border-bottom: 2px solid #cbd5e1;">Dias Restantes ⏳</th>
                    <th style="background-color: #f8fafc; padding: 12px 15px; text-align: left; font-size: 13px; color: #1e3a5f; border-bottom: 2px solid #cbd5e1;">Gestor</th>
                    <th style="background-color: #f8fafc; padding: 12px 15px; text-align: left; font-size: 13px; color: #1e3a5f; border-bottom: 2px solid #cbd5e1;">Fiscal</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- As linhas geradas pelo seu sistema entrarão aqui -->
                  ${rows}
                </tbody>
              </table>

              <!-- Botão de Ação -->
              <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
                <a href="#" style="background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">Acessar Sistema para Detalhes</a>
              </div>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 24px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 12px 0;">
                <a href="#" style="color: #1e3a5f; text-decoration: none; font-weight: bold;">Portal da Transparência</a> &nbsp;|&nbsp; 
                <a href="#" style="color: #1e3a5f; text-decoration: none; font-weight: bold;">Site da SECTI</a> &nbsp;|&nbsp; 
                <a href="#" style="color: #1e3a5f; text-decoration: none; font-weight: bold;">Contato</a>
              </p>
              <p style="margin: 0;">
                Esta é uma notificação automática gerada pelo <strong>Sistema SECTI</strong>.<br/>
                Por favor, não responda a este e-mail.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `;
}

async function sendEmail(appPassword, user, contracts) {
  const subject = `⚠️ ${contracts.length} contrato(s) em breve vencem - SECTI`;
  const html = generateContractEmailHtml(user.name || user.displayName || user.email, contracts);

  const transporter = createGmailTransporter(appPassword);
  try {
    await transporter.verify();
  } catch (verifyErr) {
    console.error('Gmail verify failed', verifyErr);
    return { success: false, email: user.email, error: String(verifyErr) };
  }

  try {
    const info = await transporter.sendMail({
      from: `"SECTI" <${GMAIL_USER}>`,
      to: user.email,
      subject,
      html,
    });
    console.log('email enviado', info.messageId);
    return { success: true, email: user.email, messageId: info.messageId };
  } catch (err) {
    console.error(`erro ao enviar para ${user.email}`, err);
    return { success: false, email: user.email, error: String(err) };
  }
}

// -----------------------------------------------------------------------------
// scheduled entry point
// -----------------------------------------------------------------------------
exports.notifyExpiringContracts = onSchedule(
  {
    schedule: '0 8 * * *', // everyday 08:00 São Paulo
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
    secrets: [GMAIL_APP_PASSWORD],
  },
  async (event) => {
    console.log('iniciando verificação de contratosâ');
    try {
      const contracts = await getExpiringContracts();
      console.log(`contratos encontrados com prazo reduzido: ${contracts.length}`);
      if (contracts.length === 0) return;

      const byEmail = groupContractsByEmail(contracts);
      const usersMap = await getUsersByEmails([...byEmail.keys()].filter(e => e !== '_unknown'));

      const appPassword = GMAIL_APP_PASSWORD.value();
      const results = [];

      for (const [email, list] of byEmail) {
        if (email === '_unknown') {
          console.warn('contratos sem destinatário válido', list);
          continue;
        }
        const user = usersMap.get(email) || { email, name: email };
        const res = await sendEmail(appPassword, user, list);
        results.push(res);

        // create in-app notifications when we know a uid
        if (user.uid) {
          for (const c of list) {
            await createExpiryNotification(user.uid, c, c.threshold);
          }
        }
      }

      const successes = results.filter(r => r.success).length;
      await db.collection('notification_logs').add({
        type: 'contract_expiry',
        executedAt: Timestamp.now(),
        contractsFound: contracts.length,
        usersNotified: successes,
        errors: results.length - successes,
      });
    } catch (err) {
      console.error('erro geral', err);
      throw err;
    }
  }
);

// HTTP endpoint for manual/testing
exports.testNotifyExpiringContracts = onRequest(
  {
    region: 'southamerica-east1',
    secrets: [GMAIL_APP_PASSWORD],
  },
  async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 90;
      const dryRun = req.query.dryRun === 'true';
      const targetEmail = req.query.email && String(req.query.email).trim().toLowerCase();

      let contracts = await getExpiringContracts();
      if (days && days !== 90) {
        contracts = contracts.filter(c => c.daysRemaining <= days);
      }

      let byEmail = groupContractsByEmail(contracts);
      // track contracts without any valid email address
      const unknownList = byEmail.get('_unknown') || [];
      if (unknownList.length) {
        console.warn('test endpoint: contratos sem destinatário válido', unknownList);
        byEmail.delete('_unknown');
      }

      let usersMap = await getUsersByEmails([...byEmail.keys()]);

      let forced = null;
      if (targetEmail) {
        forced = targetEmail;
        if (byEmail.has(targetEmail)) {
          byEmail = new Map([[targetEmail, byEmail.get(targetEmail)]]);
          usersMap = new Map([[targetEmail, usersMap.get(targetEmail)]]);
        } else {
          console.warn(`email ${targetEmail} não encontrado em contratos; envio forçado`);
        }
      }

      const summary = {
        contractsFound: contracts.length,
        usersToNotify: forced ? 1 : byEmail.size,
        dryRun,
        targetEmail,
        forcedEmail: forced,
        unknownContracts: unknownList.map(c => ({ id: c.id, empresa: c.empresa, daysRemaining: c.daysRemaining })),
        contracts: contracts.map(c => ({ id: c.id, empresa: c.empresa, daysRemaining: c.daysRemaining })),
      };

      if (!dryRun && contracts.length > 0 && byEmail.size > 0) {
        const appPassword = GMAIL_APP_PASSWORD.value();
        const results = [];
        for (const [email, list] of byEmail) {
          const user = usersMap.get(email) || { email, name: email };
          const r = await sendEmail(appPassword, user, list);
          results.push(r);
          if (!dryRun && user.uid) {
            for (const c of list) {
              await createExpiryNotification(user.uid, c, c.threshold);
            }
          }
        }
        summary.emailResults = results;
      }

      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

if (typeof module !== 'undefined' && module.exports) {
  module.exports._test = {
    daysRemaining,
    getExpiryThreshold,
    getExpiringContracts,
    groupContractsByEmail,
  };
}
