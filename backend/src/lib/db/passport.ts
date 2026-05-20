/**
 * Digital farm passport documents (owner-scoped).
 */
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { db } from "../../firebase/server";

const COLLECTION = "farmPassports";

export interface PassportHistoryEntry {
  action: string;
  description: string;
  timestamp: string;
}

export async function createFarmPassport(input: {
  ownerEmail: string;
  crop: string;
  location: string;
  plantDate: string;
  harvestDate: string;
  initialHistory?: { action: string; description: string }[];
}): Promise<string> {
  const passportId = randomUUID();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const now = new Date().toISOString();
  const history: PassportHistoryEntry[] =
    input.initialHistory?.map((h) => ({
      action: h.action,
      description: h.description,
      timestamp: now,
    })) ?? [{ action: "created", description: "Passport issued", timestamp: now }];

  const ref = db.collection(COLLECTION).doc(passportId);
  await ref.set({
    passportId,
    ownerEmail,
    crop: input.crop,
    location: input.location,
    plantDate: input.plantDate,
    harvestDate: input.harvestDate,
    history,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return passportId;
}

export async function appendPassportHistory(
  passportId: string,
  ownerEmail: string,
  entry: { action: string; description: string }
): Promise<void> {
  const ref = db.collection(COLLECTION).doc(passportId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Passport not found");
  const data = snap.data();
  if (data?.ownerEmail !== ownerEmail.trim().toLowerCase()) {
    throw new Error("Forbidden");
  }
  const prev = Array.isArray(data.history) ? (data.history as PassportHistoryEntry[]) : [];
  const next: PassportHistoryEntry[] = [
    ...prev,
    {
      action: entry.action,
      description: entry.description,
      timestamp: new Date().toISOString(),
    },
  ];
  await ref.update({
    history: next,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function listPassportsForOwner(ownerEmail: string): Promise<Record<string, unknown>[]> {
  const email = ownerEmail.trim().toLowerCase();
  const qs = await db.collection(COLLECTION).where("ownerEmail", "==", email).get();
  return qs.docs.map((d) => d.data() as Record<string, unknown>);
}
