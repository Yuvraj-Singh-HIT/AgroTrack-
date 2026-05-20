import { initializeApp, getApps, getApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseConfig as clientConfig } from "./config";
import {
  buildAdminAppOptions,
  hasAdminCredentials,
  shouldUseLocalAuthStore,
} from "./credentials";

const firebaseConfig = {
  projectId: clientConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

let app: App;
let initLogged = false;

function initApp(): App {
  if (getApps().length) return getApp();

  const options = buildAdminAppOptions(firebaseConfig);
  app = initializeApp(options);

  if (!initLogged) {
    initLogged = true;
    if (shouldUseLocalAuthStore()) {
      console.info(
        "[firebase] Using local dev auth store (no Admin credentials). " +
          "Set FIREBASE_SERVICE_ACCOUNT_PATH in backend/.env for Firestore + Firebase Auth bridge."
      );
    } else if (!hasAdminCredentials()) {
      console.warn(
        "[firebase] Admin credentials missing — email signup/login may fail in production."
      );
    }
  }

  return app;
}

app = initApp();

export { hasAdminCredentials, shouldUseLocalAuthStore, adminConfigErrorMessage } from "./credentials";

export const auth = getAuth(app);

/** Firestore Admin client — requires credentials (or emulator). Auth uses local store in dev when unset. */
export const db = getFirestore(app);
