/**
 * Upstash-based sliding window rate limits for AI server actions.
 * When Upstash env is absent, limits are skipped (local pilot / CI).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let climateLimiter: Ratelimit | null = null;
let plantLimiter: Ratelimit | null = null;
let marketLimiter: Ratelimit | null = null;
let soilLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getClimateLimiter(): Ratelimit | null {
  if (climateLimiter) return climateLimiter;
  const redis = getRedis();
  if (!redis) return null;
  climateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "agro:climate",
  });
  return climateLimiter;
}

function getPlantLimiter(): Ratelimit | null {
  if (plantLimiter) return plantLimiter;
  const redis = getRedis();
  if (!redis) return null;
  plantLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "agro:plant",
  });
  return plantLimiter;
}

function getMarketLimiter(): Ratelimit | null {
  if (marketLimiter) return marketLimiter;
  const redis = getRedis();
  if (!redis) return null;
  marketLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "agro:market",
  });
  return marketLimiter;
}

function getSoilLimiter(): Ratelimit | null {
  if (soilLimiter) return soilLimiter;
  const redis = getRedis();
  if (!redis) return null;
  soilLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "agro:soil",
  });
  return soilLimiter;
}

export type AiRateLimitKind = "climate" | "plant" | "marketplace" | "soil";

export async function assertAiRateLimit(
  userKey: string,
  kind: AiRateLimitKind
): Promise<{ ok: true } | { ok: false; message: string }> {
  const limiter =
    kind === "climate"
      ? getClimateLimiter()
      : kind === "plant"
        ? getPlantLimiter()
        : kind === "soil"
          ? getSoilLimiter()
          : getMarketLimiter();
  if (!limiter) return { ok: true };
  const { success } = await limiter.limit(userKey);
  if (!success) {
    return {
      ok: false,
      message: "Too many AI requests. Please wait a minute and try again.",
    };
  }
  return { ok: true };
}
