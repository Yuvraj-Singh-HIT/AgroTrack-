"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import {
  climateRiskForecast,
  type ClimateRiskForecastOutput,
} from "../ai/flows/climate-risk-forecast";
import {
  suggestProfitableCrops,
  type SuggestProfitableCropsOutput,
} from "../ai/flows/suggest-profitable-crops";
import {
  matchWithMarketParticipants,
  type MatchWithMarketParticipantsOutput,
} from "../ai/flows/match-with-market-participants";
import {
  diagnosePlant,
} from "../ai/flows/diagnose-plant";
import type { DiagnosePlantOutput } from "../ai/flows/plant-doctor-types";
import {
  textToSpeech,
  type TextToSpeechOutput,
} from "../ai/flows/text-to-speech";
import {
  analyzeSoil,
  type SoilAnalysisOutput,
} from "../ai/flows/soil-analysis";
import {
  ClimateRiskFormSchema,
  MarketplaceFormSchema,
  PlantDoctorFormSchema,
  AadharUploadFormSchema,
  SoilAnalysisFormSchema,
  ProfitPlannerFormSchema,
} from "./definitions";
import { authOptions } from "./auth";
import { assertAiRateLimit } from "./rateLimit";
import { getMemoryCache, setMemoryCache, stableCacheKey } from "./aiResponseCache";
import { upsertFarmProfile } from "./db/farmProfile";
import { createFarmPassport } from "./db/passport";

const AI_CACHE_TTL_MS = 30 * 60 * 1000;

type FormState<T> = {
  message: string | null;
  data: T | null;
  errors?: {
    [key: string]: string[] | undefined;
  };
};

type UploadFormState = {
  message: string | null;
  success: boolean;
  errors?: {
    [key: string]: string[] | undefined;
  };
};

async function requireSessionEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  return email ?? null;
}

export async function getClimateRiskForecast(
  prevState: FormState<ClimateRiskForecastOutput>,
  formData: FormData
): Promise<FormState<ClimateRiskForecastOutput>> {
  const email = await requireSessionEmail();
  if (!email) {
    return { message: "You must be signed in to run this forecast.", data: null };
  }

  const validatedFields = ClimateRiskFormSchema.safeParse({
    region: formData.get("region"),
    days: formData.get("days"),
  });

  if (!validatedFields.success) {
    return {
      message: "Invalid form data.",
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  const rl = await assertAiRateLimit(`${email}:climate`, "climate");
  if (!rl.ok) {
    return { message: rl.message, data: null };
  }

  const cacheKey = stableCacheKey(["climate", email, validatedFields.data]);
  const cached = getMemoryCache<ClimateRiskForecastOutput>(cacheKey);
  if (cached) {
    return { message: null, data: cached, errors: {} };
  }

  try {
    const data = await climateRiskForecast(validatedFields.data);
    setMemoryCache(cacheKey, data, AI_CACHE_TTL_MS);
    return { message: null, data, errors: {} };
  } catch (error) {
    console.error("[getClimateRiskForecast]", error);
    return { message: "Failed to fetch forecast. Please try again.", data: null };
  }
}

export async function getProfitPlan(
  prevState: FormState<SuggestProfitableCropsOutput>,
  formData: FormData
): Promise<FormState<SuggestProfitableCropsOutput>> {
  const email = await requireSessionEmail();
  if (!email) {
    return { message: "You must be signed in to use the profit planner.", data: null };
  }

  const validatedFields = ProfitPlannerFormSchema.safeParse({
    landArea: formData.get("landArea"),
    soilDetails: formData.get("soilDetails"),
    budget: formData.get("budget"),
  });

  if (!validatedFields.success) {
    return {
      message: "Invalid form data.",
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  try {
    const data = await suggestProfitableCrops(validatedFields.data);
    return { message: null, data, errors: {} };
  } catch (error) {
    console.error("[getProfitPlan]", error);
    return {
      message: "Failed to generate profit plan. Please try again.",
      data: null,
    };
  }
}

export async function getMarketMatches(
  prevState: FormState<MatchWithMarketParticipantsOutput>,
  formData: FormData
): Promise<FormState<MatchWithMarketParticipantsOutput>> {
  const email = await requireSessionEmail();
  if (!email) {
    return { message: "You must be signed in to use the marketplace assistant.", data: null };
  }

  const validatedFields = MarketplaceFormSchema.safeParse({
    farmDetails: formData.get("farmDetails"),
    harvestDetails: formData.get("harvestDetails"),
    priceExpectations: formData.get("priceExpectations"),
    desiredPartners: formData.getAll("desiredPartners"),
  });

  if (!validatedFields.success) {
    return {
      message: "Invalid form data.",
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  const rl = await assertAiRateLimit(`${email}:market`, "marketplace");
  if (!rl.ok) {
    return { message: rl.message, data: null };
  }

  const cacheKey = stableCacheKey(["market", email, validatedFields.data]);
  const cached = getMemoryCache<MatchWithMarketParticipantsOutput>(cacheKey);
  if (cached) {
    return { message: null, data: cached, errors: {} };
  }

  try {
    const data = await matchWithMarketParticipants(validatedFields.data);
    setMemoryCache(cacheKey, data, AI_CACHE_TTL_MS);
    return { message: null, data, errors: {} };
  } catch (error) {
    console.error("[getMarketMatches]", error);
    return {
      message: "Failed to find market matches. Please try again.",
      data: null,
    };
  }
}

export async function getPlantDiagnosis(
  prevState: FormState<DiagnosePlantOutput>,
  formData: FormData
): Promise<FormState<DiagnosePlantOutput>> {
  const email = await requireSessionEmail();
  if (!email) {
    return { message: "You must be signed in to use Plant Doctor.", data: null };
  }

  const validatedFields = await PlantDoctorFormSchema.safeParseAsync({
    plantImage: formData.get("plantImage"),
  });

  if (!validatedFields.success) {
    return {
      message: "Invalid form data.",
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  const rl = await assertAiRateLimit(`${email}:plant`, "plant");
  if (!rl.ok) {
    return { message: rl.message, data: null };
  }

  try {
    const data = await diagnosePlant({
      photoDataUri: validatedFields.data.plantImage,
    });
    return { message: null, data, errors: {} };
  } catch (error) {
    console.error("[getPlantDiagnosis]", error);
    return {
      message: "Failed to diagnose plant. Please try again.",
      data: null,
    };
  }
}

export async function getSpokenText(
  text: string
): Promise<{ audioDataUri: string } | { error: string }> {
  const email = await requireSessionEmail();
  if (!email) {
    return { error: "You must be signed in." };
  }
  if (!text) {
    return { error: "No text provided to read." };
  }

  try {
    const { audioDataUri } = await textToSpeech({ text });
    return { audioDataUri };
  } catch (error) {
    console.error("Text-to-speech conversion failed:", error);
    return { error: "Failed to convert text to speech. Please try again." };
  }
}

export async function uploadAadharCard(
  prevState: UploadFormState,
  formData: FormData
): Promise<UploadFormState> {
  const email = await requireSessionEmail();
  if (!email) {
    return { message: "You must be signed in.", success: false };
  }

  const validatedFields = AadharUploadFormSchema.safeParse({
    aadharPdf: formData.get("aadharPdf"),
  });

  if (!validatedFields.success) {
    return {
      message: "Invalid file. Please upload a PDF.",
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    console.log("Simulating Aadhar card upload for:", validatedFields.data.aadharPdf.name);
    return { message: "Your Aadhar card has been uploaded successfully.", success: true };
  } catch (error) {
    console.error("Aadhar upload failed:", error);
    return { message: "An unexpected error occurred during upload. Please try again.", success: false };
  }
}

export async function getSoilAnalysis(
  prevState: FormState<SoilAnalysisOutput>,
  formData: FormData
): Promise<FormState<SoilAnalysisOutput>> {
  const email = await requireSessionEmail();
  if (!email) {
    return { message: "You must be signed in to run soil analysis.", data: null };
  }

  const validatedFields = SoilAnalysisFormSchema.safeParse({
    ph: formData.get("ph"),
    nitrogen: formData.get("nitrogen"),
    phosphorus: formData.get("phosphorus"),
    potassium: formData.get("potassium"),
    moisture: formData.get("moisture"),
    organicMatter: formData.get("organicMatter"),
  });

  if (!validatedFields.success) {
    return {
      message: "Invalid form data. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  const rl = await assertAiRateLimit(`${email}:soil`, "soil");
  if (!rl.ok) {
    return { message: rl.message, data: null };
  }

  const cacheKey = stableCacheKey(["soil", email, validatedFields.data]);
  const cached = getMemoryCache<SoilAnalysisOutput>(cacheKey);
  if (cached) {
    return { message: null, data: cached, errors: {} };
  }

  try {
    const data = await analyzeSoil(validatedFields.data);
    setMemoryCache(cacheKey, data, AI_CACHE_TTL_MS);
    return { message: null, data, errors: {} };
  } catch (error) {
    console.error("[getSoilAnalysis]", error);
    return {
      message: "Failed to perform soil analysis. Please try again.",
      data: null,
    };
  }
}

const onboardingSchema = z.object({
  farmName: z.string().min(1),
  location: z.string().min(1),
  acreage: z.coerce.number().positive(),
  cropTypes: z.string().min(1),
  preferredLanguage: z.string().min(1),
});

export type OnboardingFormState = { message: string | null; ok: boolean };

export async function saveFarmProfileAction(
  _prev: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const email = await requireSessionEmail();
  if (!email) {
    return { message: "Unauthorized", ok: false };
  }
  const parsed = onboardingSchema.safeParse({
    farmName: formData.get("farmName"),
    location: formData.get("location"),
    acreage: formData.get("acreage"),
    cropTypes: formData.get("cropTypes"),
    preferredLanguage: formData.get("preferredLanguage"),
  });
  if (!parsed.success) {
    return { message: "Invalid onboarding data.", ok: false };
  }
  const crops = parsed.data.cropTypes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await upsertFarmProfile({
    ownerEmail: email,
    farmName: parsed.data.farmName,
    location: parsed.data.location,
    acreage: parsed.data.acreage,
    cropTypes: crops,
    preferredLanguage: parsed.data.preferredLanguage,
  });
  return { message: null, ok: true };
}

export async function createPassportAction(
  _prev: { message: string | null; passportId: string | null },
  formData: FormData
): Promise<{ message: string | null; passportId: string | null }> {
  const email = await requireSessionEmail();
  if (!email) {
    return { message: "Unauthorized", passportId: null };
  }
  const parsed = z
    .object({
      crop: z.string().min(1),
      location: z.string().min(1),
      plantDate: z.string().min(1),
      harvestDate: z.string().min(1),
    })
    .safeParse({
      crop: formData.get("crop"),
      location: formData.get("location"),
      plantDate: formData.get("plantDate"),
      harvestDate: formData.get("harvestDate"),
    });
  if (!parsed.success) {
    return { message: "Invalid passport fields.", passportId: null };
  }
  try {
    const passportId = await createFarmPassport({
      ownerEmail: email,
      crop: parsed.data.crop,
      location: parsed.data.location,
      plantDate: parsed.data.plantDate,
      harvestDate: parsed.data.harvestDate,
    });
    return { message: null, passportId };
  } catch (e) {
    console.error("[createPassportAction]", e);
    return { message: "Could not create passport.", passportId: null };
  }
}
