import {
  experimental_evaluate as evaluate,
  gateway,
  type Experimental_EvaluationModel,
} from "ai";
import type { AnalyzeRequest } from "../schemas/analysis-input.js";
import {
  RISK_RUBRIC,
  SCAM_TYPE_CRITERIA,
  type ClassifierResult,
} from "../schemas/classifier.js";
import type { Evidence } from "../schemas/evidence.js";
import { buildCollectorState } from "./collector.js";

export const DEFAULT_CLASSIFIER_MODEL = "typesafe-ai/jev";

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

export async function classifySubmission(
  request: AnalyzeRequest,
  evidences: Evidence[],
  model: Experimental_EvaluationModel = gateway.evaluationModel(
    DEFAULT_CLASSIFIER_MODEL,
  ),
): Promise<ClassifierResult> {
  const state = buildCollectorState(request, evidences);
  const result = await evaluate({
    model,
    state,
    questions: buildQuestions(),
    providerOptions: {
      gateway: { zeroDataRetention: true },
    },
  });

  const providerConfidence = result.providerMetadata?.typesafe?.confidence as
    | Record<string, number>
    | undefined;

  return {
    answers: result.answers as Record<string, unknown>,
    providerConfidence,
    modelId: result.response?.modelId,
  };
}
