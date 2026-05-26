import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RiskReport } from "../../services/map/mapTypes";

type LocalRiskDb = {
  reports: RiskReport[];
};

function dataPath(): string {
  const base = process.env.AGROTRACK_DEV_AUTH_DATA_DIR?.trim();
  if (base) return path.join(base, "local-risk-reports.json");
  const cwd = process.cwd();
  return path.join(cwd, "backend", ".data", "local-risk-reports.json");
}

async function readDb(): Promise<LocalRiskDb> {
  try {
    const raw = await readFile(dataPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "reports" in parsed) {
      const db = parsed as LocalRiskDb;
      // Convert timestamp strings back to Date objects
      db.reports = db.reports.map(r => ({
        ...r,
        timestamp: new Date(r.timestamp),
      }));
      return db;
    }
  } catch {
    /* empty */
  }
  return { reports: [] };
}

async function writeDb(db: LocalRiskDb): Promise<void> {
  const file = dataPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(db, null, 2), "utf8");
}

export async function localListRiskReports(
  userId: string,
  max = 20
): Promise<RiskReport[]> {
  const db = await readDb();
  return db.reports
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, max);
}

export async function localCreateRiskReport(input: Omit<RiskReport, "id">): Promise<string> {
  const db = await readDb();
  const id = `local_risk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const record: RiskReport = {
    ...input,
    id,
    timestamp: new Date(),
  };
  db.reports.push(record);
  await writeDb(db);
  return id;
}
