/**
 * Route protection for authenticated pilot routes.
 * Unauthenticated users are redirected to `/auth`.
 * Buyers are limited to dashboard, marketplace, and onboarding.
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/climate-risk",
  "/soil-analysis",
  "/marketplace",
  "/plant-doctor",
  "/crop-management",
  "/irrigation",
  "/equipment",
  "/govt-schemes",
  "/profit-planner",
  "/farm-passport",
  "/climate-map",
  "/onboarding",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function buyerAllowed(pathname: string): boolean {
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/marketplace")) return true;
  if (pathname.startsWith("/onboarding")) return true;
  return false;
}

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    if (!isProtectedPath(pathname)) {
      return NextResponse.next();
    }

    const token = req.nextauth.token as { email?: string; role?: string } | null;
    const role = (token?.role ?? "farmer").toLowerCase();
    if (role === "buyer" && !buyerAllowed(pathname)) {
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        if (!isProtectedPath(pathname)) return true;
        if (!token?.email) return false;
        return true;
      },
    },
    pages: { signIn: "/auth" },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json|sw.js|workbox.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
