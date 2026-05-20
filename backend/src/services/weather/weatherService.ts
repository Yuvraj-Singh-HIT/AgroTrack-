/**
 * Open-Meteo HTTP client with timeouts, retries, and typed aggregation.
 * Public API — follow Open-Meteo terms of use for your deployment class.
 */
import { z } from "zod";
import { getCachedWeather, setCachedWeather } from "../../lib/db/weather";
import type { GeocodeResult, OpenMeteoForecastBundle } from "./weatherTypes";
import { GeocodeResultSchema, OpenMeteoForecastBundleSchema } from "./weatherTypes";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 3;

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<unknown> {
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(id);
  }
}

async function withRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = 200 * 2 ** (attempt - 1);
      console.warn(`[weatherService] ${label} attempt ${attempt}/${MAX_RETRIES} failed`, err);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const GeocodeResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      })
    )
    .optional(),
});

const ForecastResponseSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: z.array(z.number().nullable()).optional(),
    precipitation_sum: z.array(z.number().nullable()).optional(),
    relative_humidity_2m_mean: z.array(z.number().nullable()).optional(),
    wind_gusts_10m_max: z.array(z.number().nullable()).optional(),
  }),
});

export async function geocodeRegion(region: string): Promise<GeocodeResult> {
  const q = encodeURIComponent(region.trim());
  const raw = await withRetries("geocode", () =>
    fetchJsonWithTimeout(`${GEOCODE_URL}?name=${q}&count=1&language=en&format=json`)
  );
  const parsed = GeocodeResponseSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.results?.length) {
    throw new Error(`No geocoding results for region: ${region}`);
  }
  return GeocodeResultSchema.parse(parsed.data.results[0]);
}

export async function fetchForecastBundle(
  region: string,
  forecastDays: number
): Promise<OpenMeteoForecastBundle> {
  const geo = await geocodeRegion(region);
  const days = Math.min(90, Math.max(7, Math.round(forecastDays)));
  const params = new URLSearchParams({
    latitude: String(geo.latitude),
    longitude: String(geo.longitude),
    forecast_days: String(days),
    daily: [
      "temperature_2m_max",
      "precipitation_sum",
      "relative_humidity_2m_mean",
      "wind_gusts_10m_max",
    ].join(","),
  });
  const raw = await withRetries("forecast", () =>
    fetchJsonWithTimeout(`${FORECAST_URL}?${params.toString()}`)
  );
  const parsed = ForecastResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Unexpected Open-Meteo forecast response shape");
  }
  const d = parsed.data.daily;
  const n = d.time.length;
  const precip = (d.precipitation_sum ?? []).map((v) => v ?? 0);
  const tmax = (d.temperature_2m_max ?? []).map((v) => v ?? 0);
  const rh = (d.relative_humidity_2m_mean ?? []).map((v) => v ?? 0);
  const gust = (d.wind_gusts_10m_max ?? []).map((v) => v ?? 0);

  const totalPrecipitationMm = precip.reduce((a, b) => a + b, 0);
  const meanTempMaxC = n ? tmax.reduce((a, b) => a + b, 0) / n : 0;
  const meanRelativeHumidityPct = n ? rh.reduce((a, b) => a + b, 0) / n : 0;
  const maxWindGustKmh = gust.length ? Math.max(...gust) : 0;
  const dryDays = precip.filter((p) => p < 0.5).length;
  const heavyRainDays = precip.filter((p) => p > 40).length;

  const summary = [
    `Location: ${geo.name}${geo.country ? `, ${geo.country}` : ""}.`,
    `Window: ${days} days.`,
    `Total rain: ${totalPrecipitationMm.toFixed(1)} mm; dry days: ${dryDays}; heavy rain days: ${heavyRainDays}.`,
    `Mean daily max temp: ${meanTempMaxC.toFixed(1)} °C; mean RH: ${meanRelativeHumidityPct.toFixed(0)} %.`,
    `Max wind gust: ${maxWindGustKmh.toFixed(0)} km/h.`,
  ].join(" ");

  return OpenMeteoForecastBundleSchema.parse({
    regionQuery: region,
    latitude: geo.latitude,
    longitude: geo.longitude,
    forecastDays: days,
    totalPrecipitationMm,
    meanTempMaxC,
    meanRelativeHumidityPct,
    maxWindGustKmh,
    dryDays,
    heavyRainDays,
    summary,
  });
}

const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Returns cached Open-Meteo bundle when fresh; otherwise fetches and persists to Firestore cache.
 */
export async function fetchForecastBundleCached(
  region: string,
  forecastDays: number,
  ttlMs: number = WEATHER_CACHE_TTL_MS
): Promise<OpenMeteoForecastBundle> {
  const key = `weather:${region.trim().toLowerCase()}:${Math.round(forecastDays)}`;
  const hit = await getCachedWeather(key);
  if (hit) {
    const parsed = OpenMeteoForecastBundleSchema.safeParse(hit);
    if (parsed.success) return parsed.data;
  }
  const bundle = await fetchForecastBundle(region, forecastDays);
  await setCachedWeather(key, bundle as unknown as Record<string, unknown>, ttlMs);
  return bundle;
}
