import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.join(__dirname, "../backend/.env") });
loadEnv({ path: path.join(__dirname, ".env") });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  experimental: {
    externalDir: true,
  },
  turbopack: {
    resolveAlias: {
      "@/ai": "../backend/src/ai",
      "@/lib/actions": "../backend/src/lib/actions.ts",
      "@/lib/auth": "../backend/src/lib/auth.ts",
      "@/lib/definitions": "../backend/src/lib/definitions.ts",
      "@/firebase/server": "../backend/src/firebase/server.ts",
      "@/firebase/config": "../backend/src/firebase/config.ts",
      "@backend": "../backend/src",
    },
  },
  webpack: process.env.TURBOPACK
    ? undefined
    : (config, { isServer }) => {
        config.resolve = config.resolve ?? {};
        config.resolve.alias = {
          ...(config.resolve.alias as Record<string, string>),
          "@backend": path.resolve(__dirname, "../backend/src"),
        };
        if (!isServer) {
          config.optimization.usedExports = true;
          config.optimization.sideEffects = true;
        }
        return config;
      },

  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self)",
      },
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://*.sentry.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-ancestors 'self';",
      },
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    minimumCacheTTL: 60 * 60 * 24 * 7,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
