/**
 * Firestore helpers for user-generated reports (top-level `reports` collection).
 */
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { db, shouldUseLocalAuthStore } from "../../firebase/server";
import * as local from "./localReportsStore";

export type ReportType =
  | "Climate Risk"
  | "Soil Analysis"
  | "Profit Planner"
  | "Plant Diagnosis"
  | "Irrigation"
  | "Crop Management";

export interface CreateReportInput {
  ownerEmail: string;
  title: string;
  type: ReportType;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: "pending" | "processing" | "completed" | "failed";
}

export type ServerReportRecord = {
  id: string;
  ownerId: string;
  ownerEmail: string;
  title: string;
  type: ReportType;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    typeof (value as { _seconds: unknown })._seconds === "number"
  ) {
    return new Date((value as { _seconds: number })._seconds * 1000).toISOString();
  }
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function mapDoc(id: string, data: DocumentData): ServerReportRecord {
  return {
    id: typeof data.id === "string" ? data.id : id,
    ownerId: String(data.ownerId ?? data.ownerEmail ?? ""),
    ownerEmail: String(data.ownerEmail ?? "").toLowerCase(),
    title: String(data.title ?? ""),
    type: data.type as ReportType,
    content: (data.content as Record<string, unknown>) ?? {},
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    status: String(data.status ?? "completed"),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt ?? data.createdAt),
  };
}

/**
 * Persists a report with owner scoping for production Firestore rules.
 */
export async function createReportDocument(input: CreateReportInput): Promise<string> {
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  if (shouldUseLocalAuthStore()) {
    return local.localCreateReport(input);
  }

  const col = db.collection("reports");
  const ref = col.doc();
  const payload: Record<string, unknown> = {
    id: ref.id,
    ownerId: ownerEmail,
    ownerEmail,
    title: input.title.trim(),
    type: input.type,
    content: input.content ?? {},
    metadata: input.metadata ?? {},
    status: input.status ?? "completed",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  return ref.id;
}

export async function listReportsByOwner(
  ownerEmail: string,
  max = 20
): Promise<ServerReportRecord[]> {
  const email = ownerEmail.trim().toLowerCase();
  if (!email) return [];

  if (shouldUseLocalAuthStore()) {
    return local.localListReports(email, max);
  }

  const qs = await db
    .collection("reports")
    .where("ownerEmail", "==", email)
    .orderBy("createdAt", "desc")
    .limit(max)
    .get();

  return qs.docs.map((doc) => mapDoc(doc.id, doc.data()));
}
