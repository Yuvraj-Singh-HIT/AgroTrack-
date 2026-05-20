import { z } from "zod";

/**
 * Shared explainability block for all AgroTrack AI features.
 * Surfaces how a prediction was produced so farmers can trust (or question) results.
 */
export const AiExplainabilitySchema = z.object({
  primarySource: z
    .enum(["local_cnn", "open_meteo", "gemini", "hybrid", "rules"])
    .describe("Which system produced the final answer."),
  modelName: z.string().describe("Human-readable model or service name."),
  confidenceBasis: z
    .string()
    .describe("How confidence was calculated (e.g. softmax probability, heuristic bands)."),
  evidence: z
    .array(z.string())
    .describe("Bullet points a farmer can verify (metrics, class labels, weather stats)."),
  reasoning: z
    .string()
    .describe("Short narrative tying evidence to the recommendation."),
  fallbackUsed: z
    .boolean()
    .describe("True when a secondary model (usually Gemini) refined or replaced a low-confidence primary result."),
});

export type AiExplainability = z.infer<typeof AiExplainabilitySchema>;
