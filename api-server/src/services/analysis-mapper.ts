import type { RiskLevel } from "../schemas/analysis-result.js";
import type { Evidence, PublicEvidence } from "../schemas/evidence.js";
import type { ReviewerAssessment } from "../schemas/reviewer.js";
import type { AnalysisResult } from "../schemas/analysis-result.js";

export function toRiskLevel(score: number): RiskLevel {
  if (score >= 0.85) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

export function toEvidenceSeverity(
  confidence: number,
): PublicEvidence["severity"] {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

export function toPublicEvidence(evidence: Evidence): PublicEvidence {
  return {
    id: evidence.id,
    summary: evidence.summary,
    severity: toEvidenceSeverity(evidence.confidence),
  };
}

export function toAnalysisResult(params: {
  id: string;
  assessment: ReviewerAssessment;
  evidences: Evidence[];
  createdAt: string;
  completedAt: string;
}): AnalysisResult {
  const score = params.assessment.finalScamProbability;
  const riskLevel = toRiskLevel(score);

  return {
    id: params.id,
    status: "completed",
    risk: {
      score,
      level: riskLevel,
      confidence: Math.min(
        1,
        Math.max(0, score + params.assessment.confidenceAdjustment),
      ),
    },
    classification: {
      primary: params.assessment.finalScamType,
    },
    summary: params.assessment.reasoningSummary,
    evidence: params.evidences.map(toPublicEvidence),
    createdAt: params.createdAt,
    completedAt: params.completedAt,
  };
}
