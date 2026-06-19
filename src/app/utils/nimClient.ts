const NVIDIA_NIM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GLM_API_KEY = '5db66e0702d94e08b680bf7069e60a8d.ojJBQJ8fMeujxKoq';
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// Todos os modelos NIM (DeepSeek, Nemotron) usam GLM por baixo dos panos
const NIM_TO_GLM_MODEL = 'glm-4.7-flash';

export type NIMThinkingLevel = 'none' | 'low' | 'medium' | 'high' | 'max';
export type NIMModelPolicy = 'deepseek-v4' | 'nemotron-ultra';

export interface NIMModelConfig {
  modelId: string;
  thinking: NIMThinkingLevel;
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
  { value: 'low', label: 'Leve', tokens: 'rapido' },
  { value: 'medium', label: 'Medio', tokens: 'eficiente' },
  { value: 'high', label: 'Alto', tokens: 'completo' },
  { value: 'max', label: 'Maximo', tokens: 'DeepSeek' },
];

export const NIM_POLICY_THINKING_LEVELS: Record<NIMModelPolicy, NIMThinkingLevel[]> = {
  'deepseek-v4': ['none', 'low', 'medium', 'high', 'max'],
  'nemotron-ultra': ['none', 'low', 'medium', 'high'],
};

export const NIM_MODEL_GROUPS = [
  {
    family: 'DeepSeek V4 Flash',
    icon: '/img/DeepSeek.svg',
    models: ['nim-deepseek-v4-flash', 'nim-deepseek-v4-flash-think-low', 'nim-deepseek-v4-flash-think-mid', 'nim-deepseek-v4-flash-think-high', 'nim-deepseek-v4-flash-think-max'],
  },
  {
    family: 'DeepSeek V4 Pro',
    icon: '/img/DeepSeek.svg',
    models: ['nim-deepseek-v4-pro', 'nim-deepseek-v4-pro-think-low', 'nim-deepseek-v4-pro-think-mid', 'nim-deepseek-v4-pro-think-high', 'nim-deepseek-v4-pro-think-max'],
  },
  {
    family: 'Nemotron Ultra 550B',
    icon: '/img/NVIDIA.svg',
    models: ['nim-nemotron-ultra-550b', 'nim-nemotron-ultra-550b-think-low', 'nim-nemotron-ultra-550b-think-mid', 'nim-nemotron-ultra-550b-think-high'],
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

export const SANITIZE_SYSTEM_MAX_CHARS = 2500;
export const SANITIZE_USER_MAX_CHARS = 5000;
const BASE64_PATTERN = /^[A-Za-z0-9+/]{50,}={0,2}$/;

export function sanitizeMessages(messages: NIMMessage[]): NIMMessage[] {
  return messages
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => {
      let content = m.content.trim();
      const maxLen = m.role === 'system' ? SANITIZE_SYSTEM_MAX_CHARS : SANITIZE_USER_MAX_CHARS;
      if (content.length > maxLen) {
        content = content.slice(0, maxLen) + `\n\n[... ${content.length - maxLen} caracteres omitidos para performance]`;
      }
      if (BASE64_PATTERN.test(content.slice(0, 60))) {
        content = '[conteudo binario omitido]';
      }
      return { ...m, content };
    });
}

const DEFAULT_NIM_TIMEOUT_MS = 25000;
const NIM_THINKING_BUDGET: Record<NIMThinkingLevel, number | null> = {
  none: null,
  low: 1024,
  medium: 8192,
  high: 32768,
  max: 131072,
};

export const NIM_MODELS: Record<string, NIMModelConfig> = {
  'nim-deepseek-v4-flash': {
    modelId: 'deepseek-ai/deepseek-v4-flash',
    thinking: 'none',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Flash - Sem pensamento',
  },
  'nim-deepseek-v4-flash-think-low': {
    modelId: 'deepseek-ai/deepseek-v4-flash',
    thinking: 'low',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Flash - Pensamento Leve',
  },
  'nim-deepseek-v4-flash-think-mid': {
    modelId: 'deepseek-ai/deepseek-v4-flash',
    thinking: 'medium',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Flash - Pensamento Medio',
  },
  'nim-deepseek-v4-flash-think-high': {
    modelId: 'deepseek-ai/deepseek-v4-flash',
    thinking: 'high',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Flash - Pensamento Alto',
  },
  'nim-deepseek-v4-flash-think-max': {
    modelId: 'deepseek-ai/deepseek-v4-flash',
    thinking: 'max',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Flash - Pensamento Maximo',
  },
  'nim-deepseek-v4-pro': {
    modelId: 'deepseek-ai/deepseek-v4-pro',
    thinking: 'none',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Pro - Sem pensamento',
  },
  'nim-deepseek-v4-pro-think-low': {
    modelId: 'deepseek-ai/deepseek-v4-pro',
    thinking: 'low',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Pro - Pensamento Leve',
  },
  'nim-deepseek-v4-pro-think-mid': {
    modelId: 'deepseek-ai/deepseek-v4-pro',
    thinking: 'medium',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Pro - Pensamento Medio',
  },
  'nim-deepseek-v4-pro-think-high': {
    modelId: 'deepseek-ai/deepseek-v4-pro',
    thinking: 'high',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Pro - Pensamento Alto',
  },
  'nim-deepseek-v4-pro-think-max': {
    modelId: 'deepseek-ai/deepseek-v4-pro',
    thinking: 'max',
    policy: 'deepseek-v4',
    label: 'DeepSeek V4 Pro - Pensamento Maximo',
  },
  'nim-nemotron-ultra-550b': {
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b-nvfp4',
    thinking: 'none',
    policy: 'nemotron-ultra',
    label: 'Nemotron Ultra 550B - Sem pensamento',
  },
  'nim-nemotron-ultra-550b-think-low': {
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b-nvfp4',
    thinking: 'low',
    policy: 'nemotron-ultra',
    label: 'Nemotron Ultra 550B - Pensamento Leve',
  },
  'nim-nemotron-ultra-550b-think-mid': {
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b-nvfp4',
    thinking: 'medium',
    policy: 'nemotron-ultra',
    label: 'Nemotron Ultra 550B - Pensamento Medio',
  },
  'nim-nemotron-ultra-550b-think-high': {
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b-nvfp4',
    thinking: 'high',
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

  const budget = NIM_THINKING_BUDGET[config.thinking];
  if (budget !== null) {
    body.thinking = { type: 'enabled', budget_tokens: budget };
  }

  return body;
}

async function postNim(body: Record<string, unknown>, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(NVIDIA_NIM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (data as { detail?: string; error?: { message?: string } } | null)?.detail ||
      (data as { detail?: string; error?: { message?: string } } | null)?.error?.message ||
      `Erro NIM (${response.status})`
    );
  }

  return data;
}

async function postGLM(body: Record<string, unknown>, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GLM_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (data as { error?: { message?: string } } | null)?.error?.message ||
      `Erro GLM (${response.status})`
    );
  }

  return data;
}

async function callNvidiaNim(options: NIMRequestOptions): Promise<{ content: string; reasoningContent?: string }> {
  const sanitizedMessages = sanitizeMessages(options.messages);
  const body = { model: NIM_TO_GLM_MODEL, messages: sanitizedMessages, stream: false };

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_NIM_TIMEOUT_MS;
  const timeoutId = timeoutMs > 0
    ? setTimeout(() => controller.abort(), timeoutMs)
    : undefined;

  try {
    const data = await postGLM(body, controller.signal);

    const message = (data as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }>; reasoning_content?: string } }> } | null)?.choices?.[0]?.message;
    if (!message?.content) throw new Error('GLM retornou resposta vazia.');
    const content = typeof message.content === 'string' ? message.content : message.content.map((p: { text?: string }) => p?.text || '').join('').trim();
    const reasoningContent = message.reasoning_content || undefined;
    return { content, reasoningContent };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Tempo limite excedido ao consultar o GLM (${Math.round(timeoutMs / 1000)}s).`);
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
