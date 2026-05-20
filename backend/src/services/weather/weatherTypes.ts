import { z } from "zod";

/** Open-Meteo geocoding first result (best-effort). */
export const GeocodeResultSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional(),
  admin1: z.string().optional(),
});
export type GeocodeResult = z.infer<typeof GeocodeResultSchema>;

/** Aggregated daily metrics used by climate risk flows. */
export const OpenMeteoForecastBundleSchema = z.object({
  regionQuery: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  forecastDays: z.number(),
  /** Total precipitation (mm) over the window. */
  totalPrecipitationMm: z.number(),
  /** Mean of daily max temperature (°C). */
  meanTempMaxC: z.number(),
  /** Mean of daily min relative humidity (%). */
  meanRelativeHumidityPct: z.number(),
  /** Max wind gust (km/h) observed in window. */
  maxWindGustKmh: z.number(),
  /** Simple drought indicator: days with precip < 0.5mm. */
  dryDays: z.number(),
  /** Heuristic flood risk: days with precip > 40mm. */
  heavyRainDays: z.number(),
  /** Short textual summary for the model. */
  summary: z.string(),
});
export type OpenMeteoForecastBundle = z.infer<typeof OpenMeteoForecastBundleSchema>;
