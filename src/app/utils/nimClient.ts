const NVIDIA_NIM_URL = '/api/nim/v1/chat/completions';
const NVIDIA_NIM_PROD_URL = '/.netlify/functions/nim-proxy';
const IS_PRODUCTION = import.meta.env.PROD;

export type NIMThinkingLevel = 'none' | 'medium' | 'high' | 'max';
export type NIMModelPolicy = 'deepseek-v4' | 'nemotron-ultra';

export interface NIMModelConfig {
  modelId: string;
  thinking: NIMThinkingLevel;
  reasoningEffort: NIMThinkingLevel;
  reasoningBudget?: number;
  policy: NIMModelPolicy;
  label: string;
}

export interface NIMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NIMRequestOptions {
  modelKey: string;
  messages: NIMMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface NIMResponse {
  text: string;
  modelUsed: string;
  thinking?: NIMThinkingLevel;
  reasoningContent?: string;
}

export const NIM_THINKING_LEVELS: { value: NIMThinkingLevel; label: string; tokens: string }[] = [
  { value: 'none', label: 'Sem', tokens: 'desativado' },
  { value: 'medium', label: 'Medio', tokens: 'eficiente' },
  { value: 'high', label: 'Alto', tokens: 'completo' },
  { value: 'max', label: 'Maximo', tokens: 'DeepSeek' },
];

export const NIM_POLICY_THINKING_LEVELS: Record<NIMModelPolicy, NIMThinkingLevel[]> = {
  'deepseek-v4': ['none', 'high', 'max'],
  'nemotron-ultra': ['none', 'medium', 'high'],
};

export const NIM_MODEL_GROUPS = [
  {
    family: 'DeepSeek V4 Flash',
    icon: '/img/DeepSeek.svg',
    models: ['nim-deepseek-v4-flash', 'nim-deepseek-v4-flash-think-high', 'nim-deepseek-v4-flash-think-max'],
  },
  {
    family: 'DeepSeek V4 Pro',
    icon: '/img/DeepSeek.svg',
    models: ['nim-deepseek-v4-pro', 'nim-deepseek-v4-pro-think-high', 'nim-deepseek-v4-pro-think-max'],
  },
  {
    family: 'Nemotron Ultra 550B',
    icon: '/img/NVIDIA.svg',
    models: ['nim-nemotron-ultra-550b', 'nim-nemotron-ultra-550b-think-mid', 'nim-nemotron-ultra-550b-think-high'],
  },
];

export function getModelIcon(modelKey: string): string {
  if (modelKey.startsWith('nim-deepseek')) return '/img/DeepSeek.svg';
  if (modelKey.startsWith('nim-nemotron')) return '/img/NVIDIA.svg';
  return '/img/NVIDIA.svg';
}

export function getModelFamily(modelKey: string): string {
  if (modelKey.startsWith('nim-deepseek-v4-flash')) return 'DeepSeek V4 Flash';
  if (modelKey.startsWith('nim-deepseek-v4-pro')) return 'DeepSeek V4 Pro';
  if (modelKey.startsWith('nim-nemotron')) return 'Nemotron Ultra 550B';
  return '';
}

export function thinkingToKeySuffix(level: NIMThinkingLevel): string {
  if (level === 'medium') return 'mid';
  if (level === 'none') return '';
  return level;
}

const DEFAULT_NIM_TIMEOUT_MS = 25000;

export const NIM_MODELS: Record<string, NIMModelConfig> = {
  'nim-deepseek-v4-flash': {
    modelId: 'deepseek-ai/deepseek-v4-flash',
    thinking: 'none',
    reasoningEffort: 'none',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Flash - Sem pensamento',
  },
  'nim-deepseek-v4-flash-think-high': {
    modelId: 'deepseek-ai/deepseek-v4-flash',
    thinking: 'high',
    reasoningEffort: 'high',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Flash - Pensamento Alto',
  },
  'nim-deepseek-v4-flash-think-max': {
    modelId: 'deepseek-ai/deepseek-v4-flash',
    thinking: 'max',
    reasoningEffort: 'max',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Flash - Pensamento Maximo',
  },
  'nim-deepseek-v4-pro': {
    modelId: 'deepseek-ai/deepseek-v4-pro',
    thinking: 'none',
    reasoningEffort: 'none',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Pro - Sem pensamento',
  },
  'nim-deepseek-v4-pro-think-high': {
    modelId: 'deepseek-ai/deepseek-v4-pro',
    thinking: 'high',
    reasoningEffort: 'high',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Pro - Pensamento Alto',
  },
  'nim-deepseek-v4-pro-think-max': {
    modelId: 'deepseek-ai/deepseek-v4-pro',
    thinking: 'max',
    reasoningEffort: 'max',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Pro - Pensamento Maximo',
  },
  'nim-nemotron-ultra-550b': {
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b',
    thinking: 'none',
    reasoningEffort: 'none',
    policy: 'nemotron-ultra',
    label: 'Nemotron Ultra 550B - Sem pensamento',
  },
  'nim-nemotron-ultra-550b-think-mid': {
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b',
    thinking: 'medium',
    reasoningEffort: 'medium',
    reasoningBudget: 8192,
    policy: 'nemotron-ultra',
    label: 'Nemotron Ultra 550B - Pensamento Medio',
  },
  'nim-nemotron-ultra-550b-think-high': {
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b',
    thinking: 'high',
    reasoningEffort: 'high',
    reasoningBudget: 16384,
    policy: 'nemotron-ultra',
    label: 'Nemotron Ultra 550B - Pensamento Alto',
  },
};

function getApiKey(): string {
  const key = import.meta.env.VITE_NVIDIA_NIM_API_KEY as string | undefined;
  if (!key) {
    throw new Error('VITE_NVIDIA_NIM_API_KEY nao configurada. Crie um arquivo .env com VITE_NVIDIA_NIM_API_KEY=sua-chave');
  }
  return key;
}

export function isNimModelKey(key: string): boolean {
  return key.startsWith('nim-');
}

export function getAvailableModels(): string[] {
  return Object.keys(NIM_MODELS);
}

export function getModelConfig(modelKey: string): NIMModelConfig | undefined {
  return NIM_MODELS[modelKey];
}

export function getSupportedThinkingLevelsForModelKey(modelKey: string): NIMThinkingLevel[] {
  const config = NIM_MODELS[modelKey];
  if (!config) return [];
  return NIM_POLICY_THINKING_LEVELS[config.policy];
}

function buildNimBody(config: NIMModelConfig, options: NIMRequestOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: config.modelId,
    messages: options.messages,
    stream: false,
  };

  if (config.reasoningEffort !== 'none') {
    body.reasoning_effort = config.reasoningEffort;
    body.chat_template_kwargs = { thinking: true };
  }

  if (config.policy === 'deepseek-v4') {
    body.temperature = options.temperature ?? 1;
    body.top_p = 0.95;
  } else {
    body.temperature = options.temperature ?? 0.2;
    if (config.reasoningBudget !== undefined) {
      body.reasoning_budget = config.reasoningBudget;
    }
  }

  if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;

  return body;
}

async function callNvidiaNim(options: NIMRequestOptions): Promise<{ content: string; reasoningContent?: string }> {
  const config = NIM_MODELS[options.modelKey];
  if (!config) throw new Error(`Modelo NIM nao encontrado: ${options.modelKey}`);

  const url = IS_PRODUCTION ? NVIDIA_NIM_PROD_URL : NVIDIA_NIM_URL;
  const body = buildNimBody(config, options);

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_NIM_TIMEOUT_MS;
  const timeoutId = timeoutMs > 0
    ? setTimeout(() => controller.abort(), timeoutMs)
    : undefined;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (!IS_PRODUCTION) {
      headers.Authorization = `Bearer ${getApiKey()}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.error?.message || `Erro NIM (${response.status})`);
    }

    const message = data?.choices?.[0]?.message;
    if (!message?.content) throw new Error('NVIDIA NIM retornou resposta vazia.');
    const content = typeof message.content === 'string' ? message.content : message.content.map((p: { text?: string }) => p?.text || '').join('').trim();
    const reasoningContent = message.reasoning_content || undefined;
    return { content, reasoningContent };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Tempo limite excedido ao consultar o NIM (${Math.round(timeoutMs / 1000)}s).`);
    }
    throw err;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function generateChat(options: NIMRequestOptions): Promise<NIMResponse> {
  const { content, reasoningContent } = await callNvidiaNim(options);
  return { text: content, modelUsed: options.modelKey, thinking: NIM_MODELS[options.modelKey]?.thinking, reasoningContent };
}

export async function generateChatWithFallback(modelKeys: string[], buildMessages: (modelKey: string) => NIMMessage[], options?: { temperature?: number; maxTokens?: number; timeoutMs?: number }): Promise<NIMResponse> {
  const errors: string[] = [];
  for (const modelKey of modelKeys) {
    try {
      const { content, reasoningContent } = await callNvidiaNim({
        modelKey,
        messages: buildMessages(modelKey),
        ...options,
      });
      return { text: content, modelUsed: modelKey, thinking: NIM_MODELS[modelKey]?.thinking, reasoningContent };
    } catch (err) {
      errors.push(`${modelKey}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  }
  throw new Error(`Falha em todos os modelos NIM. ${errors.join(' | ')}`);
}
