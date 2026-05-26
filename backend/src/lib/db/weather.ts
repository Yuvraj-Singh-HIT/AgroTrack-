import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../firebase/server";
import { shouldUseLocalAuthStore } from "../../firebase/credentials";

const COLLECTION = "weatherCache";

async function safeGetCachedWeather(cacheKey: string): Promise<Record<string, unknown> | null> {
  if (shouldUseLocalAuthStore()) return null;
  try {
    const snap = await db.collection(COLLECTION).doc(cacheKey).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (!data?.payload) return null;
    const exp = data.expiresAt as Timestamp | undefined;
    if (exp && exp.toMillis() < Date.now()) return null;
    return data.payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function safeSetCachedWeather(
  cacheKey: string,
  payload: Record<string, unknown>,
  ttlMs: number
): Promise<void> {
  if (shouldUseLocalAuthStore()) return;
  try {
    const ref = db.collection(COLLECTION).doc(cacheKey);
    await ref.set({
      cacheKey,
      payload,
      expiresAt: Timestamp.fromMillis(Date.now() + ttlMs),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    /* ignore in dev mode */
  }
}

export const getCachedWeather = safeGetCachedWeather;
export const setCachedWeather = safeSetCachedWeather;
