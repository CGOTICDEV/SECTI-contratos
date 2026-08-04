/**
 * Lista oficial de gestores e fiscais da SECTI usada para casar nomes com emails
 * quando o usuario digita um nome em vez do email.  Reflete a mesma lista usada
 * pela funcao cloud `contractAlerts.js` para envio de emails de vencimento.
 */

export interface GestorFiscalOficial {
  email: string;
  nome: string;
  tipo: 'gestor' | 'fiscal';
}

export const GESTORES_FISCAIS_OFICIAIS: GestorFiscalOficial[] = [
  // Gestores
  { email: 'joao.santana@secti.ba.gov.br', nome: 'JOÃO DOS SANTOS SANTANA JÚNIOR', tipo: 'gestor' },
  { email: 'micaele.diamantino@secti.ba.gov.br', nome: 'MICAELE SANTOS DIAMANTINO', tipo: 'gestor' },
  { email: 'diana.melo@secti.ba.gov.br', nome: 'DIANA SAMPAIO MELO', tipo: 'gestor' },
  { email: 'elisangela.reis@secti.ba.gov.br', nome: 'ELISÂNGELA DOS REIS OLIVEIRA', tipo: 'gestor' },
  { email: 'caio.cerqueira@secti.ba.gov.br', nome: 'CAIO DE JESUS CERQUEIRA', tipo: 'gestor' },
  { email: 'renato.cardozo@secti.ba.gov.br', nome: 'RENATO GUIMARÃES CARDOZO', tipo: 'gestor' },
  // Fiscais
  { email: 'taisa.silva@secti.ba.gov.br', nome: 'TAÍSA TELES DA SILVA', tipo: 'fiscal' },
  { email: 'janine.duarte@secti.ba.gov.br', nome: 'JANINE BIDU DUARTE', tipo: 'fiscal' },
  { email: 'soane.madureira@secti.ba.gov.br', nome: 'SOANE NAZARÉ DE ANDRADE HART MADUREIRA', tipo: 'fiscal' },
  { email: 'nathaly.nascimento@secti.ba.gov.br', nome: 'NATHALY DA SILVA NASCIMENTO', tipo: 'fiscal' },
  { email: 'sueli.jesus@secti.ba.gov.br', nome: 'SUELI DE JESUS SILVA', tipo: 'fiscal' },
  { email: 'valmir.ferreira@secti.ba.gov.br', nome: 'VALMIR SANTOS FERREIRA FILHO', tipo: 'fiscal' },
  { email: 'evelin.candeias@secti.ba.gov.br', nome: 'JÔSE EVELIN TELES CANDEIAS', tipo: 'fiscal' },
  { email: 'ariadna.flores@secti.ba.gov.br', nome: 'ARIADNA COSTA FLORES', tipo: 'fiscal' },
  { email: 'ricardo.cavalcanti@secti.ba.gov.br', nome: 'RICARDO JORGE CAVALCANTI CAVALCANTI FILHO', tipo: 'fiscal' },
  { email: 'kleber.freitas@secti.ba.gov.br', nome: 'KLEBER ALMEIDA FREITAS', tipo: 'fiscal' },
];

function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Procura um email pelo nome do gestor/fiscal usando correspondencia flexivel. */
export function findEmailByNormalizedName(rawName: string): string | null {
  if (!rawName) return null;
  const normalizedInput = normalizeName(rawName);
  for (const g of GESTORES_FISCAIS_OFICIAIS) {
    const n = normalizeName(g.nome);
    if (normalizedInput === n || normalizedInput.includes(n) || n.includes(normalizedInput)) {
      return g.email;
    }
  }
  return null;
}

/** Procura o nome pelo email (case-insensitive). */
export function findNameByEmail(email: string): string | null {
  if (!email) return null;
  const e = email.toLowerCase();
  return GESTORES_FISCAIS_OFICIAIS.find((g) => g.email === e)?.nome ?? null;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Recebe um texto livre (conteudo de apostila, portaria, etc.) e devolve
 * gestor/fiscal/email detectados.  Emails explicitos sao coletados direto; se
 * um nome conhecido da lista oficial aparecer no texto, o email correspondente
 * tambem e atribuido.
 */
export interface ParsedGestorFiscal {
  gestorEmail?: string;
  fiscalEmails?: string[];
  gestor?: string;
  fiscal?: string;
  rawEmails: string[];
}

export function extractGestorFiscalFromText(text: string): ParsedGestorFiscal {
  const out: ParsedGestorFiscal = { rawEmails: [] };
  if (!text) return out;

  const emailsFound = (text.match(EMAIL_RE) || []).map((e) => e.toLowerCase());
  out.rawEmails = emailsFound;

  const gestorEmails: string[] = [];
  const fiscalEmails: string[] = [];

  for (const email of emailsFound) {
    const match = GESTORES_FISCAIS_OFICIAIS.find((g) => g.email === email);
    if (match) {
      if (match.tipo === 'gestor') {
        gestorEmails.push(match.email);
        out.gestor = out.gestor || match.nome;
      } else {
        fiscalEmails.push(match.email);
        if (!out.fiscal) out.fiscal = match.nome;
      }
    } else {
      // email externo: assume fiscal se nao houver contexto melhor
      fiscalEmails.push(email);
    }
  }

  // busca por nomes da lista oficial que aparecem no texto
  const upper = normalizeName(text);
  for (const g of GESTORES_FISCAIS_OFICIAIS) {
    const n = normalizeName(g.nome);
    if (n.length < 8) continue;
    if (upper.includes(n)) {
      if (g.tipo === 'gestor' && !gestorEmails.includes(g.email)) {
        gestorEmails.push(g.email);
        out.gestor = out.gestor || g.nome;
      } else if (g.tipo === 'fiscal' && !fiscalEmails.includes(g.email)) {
        fiscalEmails.push(g.email);
        if (!out.fiscal) out.fiscal = g.nome;
      }
    }
  }

  if (gestorEmails.length > 0) out.gestorEmail = gestorEmails[0];
  if (fiscalEmails.length > 0) out.fiscalEmails = fiscalEmails;

  return out;
}
