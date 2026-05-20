'use server';

/**
 * @fileOverview An AI agent that matches farmers with potential market participants.
 *
 * - matchWithMarketParticipants - A function that handles the matching process.
 * - MatchWithMarketParticipantsInput - The input type for the matchWithMarketParticipants function.
 * - MatchWithMarketParticipantsOutput - The return type for the matchWithMarketParticipants function.
 */

import {ai} from '../genkit';
import {z} from 'zod';
import { AiExplainabilitySchema } from '../schemas/explainability';

const MatchWithMarketParticipantsInputSchema = z.object({
  farmDetails: z.string().describe('Details about the farm, including location, size, and types of crops grown.'),
  harvestDetails: z.string().describe('Details about the current harvest, including quantity, quality, and any certifications.'),
  priceExpectations: z.string().describe('The farmer’s expectations for pricing and payment terms.'),
  desiredPartners: z.array(z.enum(['buyers', 'suppliers', 'storage units', 'transport providers'])).describe('The types of market participants the farmer is looking for.'),
});
export type MatchWithMarketParticipantsInput = z.infer<typeof MatchWithMarketParticipantsInputSchema>;

const MatchWithMarketParticipantsOutputSchema = z.object({
  matches: z.array(
    z.object({
      type: z.enum(['buyer', 'supplier', 'storage unit', 'transport provider']),
      name: z.string().describe('The name of the potential match.'),
      contactInformation: z.string().describe('Contact information for the potential match.'),
      relevanceScore: z.number().describe('A score indicating how well the match aligns with the farmer’s needs.'),
      details: z.string().describe('Additional details about the match, such as services offered or products needed.'),
    })
  ).describe('A list of potential matches with market participants.'),
  explainability: AiExplainabilitySchema,
});
export type MatchWithMarketParticipantsOutput = z.infer<typeof MatchWithMarketParticipantsOutputSchema>;

export async function matchWithMarketParticipants(input: MatchWithMarketParticipantsInput): Promise<MatchWithMarketParticipantsOutput> {
  return matchWithMarketParticipantsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'matchWithMarketParticipantsPrompt',
  input: {schema: MatchWithMarketParticipantsInputSchema},
  output: {schema: MatchWithMarketParticipantsOutputSchema.omit({ explainability: true })},
  prompt: `You are an AI-powered agricultural marketplace expert, specializing in matching farmers with the most suitable market participants.

  Given the following details about the farmer's farm, harvest, and preferences, identify potential matches from the following categories: buyers, suppliers, storage units, and transport providers.

  Farm Details: {{{farmDetails}}}
  Harvest Details: {{{harvestDetails}}}
  Price Expectations: {{{priceExpectations}}}
  Desired Partners: {{#each desiredPartners}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Provide a list of potential matches, including their name, contact information, a relevance score (out of 100), and any relevant details. The relevance score should reflect how well the match aligns with the farmer's stated needs and preferences.
  Ensure that only the 'type' field is one of the following: buyer, supplier, storage unit, transport provider.
  Return your answer as a JSON object.`,
});

const matchWithMarketParticipantsFlow = ai.defineFlow(
  {
    name: 'matchWithMarketParticipantsFlow',
    inputSchema: MatchWithMarketParticipantsInputSchema,
    outputSchema: MatchWithMarketParticipantsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to find market matches.');
    }
    return {
      ...output,
      explainability: {
        primarySource: 'gemini' as const,
        modelName: 'Gemini 2.5 Flash',
        confidenceBasis: 'Relevance scores are model-estimated from your farm/harvest text, not verified trader databases.',
        evidence: [
          `Desired partners: ${input.desiredPartners.join(', ')}`,
          `Price expectations: ${input.priceExpectations}`,
          `Matches returned: ${output.matches.length}`,
          ...output.matches.slice(0, 3).map(
            (m) => `${m.name} (${m.type}) — relevance ${m.relevanceScore}%`
          ),
        ],
        reasoning:
          'Gemini synthesized plausible marketplace contacts from your description. Confirm all contacts and prices directly before transacting.',
        fallbackUsed: false,
      },
    };
  }
);
