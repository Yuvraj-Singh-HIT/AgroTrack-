/**
 * Application auth roles and Firestore-aligned user profile types.
 * Roles are stored lowercase in JWT / Firestore for consistency with security rules.
 */
import type { Timestamp, FieldValue } from "firebase-admin/firestore";

export type AppRole = "farmer" | "admin" | "buyer";

export interface FirestoreUserProfile {
  /** Document ID — normalized email (lowercase) */
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
  provider?: string;
  createdAt: Timestamp | FieldValue | null;
  updatedAt?: Timestamp | FieldValue | null;
}

/** Payload written on registration (credentials). */
export interface CreateUserProfileInput {
  email: string;
  name: string | null;
  role: AppRole;
  provider: string;
}
