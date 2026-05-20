/**
 * Deterministic Firebase Auth UID derived from email.
 * Used with custom tokens so Firestore rules can scope data by `request.auth.uid`
 * without using raw email as the Firebase UID string.
 */
import { createHash } from "node:crypto";

export function firebaseUidFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 28);
}
