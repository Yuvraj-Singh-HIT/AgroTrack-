import { randomUUID } from "node:crypto";
import type { PassportHistoryEntry } from "./passport";

interface LocalPassport {
  passportId: string;
  ownerEmail: string;
  crop: string;
  location: string;
  plantDate: string;
  harvestDate: string;
  history: PassportHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const passportStore = new Map<string, LocalPassport>();

export async function localCreateFarmPassport(input: {
  ownerEmail: string;
  crop: string;
  location: string;
  plantDate: string;
  harvestDate: string;
  initialHistory?: { action: string; description: string }[];
}): Promise<string> {
  const passportId = randomUUID();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const now = new Date();
  
  const history: PassportHistoryEntry[] =
    input.initialHistory?.map((h) => ({
      action: h.action,
      description: h.description,
      timestamp: now.toISOString(),
    })) ?? [{ action: "created", description: "Passport issued", timestamp: now.toISOString() }];

  const record: LocalPassport = {
    passportId,
    ownerEmail,
    crop: input.crop,
    location: input.location,
    plantDate: input.plantDate,
    harvestDate: input.harvestDate,
    history,
    createdAt: now,
    updatedAt: now,
  };

  passportStore.set(passportId, record);
  return passportId;
}

export async function localAppendPassportHistory(
  passportId: string,
  ownerEmail: string,
  entry: { action: string; description: string }
): Promise<void> {
  const record = passportStore.get(passportId);
  if (!record) throw new Error("Passport not found");
  if (record.ownerEmail !== ownerEmail.trim().toLowerCase()) {
    throw new Error("Forbidden");
  }

  record.history.push({
    action: entry.action,
    description: entry.description,
    timestamp: new Date().toISOString(),
  });
  record.updatedAt = new Date();
  passportStore.set(passportId, record);
}

export async function localListPassportsForOwner(ownerEmail: string): Promise<Record<string, unknown>[]> {
  const email = ownerEmail.trim().toLowerCase();
  const results: Record<string, unknown>[] = [];
  
  for (const record of passportStore.values()) {
    if (record.ownerEmail === email) {
      // Return plain object simulating Firestore doc.data()
      results.push({
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      });
    }
  }
  
  return results.sort((a, b) => {
    return new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime();
  });
}
