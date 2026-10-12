import {
  analysesUrl,
  analyzerErrorMessage,
  DEFAULT_API_BASE,
} from "./api-url.ts";
import type {
  AnalyzeMessage,
  AnalyzeRequest,
  AnalysisResult,
} from "./types.ts";

async function getApiBase(): Promise<string> {
  const { apiBase } = await chrome.storage.sync.get("apiBase");
  return typeof apiBase === "string" && apiBase.length > 0
    ? apiBase.replace(/\/+$/, "")
    : DEFAULT_API_BASE;
}

async function runAnalysis(request: AnalyzeRequest): Promise<AnalysisResult> {
  const res = await fetch(analysesUrl(await getApiBase()), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(analyzerErrorMessage(res.status, bodyText));
  }

  return res.json() as Promise<AnalysisResult>;
}

chrome.runtime.onMessage.addListener(
  (message: AnalyzeMessage, _sender, sendResponse) => {
    if (message?.type !== "analyze") return false;

    runAnalysis(message.request)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err: unknown) =>
        sendResponse({
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Is the ScamHelp server running?",
        }),
      );

    return true;
  },
);
