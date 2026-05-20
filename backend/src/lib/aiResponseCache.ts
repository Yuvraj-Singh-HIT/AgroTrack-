/**
 * In-process TTL cache for expensive AI responses (per server instance).
 * Complements Firestore weather cache; use short TTL for personalized outputs.
 */
import { createHash } from "node:crypto";

type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();

export function stableCacheKey(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function getMemoryCache<T>(key: string): T | null {
  const row = store.get(key);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return row.value as T;
}

export function setMemoryCache(key: string, value: unknown, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
