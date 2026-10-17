/**
 * Formats analysis inputs and collector/classifier context into prompts for
 * the verifier LLM.
 */
import type {
  AnalyzeRequest,
  AnalysisInput,
} from "../schemas/analysis-input.js";
import type { ClassifierResult } from "../schemas/classifier.js";
import type { Evidence } from "../schemas/evidence.js";

export function formatInput(input: AnalysisInput, index: number): string {
  const label = `Input ${index + 1} (${input.type})`;

  switch (input.type) {
    case "text":
      return `${label}:\n${input.content}`;
    case "url":
      return `${label}:\n${input.url}`;
    case "image":
      return `${label}:\nassetId: ${input.assetId}`;
    case "audio":
      return `${label}:\nassetId: ${input.assetId}`;
    case "pdf":
      return `${label}:\nassetId: ${input.assetId}`;
    case "email": {
      const parts = [label];
      if (input.raw) parts.push(`raw:\n${input.raw}`);
      if (input.headers) {
        parts.push(`headers:\n${JSON.stringify(input.headers, null, 2)}`);
      }
      if (input.body) parts.push(`body:\n${input.body}`);
      if (input.assetIds?.length) {
        parts.push(`assetIds: ${input.assetIds.join(", ")}`);
      }
      return parts.join("\n");
    }
    default: {
      const _exhaustive: never = input;
      return _exhaustive;
    }
  }
}

export function buildSubmissionPrompt(request: AnalyzeRequest): string {
  const inputBlocks = request.inputs.map(formatInput).join("\n\n");
  const contextBlock = request.context
    ? `\n\nContext:\n${JSON.stringify(request.context, null, 2)}`
    : "";

  return `Submission:\n\n${inputBlocks}${contextBlock}`;
}

export function buildReviewerPrompt(params: {
  request: AnalyzeRequest;
  evidences: Evidence[];
  classifier: ClassifierResult;
}): string {
  const submission = buildSubmissionPrompt(params.request);
  return `Review this submission. A fast classifier produced a prior assessment; challenge it rather than copying it blindly.

Classifier prior:
${JSON.stringify(params.classifier.answers, null, 2)}

Collected evidence:
${JSON.stringify(params.evidences, null, 2)}

${submission}`;
}
