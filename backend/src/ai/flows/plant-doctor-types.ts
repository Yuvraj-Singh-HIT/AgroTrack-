/**
 * Plant Doctor types (no "use server" — safe for client type imports).
 */
import { z } from "zod";
import { AiExplainabilitySchema } from "../schemas/explainability";

export const DiagnosePlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});

export const PlantDoctorReportSchema = z.object({
  summary: z.string(),
  diseaseOverview: z.string(),
  symptomsAndSigns: z.array(z.string()),
  immediateActions: z.array(z.string()),
  treatmentSteps: z.array(
    z.object({
      stepNumber: z.number(),
      title: z.string(),
      instruction: z.string(),
    })
  ),
  fertilizerAndTreatment: z.string(),
  preventiveMeasures: z.array(z.string()),
  precautionsAndSafety: z.array(z.string()),
  recoveryTimeline: z.string(),
  whenToConsultExpert: z.string(),
});

export const DiagnosePlantCoreSchema = z.object({
  plantName: z.string(),
  disease: z.string(),
  confidenceScore: z.number(),
  report: PlantDoctorReportSchema,
});

export const DiagnosePlantOutputSchema = DiagnosePlantCoreSchema.extend({
  recommendedFertilizer: z.string(),
  preventiveMeasures: z.string(),
  explainability: AiExplainabilitySchema,
});

export type DiagnosePlantInput = z.infer<typeof DiagnosePlantInputSchema>;
export type PlantDoctorReport = z.infer<typeof PlantDoctorReportSchema>;
export type DiagnosePlantOutput = z.infer<typeof DiagnosePlantOutputSchema>;
