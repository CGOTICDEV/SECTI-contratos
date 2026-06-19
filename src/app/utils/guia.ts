import { generateChat, isNimModelKey, NIM_MODELS } from './nimClient';
import type { Contract } from '../types/contract';
import { getCacheKey, getCachedResult, setCachedResult } from './nimCache';

export type GuiaMode = 'criar-contrato' | 'sugerir-termo';

export interface GuiaContractSuggestion {
  tipoRegistro: string;
  numeroContrato: string;
  empresa: string;
  convenente: string;
  interveniente: string;
  objeto: string;
  gestor: string;
  fiscal: string;
  situacao: string;
  vigenciaInicial: string;
  vigenciaAtual: string;
  valorInicial: number;
  valorAtual: number;
  garantiaTipo: string;
  resumo: string;
  observacoes: string;
}

export interface GuiaTermoSuggestion {
  tipo: string;
  ajuste: number;
  prorrogacao: string;
  minuta: string;
  justificativa: string;
  fundamentacaoLegal: string;
}

export interface GuiaResponse<T = GuiaContractSuggestion | GuiaTermoSuggestion> {
  sugestao: T;
  raw: string;
  modelUsed: string;
  thinking?: string;
}

const TIPOS_REGISTRO = [
  'contrato', 'convenio', 'termoAdesao', 'acordoCooperacaoTecnica',
  'acordoConsorcial', 'acordoCooperacaoInternacional', 'convenioCooperacaoTecnica',
  'termoCooperacaoTecnica', 'termoCessaoUsoMovel', 'termoRecisaoUnilateral',
  'termoRecisaoAmigavel', 'termoDoacaoMoveis', 'convenioEspacoColaborar',
  'convenioEspacoFazer', 'convenioEspacoPensar', 'conveniosFederais',
  'termoCessaoVeiculos', 'contratoGestao', 'portaria', 'outro',
] as const;

const TIPOS_TERMO = [
  'prorrogacao', 'acrescimo', 'supressao', 'reajuste',
  'termoRecisaoUnilateral', 'termoRecisaoAmigavel', 'outro',
] as const;

const GUIA_LOCAL_MODEL = 'guia-extracao-local';
const FAST_CONTRACT_MODEL = 'nim-nemotron-ultra-550b';
const FAST_TERMO_MODEL = 'nim-nemotron-ultra-550b';
const CONTRACT_MAX_TOKENS = 2048;
const TERMO_MAX_TOKENS = 4096;
const CONTRACT_TIMEOUT_MS = 120000;
const TERMO_TIMEOUT_MS = 180000;
const GUIA_CACHE_TTL_MS = 15 * 60 * 1000;

function sanitizeContractForPrompt(contract: Partial<Contract>): Record<string, unknown> {
  const MAX_OBJETO = 500;
  const MAX_OBS = 300;
  const MAX_PARTE = 200;

  return {
    tipoRegistro: contract.tipoRegistro,
    numero: contract.numeroContrato || contract.numeroConvenio || '',
    parte: (contract.empresa || contract.convenente || '').slice(0, MAX_PARTE),
    objeto: (contract.objeto || '').slice(0, MAX_OBJETO),
    valorAtual: contract.valorAtual ?? 0,
    vigenciaAtual: contract.vigenciaAtual || '',
    saldoDisponivel: contract.saldoDisponivel ?? 0,
  };
}

const cleanJson = (raw: string): string => {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return cleaned.slice(start, end + 1).trim();
  }

  return cleaned;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return 'falha de rede na chamada direta ao NIM; o navegador pode ter bloqueado CORS ou a conexao falhou';
  }
  return err instanceof Error ? err.message : 'erro desconhecido';
}

function formatGuiaFailure(errors: string[]): string {
  if (errors.length === 0) {
    return 'Informe pelo menos parte/empresa, objeto, valor e vigencia para aumentar a precisao.';
  }

  return `Detalhes: ${errors.slice(-2).join(' | ')}`;
}

const normalizeText = (value: string): string => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
);

function emptyContractSuggestion(): GuiaContractSuggestion {
  return {
    tipoRegistro: 'contrato',
    numeroContrato: '',
    empresa: '',
    convenente: '',
    interveniente: '',
    objeto: '',
    gestor: '',
    fiscal: '',
    situacao: 'Vigente',
    vigenciaInicial: '',
    vigenciaAtual: '',
    valorInicial: 0,
    valorAtual: 0,
    garantiaTipo: '',
    resumo: '',
    observacoes: '',
  };
}

function cleanSegment(value: string): string {
  return value
    .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBetween(original: string, normalized: string, startRegex: RegExp, stopRegex: RegExp): string {
  const start = normalized.match(startRegex);
  if (!start || start.index === undefined) return '';

  const startIdx = start.index + start[0].length;
  const rest = normalized.slice(startIdx);
  const stop = rest.search(stopRegex);
  const endIdx = stop >= 0 ? startIdx + stop : original.length;

  return cleanSegment(original.slice(startIdx, endIdx));
}

function parseLocalizedNumber(value: string): number {
  const clean = value.trim();
  if (clean.includes(',') && clean.includes('.')) {
    return Number.parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  }
  if (clean.includes(',')) {
    return Number.parseFloat(clean.replace(',', '.'));
  }
  if (/\.\d{3}(?:\.|$)/.test(clean)) {
    return Number.parseFloat(clean.replace(/\./g, ''));
  }
  return Number.parseFloat(clean);
}

function parseMoneyWords(normalized: string): number {
  const wordAmounts: Array<[RegExp, number]> = [
    [/\b(um|uma) milhao\b/, 1000000],
    [/\bdois milhoes\b/, 2000000],
    [/\btres milhoes\b/, 3000000],
    [/\bquatro milhoes\b/, 4000000],
    [/\bcinco milhoes\b/, 5000000],
    [/\bcem mil\b/, 100000],
    [/\bduzentos mil\b/, 200000],
    [/\btrezentos mil\b/, 300000],
    [/\bquatrocentos mil\b/, 400000],
    [/\bquinhentos mil\b/, 500000],
    [/\bseiscentos mil\b/, 600000],
    [/\bsetecentos mil\b/, 700000],
    [/\boitocentos mil\b/, 800000],
    [/\bnovecentos mil\b/, 900000],
  ];

  const match = wordAmounts.find(([pattern]) => pattern.test(normalized));
  return match ? match[1] : 0;
}

function parseMoney(descricao: string): number {
  const normalized = normalizeText(descricao);
  const wordValue = parseMoneyWords(normalized);
  if (wordValue > 0) return wordValue;

  const moneyPattern = /(?:r\$\s*)?(\d[\d.,]*)\s*(milhoes|milhao|mi|mil|k)?(?:\s*(?:de\s+)?reais)?/gi;
  let match: RegExpExecArray | null;

  while ((match = moneyPattern.exec(normalized))) {
    const full = match[0];
    const scale = match[2] || '';
    const hasMoneyCue = full.includes('r$') || !!scale || /\breais\b/.test(full);
    if (!hasMoneyCue) continue;

    const parsed = parseLocalizedNumber(match[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;

    const multiplier = scale === 'milhoes' || scale === 'milhao' || scale === 'mi'
      ? 1000000
      : scale === 'mil' || scale === 'k'
        ? 1000
        : 1;

    return Math.round(parsed * multiplier * 100) / 100;
  }

  return 0;
}

function toIsoDate(value: string): string {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return value;

  const br = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!br) return '';

  const day = br[1].padStart(2, '0');
  const month = br[2].padStart(2, '0');
  const year = br[3].length === 2 ? `20${br[3]}` : br[3];
  return `${year}-${month}-${day}`;
}

function addDurationToDate(isoDate: string, amount: number, unit: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return '';

  const date = new Date(Date.UTC(year, month - 1, day));
  if (unit.startsWith('ano')) {
    date.setUTCFullYear(date.getUTCFullYear() + amount);
  } else {
    date.setUTCMonth(date.getUTCMonth() + amount);
  }

  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function findDates(normalized: string): string[] {
  const datePattern = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g;
  const dates: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = datePattern.exec(normalized))) {
    const iso = toIsoDate(match[1]);
    if (iso) dates.push(iso);
  }

  return dates;
}

function inferTipoRegistro(normalized: string): string {
  const typeHints: Array<[RegExp, string]> = [
    [/\btermo de adesao\b/, 'termoAdesao'],
    [/\bacordo de cooperacao tecnica\b/, 'acordoCooperacaoTecnica'],
    [/\bacordo consorcial\b/, 'acordoConsorcial'],
    [/\bacordo de cooperacao internacional\b/, 'acordoCooperacaoInternacional'],
    [/\btermo de cooperacao tecnica\b/, 'termoCooperacaoTecnica'],
    [/\bcessao de uso\b/, 'termoCessaoUsoMovel'],
    [/\bcessao de veiculos\b/, 'termoCessaoVeiculos'],
    [/\bcontrato de gestao\b/, 'contratoGestao'],
    [/\bportaria\b/, 'portaria'],
    [/\bconvenio\b/, 'convenio'],
  ];

  return typeHints.find(([pattern]) => pattern.test(normalized))?.[1] || 'contrato';
}

function inferGarantia(normalized: string): string {
  if (!/\bgarantia\b/.test(normalized)) return '';
  const hasTecnica = /\btecnica\b/.test(normalized);
  const hasValor = /\bvalor\b/.test(normalized);

  if (hasTecnica && hasValor) return 'tecnicaEValor';
  if (hasTecnica) return 'tecnica';
  if (hasValor) return 'valor';
  return '';
}

function extractNumero(normalized: string): string {
  const match = normalized.match(/\b(?:numero|n[.oº]*)\s*(?:do\s*)?(?:contrato|convenio)?\s*[:#-]?\s*([a-z0-9./-]+)/i);
  return match?.[1] || '';
}

function tryBuildLocalContractSuggestion(descricao: string): GuiaContractSuggestion | null {
  const original = descricao.replace(/\s+/g, ' ').trim();
  if (!original) return null;

  const normalized = normalizeText(original);
  const suggestion = emptyContractSuggestion();
  const fieldStop = /[,;]\s*(?:vigencia|gestor|gestora|fiscal|valor|garantia|situacao|numero|objeto|empresa|convenente|interveniente)\b|\s+\b(?:vigencia|gestor|gestora|fiscal|valor|garantia|situacao|numero|objeto|empresa|convenente|interveniente)\b/;

  suggestion.tipoRegistro = inferTipoRegistro(normalized);
  suggestion.numeroContrato = extractNumero(normalized);

  const entity = extractBetween(
    original,
    normalized,
    /\bcom\s+/,
    /\s+(?:para|visando|objetivando)\b|[,;]\s*(?:vigencia|gestor|gestora|fiscal|valor|garantia|situacao|numero|objeto)\b/
  );
  const objeto = extractBetween(
    original,
    normalized,
    /\b(?:para|visando|objetivando|objeto(?:\s+de)?|com\s+objeto\s+de)\s+/,
    fieldStop
  );

  if (suggestion.tipoRegistro === 'convenio') {
    suggestion.convenente = entity;
  } else {
    suggestion.empresa = entity;
  }
  suggestion.objeto = objeto;

  suggestion.gestor = extractBetween(original, normalized, /\bgestor(?:a)?\s*(?::|-|=)?\s*/, fieldStop);
  suggestion.fiscal = extractBetween(original, normalized, /\bfiscal\s*(?::|-|=)?\s*/, fieldStop);

  if (/\bsuspenso\b/.test(normalized)) suggestion.situacao = 'Suspenso';
  if (/\bvencido\b/.test(normalized)) suggestion.situacao = 'Vencido';

  const valor = parseMoney(original);
  suggestion.valorInicial = valor;
  suggestion.valorAtual = valor;
  suggestion.garantiaTipo = inferGarantia(normalized);

  const dates = findDates(normalized);
  const inicioMatch = normalized.match(/\b(?:inicio|vigencia inicial|a partir de|inicia(?:\s+em)?)\s*(?:em|no dia|:|-)?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  const fimMatch = normalized.match(/\b(?:termino|fim|ate|vigencia final|vigencia atual)\s*(?:em|no dia|:|-)?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);

  suggestion.vigenciaInicial = inicioMatch ? toIsoDate(inicioMatch[1]) : dates[0] || '';
  suggestion.vigenciaAtual = fimMatch ? toIsoDate(fimMatch[1]) : dates[1] || '';

  const durationMatch = normalized.match(/\bvigencia(?:\s+de)?\s+(\d+)\s*(mes|meses|ano|anos)\b/);
  if (!suggestion.vigenciaAtual && suggestion.vigenciaInicial && durationMatch) {
    suggestion.vigenciaAtual = addDurationToDate(suggestion.vigenciaInicial, Number(durationMatch[1]), durationMatch[2]);
  }

  const notes: string[] = [];
  if (durationMatch && !suggestion.vigenciaInicial) {
    notes.push(`Vigencia de ${durationMatch[1]} ${durationMatch[2]} informada; preencha a data inicial para calcular o termino.`);
  }
  if (!suggestion.fiscal) {
    notes.push('Fiscal nao informado.');
  }
  suggestion.observacoes = notes.join(' ');

  const partesResumo = [
    suggestion.tipoRegistro === 'convenio' ? 'Convenio' : 'Contrato',
    entity ? `com ${entity}` : '',
    objeto ? `para ${objeto}` : '',
    valor ? `no valor de R$ ${valor.toLocaleString('pt-BR')}` : '',
  ].filter(Boolean);
  suggestion.resumo = partesResumo.join(' ');

  const confidence = [
    valor > 0,
    !!entity,
    !!objeto,
    !!suggestion.gestor,
    !!suggestion.fiscal,
    !!suggestion.vigenciaInicial || !!suggestion.vigenciaAtual || !!durationMatch,
    !!suggestion.numeroContrato,
  ].filter(Boolean).length;

  return confidence >= 3 ? suggestion : null;
}

const LABELED_KEYS = ['tipo', 'empresa', 'convenente', 'interveniente', 'objeto', 'gestor', 'gestora', 'fiscal', 'situacao', 'situação', 'vigencia', 'vigência', 'valor', 'garantia', 'resumo', 'observacoes', 'obs', 'numero', 'nº', 'número'];

function tryBuildLabeledContractSuggestion(descricao: string): GuiaContractSuggestion | null {
  const raw: Record<string, string> = {};

  for (const line of descricao.split(/\r?\n/)) {
    const m = line.match(/^\s*([\wÀ-ÿ]+(?:\s+[\wÀ-ÿ]+)*)\s*:\s*(.+?)\s*$/i);
    if (!m) continue;
    const key = normalizeText(m[1]);
    const value = m[2].trim();
    if (!value) continue;
    for (const known of LABELED_KEYS) {
      if (key === known || key.startsWith(known + ' ')) {
        raw[known] = value;
        break;
      }
    }
  }

  const filled = Object.keys(raw).filter(k => raw[k].length > 0).length;
  if (filled < 3) return null;

  const r = emptyContractSuggestion();

  if (raw.tipo) r.tipoRegistro = inferTipoRegistro(normalizeText(raw.tipo));
  if (raw.empresa) r.empresa = raw.empresa;
  if (raw.convenente) r.convenente = raw.convenente;
  if (raw.interveniente) r.interveniente = raw.interveniente;
  if (raw.objeto) r.objeto = raw.objeto;
  if (raw.gestor || raw.gestora) r.gestor = raw.gestor || raw.gestora;
  if (raw.fiscal) r.fiscal = raw.fiscal;
  if (raw.resumo) r.resumo = raw.resumo;
  if (raw.observacoes || raw.obs) r.observacoes = raw.observacoes || raw.obs;
  if (raw.numero || raw['nº'] || raw.número) r.numeroContrato = raw.numero || raw['nº'] || raw.número;

  if (raw.situacao || raw.situação) {
    const s = normalizeText(raw.situacao || raw.situação);
    r.situacao = /suspens/.test(s) ? 'Suspenso' : /vencid/.test(s) ? 'Vencido' : 'Vigente';
  }

  const vig = raw.vigencia || raw.vigência;
  if (vig) {
    const range = vig.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:→|-|–|a|ate|até)\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (range) {
      r.vigenciaInicial = toIsoDate(range[1]);
      r.vigenciaAtual = toIsoDate(range[2]);
    } else {
      const d = vig.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (d) r.vigenciaInicial = toIsoDate(d[1]);
    }
  }

  if (raw.valor) {
    r.valorInicial = parseMoney(raw.valor);
    r.valorAtual = r.valorInicial;
  }

  if (raw.garantia) r.garantiaTipo = inferGarantia(normalizeText(raw.garantia));

  if (!r.resumo && (r.empresa || r.convenente) && r.objeto) {
    const parte = r.empresa || r.convenente;
    r.resumo = `Contrato com ${parte} para ${r.objeto}`;
    if (r.valorInicial > 0) r.resumo += ` no valor de R$ ${r.valorInicial.toLocaleString('pt-BR')}`;
  }

  return r;
}

function buildContractSystemPrompt(): string {
  return `Você é o GUIÁ, assistente de criação de contratos da SECTI Bahia.
Você recebe uma descrição em linguagem natural e deve extrair os dados estruturados do contrato/convênio.

Tipos de registro disponíveis: ${TIPOS_REGISTRO.join(', ')}
Campos de garantia: 'tecnica', 'valor', 'tecnicaEValor'
Situação: 'Vigente', 'Suspenso', 'Vencido'

Regras:
- Converta valores por extenso para número (ex: "quinhentos mil" = 500000)
- Datas no formato YYYY-MM-DD
- Se o tipo for convênio, preencha convenente/interveniente em vez de empresa
- Se não houver informação para um campo, deixe string vazia ou 0
- vigenciaAtual = vigência inicial + prazo informado

Retorne APENAS um JSON válido sem markdown:
{
  "tipoRegistro": "contrato",
  "numeroContrato": "",
  "empresa": "",
  "convenente": "",
  "interveniente": "",
  "objeto": "",
  "gestor": "",
  "fiscal": "",
  "situacao": "Vigente",
  "vigenciaInicial": "",
  "vigenciaAtual": "",
  "valorInicial": 0,
  "valorAtual": 0,
  "garantiaTipo": "",
  "resumo": "Resumo do contrato em 1 linha",
  "observacoes": "Observações relevantes"
}`;
}

function buildTermoSystemPrompt(contract: Partial<Contract>): string {
  const contractSummary = sanitizeContractForPrompt(contract);

  return `Você é o GUIÁ, assistente de termos aditivos e apostilas da SECTI Bahia.
Você recebe os dados atuais de um contrato e uma descrição da necessidade.

DADOS ATUAIS DO CONTRATO:
${JSON.stringify(contractSummary, null, 2)}

Tipos de termo disponíveis: ${TIPOS_TERMO.join(', ')}

Regras:
- prorrogacao: extensão de prazo → sugira nova data de vigência
- acrescimo: aumento de valor → calcule com base em índices (IGPM ~4.5% aa, IPCA ~3.8% aa)
- supressao: redução de valor → sugira valor negativo
- reajuste: correção monetária → use índice oficial
- Ajuste positivo aumenta valorAtual, ajuste negativo é supressão
- Valide: acréscimos não devem ultrapassar 25% do valor atual (Lei 14.133)
- Valide: prorrogações não devem ultrapassar 60 meses total

Retorne APENAS um JSON válido sem markdown:
{
  "tipo": "prorrogacao",
  "ajuste": 0,
  "prorrogacao": "2027-06-11",
  "minuta": "Texto descritivo do termo sugerido em linguagem formal",
  "justificativa": "Justificativa técnica para a sugestão",
  "fundamentacaoLegal": "Base legal aplicável"
}`;
}

function buildFastContractSystemPrompt(): string {
  return [
    'Extraia dados de contrato/convenio da SECTI. Responda somente JSON valido.',
    `tipoRegistro deve ser um destes: ${TIPOS_REGISTRO.join(', ')}`,
    'Datas em YYYY-MM-DD. Valores numericos. Campos ausentes: "" ou 0. situacao: Vigente, Suspenso ou Vencido.',
    'Se for convenio, use convenente/interveniente; senao use empresa.',
    'JSON: {"tipoRegistro":"contrato","numeroContrato":"","empresa":"","convenente":"","interveniente":"","objeto":"","gestor":"","fiscal":"","situacao":"Vigente","vigenciaInicial":"","vigenciaAtual":"","valorInicial":0,"valorAtual":0,"garantiaTipo":"","resumo":"","observacoes":""}',
  ].join('\n');
}

function buildFastTermoSystemPrompt(contract: Partial<Contract>): string {
  const c = sanitizeContractForPrompt(contract);

  return [
    'Sugira termo aditivo/apostila para este contrato. Responda somente JSON valido.',
    `Contrato: ${JSON.stringify(c)}`,
    `tipo deve ser um destes: ${TIPOS_TERMO.join(', ')}`,
    'ajuste positivo aumenta valor; negativo reduz. prorrogacao em YYYY-MM-DD ou "".',
    'JSON: {"tipo":"prorrogacao","ajuste":0,"prorrogacao":"","minuta":"","justificativa":"","fundamentacaoLegal":""}',
  ].join('\n');
}

interface GuiaCallOptions {
  preferredModel?: string;
  fallbackModels?: string[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  timeoutMsForModel?: (modelKey: string) => number;
  onStatus?: (status: string) => void;
}

function getTimeoutForModel(modelKey: string, baseTimeoutMs: number): number {
  const thinking = NIM_MODELS[modelKey]?.thinking;
  if (thinking === 'max') return Math.max(baseTimeoutMs, 90000);
  if (thinking === 'high') return Math.max(baseTimeoutMs, 60000);
  if (thinking === 'medium') return Math.max(baseTimeoutMs, 50000);
  return baseTimeoutMs;
}

function getModelsToTry(options: GuiaCallOptions): string[] {
  const models: string[] = [];
  const addModel = (key?: string) => {
    if (key && isNimModelKey(key) && NIM_MODELS[key] && !models.includes(key)) {
      models.push(key);
    }
  };

  addModel(options.preferredModel);
  options.fallbackModels?.forEach(addModel);

  return models.length > 0 ? models : [FAST_CONTRACT_MODEL];
}

async function callGuia(messages: { role: 'system' | 'user'; content: string }[], options: GuiaCallOptions = {}): Promise<{ text: string; modelUsed: string; thinking?: string }> {
  const modelsToTry = getModelsToTry(options);

  const cacheKey = await getCacheKey('guia', messages, modelsToTry[0] || '', options.temperature);
  const cached = await getCachedResult(cacheKey);
  if (cached && cached.length > 20) {
    try {
      const parsed = JSON.parse(cached);
      return { text: parsed.text, modelUsed: parsed.modelUsed || 'cache', thinking: parsed.thinking };
    } catch {
      // Ignore corrupted cache and ask the model again.
    }
  }

  const errors: string[] = [];
  for (const modelKey of modelsToTry) {
    try {
      options.onStatus?.(`Consultando ${NIM_MODELS[modelKey]?.label || modelKey}...`);
      const result = await generateChat({
        modelKey,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.2,
        maxTokens: options.maxTokens,
        timeoutMs: options.timeoutMsForModel?.(modelKey) ?? options.timeoutMs,
      });
      const response = { text: result.text, modelUsed: result.modelUsed, thinking: result.reasoningContent };
      if (result.text.length > 10) {
        await setCachedResult(cacheKey, JSON.stringify(response), GUIA_CACHE_TTL_MS);
      }
      return response;
    } catch (err) {
      errors.push(`${modelKey}: ${getErrorMessage(err)}`);
    }
  }
  throw new Error(`GUIÁ: todos os modelos falharam. ${errors.join(' | ')}`);
}

export async function sugerirCriacaoContrato(descricao: string, modelKey?: string, onStatus?: (status: string) => void): Promise<GuiaResponse<GuiaContractSuggestion>> {
  const preferredModel = modelKey && NIM_MODELS[modelKey] ? modelKey : FAST_CONTRACT_MODEL;
  const errors: string[] = [];

  onStatus?.('Extraindo dados do contrato...');
  const labeled = tryBuildLabeledContractSuggestion(descricao);
  if (labeled) return { sugestao: labeled, raw: JSON.stringify(labeled), modelUsed: GUIA_LOCAL_MODEL };

  const local = tryBuildLocalContractSuggestion(descricao);
  if (local) return { sugestao: local, raw: JSON.stringify(local), modelUsed: GUIA_LOCAL_MODEL };

  const systemPrompt = buildContractSystemPrompt();
  const userPrompt = `Extraia os dados estruturados do contrato/convênio a partir da descrição abaixo e preencha o JSON. Deixe campos não identificados como string vazia ou 0.\n\n"${descricao}"`;

  try {
    const result = await callGuia([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      preferredModel,
      fallbackModels: [FAST_CONTRACT_MODEL, 'nim-deepseek-v4-flash'],
      temperature: 0.1,
      maxTokens: CONTRACT_MAX_TOKENS,
      timeoutMsForModel: (key) => getTimeoutForModel(key, CONTRACT_TIMEOUT_MS),
      onStatus,
    });

    const cleaned = cleanJson(result.text);
    const parsed = JSON.parse(cleaned) as GuiaContractSuggestion;
    const isEmpty = !parsed.empresa && !parsed.convenente && !parsed.objeto && !parsed.gestor && !parsed.valorInicial;
    if (!isEmpty) return { sugestao: parsed, raw: result.text, modelUsed: result.modelUsed, thinking: result.thinking };
    throw new Error('a IA retornou JSON sem dados minimos do contrato');
  } catch (err) {
    errors.push(`prompt completo: ${getErrorMessage(err)}`);
  }

  onStatus?.('Tentando extração com prompt otimizado...');
  try {
    const fastPrompt = buildFastContractSystemPrompt();
    const userPrompt2 = `Descreva o contrato/convênio com base nesta solicitação:\n\n"${descricao}"\n\nPreencha o JSON com todos os campos que conseguir extrair.`;
    const result2 = await callGuia([
      { role: 'system', content: fastPrompt },
      { role: 'user', content: userPrompt2 },
    ], {
      preferredModel,
      fallbackModels: [FAST_CONTRACT_MODEL],
      temperature: 0.1,
      maxTokens: CONTRACT_MAX_TOKENS,
      timeoutMsForModel: (key) => getTimeoutForModel(key, CONTRACT_TIMEOUT_MS),
      onStatus,
    });
    const cleaned2 = cleanJson(result2.text);
    const parsed2 = JSON.parse(cleaned2) as GuiaContractSuggestion;
    return { sugestao: parsed2, raw: result2.text, modelUsed: result2.modelUsed, thinking: result2.thinking };
  } catch (err) {
    errors.push(`prompt otimizado: ${getErrorMessage(err)}`);
    const local = tryBuildLabeledContractSuggestion(descricao) || tryBuildLocalContractSuggestion(descricao);
    if (local) return { sugestao: local, raw: JSON.stringify(local), modelUsed: GUIA_LOCAL_MODEL };
    throw new Error(`Nao foi possivel extrair dados do contrato. ${formatGuiaFailure(errors)}`);
  }
}

export async function sugerirTermoAditivo(contract: Partial<Contract>, descricao: string, modelKey?: string, onStatus?: (status: string) => void): Promise<GuiaResponse<GuiaTermoSuggestion>> {
  const systemPrompt = buildTermoSystemPrompt(contract);
  const userPrompt = `Com base na necessidade abaixo, analise os dados do contrato e sugira tipo de termo, valores, prazo e minuta preenchendo o JSON:\n\n"${descricao.trim()}"`;

  const result = await callGuia([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], {
    preferredModel: modelKey,
    fallbackModels: [FAST_TERMO_MODEL, 'nim-deepseek-v4-flash'],
    temperature: 0.2,
    maxTokens: TERMO_MAX_TOKENS,
    timeoutMsForModel: (key) => getTimeoutForModel(key, TERMO_TIMEOUT_MS),
    onStatus,
  });

  const cleaned = cleanJson(result.text);
  const parsed = JSON.parse(cleaned) as GuiaTermoSuggestion;

  return { sugestao: parsed, raw: result.text, modelUsed: result.modelUsed, thinking: result.thinking };
}
