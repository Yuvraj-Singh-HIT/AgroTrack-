/**
 * Plant Doctor flow implementation (no "use server").
 */
import { ai } from "../genkit";
import { z } from "zod";
import { AiExplainabilitySchema } from "../schemas/explainability";
import { runPlantDiseaseCnn, type MlPlantPrediction } from "../../services/plantDisease/mlPredictor";
import {
  DiagnosePlantInputSchema,
  DiagnosePlantOutputSchema,
  DiagnosePlantCoreSchema,
  PlantDoctorReportSchema,
  type DiagnosePlantInput,
  type DiagnosePlantOutput,
  type PlantDoctorReport,
} from "./plant-doctor-types";

const enrichReportPrompt = ai.definePrompt({
  name: "enrichPlantDoctorReport",
  input: {
    schema: z.object({
      photoDataUri: z.string(),
      plantName: z.string(),
      disease: z.string(),
      confidenceScore: z.number(),
      cnnClassLabel: z.string(),
      catalogDescription: z.string(),
      catalogPrevention: z.string(),
      catalogTreatment: z.string(),
    }),
  },
  output: { schema: PlantDoctorReportSchema },
  prompt: `You are an expert agronomist writing a complete Plant Doctor report for a smallholder farmer in India.

The local CNN already diagnosed the plant (use as strong prior — verify against the image and correct only if clearly wrong).

Diagnosis:
- Plant: {{{plantName}}}
- Disease/condition: {{{disease}}}
- CNN confidence: {{{confidenceScore}}}%
- CNN class: {{{cnnClassLabel}}}

Reference catalog (from training data — expand into actionable guidance):
- Description: {{{catalogDescription}}}
- Catalog prevention notes: {{{catalogPrevention}}}
- Catalog treatment/supplement: {{{catalogTreatment}}}

Using the image {{{media url=photoDataUri}}} and the diagnosis above, write a thorough, practical report.

If the plant is Healthy, focus on maintenance, monitoring, and prevention — still fill all sections appropriately.

Requirements:
- Use simple language; be specific (spacing, irrigation, fungicide types, timing).
- treatmentSteps: at least 4 numbered steps when diseased; at least 2 when healthy.
- immediateActions: 3–5 bullets.
- precautionsAndSafety: include PPE, withholding periods, and avoid harmful practices.
- Do not invent brand names unless common in India; prefer generic active ingredients when suggesting chemicals.
- If uncertain about dosage, say "consult local label / agronomist".

Return only the structured JSON report.`,
});

const geminiFullDiagnosisPrompt = ai.definePrompt({
  name: "diagnosePlantGeminiFull",
  input: {
    schema: DiagnosePlantInputSchema.extend({
      cnnHint: z.string().optional(),
    }),
  },
  output: { schema: DiagnosePlantCoreSchema },
  prompt: `You are a virtual plant doctor and agricultural expert for Indian farmers.

Analyze the plant image. If cnnHint is provided, treat it as a weak prior from a 39-class CNN — verify visually and correct if wrong.

Return:
1. plantName, disease (or "Healthy"), confidenceScore 0-100
2. A complete report with: summary, diseaseOverview, symptomsAndSigns, immediateActions, treatmentSteps (4+ steps if diseased), fertilizerAndTreatment, preventiveMeasures, precautionsAndSafety, recoveryTimeline, whenToConsultExpert

Image: {{media url=photoDataUri}}
CNN hint: {{cnnHint}}
`,
});

function listToText(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

function reportFromCnnCatalog(ml: MlPlantPrediction): PlantDoctorReport {
  const isHealthy = ml.disease.toLowerCase() === "healthy";
  return {
    summary: isHealthy
      ? `${ml.plantName} appears healthy (${ml.confidenceScore}% CNN confidence). Continue good practices and monitor weekly.`
      : `${ml.plantName} shows signs consistent with ${ml.disease} (${ml.confidenceScore}% CNN confidence). Follow the steps below and monitor progress.`,
    diseaseOverview: ml.description || `${ml.displayTitle} detected on ${ml.plantName}.`,
    symptomsAndSigns: [
      `Visual match to catalog class: ${ml.displayTitle}.`,
      "Compare new leaves vs old leaves for spread pattern.",
      "Check underside of leaves for spots, mold, or pests.",
    ],
    immediateActions: isHealthy
      ? [
          "Maintain balanced irrigation.",
          "Scout field twice per week.",
          "Remove only truly dead debris.",
        ]
      : [
          "Remove and destroy heavily infected plant parts (do not compost).",
          "Avoid working in the field when foliage is wet.",
          "Isolate severely affected plants if in a nursery or greenhouse.",
        ],
    treatmentSteps: isHealthy
      ? [
          {
            stepNumber: 1,
            title: "Maintain plant health",
            instruction: ml.recommendedFertilizer,
          },
          {
            stepNumber: 2,
            title: "Preventive scouting",
            instruction: ml.preventiveMeasures.slice(0, 500),
          },
        ]
      : [
          {
            stepNumber: 1,
            title: "Sanitation",
            instruction:
              "Remove infected leaves and debris; sanitize tools with dilute bleach.",
          },
          {
            stepNumber: 2,
            title: "Recommended treatment",
            instruction: ml.recommendedFertilizer,
          },
          {
            stepNumber: 3,
            title: "Preventive practices",
            instruction: ml.preventiveMeasures.slice(0, 800),
          },
          {
            stepNumber: 4,
            title: "Follow-up",
            instruction: "Re-check plants in 7–10 days; retreat if symptoms spread.",
          },
        ],
    fertilizerAndTreatment: ml.recommendedFertilizer,
    preventiveMeasures: ml.preventiveMeasures
      .split(/\n|\.(?=\s)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 6)
      .concat(
        ml.preventiveMeasures.length < 20
          ? ["Improve airflow", "Avoid overhead irrigation late in the day"]
          : []
      ),
    precautionsAndSafety: [
      "Read chemical labels before mixing; wear gloves and mask when spraying.",
      "Do not apply fungicides during peak heat unless label allows.",
      "Keep treated produce withholding periods per product label.",
    ],
    recoveryTimeline: isHealthy
      ? "Continue routine monitoring each week during the growing season."
      : "Expect visible improvement within 10–21 days if treatment is applied promptly; severe cases may need 4+ weeks.",
    whenToConsultExpert:
      "Contact your local agriculture officer if >30% of plants are affected, symptoms worsen after treatment, or you are unsure about chemical choice.",
  };
}

async function generateGeminiReport(params: {
  photoDataUri: string;
  plantName: string;
  disease: string;
  confidenceScore: number;
  ml: MlPlantPrediction;
}): Promise<PlantDoctorReport> {
  try {
    const { output } = await enrichReportPrompt({
      photoDataUri: params.photoDataUri,
      plantName: params.plantName,
      disease: params.disease,
      confidenceScore: params.confidenceScore,
      cnnClassLabel: params.ml.classLabel,
      catalogDescription: params.ml.description,
      catalogPrevention: params.ml.preventiveMeasures,
      catalogTreatment: params.ml.recommendedFertilizer,
    });
    if (output) return output;
  } catch (err) {
    console.warn(
      "[diagnosePlant] Gemini report enrichment failed, using catalog fallback",
      err
    );
  }
  return reportFromCnnCatalog(params.ml);
}

function buildOutput(
  core: z.infer<typeof DiagnosePlantCoreSchema>,
  explainability: z.infer<typeof AiExplainabilitySchema>
): DiagnosePlantOutput {
  return {
    ...core,
    recommendedFertilizer: core.report.fertilizerAndTreatment,
    preventiveMeasures: listToText(core.report.preventiveMeasures),
    explainability,
  };
}

function buildExplainabilityFromCnn(
  ml: MlPlantPrediction,
  geminiReportUsed: boolean
): z.infer<typeof AiExplainabilitySchema> {
  const evidence = [
    `CNN class: ${ml.classLabel} (${ml.confidenceScore}% softmax confidence).`,
    `Threshold for local-only diagnosis: ${ml.minConfidenceThreshold}%.`,
    ...ml.topPredictions.map(
      (t, i) => `Alternative #${i + 1}: ${t.classLabel} (${t.confidence}%).`
    ),
  ];
  if (geminiReportUsed) {
    evidence.push(
      "Detailed treatment report generated by Gemini using CNN diagnosis + catalog + image."
    );
  }
  return {
    primarySource: geminiReportUsed ? ("hybrid" as const) : ("local_cnn" as const),
    modelName: geminiReportUsed
      ? "Plant Village CNN + Gemini 2.5 Flash"
      : "Plant Village CNN (plant_disease_model_1_latest.pt, 39 classes)",
    confidenceBasis: `Softmax probability of predicted class index ${ml.classIndex}.`,
    evidence,
    reasoning: geminiReportUsed
      ? `The CNN identified "${ml.displayTitle}" with ${ml.confidenceScore}% confidence. Gemini expanded catalog notes into a full farmer treatment report (steps, precautions, timeline).`
      : `The on-device CNN matched "${ml.displayTitle}" with ${ml.confidenceScore}% confidence.`,
    fallbackUsed: false,
  };
}

function buildExplainabilityGemini(
  reason: string,
  ml: MlPlantPrediction | null
): z.infer<typeof AiExplainabilitySchema> {
  const evidence = [reason];
  if (ml) {
    evidence.push(
      `CNN prior: ${ml.classLabel} at ${ml.confidenceScore}% (below threshold ${ml.minConfidenceThreshold}%).`
    );
  }
  evidence.push("Full diagnosis and report produced by Gemini vision model.");
  return {
    primarySource: ml ? ("hybrid" as const) : ("gemini" as const),
    modelName: "Google Gemini 2.5 Flash (vision)",
    confidenceBasis: "Multimodal model estimate from image + optional CNN hint.",
    evidence,
    reasoning:
      "Gemini analyzed the leaf image because the local CNN was unavailable or below the confidence threshold, and authored the complete treatment report.",
    fallbackUsed: true,
  };
}

const diagnosePlantFlow = ai.defineFlow(
  {
    name: "diagnosePlantFlow",
    inputSchema: DiagnosePlantInputSchema,
    outputSchema: DiagnosePlantOutputSchema,
  },
  async (input) => {
    const ml = await runPlantDiseaseCnn(input.photoDataUri);

    if (ml && !ml.shouldUseGeminiFallback) {
      const report = await generateGeminiReport({
        photoDataUri: input.photoDataUri,
        plantName: ml.plantName,
        disease: ml.disease,
        confidenceScore: ml.confidenceScore,
        ml,
      });

      return buildOutput(
        {
          plantName: ml.plantName,
          disease: ml.disease,
          confidenceScore: ml.confidenceScore,
          report,
        },
        buildExplainabilityFromCnn(ml, true)
      );
    }

    const cnnHint = ml
      ? `CNN suggested ${ml.displayTitle} (${ml.confidenceScore}%) — ${ml.fallbackReason ?? "low confidence"}. Catalog: ${ml.description.slice(0, 400)}`
      : "CNN unavailable (install Python + model weights in backend/ml/plant_disease/).";

    const { output } = await geminiFullDiagnosisPrompt({
      photoDataUri: input.photoDataUri,
      cnnHint,
    });

    if (!output) {
      throw new Error("Failed to generate plant diagnosis. Please try again.");
    }

    const fallbackReason = ml?.fallbackReason ?? "CNN model not loaded";
    return buildOutput(output, buildExplainabilityGemini(fallbackReason, ml));
  }
);

export async function runDiagnosePlant(input: DiagnosePlantInput): Promise<DiagnosePlantOutput> {
  return diagnosePlantFlow(input);
}
