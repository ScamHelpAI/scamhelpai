import { z } from "zod";
import { evidenceSchema, type Evidence } from "./evidence.js";

export const scannerOutputSchema = z.object({
  evidences: z.array(evidenceSchema),
});

export type ScannerOutput = z.infer<typeof scannerOutputSchema>;

/** Ensures every evidence item satisfies the full schema with stable ids. */
export function normalizeScannerEvidences(
  evidences: Evidence[],
  generatedAt = new Date().toISOString(),
): Evidence[] {
  return evidences.map((evidence, index) =>
    evidenceSchema.parse({
      ...evidence,
      id: evidence.id.trim() || `ev-${String(index + 1).padStart(3, "0")}`,
      createdAt: evidence.createdAt || generatedAt,
    }),
  );
}

export function normalizeScannerOutput(
  output: ScannerOutput,
  generatedAt = new Date().toISOString(),
): ScannerOutput {
  return {
    evidences: normalizeScannerEvidences(output.evidences, generatedAt),
  };
}
