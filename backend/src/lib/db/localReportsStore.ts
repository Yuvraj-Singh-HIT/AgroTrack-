import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CreateReportInput, ReportType } from "./reports";

export type LocalReportRecord = {
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

type LocalReportsDb = {
  reports: LocalReportRecord[];
};

function dataPath(): string {
  const base = process.env.AGROTRACK_DEV_AUTH_DATA_DIR?.trim();
  if (base) return path.join(base, "local-reports.json");
  const cwd = process.cwd();
  return path.join(cwd, "backend", ".data", "local-reports.json");
}

async function readDb(): Promise<LocalReportsDb> {
  try {
    const raw = await readFile(dataPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "reports" in parsed) {
      return parsed as LocalReportsDb;
    }
  } catch {
    /* empty */
  }
  return { reports: [] };
}

async function writeDb(db: LocalReportsDb): Promise<void> {
  const file = dataPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(db, null, 2), "utf8");
}

export async function localListReports(
  ownerEmail: string,
  max = 20
): Promise<LocalReportRecord[]> {
  const db = await readDb();
  return db.reports
    .filter((r) => r.ownerEmail === ownerEmail)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, max);
}

export async function localCreateReport(input: CreateReportInput): Promise<string> {
  const db = await readDb();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const record: LocalReportRecord = {
    id,
    ownerId: ownerEmail,
    ownerEmail,
    title: input.title.trim(),
    type: input.type,
    content: input.content ?? {},
    metadata: input.metadata ?? {},
    status: input.status ?? "completed",
    createdAt: now,
    updatedAt: now,
  };
  db.reports.push(record);
  await writeDb(db);
  return id;
}
