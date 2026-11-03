import type { AnalyzeResponse } from "../../shared/messages.ts";
import type { AnalysisResult, AnalyzeRequest } from "../../shared/types.ts";
import {
  REVIEW_POLL_MAX_ATTEMPTS,
  REVIEW_POLL_MS,
} from "../../shared/analysis-poll.ts";
import { applyAnnotations } from "../annotations/decorate.ts";
import { findOpenMessage, markAnnotateRoot } from "./dom.ts";
import { getButtonStatusEl, SCAN_STEPS, setButtonState } from "./button.ts";
import { clearGmailVerdict, renderGmailVerdict } from "./mount-verdict.tsx";

/** Same /v1/analyses text path as page scan — headers are baked into content. */
function textAnalyzeRequest(text: string, pageUrl: string): AnalyzeRequest {
  return {
    inputs: [{ type: "text", content: text }],
    context: {
      source: "browser_extension",
      pageUrl,
    },
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

const SCAN_STEP_MS = 1400;

/** Advance the status text while the request is pending; holds on the last step until stopped. */
function cycleScanSteps(statusEl: HTMLElement | null): () => void {
  let step = 0;
  const timer = setInterval(() => {
    step = Math.min(step + 1, SCAN_STEPS.length - 1);
    if (statusEl) statusEl.textContent = SCAN_STEPS[step];
  }, SCAN_STEP_MS);
  return () => clearInterval(timer);
}

/** Tint + sweeping scan line over the email body (styles in content/ui/motion.css). */
function showScanOverlay(body: HTMLElement, doc: Document): () => void {
  const overlay = doc.createElement("div");
  overlay.className = "sh-scan";
  overlay.setAttribute("aria-hidden", "true");
  const line = doc.createElement("div");
  line.className = "sh-scanline";
  overlay.append(line);
  body.classList.add("sh-scanning");
  body.append(overlay);
  return () => {
    overlay.remove();
    body.classList.remove("sh-scanning");
  };
}

export async function scanOpenGmailEmail(
  button: HTMLButtonElement,
  doc: Document = document,
): Promise<void> {
  const statusEl = getButtonStatusEl(button);
  setButtonState(button, "loading", statusEl);
  const stopSteps = cycleScanSteps(statusEl);
  let stopScan = () => {};
  renderGmailVerdict(doc, button, {
    loading: true,
    reviewing: false,
    result: null,
  });

  try {
    const open = findOpenMessage(doc);
    if (!open) {
      throw new Error("Open an email first, then try again.");
    }

    markAnnotateRoot(open.body, doc);
    stopScan = showScanOverlay(open.body, doc);

    const initial = await requestAnalyze(
      textAnalyzeRequest(open.text, doc.location.href),
    );
    stopSteps();

    if (initial.status === "failed") {
      throw new Error("Analysis failed. Try again in a moment.");
    }

    let result = initial;

    renderGmailVerdict(doc, button, {
      loading: false,
      reviewing: initial.status === "reviewing",
      result: initial,
      footerMessage:
        initial.status === "reviewing"
          ? "Finding risky phrases in this email…"
          : undefined,
    });

    if (initial.status === "reviewing") {
      setButtonState(button, "reviewing", statusEl, {
        message: "Double-checking with ScamHelp…",
      });
      result = await waitForCompletion(initial.id);
      renderGmailVerdict(doc, button, {
        loading: false,
        reviewing: false,
        result,
        footerMessage: "Finding risky phrases in this email…",
      });
    } else {
      setButtonState(button, "done", statusEl, { message: "" });
    }

    if (result.status === "failed") {
      throw new Error("Analysis failed. Try again in a moment.");
    }
    if (result.status !== "completed") {
      throw new Error("The check is taking too long. Try again in a moment.");
    }

    stopScan();
    const highlighted = applyHighlights(result, open.body, doc);
    const footerMessage = doneStatusMessage(highlighted);

    renderGmailVerdict(doc, button, {
      loading: false,
      reviewing: false,
      result,
      footerMessage,
    });

    setButtonState(button, "done", statusEl, {
      message: footerMessage,
    });
  } catch (error) {
    clearGmailVerdict(doc, button);
    setButtonState(button, "error", statusEl, {
      message:
        error instanceof Error ? error.message : "Could not check this email.",
    });
  } finally {
    stopSteps();
    stopScan();
  }
}
