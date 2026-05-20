/**
 * Farm profile documents used for onboarding and auto-filling forms.
 */
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../firebase/server";

const COLLECTION = "farmProfiles";

export interface FarmProfile {
  id: string;
  ownerEmail: string;
  farmName: string;
  location: string;
  acreage: number;
  cropTypes: string[];
  preferredLanguage: string;
}

export async function upsertFarmProfile(input: {
  ownerEmail: string;
  farmName: string;
  location: string;
  acreage: number;
  cropTypes: string[];
  preferredLanguage: string;
}): Promise<void> {
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ref = db.collection(COLLECTION).doc(ownerEmail);
  const existing = await ref.get();
  await ref.set(
    {
      id: ownerEmail,
      ownerEmail,
      farmName: input.farmName,
      location: input.location,
      acreage: input.acreage,
      cropTypes: input.cropTypes,
      preferredLanguage: input.preferredLanguage,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true }
  );
}

export async function getFarmProfile(ownerEmail: string) {
  const snap = await db.collection(COLLECTION).doc(ownerEmail.trim().toLowerCase()).get();
  return snap.exists ? snap.data() : null;
}
