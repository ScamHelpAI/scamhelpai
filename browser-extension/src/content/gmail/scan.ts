import type { AnalyzeResponse } from "../../shared/messages.ts";
import type { AnalysisResult, AnalyzeRequest } from "../../shared/types.ts";
import {
  REVIEW_POLL_MAX_ATTEMPTS,
  REVIEW_POLL_MS,
} from "../../shared/analysis-poll.ts";
import { toVerdict } from "../../shared/verdict.ts";
import { applyAnnotations } from "../annotations/decorate.ts";
import { findOpenMessage, markAnnotateRoot } from "./dom.ts";
import { getButtonStatusEl, setButtonState } from "./button.ts";

function emailAnalyzeRequest(text: string, pageUrl: string): AnalyzeRequest {
  return {
    inputs: [{ type: "text", content: text }],
    context: {
      source: "browser_extension",
      pageUrl,
    },
  };
}

function verdictUi(result: AnalysisResult) {
  const verdict = toVerdict(result);
  const topReason = verdict.reasons[0];
  const statusMessage = topReason
    ? `${topReason} Finding risky phrases…`
    : "Finding risky phrases…";
  return {
    tone: verdict.tone,
    label: `${verdict.title} · ${verdict.riskScore}/100`,
    statusMessage,
  };
}

function doneStatusMessage(highlighted: number): string {
  if (highlighted > 0) {
    return `Highlighted ${highlighted} risky ${highlighted === 1 ? "part" : "parts"}. Click one to see why.`;
  }
  return "No risky parts found in this email.";
}

async function requestAnalyze(
  request: AnalyzeRequest,
): Promise<AnalysisResult> {
  const response = (await chrome.runtime.sendMessage({
    type: "analyze",
    request,
  })) as AnalyzeResponse | undefined;

  if (!response?.ok) {
    throw new Error(
      response && "error" in response
        ? response.error
        : "Is the ScamHelp server running?",
    );
  }
  return response.result;
}

async function requestGetAnalysis(id: string): Promise<AnalysisResult> {
  const response = (await chrome.runtime.sendMessage({
    type: "getAnalysis",
    id,
  })) as AnalyzeResponse | undefined;

  if (!response?.ok) {
    throw new Error(
      response && "error" in response
        ? response.error
        : "Could not load analysis.",
    );
  }
  return response.result;
}

async function waitForCompletion(id: string): Promise<AnalysisResult> {
  let latest = await requestGetAnalysis(id);
  if (latest.status === "completed" || latest.status === "failed") {
    return latest;
  }

  for (let attempt = 0; attempt < REVIEW_POLL_MAX_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, REVIEW_POLL_MS));
    latest = await requestGetAnalysis(id);
    if (latest.status === "completed" || latest.status === "failed") {
      return latest;
    }
  }

  return latest;
}

function applyHighlights(
  result: AnalysisResult,
  body: HTMLElement,
  doc: Document,
): number {
  const riskyParts = result.riskyParts ?? [];
  if (!result.decision || riskyParts.length === 0) {
    return 0;
  }
  return applyAnnotations(result.decision, riskyParts, {
    doc,
    root: body,
  });
}

export async function scanOpenGmailEmail(
  button: HTMLButtonElement,
  doc: Document = document,
): Promise<void> {
  const statusEl = getButtonStatusEl(button);
  setButtonState(button, "loading", statusEl);

  try {
    const open = findOpenMessage(doc);
    if (!open) {
      throw new Error("Open an email first, then try again.");
    }

    markAnnotateRoot(open.body, doc);

    const initial = await requestAnalyze(
      emailAnalyzeRequest(open.text, doc.location.href),
    );

    if (initial.status === "failed") {
      throw new Error("Analysis failed. Try again in a moment.");
    }

    let result = initial;
    const quickUi = verdictUi(initial);

    if (initial.status === "reviewing") {
      setButtonState(button, "reviewing", statusEl, {
        tone: quickUi.tone,
        label: quickUi.label,
        message: quickUi.statusMessage,
      });
      result = await waitForCompletion(initial.id);
    }

    if (result.status === "failed") {
      throw new Error("Analysis failed. Try again in a moment.");
    }
    if (result.status !== "completed") {
      throw new Error("The check is taking too long. Try again in a moment.");
    }

    const highlighted = applyHighlights(result, open.body, doc);
    const finalUi = verdictUi(result);

    setButtonState(button, "done", statusEl, {
      tone: finalUi.tone,
      label: finalUi.label,
      message: doneStatusMessage(highlighted),
    });
  } catch (error) {
    setButtonState(button, "error", statusEl, {
      message:
        error instanceof Error ? error.message : "Could not check this email.",
    });
  }
}
