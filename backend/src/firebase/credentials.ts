import { existsSync, readFileSync } from "node:fs";
import { cert, type AppOptions, type ServiceAccount } from "firebase-admin/app";

function parseServiceAccountJson(raw: string): ServiceAccount {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid service account JSON");
  }
  const p = parsed as {
    project_id?: string;
    projectId?: string;
    client_email?: string;
    clientEmail?: string;
    private_key?: string;
    privateKey?: string;
  };
  return {
    projectId: p.project_id ?? p.projectId ?? "",
    clientEmail: p.client_email ?? p.clientEmail ?? "",
    privateKey: (p.private_key ?? p.privateKey ?? "").replace(/\\n/g, "\n"),
  };
}

export function hasAdminCredentials(): boolean {
  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) return true;
  if (process.env.FIREBASE_ADMIN_CREDENTIALS?.trim()) return true;
  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (filePath && existsSync(filePath)) return true;
  return false;
}

export function shouldUseLocalAuthStore(): boolean {
  if (process.env.AGROTRACK_DEV_AUTH_STORE === "false") return false;
  if (process.env.AGROTRACK_DEV_AUTH_STORE === "true") return true;
  return process.env.NODE_ENV === "development" && !hasAdminCredentials();
}

export function buildAdminAppOptions(base: AppOptions): AppOptions {
  const inline = process.env.FIREBASE_ADMIN_CREDENTIALS?.trim();
  if (inline) {
    return { ...base, credential: cert(parseServiceAccountJson(inline)) };
  }

  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (filePath && existsSync(filePath)) {
    const raw = readFileSync(filePath, "utf8");
    return { ...base, credential: cert(parseServiceAccountJson(raw)) };
  }

  if (process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    return base;
  }

  return base;
}

export function adminConfigErrorMessage(): string {
  return (
    "Firebase Admin is not configured. Add FIREBASE_ADMIN_CREDENTIALS (JSON string) or " +
    "FIREBASE_SERVICE_ACCOUNT_PATH (path to service account .json) in backend/.env. " +
    "Download from Firebase Console → Project Settings → Service accounts → Generate new private key. " +
    "For local-only testing without Firebase, dev mode uses backend/.data/local-auth.json automatically."
  );
}
