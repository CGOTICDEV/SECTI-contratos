import { generateChat, isNimModelKey, NIM_MODELS } from './nimClient';
import type { Contract } from '../types/contract';

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
const CONTRACT_MAX_TOKENS = 420;
const TERMO_MAX_TOKENS = 900;
const CONTRACT_TIMEOUT_MS = 20000;
const TERMO_TIMEOUT_MS = 30000;

const cleanJson = (raw: string): string => {
  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^[\s\n]*\{/, '{')
    .replace(/\}[\s\n]*$/, '}')
    .trim();
};

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
  const contractSummary = {
    tipoRegistro: contract.tipoRegistro,
    numeroContrato: contract.numeroContrato,
    empresa: contract.empresa || contract.convenente,
    objeto: contract.objeto,
    valorAtual: contract.valorAtual,
    vigenciaAtual: contract.vigenciaAtual,
    saldoDisponivel: contract.saldoDisponivel,
  };

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
  const c = {
    tipoRegistro: contract.tipoRegistro,
    numero: contract.numeroContrato || contract.numeroConvenio,
    parte: contract.empresa || contract.convenente,
    objeto: contract.objeto,
    valorAtual: contract.valorAtual,
    vigenciaAtual: contract.vigenciaAtual,
    saldoDisponivel: contract.saldoDisponivel,
  };

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

async function callGuia(messages: { role: 'system' | 'user'; content: string }[], options: GuiaCallOptions = {}): Promise<{ text: string; modelUsed: string }> {
  const modelsToTry = getModelsToTry(options);

  const errors: string[] = [];
  for (const modelKey of modelsToTry) {
    try {
      const result = await generateChat({
        modelKey,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.2,
        maxTokens: options.maxTokens,
        timeoutMs: options.timeoutMsForModel?.(modelKey) ?? options.timeoutMs,
      });
      return { text: result.text, modelUsed: result.modelUsed };
    } catch (err) {
      errors.push(`${modelKey}: ${err instanceof Error ? err.message : 'erro'}`);
    }
  }
  throw new Error(`GUIÁ: todos os modelos falharam. ${errors.join(' | ')}`);
}

export async function sugerirCriacaoContrato(descricao: string, modelKey?: string): Promise<GuiaResponse<GuiaContractSuggestion>> {
  const preferredModel = modelKey && NIM_MODELS[modelKey] ? modelKey : FAST_CONTRACT_MODEL;
  const localSuggestion = NIM_MODELS[preferredModel]?.thinking === 'none'
    ? tryBuildLocalContractSuggestion(descricao)
    : null;

  if (localSuggestion) {
    return {
      sugestao: localSuggestion,
      raw: JSON.stringify(localSuggestion),
      modelUsed: GUIA_LOCAL_MODEL,
    };
  }

  const systemPrompt = buildFastContractSystemPrompt();
  const contractUserPrompt = descricao.trim();
  const userPrompt = `Descreva o contrato/convênio com base nesta solicitação:\n\n"${descricao}"\n\nPreencha o JSON com todos os campos que conseguir extrair.`;

  let text: string;
  let modelUsed: string;

  try {
    const result = await callGuia([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contractUserPrompt },
    ], {
      preferredModel,
      fallbackModels: [FAST_CONTRACT_MODEL, 'nim-deepseek-v4-flash'],
      temperature: 0.1,
      maxTokens: CONTRACT_MAX_TOKENS,
      timeoutMsForModel: (key) => getTimeoutForModel(key, CONTRACT_TIMEOUT_MS),
    });
    text = result.text;
    modelUsed = result.modelUsed;
  } catch (err) {
    const localSuggestion = tryBuildLocalContractSuggestion(descricao);
    if (localSuggestion) {
      return {
        sugestao: localSuggestion,
        raw: JSON.stringify(localSuggestion),
        modelUsed: GUIA_LOCAL_MODEL,
      };
    }
    throw err;
  }

  const cleaned = cleanJson(text);
  const parsed = JSON.parse(cleaned) as GuiaContractSuggestion;

  return { sugestao: parsed, raw: text, modelUsed };
}

export async function sugerirTermoAditivo(contract: Partial<Contract>, descricao: string, modelKey?: string): Promise<GuiaResponse<GuiaTermoSuggestion>> {
  const systemPrompt = buildFastTermoSystemPrompt(contract);
  const termoUserPrompt = descricao.trim();
  const userPrompt = `Preciso registrar o seguinte:\n\n"${descricao}"\n\nAnalise os dados do contrato e sugira o tipo de termo, valores, e gere a minuta.`;

  const { text, modelUsed } = await callGuia([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: termoUserPrompt },
  ], {
    preferredModel: modelKey,
    fallbackModels: [FAST_TERMO_MODEL, 'nim-deepseek-v4-flash'],
    temperature: 0.2,
    maxTokens: TERMO_MAX_TOKENS,
    timeoutMsForModel: (key) => getTimeoutForModel(key, TERMO_TIMEOUT_MS),
  });

  const cleaned = cleanJson(text);
  const parsed = JSON.parse(cleaned) as GuiaTermoSuggestion;

  return { sugestao: parsed, raw: text, modelUsed };
}
