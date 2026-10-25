/**
 * Formats analysis inputs and collector/classifier context into prompts for
 * the verifier LLM.
 */
import type {
  AnalyzeRequest,
  AnalysisInput,
} from "../../schemas/analysis-input.js";
import type { ClassifierResult } from "../../schemas/classifier.js";
import type { Evidence } from "../../schemas/evidence.js";

const INPUT_EXCERPT_MAX = 20_000;

function formatAssetExcerpt(
  index: number,
  extractedTextByInputIndex: Map<number, string>,
): string {
  const excerpt = extractedTextByInputIndex.get(index);
  if (!excerpt) {
    return "\nExtracted text excerpt: (none)";
  }
  const trimmed =
    excerpt.length > INPUT_EXCERPT_MAX
      ? `${excerpt.slice(0, INPUT_EXCERPT_MAX)}…`
      : excerpt;
  return `\nExtracted text excerpt:\n${trimmed}`;
}

export function formatInput(
  input: AnalysisInput,
  index: number,
  extractedTextByInputIndex: Map<number, string> = new Map(),
): string {
  const label = `Input ${index + 1} (${input.type})`;

  switch (input.type) {
    case "text":
      return `${label}:\n${input.content}`;
    case "url":
      return `${label}:\n${input.url}`;
    case "image":
      return `${label}:\nassetId: ${input.assetId}${formatAssetExcerpt(index, extractedTextByInputIndex)}`;
    case "audio":
      return `${label}:\nassetId: ${input.assetId}${formatAssetExcerpt(index, extractedTextByInputIndex)}`;
    case "pdf":
      return `${label}:\nassetId: ${input.assetId}${formatAssetExcerpt(index, extractedTextByInputIndex)}`;
    default: {
      const _exhaustive: never = input;
      return _exhaustive;
    }
  }
}

export function buildSubmissionPrompt(
  request: AnalyzeRequest,
  extractedTextByInputIndex: Map<number, string> = new Map(),
): string {
  const inputBlocks = request.inputs
    .map((input, index) =>
      formatInput(input, index, extractedTextByInputIndex),
    )
    .join("\n\n");
  const contextBlock = request.context
    ? `\n\nContext:\n${JSON.stringify(request.context, null, 2)}`
    : "";

  return `Submission:\n\n${inputBlocks}${contextBlock}`;
}

export function buildReviewerPrompt(params: {
  request: AnalyzeRequest;
  evidences: Evidence[];
  classifier: ClassifierResult;
  extractedTextByInputIndex?: Map<number, string>;
}): string {
  const submission = buildSubmissionPrompt(
    params.request,
    params.extractedTextByInputIndex ?? new Map(),
  );
  return `Review this submission. A fast classifier produced a prior assessment; challenge it rather than copying it blindly.

For decision and riskyParts, quote only contiguous substrings that appear in the submission inputs below. Each riskyParts.message should explain that quote in one short sentence.

Classifier prior:
${JSON.stringify(params.classifier.answers, null, 2)}

Collected evidence:
${JSON.stringify(params.evidences, null, 2)}

${submission}`;
}
