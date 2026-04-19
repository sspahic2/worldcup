/**
 * Cache abstraction layer.
 *
 * Currently uses in-memory Map. Swap this file's export for a Redis
 * implementation later — the interface stays the same.
 */

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
}

// ── In-memory implementation ──────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache implements CacheStore {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async flush(): Promise<void> {
    this.store.clear();
  }
}

// Singleton — lives for the lifetime of the server process.
// In a serverless env each cold start gets a fresh cache, which is fine.
let instance: CacheStore | null = null;

export function getCache(): CacheStore {
  if (!instance) {
    instance = new MemoryCache();
  }
  return instance;
}
