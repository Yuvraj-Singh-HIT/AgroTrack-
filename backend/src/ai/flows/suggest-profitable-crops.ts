'use server';

/**
 * @fileOverview An AI agent that suggests the most profitable crop combinations for a farmer's land.
 *
 * - suggestProfitableCrops - A function that handles the crop suggestion process.
 * - SuggestProfitableCropsInput - The input type for the suggestProfitableCrops function.
 * - SuggestProfitableCropsOutput - The return type for the suggestProfitableCrops function.
 */

import {ai} from '../genkit';
import {z} from 'zod';
import { AiExplainabilitySchema } from '../schemas/explainability';

const SuggestProfitableCropsInputSchema = z.object({
  landArea: z.number().describe('The area of the land in acres.'),
  soilDetails: z.string().describe('Detailed information about the soil composition and properties.'),
  budget: z.number().describe('The total budget available for farming activities in INR.'),
});
export type SuggestProfitableCropsInput = z.infer<typeof SuggestProfitableCropsInputSchema>;

const SuggestProfitableCropsOutputSchema = z.object({
  cropSuggestions: z.array(
    z.object({
      cropName: z.string().describe('The name of the suggested crop.'),
      expectedRoi: z.number().describe('The expected return on investment (ROI) for the crop (percentage).'),
      costBreakdown: z.string().describe('A detailed breakdown of the costs associated with growing the crop.'),
      historicalMarketPriceTrend: z.string().describe('The historical market price trend for the crop.'),
    })
  ).describe('An array of crop suggestions with their expected ROI, cost breakdown, and historical market price trend.'),
  explainability: AiExplainabilitySchema,
});
export type SuggestProfitableCropsOutput = z.infer<typeof SuggestProfitableCropsOutputSchema>;

export async function suggestProfitableCrops(input: SuggestProfitableCropsInput): Promise<SuggestProfitableCropsOutput> {
  return suggestProfitableCropsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestProfitableCropsPrompt',
  input: {schema: SuggestProfitableCropsInputSchema},
  output: {schema: SuggestProfitableCropsOutputSchema.omit({ explainability: true })},
  prompt: `You are an expert agricultural advisor. Based on the farmer's land area, soil details, and budget, suggest the most profitable crop combinations.

Land Area: {{{landArea}}} acres
Soil Details: {{{soilDetails}}}
Budget: {{{budget}}} INR

Provide a list of crop suggestions, including the expected ROI (as a percentage), a detailed cost breakdown, and the historical market price trend for each crop.

Format your output as a JSON array of crop suggestions.

Example:
[
  {
    "cropName": "Wheat",
    "expectedRoi": 25,
    "costBreakdown": "Seeds: ₹10000, Fertilizer: ₹5000, Labor: ₹20000",
    "historicalMarketPriceTrend": "Stable"
  },
  ...
]
`,
});

const suggestProfitableCropsFlow = ai.defineFlow(
  {
    name: 'suggestProfitableCropsFlow',
    inputSchema: SuggestProfitableCropsInputSchema,
    outputSchema: SuggestProfitableCropsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate profit plan.');
    }
    return {
      ...output,
      explainability: {
        primarySource: 'gemini' as const,
        modelName: 'Gemini 2.5 Flash',
        confidenceBasis: 'ROI estimates from stated land area, soil narrative, and budget — not live mandi prices.',
        evidence: [
          `Land area: ${input.landArea} acres`,
          `Budget: ₹${input.budget}`,
          `Soil details: ${input.soilDetails.slice(0, 200)}${input.soilDetails.length > 200 ? '…' : ''}`,
          `Crops evaluated: ${output.cropSuggestions.map((c) => c.cropName).join(', ')}`,
        ],
        reasoning:
          'Gemini ranked crop options using your inputs. Validate ROI against local market rates before planting.',
        fallbackUsed: false,
      },
    };
  }
);
