/**
 * Marketplace listings — Firestore scaffolding for future deal persistence.
 * (AI matching remains in Genkit; this module is for pilot transactional data.)
 */
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../firebase/server";

const COLLECTION = "marketplaceListings";

export interface MarketplaceListing {
  id: string;
  ownerEmail: string;
  summary: string;
}

export async function createListingDraft(input: {
  ownerEmail: string;
  summary: string;
}): Promise<string> {
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    id: ref.id,
    ownerEmail: input.ownerEmail.trim().toLowerCase(),
    summary: input.summary,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
