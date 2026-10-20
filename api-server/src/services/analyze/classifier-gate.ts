/**
 * Maps decision-model answers into an assessment, combines risk signals into a
 * scam probability, and decides whether a deeper LLM review is warranted.
 */
import type { AnalyzeRequest } from "../schemas/analysis-input.js";
import type { ScamType } from "../schemas/analyst.js";
import type { ClassifierResult } from "../schemas/classifier.js";
import type { Evidence } from "../schemas/evidence.js";
import type { ReviewerAssessment } from "../schemas/reviewer.js";
import { hasToolBackedEvidence } from "./evidence-utils.js";

export const CHOICE_CONFIDENCE_FLOOR = 0.6;
export const SELECTED_PROBABILITY_FLOOR = 0.7;
export const BOOLEAN_UNCERTAIN_LOW = 0.25;
export const BOOLEAN_UNCERTAIN_HIGH = 0.75;
export const INSUFFICIENT_EVIDENCE_THRESHOLD = 0.6;

const HIGH_IMPACT_FLAGS = [
  "impersonation",
  "credential_harvest",
  "payment_redirection",
  "malware_delivery",
] as const;

type BooleanAnswer = { type: "boolean"; probability: number };
type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities?: Record<string, number>;
};
type ScoreAnswer = { type: "score"; score: number };

function asBoolean(answer: unknown): BooleanAnswer | null {
  if (
    typeof answer === "object" &&
    answer !== null &&
    "type" in answer &&
    answer.type === "boolean" &&
    "probability" in answer &&
    typeof answer.probability === "number"
  ) {
    return answer as BooleanAnswer;
  }
  return null;
}

function asChoice(answer: unknown): ChoiceAnswer | null {
  if (
    typeof answer === "object" &&
    answer !== null &&
    "type" in answer &&
    answer.type === "choice" &&
    "choice" in answer &&
    typeof answer.choice === "string"
  ) {
    return answer as ChoiceAnswer;
  }
  return null;
}

function asScore(answer: unknown): ScoreAnswer | null {
  if (
    typeof answer === "object" &&
    answer !== null &&
    "type" in answer &&
    answer.type === "score" &&
    "score" in answer &&
    typeof answer.score === "number"
  ) {
    return answer as ScoreAnswer;
  }
  return null;
}

export function hasMultimodalInput(request: AnalyzeRequest): boolean {
  return request.inputs.some(
    (input) =>
      input.type === "image" ||
      input.type === "audio" ||
      input.type === "pdf" ||
      (input.type === "email" && (input.assetIds?.length ?? 0) > 0),
  );
}

function booleanProbability(
  classifier: ClassifierResult,
  key: string,
): number | null {
  const answer = asBoolean(classifier.answers[key]);
  return answer?.probability ?? null;
}

function isBooleanUncertain(probability: number | null): boolean {
  if (probability === null) return true;
  return (
    probability > BOOLEAN_UNCERTAIN_LOW && probability < BOOLEAN_UNCERTAIN_HIGH
  );
}

function isScamTypeUncertain(classifier: ClassifierResult): boolean {
  const answer = asChoice(classifier.answers.scam_type);
  if (!answer) return true;

  const confidence = classifier.providerConfidence?.scam_type;
  if (confidence === undefined) return true;
  if (confidence < CHOICE_CONFIDENCE_FLOOR) return true;

  const selectedProbability = answer.probabilities?.[answer.choice];
  if (selectedProbability === undefined) return true;
  if (selectedProbability < SELECTED_PROBABILITY_FLOOR) return true;

  return false;
}

export function shouldReview(
  request: AnalyzeRequest,
  classifier: ClassifierResult,
  evidences: Evidence[],
): boolean {
  if (hasMultimodalInput(request)) return true;
  if (!hasToolBackedEvidence(evidences)) return true;

  const insufficient = booleanProbability(classifier, "insufficient_evidence");
  if (
    insufficient !== null &&
    insufficient >= INSUFFICIENT_EVIDENCE_THRESHOLD
  ) {
    return true;
  }

  if (isScamTypeUncertain(classifier)) return true;

  for (const flag of HIGH_IMPACT_FLAGS) {
    if (isBooleanUncertain(booleanProbability(classifier, flag))) {
      return true;
    }
  }

  return false;
}

export function combineScamProbability(classifier: ClassifierResult): number {
  const highImpact = HIGH_IMPACT_FLAGS.map((flag) =>
    booleanProbability(classifier, flag),
  ).filter((value): value is number => value !== null);

  const maxBoolean = highImpact.length > 0 ? Math.max(...highImpact) : 0;
  const risk = asScore(classifier.answers.risk);
  const riskNormalized = risk ? Math.min(1, Math.max(0, risk.score / 3)) : 0;

  return Math.min(1, Math.max(maxBoolean, riskNormalized));
}

function firedSignals(classifier: ClassifierResult): string[] {
  const labels: Record<string, string> = {
    impersonation: "impersonation",
    credential_harvest: "credential harvest",
    payment_redirection: "payment redirection",
    malware_delivery: "malware delivery",
    urgency_manipulation: "urgency manipulation",
  };

  return Object.entries(labels)
    .filter(([key]) => {
      const probability = booleanProbability(classifier, key);
      return probability !== null && probability >= 0.6;
    })
    .map(([, label]) => label);
}

export function assessmentFromClassifier(
  classifier: ClassifierResult,
  evidences: Evidence[],
): ReviewerAssessment {
  const scamTypeAnswer = asChoice(classifier.answers.scam_type);
  const insufficient = booleanProbability(classifier, "insufficient_evidence");
  const finalScamProbability = combineScamProbability(classifier);
  const finalScamType = (scamTypeAnswer?.choice ?? "unknown") as ScamType;
  const signals = firedSignals(classifier);
  const topEvidence = evidences
    .filter((item) => item.confidence >= 0.7)
    .slice(0, 5);

  const reasoningParts = [
    `Classifier assessment: ${Math.round(finalScamProbability * 100)}% scam probability (${finalScamType}).`,
    signals.length > 0 ? `Signals: ${signals.join(", ")}.` : null,
    topEvidence.length > 0
      ? `Key evidence: ${topEvidence.map((item) => item.summary).join("; ")}.`
      : null,
  ].filter(Boolean);

  const verdict =
    insufficient !== null && insufficient >= INSUFFICIENT_EVIDENCE_THRESHOLD
      ? "insufficient_evidence"
      : "agree";

  return {
    verdict,
    finalScamProbability,
    finalScamType,
    supportedClaims: topEvidence.map((item) => ({
      claim: item.summary,
      evidenceIds: [item.id],
    })),
    unsupportedClaims: [],
    contradictions: [],
    confidenceAdjustment: 0,
    additionalEvidenceIds: [],
    reasoningSummary: reasoningParts.join(" "),
  };
}
