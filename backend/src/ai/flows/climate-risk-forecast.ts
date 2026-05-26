
'use server';

/**
 * @fileOverview Climate risk forecast: combines Open-Meteo (real weather) with Gemini reasoning.
 * Weather metrics are cached in Firestore (see `lib/db/weather`) and exposed as a Genkit tool
 * in `services/weather/genkitTool.ts` for explorer parity.
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { AiExplainabilitySchema } from '../schemas/explainability';
import { fetchForecastBundleCached, geocodeRegion } from '../../services/weather/weatherService';
import type { OpenMeteoForecastBundle } from '../../services/weather/weatherTypes';

const ClimateRiskForecastInputSchema = z.object({
  region: z.string().describe('The region for which to forecast climate risks.'),
  days: z
    .number()
    .min(7)
    .max(90)
    .describe('The number of days for the forecast (7-90).'),
});
export type ClimateRiskForecastInput = z.infer<typeof ClimateRiskForecastInputSchema>;

const WeatherAlertSchema = z.object({
  alertTitle: z.string().describe('The title of the weather alert.'),
  eventType: z.string().describe('The type of weather event (e.g., COASTAL_FLOOD).'),
  severity: z.string().describe('The severity of the alert (e.g., MINOR, MODERATE, SEVERE).'),
  certainty: z.string().describe('The certainty of the alert (e.g., LIKELY, OBSERVED).'),
  urgency: z.string().describe('The urgency of the alert (e.g., EXPECTED, IMMEDIATE).'),
  description: z.string().describe('A detailed description of the alert.'),
  instruction: z.string().describe('Instructions for what to do in response to the alert.'),
});

const ClimateRiskForecastOutputSchema = z.object({
  pestAttackProbability: z
    .string()
    .describe('The probability of pest attacks in the region.'),
  cropDiseaseOutbreak: z.string().describe('The risk of crop disease outbreak.'),
  waterShortageRisk: z.string().describe('The risk of water shortage.'),
  extremeWeatherRisk: z.string().describe('The risk of extreme weather events.'),
  sustainabilityAnalysis: z.string().describe('A detailed analysis of which crops are suitable for the climate and required soil types or management techniques.'),
  weatherAlerts: z.array(WeatherAlertSchema).optional().describe('A list of active weather alerts for the region.'),
  droughtRiskLevel: z.enum(['Low', 'Medium', 'High']).describe('Drought stress risk level.'),
  rainfallOutlookLevel: z.enum(['Below Normal', 'Normal', 'Above Normal']).describe('Rainfall outlook level.'),
  floodRiskLevel: z.enum(['Low', 'Medium', 'High']).describe('Flood / heavy rain risk level.'),
  cropSuitabilityLevel: z.enum(['Low', 'Medium', 'High']).describe('Overall crop suitability level for current season/forecast period.'),
  latitude: z.number().optional().describe('Latitude of the geocoded region.'),
  longitude: z.number().optional().describe('Longitude of the geocoded region.'),
  explainability: AiExplainabilitySchema,
});
export type ClimateRiskForecastOutput = z.infer<typeof ClimateRiskForecastOutputSchema>;

export async function climateRiskForecast(input: ClimateRiskForecastInput): Promise<ClimateRiskForecastOutput> {
  return climateRiskForecastFlow(input);
}

const PromptInputSchema = ClimateRiskForecastInputSchema.extend({
  weatherContext: z
    .string()
    .describe('JSON or prose summary of Open-Meteo derived metrics for the region and horizon.'),
});

const textGenerationPrompt = ai.definePrompt({
  name: 'climateRiskTextPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: ClimateRiskForecastOutputSchema.pick({
    pestAttackProbability: true,
    cropDiseaseOutbreak: true,
    waterShortageRisk: true,
    extremeWeatherRisk: true,
    sustainabilityAnalysis: true,
    weatherAlerts: true,
    droughtRiskLevel: true,
    rainfallOutlookLevel: true,
    floodRiskLevel: true,
    cropSuitabilityLevel: true,
  })},
  prompt: `You are an AI assistant that forecasts climate risks for farmers using BOTH agronomic expertise and the supplied real-world weather statistics.

The weatherContext block was produced from Open-Meteo (geocoded forecast). You MUST ground your risk narrative in those statistics when they are present (rainfall totals, dry days, heavy rain days, mean max temperature, humidity, wind gusts). If weatherContext states the service was unavailable, say so briefly and give conservative general guidance only.

Then provide a "Sustainability Analysis" that details which crops are suitable given the forecasted conditions, ideal soil types, and soil/water management techniques.

Also synthesize plausible structured weatherAlerts (0–5 items) consistent with the metrics (e.g., drought stress if dryDays is high, flood/waterlogging risk if heavyRainDays is high, wind damage if gusts are high).

Determine the specific risk levels for:
- droughtRiskLevel: 'Low', 'Medium', or 'High' depending on whether there is high temperature and low/no rainfall forecast.
- rainfallOutlookLevel: 'Below Normal', 'Normal', or 'Above Normal' based on total precipitation compared to typical expectations.
- floodRiskLevel: 'Low', 'Medium', or 'High' based on whether heavy rain days or high daily precipitation peaks are present.
- cropSuitabilityLevel: 'Low', 'Medium', or 'High' depending on how favorable the temperature and rainfall pattern is for common crops in this region.

Region: {{{region}}}
Days: {{{days}}}
weatherContext:
{{{weatherContext}}}
`,
});

const climateRiskForecastFlow = ai.defineFlow(
  {
    name: 'climateRiskForecastFlow',
    inputSchema: ClimateRiskForecastInputSchema,
    outputSchema: ClimateRiskForecastOutputSchema,
  },
  async (input) => {
    let weatherContext: string;
    let bundle: OpenMeteoForecastBundle | null = null;
    try {
      bundle = await fetchForecastBundleCached(input.region, input.days);
      weatherContext = JSON.stringify({
        source: 'open-meteo',
        bundle,
      });
    } catch (err) {
      console.error('[climateRiskForecastFlow] Open-Meteo fetch failed', err);
      weatherContext = JSON.stringify({
        source: 'unavailable',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    const {output} = await textGenerationPrompt({ ...input, weatherContext });

    if (!output) {
        throw new Error('Failed to generate the climate risk forecast. Please try again.');
    }

    let latitude: number | undefined = bundle?.latitude;
    let longitude: number | undefined = bundle?.longitude;

    if (!latitude || !longitude) {
      try {
        const geo = await geocodeRegion(input.region);
        latitude = geo.latitude;
        longitude = geo.longitude;
      } catch (geocodeErr) {
        console.error('[climateRiskForecastFlow] geocoding fallback failed', geocodeErr);
      }
    }

    const evidence = bundle
      ? [
          bundle.summary,
          `Total rain ${bundle.totalPrecipitationMm.toFixed(1)} mm over ${bundle.forecastDays} days.`,
          `Dry days: ${bundle.dryDays}, heavy rain days: ${bundle.heavyRainDays}.`,
          `Mean max temp ${bundle.meanTempMaxC.toFixed(1)} °C, mean RH ${bundle.meanRelativeHumidityPct.toFixed(0)}%.`,
        ]
      : ['Open-Meteo data was unavailable; forecast relies on general agronomic knowledge.'];

    return {
      ...output,
      latitude,
      longitude,
      explainability: {
        primarySource: bundle ? ('hybrid' as const) : ('gemini' as const),
        modelName: bundle
          ? 'Open-Meteo forecast + Gemini 2.5 Flash'
          : 'Gemini 2.5 Flash',
        confidenceBasis: bundle
          ? 'Risk narrative grounded in observed precipitation/temperature/humidity statistics for the region.'
          : 'Model estimate without live weather feed.',
        evidence,
        reasoning:
          'AgroTrack fetched public weather statistics first, then Gemini interpreted agronomic risk from those metrics and your region inputs.',
        fallbackUsed: !bundle,
      },
    };
  }
);
