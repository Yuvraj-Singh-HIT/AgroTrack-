import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Profile, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { compare } from "bcryptjs";
import {
  getAuthUserPasswordHash,
  getUserProfileByEmail,
  mergeOAuthUserProfile,
} from "./db/users";
import type { AppRole } from "../types/auth";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function readGoogleEmail(profile: Profile | undefined): string | undefined {
  if (!profile || typeof profile !== "object") return undefined;
  const email = (profile as { email?: unknown }).email;
  return typeof email === "string" ? email.trim().toLowerCase() : undefined;
}

function readUserEmail(user: User | undefined): string | undefined {
  if (!user || typeof user.email !== "string") return undefined;
  return user.email.trim().toLowerCase();
}

async function hydrateJwtFromEmail(token: JWT, email: string): Promise<JWT> {
  const profile = await getUserProfileByEmail(email);
  const role: AppRole = profile?.role ?? "farmer";
  return {
    ...token,
    email,
    role,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!isNonEmptyString(credentials?.email) || !isNonEmptyString(credentials?.password)) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const passwordHash = await getAuthUserPasswordHash(email);
        if (!passwordHash) {
          return null;
        }

        const isValid = await compare(credentials.password, passwordHash);
        if (!isValid) {
          return null;
        }

        const profile = await getUserProfileByEmail(email);
        const name = profile?.name ?? undefined;

        return {
          id: email,
          name,
          email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, account, profile, user }): Promise<JWT> {
      if (account?.provider === "google" && profile) {
        const email = readGoogleEmail(profile);
        if (email) {
          return hydrateJwtFromEmail(token, email);
        }
      }

      if (user) {
        const email = readUserEmail(user);
        if (email) {
          return hydrateJwtFromEmail(token, email);
        }
      }

      if (isNonEmptyString(token.email)) {
        return hydrateJwtFromEmail(token, token.email);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name ?? session.user.name;
        if (isNonEmptyString(token.email)) {
          session.user.email = token.email;
        }
        if (isNonEmptyString(token.role)) {
          session.user.role = token.role;
        }
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      const provider = account?.provider;
      const emailFromProfile = readGoogleEmail(profile);
      const emailFromUser = readUserEmail(user);
      const email = (emailFromProfile ?? emailFromUser ?? "").trim().toLowerCase();
      const nameFromProfile =
        profile && typeof profile === "object" && "name" in profile && typeof (profile as { name?: unknown }).name === "string"
          ? String((profile as { name: string }).name).trim()
          : undefined;
      const nameFromUser = typeof user?.name === "string" ? user.name.trim() : "";
      const name = nameFromProfile || nameFromUser || null;

      if (!provider || !email) return;

      await mergeOAuthUserProfile({
        email,
        name,
        provider,
        defaultRole: "farmer",
      });
    },
  },
};
