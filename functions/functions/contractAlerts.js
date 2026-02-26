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
    if (data.situacao === 'Vencido') return; // already expired

    const days = daysRemaining(data.vigenciaAtual);
    const threshold = getExpiryThreshold(days);
    if (threshold !== null) {
      results.push({ id: doc.id, ...data, daysRemaining: days, threshold });
    }
  });

  return results;
}

function extractEmailsFromContract(contract) {
  const emails = new Set();

  // scan every property looking for address-like values; supports
  // strings and arrays of strings.  This lets us pick up fields such as
  // gestor, fiscal or emailEditor (which in the UI is stored as an array).
  for (const key of Object.keys(contract)) {
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
      return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
          <strong>${c.empresa || 'Sem empresa'}</strong><br/>
          <small>${c.numeroContrato || ''}</small>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">
          ${formatDate(c.vigenciaAtual)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:center;">
          ${c.daysRemaining} dias
        </td>
      </tr>
      `;
    })
    .join('');

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
      <div style="background:#1e3a5f;padding:24px;text-align:center;color:#fff;">
        <h1 style="margin:0;font-size:20px;">🔔 Aviso de contratos</h1>
        <p style="margin:0;font-size:12px;">Sistema SECTI</p>
      </div>
      <div style="padding:24px;color:#334155;">
        <p>Olá <strong>${userName || 'usuário'}</strong>,</p>
        <p>Os seguintes contratos estão se aproximando do fim da vigência:</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f1f5f9;font-size:12px;color:#64748b;">
              <th style="padding:8px;text-align:left;">Contrato / Empresa</th>
              <th style="padding:8px;text-align:center;">Vigência atual</th>
              <th style="padding:8px;text-align:center;">Dias restantes</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
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
