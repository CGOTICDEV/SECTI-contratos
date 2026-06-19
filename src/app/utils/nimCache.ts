const CACHE_PREFIX = 'nim_cache_';
const DEFAULT_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  data: string;
  expiry: number;
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getCacheKey(mode: string, messages: { role: string; content: string }[], modelKey: string, temperature?: number): string {
  const stable = JSON.stringify({ mode, messages, modelKey, temperature: temperature ?? 0.2 });
  return stable;
}

export async function getCachedResult(cacheKey: string): Promise<string | null> {
  try {
    const hash = await sha256(cacheKey);
    const stored = localStorage.getItem(CACHE_PREFIX + hash);
    if (!stored) return null;

    const entry: CacheEntry = JSON.parse(stored);
    if (Date.now() > entry.expiry) {
      localStorage.removeItem(CACHE_PREFIX + hash);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export async function setCachedResult(cacheKey: string, data: string, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  try {
    const hash = await sha256(cacheKey);
    const entry: CacheEntry = { data, expiry: Date.now() + ttlMs };
    localStorage.setItem(CACHE_PREFIX + hash, JSON.stringify(entry));
  } catch {
    // cache is best-effort
  }
}

export function clearExpiredCache(): void {
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const entry: CacheEntry = JSON.parse(localStorage.getItem(key) ?? '{}');
          if (now > entry.expiry) localStorage.removeItem(key);
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // best-effort
  }
}

export function clearAllCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // best-effort
  }
}
