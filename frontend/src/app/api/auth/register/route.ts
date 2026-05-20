import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import {
  adminConfigErrorMessage,
  hasAdminCredentials,
  shouldUseLocalAuthStore,
} from "@/firebase/server";
import {
  authUserExists,
  createCredentialsUserProfile,
  setAuthUserPasswordHash,
  userProfileExists,
} from "@backend/lib/db/users";

export async function POST(request: NextRequest) {
  try {
    if (!shouldUseLocalAuthStore() && !hasAdminCredentials()) {
      return NextResponse.json(
        { error: adminConfigErrorMessage() },
        { status: 503 }
      );
    }

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const record = body as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
    const password = typeof record.password === "string" ? record.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const [userExists, authExists] = await Promise.all([
      userProfileExists(email),
      authUserExists(email),
    ]);

    if (userExists || authExists) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);

    await setAuthUserPasswordHash(email, passwordHash);

    await createCredentialsUserProfile({
      email,
      name: name || null,
      role: "farmer",
      provider: "credentials",
    });

    return NextResponse.json(
      { id: email, email, name: name || null },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register]", error);
    const message =
      error instanceof Error && error.message.includes("Could not load the default credentials")
        ? adminConfigErrorMessage()
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
