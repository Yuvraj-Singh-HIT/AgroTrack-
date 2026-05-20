"use server";

/**
 * Plant Doctor server entry — only exports async functions (Next.js requirement).
 */
import { runDiagnosePlant } from "./diagnose-plant-core";
import type { DiagnosePlantInput, DiagnosePlantOutput } from "./plant-doctor-types";

export async function diagnosePlant(
  input: DiagnosePlantInput
): Promise<DiagnosePlantOutput> {
  return runDiagnosePlant(input);
}
