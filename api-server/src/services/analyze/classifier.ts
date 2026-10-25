/**
 * Runs the OpenAI decision model over collector state to answer scam-signal
 * questions (impersonation, credential harvest, scam type, risk, etc.).
 */
import { openai, type OpenAIDecisionModelId } from "@ai-sdk/openai";
import {
  experimental_decide as decide,
  type Experimental_DecisionModel,
} from "ai";
import type { AnalyzeRequest } from "../../schemas/analysis-input.js";
import {
  RISK_RUBRIC,
  SCAM_TYPE_CRITERIA,
  type ClassifierResult,
} from "../../schemas/classifier.js";
import type { Evidence } from "../../schemas/evidence.js";
import { buildCollectorState } from "./collector.js";
import { logModelCost } from "../cost-log.js";

export const DEFAULT_CLASSIFIER_MODEL: OpenAIDecisionModelId = "gpt-6-luna";

const BOOLEAN_CRITERIA = {
  impersonation: {
    true: "Content claims to be a trusted organization or person without corroboration",
    false: "No impersonation claim or sender matches a legitimate organization",
  },
  credential_harvest: {
    true: "Asks for passwords, MFA codes, or login on a suspicious page or form",
    false: "No credential or login request is present",
  },
  payment_redirection: {
    true: "Demands payment via unusual method, gift cards, crypto, or urgent wire",
    false: "No payment redirection or unusual payment demand",
  },
  malware_delivery: {
    true: "Includes suspicious attachment, download link, or malware indicators",
    false: "No malware delivery mechanism is present",
  },
  urgency_manipulation: {
    true: "Uses urgency, fear, secrecy, or authority pressure to rush action",
    false: "No strong urgency or pressure language",
  },
  insufficient_evidence: {
    true: "Indicators were not investigated, tools failed, or submission is too thin",
    false: "Enough observable facts exist to support a classification",
  },
} as const;

function buildQuestions() {
  return {
    impersonation: {
      type: "boolean" as const,
      instructions:
        "Does the submission impersonate a trusted organization or person?",
      criteria: BOOLEAN_CRITERIA.impersonation,
    },
    credential_harvest: {
      type: "boolean" as const,
      instructions:
        "Does the submission attempt to harvest credentials or login details?",
      criteria: BOOLEAN_CRITERIA.credential_harvest,
    },
    payment_redirection: {
      type: "boolean" as const,
      instructions:
        "Does the submission redirect the victim toward an unusual payment?",
      criteria: BOOLEAN_CRITERIA.payment_redirection,
    },
    malware_delivery: {
      type: "boolean" as const,
      instructions:
        "Does the submission attempt to deliver malware or a malicious download?",
      criteria: BOOLEAN_CRITERIA.malware_delivery,
    },
    urgency_manipulation: {
      type: "boolean" as const,
      instructions:
        "Does the submission use urgency, fear, or authority pressure?",
      criteria: BOOLEAN_CRITERIA.urgency_manipulation,
    },
    insufficient_evidence: {
      type: "boolean" as const,
      instructions:
        "Is there insufficient evidence to classify this submission reliably?",
      criteria: BOOLEAN_CRITERIA.insufficient_evidence,
    },
    scam_type: {
      type: "choice" as const,
      instructions: "Which scam type best fits the submission?",
      criteria: SCAM_TYPE_CRITERIA,
    },
    risk: {
      type: "score" as const,
      instructions: "How severe is the scam risk for this submission?",
      criteria: [...RISK_RUBRIC],
    },
  };
}

function confidenceFromProviderMetadata(
  providerMetadata: Record<string, Record<string, unknown>> | undefined,
): Record<string, number> | undefined {
  const confidence = providerMetadata?.openai?.confidence;
  if (!confidence || typeof confidence !== "object") return undefined;

  const entries = Object.entries(confidence).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export async function classifySubmission(
  request: AnalyzeRequest,
  evidences: Evidence[],
  extractedTextByInputIndex: Map<number, string> = new Map(),
  model: Experimental_DecisionModel = openai.decisionModel(
    DEFAULT_CLASSIFIER_MODEL,
  ),
): Promise<ClassifierResult> {
  const state = buildCollectorState(
    request,
    evidences,
    extractedTextByInputIndex,
  );
  const result = await decide({
    model,
    state,
    questions: buildQuestions(),
  });

  const modelId = result.response?.modelId ?? DEFAULT_CLASSIFIER_MODEL;
  if (result.usage) {
    logModelCost("classifier", modelId, result.usage);
  }

  return {
    answers: result.answers as Record<string, unknown>,
    providerConfidence: confidenceFromProviderMetadata(
      result.providerMetadata as
        Record<string, Record<string, unknown>> | undefined,
    ),
    modelId: result.response?.modelId,
  };
}
