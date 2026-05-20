/**
 * Invokes the Plant Village PyTorch CNN via Python subprocess.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

function resolveMlDir(): string {
  if (process.env.PLANT_DISEASE_ML_DIR) {
    return process.env.PLANT_DISEASE_ML_DIR;
  }
  const candidates = [
    path.join(process.cwd(), "backend", "ml", "plant_disease"),
    path.join(process.cwd(), "..", "backend", "ml", "plant_disease"),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, "predict.py"))) {
      return dir;
    }
  }
  return candidates[0];
}

const ML_DIR = resolveMlDir();
const PREDICT_SCRIPT = path.join(ML_DIR, "predict.py");

const MlPredictionSchema = z.object({
  success: z.literal(true),
  classIndex: z.number(),
  classLabel: z.string(),
  plantName: z.string(),
  disease: z.string(),
  displayTitle: z.string(),
  confidenceScore: z.number(),
  topPredictions: z.array(
    z.object({
      classIndex: z.number(),
      classLabel: z.string(),
      confidence: z.number(),
    })
  ),
  description: z.string(),
  preventiveMeasures: z.string(),
  recommendedFertilizer: z.string(),
  shouldUseGeminiFallback: z.boolean(),
  fallbackReason: z.string().nullable().optional(),
  minConfidenceThreshold: z.number(),
});

const MlErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

export type MlPlantPrediction = z.infer<typeof MlPredictionSchema>;

function resolvePythonCommand(): string {
  return process.env.PLANT_DISEASE_PYTHON ?? "python";
}

/**
 * Runs CNN inference; returns null when Python/model is unavailable (caller uses Gemini).
 */
export async function runPlantDiseaseCnn(photoDataUri: string): Promise<MlPlantPrediction | null> {
  const python = resolvePythonCommand();
  const payload = JSON.stringify({ photoDataUri });

  return new Promise((resolve) => {
    const child = spawn(python, [PREDICT_SCRIPT], {
      cwd: ML_DIR,
      env: {
        ...process.env,
        PLANT_DISEASE_MODEL_PATH:
          process.env.PLANT_DISEASE_MODEL_PATH ??
          path.join(ML_DIR, "plant_disease_model_1_latest.pt"),
        PLANT_DISEASE_MIN_CONFIDENCE: process.env.PLANT_DISEASE_MIN_CONFIDENCE ?? "55",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      console.warn("[mlPredictor] spawn failed", err);
      resolve(null);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.warn("[mlPredictor] python exit", code, stderr);
        resolve(null);
        return;
      }
      try {
        const parsed: unknown = JSON.parse(stdout.trim());
        const ok = MlPredictionSchema.safeParse(parsed);
        if (ok.success) {
          resolve(ok.data);
          return;
        }
        const err = MlErrorSchema.safeParse(parsed);
        if (err.success) {
          console.warn("[mlPredictor]", err.data.error);
        }
        resolve(null);
      } catch (e) {
        console.warn("[mlPredictor] invalid JSON", e, stdout, stderr);
        resolve(null);
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}
