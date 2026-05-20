/**
 * Registers the Open-Meteo Genkit tool for discovery in `genkit start` and future prompt wiring.
 */
import { z } from "zod";
import { ai } from "../../ai/genkit";
import { fetchForecastBundleCached } from "./weatherService";
import { OpenMeteoForecastBundleSchema } from "./weatherTypes";

export const openMeteoForecastTool = ai.defineTool(
  {
    name: "openMeteoForecast",
    description:
      "Fetches aggregated Open-Meteo forecast statistics (rainfall, temperature, humidity, wind, drought/heavy-rain heuristics) for a free-text region and horizon in days (7–90).",
    inputSchema: z.object({
      region: z.string().describe("Region or place name to geocode."),
      forecastDays: z.number().min(7).max(90).describe("Forecast horizon in days."),
    }),
    outputSchema: OpenMeteoForecastBundleSchema,
  },
  async (input) => fetchForecastBundleCached(input.region, input.forecastDays)
);
