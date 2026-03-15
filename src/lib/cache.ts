// Simple in-memory TTL cache for API responses.
// Prevents identical queries from hitting the database on every page load.

type CacheEntry<T> = { data: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get a value from cache, or compute and store it.
 * @param key   Unique cache key
 * @param ttlMs Time-to-live in milliseconds
 * @param fn    Async function that produces the value
 */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) {
    return entry.data;
  }
  const data = await fn();
  store.set(key, { data, expiresAt: now + ttlMs });
  return data;
}
