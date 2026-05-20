/**
 * Local JSON store for email/password auth when Firebase Admin credentials are unavailable (dev only).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppRole, FirestoreUserProfile } from "../../types/auth";

type AuthUserRecord = {
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type UserRecord = {
  email: string;
  name: string | null;
  role: AppRole;
  provider: string;
  createdAt: string;
  updatedAt: string;
};

type LocalDb = {
  auth_users: Record<string, AuthUserRecord>;
  users: Record<string, UserRecord>;
};

function dataPath(): string {
  const base = process.env.AGROTRACK_DEV_AUTH_DATA_DIR?.trim();
  if (base) return path.join(base, "local-auth.json");
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "backend", ".data", "local-auth.json"),
    path.join(cwd, ".data", "local-auth.json"),
  ];
  return candidates[0];
}

async function readDb(): Promise<LocalDb> {
  try {
    const raw = await readFile(dataPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "auth_users" in parsed &&
      "users" in parsed
    ) {
      return parsed as LocalDb;
    }
  } catch {
    /* first run */
  }
  return { auth_users: {}, users: {} };
}

async function writeDb(db: LocalDb): Promise<void> {
  const file = dataPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(db, null, 2), "utf8");
}

function parseRole(value: unknown): AppRole {
  const r = typeof value === "string" ? value.trim().toLowerCase() : "farmer";
  if (r === "admin" || r === "buyer" || r === "farmer") return r;
  return "farmer";
}

export async function localAuthUserExists(email: string): Promise<boolean> {
  const db = await readDb();
  return Boolean(db.auth_users[email]);
}

export async function localUserExists(email: string): Promise<boolean> {
  const db = await readDb();
  return Boolean(db.users[email]);
}

export async function localGetAuthUser(
  email: string
): Promise<{ passwordHash: string } | null> {
  const db = await readDb();
  const row = db.auth_users[email];
  if (!row?.passwordHash) return null;
  return { passwordHash: row.passwordHash };
}

export async function localSetAuthUser(email: string, passwordHash: string): Promise<void> {
  const db = await readDb();
  const now = new Date().toISOString();
  db.auth_users[email] = {
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };
  await writeDb(db);
}

export async function localGetUserProfile(email: string): Promise<FirestoreUserProfile | null> {
  const db = await readDb();
  const row = db.users[email];
  if (!row) return null;
  return {
    id: email,
    email: row.email,
    name: row.name,
    role: parseRole(row.role),
    provider: row.provider,
    createdAt: null,
    updatedAt: null,
  };
}

export async function localCreateUserProfile(params: {
  email: string;
  name: string | null;
  role: AppRole;
  provider: string;
}): Promise<void> {
  const db = await readDb();
  const now = new Date().toISOString();
  db.users[params.email] = {
    email: params.email,
    name: params.name,
    role: params.role,
    provider: params.provider,
    createdAt: now,
    updatedAt: now,
  };
  await writeDb(db);
}

export async function localMergeOAuthUser(params: {
  email: string;
  name: string | null;
  provider: string;
  defaultRole?: AppRole;
}): Promise<void> {
  const db = await readDb();
  const existing = db.users[params.email];
  const now = new Date().toISOString();
  const role = existing ? parseRole(existing.role) : params.defaultRole ?? "farmer";
  db.users[params.email] = {
    email: params.email,
    name: params.name ?? existing?.name ?? null,
    role,
    provider: params.provider,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await writeDb(db);
}
