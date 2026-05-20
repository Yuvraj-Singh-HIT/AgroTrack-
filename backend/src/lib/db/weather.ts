import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../firebase/server";

const COLLECTION = "weatherCache";

export async function getCachedWeather(cacheKey: string): Promise<Record<string, unknown> | null> {
  const snap = await db.collection(COLLECTION).doc(cacheKey).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data?.payload) return null;
  const exp = data.expiresAt as Timestamp | undefined;
  if (exp && exp.toMillis() < Date.now()) return null;
  return data.payload as Record<string, unknown>;
}

export async function setCachedWeather(
  cacheKey: string,
  payload: Record<string, unknown>,
  ttlMs: number
): Promise<void> {
  const ref = db.collection(COLLECTION).doc(cacheKey);
  await ref.set({
    cacheKey,
    payload,
    expiresAt: Timestamp.fromMillis(Date.now() + ttlMs),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
