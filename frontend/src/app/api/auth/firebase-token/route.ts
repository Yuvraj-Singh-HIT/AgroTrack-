import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { auth as adminAuth } from "@/firebase/server";
import {
  adminConfigErrorMessage,
  hasAdminCredentials,
  shouldUseLocalAuthStore,
} from "@/firebase/server";
import { firebaseUidFromEmail } from "@backend/lib/ids/firebaseUid";
import { getUserProfileByEmail } from "@backend/lib/db/users";

/**
 * Issues a Firebase custom token so the browser Firestore SDK runs under `request.auth`
 * matching production security rules.
 */
export async function POST() {
  try {
    if (shouldUseLocalAuthStore() || !hasAdminCredentials()) {
      return NextResponse.json(
        {
          error: "Firebase client sync unavailable in local auth mode",
          localAuth: true,
          hint: adminConfigErrorMessage(),
        },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfileByEmail(email);
    const role = profile?.role ?? "farmer";
    const uid = firebaseUidFromEmail(email);

    const token = await adminAuth.createCustomToken(uid, {
      email,
      role,
    });

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[firebase-token]", err);
    return NextResponse.json({ error: "Token mint failed" }, { status: 500 });
  }
}
