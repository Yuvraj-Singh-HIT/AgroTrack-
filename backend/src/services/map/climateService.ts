import { z } from "zod";
import { ai } from "../../ai/genkit";
import { geocodeRegion } from "../weather/weatherService";
import { fetchWeatherData } from "./weatherService";
import { analyzeRisks } from "./riskAnalyzer";
import { createRiskReportDocument } from "../../lib/db/riskReports";
import type { MapDataResponse, ClimateRecommendation } from "./mapTypes";

const ClimateRecommendationSchema = z.object({
  cropRecommendations: z.array(z.string()).describe("Specific recommended crops based on conditions"),
  farmingAdvice: z.string().describe("General actionable agricultural advice"),
  irrigationAdvice: z.string().describe("Targeted watering and irrigation instructions"),
  riskMitigation: z.array(z.string()).describe("Concrete steps to mitigate the current climate hazards"),
  fertilizerSuggestions: z.array(z.string()).describe("Chemical or organic fertilizer recommendations"),
  expectedYieldInsights: z.string().describe("Potential yield forecast descriptions"),
});

const ClimateMapPromptInputSchema = z.object({
  location: z.string(),
  weather: z.object({
    temperature: z.number(),
    humidity: z.number(),
    rainfall: z.number(),
    windSpeed: z.number(),
    precipitation: z.number(),
    soilMoisture: z.number(),
  }),
  risks: z.object({
    rainfallScore: z.number(),
    floodRisk: z.number(),
    droughtRisk: z.number(),
    cropSuitability: z.number(),
  }),
});

const mapRecommendationPrompt = ai.definePrompt({
  name: "mapRecommendationPrompt",
  input: { schema: ClimateMapPromptInputSchema },
  output: { schema: ClimateRecommendationSchema },
  prompt: `You are an expert agronomist and AI advisor. Analyze this location, current weather metrics, and mathematical risk scores, and generate structured crop and farming recommendations.

Location: {{{location}}}

Current Weather Metrics:
- Temperature: {{{weather.temperature}}} °C
- Humidity: {{{weather.humidity}}} %
- Rainfall: {{{weather.rainfall}}} mm
- Wind Speed: {{{weather.windSpeed}}} km/h
- Precipitation: {{{weather.precipitation}}} mm
- Soil Moisture: {{{weather.soilMoisture}}} m³/m³

Mathematical Risk Scores (0-100 where higher is worse except suitability which is better):
- Rainfall Intensity: {{{risks.rainfallScore}}}
- Flood Risk: {{{risks.floodRisk}}}
- Drought Risk: {{{risks.droughtRisk}}}
- Crop Suitability Index: {{{risks.cropSuitability}}}

Based on this, generate:
1. cropRecommendations: list of 3-4 specific crops suitable for these conditions.
2. farmingAdvice: actionable general farming advice.
3. irrigationAdvice: customized irrigation advice.
4. riskMitigation: list of concrete steps to mitigate the identified risks.
5. fertilizerSuggestions: fertilizer suggestions.
6. expectedYieldInsights: expected yield insights.
`,
});

/**
 * Runs geocoding, fetches Open-Meteo current variables, calculates risk metrics,
 * prompts Gemini for structured agricultural advice, saves the report to Firestore, and returns results.
 */
export async function getClimateRiskMapData(
  region: string,
  userId: string
): Promise<MapDataResponse> {
  // 1. Geocode location query
  const geo = await geocodeRegion(region);

  // 2. Fetch current weather and soil telemetry
  const weather = await fetchWeatherData(geo.latitude, geo.longitude);

  // 3. Compute mathematical risk scores
  const risks = analyzeRisks(weather);

  // 4. Generate structured AI recommendations using Gemini
  const { output } = await mapRecommendationPrompt({
    location: geo.name,
    weather,
    risks,
  });

  if (!output) {
    throw new Error("Gemini failed to generate map recommendation. Please try again.");
  }

  // 5. Save the report to Firestore/local storage
  await createRiskReportDocument({
    userId,
    location: geo.name,
    latitude: geo.latitude,
    longitude: geo.longitude,
    rainfall: weather.rainfall,
    temperature: weather.temperature,
    floodRisk: risks.floodRisk,
    droughtRisk: risks.droughtRisk,
    cropSuitability: risks.cropSuitability,
    recommendation: JSON.stringify(output),
  });

  return {
    location: `${geo.name}${geo.country ? `, ${geo.country}` : ""}`,
    latitude: geo.latitude,
    longitude: geo.longitude,
    weather,
    risks,
    recommendation: output,
  };
}

/**
 * Directly processes latitude and longitude coordinates (e.g. from Geolocation API).
 */
export async function getClimateRiskMapDataByCoords(
  latitude: number,
  longitude: number,
  userId: string
): Promise<MapDataResponse> {
  const weather = await fetchWeatherData(latitude, longitude);
  const risks = analyzeRisks(weather);

  const locationLabel = `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;

  const { output } = await mapRecommendationPrompt({
    location: locationLabel,
    weather,
    risks,
  });

  if (!output) {
    throw new Error("Gemini failed to generate map recommendation. Please try again.");
  }

  await createRiskReportDocument({
    userId,
    location: locationLabel,
    latitude,
    longitude,
    rainfall: weather.rainfall,
    temperature: weather.temperature,
    floodRisk: risks.floodRisk,
    droughtRisk: risks.droughtRisk,
    cropSuitability: risks.cropSuitability,
    recommendation: JSON.stringify(output),
  });

  return {
    location: locationLabel,
    latitude,
    longitude,
    weather,
    risks,
    recommendation: output,
  };
}
