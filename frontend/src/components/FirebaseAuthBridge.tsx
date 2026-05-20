"use client";

/**
 * After NextAuth session is established, exchanges a Firebase custom token so
 * Firestore client reads/writes satisfy `request.auth.token.email` rules.
 */
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { auth } from "@/firebase/client";

const MAX_ATTEMPTS = 4;
const RETRY_MS = 1500;

export function FirebaseAuthBridge() {
  const { data: session, status } = useSession();
  const lastEmail = useRef<string | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) {
      lastEmail.current = null;
      attemptRef.current = 0;
      return;
    }

    const email = session.user.email.trim().toLowerCase();
    if (lastEmail.current === email && auth.currentUser) return;

    let cancelled = false;

    const trySignIn = async (attempt: number) => {
      if (cancelled) return;
      try {
        const res = await fetch("/api/auth/firebase-token", { method: "POST" });
        if (cancelled) return;

        if (res.status === 503) {
          // Local dev without Admin SDK — dashboard uses /api/reports instead
          return;
        }

        if (!res.ok) {
          if (attempt < MAX_ATTEMPTS) {
            window.setTimeout(() => void trySignIn(attempt + 1), RETRY_MS);
          }
          return;
        }

        const body = (await res.json()) as { token?: string };
        if (!body.token) return;

        await signInWithCustomToken(auth, body.token);
        lastEmail.current = email;
        attemptRef.current = 0;
      } catch (e) {
        console.error("[FirebaseAuthBridge] custom token sign-in failed", e);
        if (attempt < MAX_ATTEMPTS && !cancelled) {
          window.setTimeout(() => void trySignIn(attempt + 1), RETRY_MS);
        }
      }
    };

    void trySignIn(0);

    return () => {
      cancelled = true;
    };
  }, [session?.user?.email, status]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        lastEmail.current = user.email.trim().toLowerCase();
      }
    });
    return unsub;
  }, []);

  return null;
}
