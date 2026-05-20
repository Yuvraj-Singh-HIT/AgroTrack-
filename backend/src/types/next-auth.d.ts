import type { DefaultSession } from "next-auth";
import type { AppRole } from "./auth";

declare module "next-auth" {
  interface Session {
    user: {
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string;
    role?: AppRole;
    name?: string | null;
  }
}
