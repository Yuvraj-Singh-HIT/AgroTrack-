/**
 * Firestore access helpers for `users` documents (email as document ID).
 */
import { FieldValue } from "firebase-admin/firestore";
import { db, shouldUseLocalAuthStore } from "../../firebase/server";
import type { AppRole, CreateUserProfileInput, FirestoreUserProfile } from "../../types/auth";
import * as local from "./localAuthStore";

const COLLECTION = "users";

function parseRole(value: unknown): AppRole {
  const r = typeof value === "string" ? value.trim().toLowerCase() : "farmer";
  if (r === "admin" || r === "buyer" || r === "farmer") return r;
  return "farmer";
}

export async function getUserProfileByEmail(email: string): Promise<FirestoreUserProfile | null> {
  const docId = email.trim().toLowerCase();
  if (shouldUseLocalAuthStore()) {
    return local.localGetUserProfile(docId);
  }

  const snap = await db.collection(COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data || typeof data.email !== "string") return null;
  return {
    id: snap.id,
    email: data.email,
    name: typeof data.name === "string" ? data.name : null,
    role: parseRole(data.role),
    provider: typeof data.provider === "string" ? data.provider : undefined,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt,
  };
}

export async function createCredentialsUserProfile(input: CreateUserProfileInput): Promise<void> {
  const docId = input.email.trim().toLowerCase();
  if (shouldUseLocalAuthStore()) {
    await local.localCreateUserProfile({
      email: docId,
      name: input.name,
      role: input.role,
      provider: input.provider,
    });
    return;
  }

  const ref = db.collection(COLLECTION).doc(docId);
  await ref.set({
    email: docId,
    name: input.name,
    provider: input.provider,
    role: input.role,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function mergeOAuthUserProfile(params: {
  email: string;
  name: string | null;
  provider: string;
  defaultRole?: AppRole;
}): Promise<void> {
  const docId = params.email.trim().toLowerCase();
  if (shouldUseLocalAuthStore()) {
    await local.localMergeOAuthUser({
      email: docId,
      name: params.name,
      provider: params.provider,
      defaultRole: params.defaultRole,
    });
    return;
  }

  const ref = db.collection(COLLECTION).doc(docId);
  const existing = await ref.get();
  const role: AppRole = existing.exists
    ? parseRole(existing.data()?.role)
    : params.defaultRole ?? "farmer";

  await ref.set(
    {
      email: docId,
      name: params.name,
      provider: params.provider,
      role,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists
        ? {}
        : {
            createdAt: FieldValue.serverTimestamp(),
          }),
    },
    { merge: true }
  );
}

export async function authUserExists(email: string): Promise<boolean> {
  const docId = email.trim().toLowerCase();
  if (shouldUseLocalAuthStore()) {
    return local.localAuthUserExists(docId);
  }
  const snap = await db.collection("auth_users").doc(docId).get();
  return snap.exists;
}

export async function userProfileExists(email: string): Promise<boolean> {
  const docId = email.trim().toLowerCase();
  if (shouldUseLocalAuthStore()) {
    return local.localUserExists(docId);
  }
  const snap = await db.collection(COLLECTION).doc(docId).get();
  return snap.exists;
}

export async function getAuthUserPasswordHash(email: string): Promise<string | null> {
  const docId = email.trim().toLowerCase();
  if (shouldUseLocalAuthStore()) {
    const row = await local.localGetAuthUser(docId);
    return row?.passwordHash ?? null;
  }
  const snap = await db.collection("auth_users").doc(docId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  const hash = data?.passwordHash;
  return typeof hash === "string" ? hash : null;
}

export async function setAuthUserPasswordHash(email: string, passwordHash: string): Promise<void> {
  const docId = email.trim().toLowerCase();
  if (shouldUseLocalAuthStore()) {
    await local.localSetAuthUser(docId, passwordHash);
    return;
  }
  await db.collection("auth_users").doc(docId).set({
    email: docId,
    passwordHash,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
