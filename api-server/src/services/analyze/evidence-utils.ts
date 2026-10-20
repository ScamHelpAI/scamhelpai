/**
 * Small evidence helpers shared across analysis gating and assessment mapping.
 */
import type { Evidence } from "../../schemas/evidence.js";

export function hasToolBackedEvidence(evidences: Evidence[]): boolean {
  return evidences.some((item) => item.source === "tool");
}
