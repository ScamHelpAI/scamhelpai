/**
 * Tests for classifier-gate: review gating rules and mapping decision-model
 * answers into assessments.
 */
import { Experimental_DecisionMockModelV4 as MockDecisionModel } from "ai/test";
import { describe, expect, it } from "vitest";
import type { AnalyzeRequest } from "../schemas/analysis-input.js";
import type { ClassifierResult } from "../schemas/classifier.js";
import type { Evidence } from "../schemas/evidence.js";
import {
  assessmentFromClassifier,
  shouldReview,
} from "./classifier-gate.js";

const textRequest: AnalyzeRequest = {
  inputs: [{ type: "text", content: "Urgent: verify your PayPal account now." }],
};

const imageRequest: AnalyzeRequest = {
  inputs: [{ type: "image", assetId: "asset-1" }],
};

const toolEvidence: Evidence[] = [
  {
    id: "ev-001",
    type: "url",
    source: "tool",
    summary: "URL uses HTTP and has a credential form",
    confidence: 0.9,
    toolName: "inspect_url",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const clearClassifier: ClassifierResult = {
  answers: {
    impersonation: { type: "boolean", probability: 0.92 },
    credential_harvest: { type: "boolean", probability: 0.88 },
    payment_redirection: { type: "boolean", probability: 0.12 },
    malware_delivery: { type: "boolean", probability: 0.05 },
    urgency_manipulation: { type: "boolean", probability: 0.8 },
    insufficient_evidence: { type: "boolean", probability: 0.1 },
    scam_type: {
      type: "choice",
      choice: "credential_phishing",
      probabilities: {
        credential_phishing: 0.91,
        impersonation: 0.05,
        unknown: 0.04,
      },
    },
    risk: {
      type: "score",
      score: 2.4,
      probabilities: { "0": 0, "1": 0.05, "2": 0.35, "3": 0.6 },
    },
  },
  providerConfidence: {
    scam_type: 0.88,
    risk: 0.75,
  },
};

describe("shouldReview", () => {
  it("skips the LLM for a clear text-only case", () => {
    expect(shouldReview(textRequest, clearClassifier, toolEvidence)).toBe(
      false,
    );
  });

  it("requires review for multimodal submissions", () => {
    expect(shouldReview(imageRequest, clearClassifier, toolEvidence)).toBe(
      true,
    );
  });

  it("requires review when scam_type confidence metadata is missing", () => {
    expect(
      shouldReview(
        textRequest,
        { ...clearClassifier, providerConfidence: undefined },
        toolEvidence,
      ),
    ).toBe(true);
  });

  it("requires review when the selected scam_type probability is too low", () => {
    expect(
      shouldReview(
        textRequest,
        {
          ...clearClassifier,
          answers: {
            ...clearClassifier.answers,
            scam_type: {
              type: "choice",
              choice: "credential_phishing",
              probabilities: {
                credential_phishing: 0.45,
                impersonation: 0.4,
                unknown: 0.15,
              },
            },
          },
          providerConfidence: { scam_type: 0.7, risk: 0.75 },
        },
        toolEvidence,
      ),
    ).toBe(true);
  });

  it("requires review when insufficient_evidence is elevated", () => {
    expect(
      shouldReview(
        textRequest,
        {
          ...clearClassifier,
          answers: {
            ...clearClassifier.answers,
            insufficient_evidence: { type: "boolean", probability: 0.8 },
          },
        },
        toolEvidence,
      ),
    ).toBe(true);
  });

  it("requires review when there is no tool-backed evidence", () => {
    expect(
      shouldReview(
        textRequest,
        clearClassifier,
        [
          {
            id: "ev-001",
            type: "text",
            source: "user_input",
            summary: "User pasted text",
            confidence: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      ),
    ).toBe(true);
  });
});

describe("assessmentFromClassifier", () => {
  it("maps a clear classifier result into a reviewer assessment", () => {
    const assessment = assessmentFromClassifier(clearClassifier, toolEvidence);

    expect(assessment.verdict).toBe("agree");
    expect(assessment.finalScamType).toBe("credential_phishing");
    expect(assessment.finalScamProbability).toBeGreaterThan(0.8);
    expect(assessment.supportedClaims[0]?.evidenceIds).toContain("ev-001");
    expect(assessment.reasoningSummary).toContain("credential_phishing");
  });

  it("marks insufficient_evidence when the classifier says so", () => {
    const assessment = assessmentFromClassifier(
      {
        ...clearClassifier,
        answers: {
          ...clearClassifier.answers,
          insufficient_evidence: { type: "boolean", probability: 0.9 },
        },
      },
      toolEvidence,
    );

    expect(assessment.verdict).toBe("insufficient_evidence");
  });
});

describe("mock decision model injection", () => {
  it("allows tests to substitute a mock decision model", () => {
    const mock = new MockDecisionModel({
      doDecide: async () =>
        ({
          answers: clearClassifier.answers,
          warnings: [],
          providerMetadata: {
            openai: { confidence: clearClassifier.providerConfidence },
          },
        }) as Awaited<ReturnType<MockDecisionModel["doDecide"]>>,
    });

    expect(mock).toBeInstanceOf(MockDecisionModel);
  });
});
