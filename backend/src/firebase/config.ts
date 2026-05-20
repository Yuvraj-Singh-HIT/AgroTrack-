/**
 * Firebase web client configuration — prefers environment variables.
 * Fallback values support local builds when `.env` is incomplete (override in production).
 */
export const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyATzvAI9zFbfJiB75QD2uyj0e1J8jm2WPY",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "studio-3272999438-bf5be.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "studio-3272999438-bf5be",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "studio-3272999438-bf5be.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "453222078354",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:453222078354:web:859d1baa87e74f934a134b",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};
