import {
  analysesUrl,
  analysisUrl,
  analyzerErrorMessage,
  DEFAULT_API_BASE,
} from "../shared/api-url.ts";
import type {
  AnalyzeMessage,
  AnalyzeResponse,
  GetAnalysisMessage,
  ReadActivePageMessage,
  ReadPageResponse,
  ScanActivePageMessage,
} from "../shared/messages.ts";
import { pageHtmlToAnalyzeRequest } from "../shared/page-request.ts";
import type { AnalysisResult, AnalyzeRequest } from "../shared/types.ts";

async function getApiBase(): Promise<string> {
  const { apiBase } = await chrome.storage.sync.get("apiBase");
  return typeof apiBase === "string" && apiBase.length > 0
    ? apiBase.replace(/\/+$/, "")
    : DEFAULT_API_BASE;
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  if (!tab.url || !/^https?:/i.test(tab.url)) {
    throw new Error("Open a normal http or https page first.");
  }
  return tab;
}

async function readActivePageContents(): Promise<ReadPageResponse> {
  const tab = await getActiveTab();
  const tabId = tab.id;
  if (tabId === undefined) {
    return { ok: false, error: "No active tab found." };
  }

  const request = { type: "readPageContents" as const };

  try {
    const response = (await chrome.tabs.sendMessage(
      tabId,
      request,
    )) as ReadPageResponse | undefined;
    if (response) return response;
  } catch {
    // Content script not injected yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/page.js"],
    });
    const response = (await chrome.tabs.sendMessage(
      tabId,
      request,
    )) as ReadPageResponse | undefined;

    if (!response) {
      return { ok: false, error: "Page script did not respond." };
    }
    return response;
  } catch {
    return {
      ok: false,
      error: "Could not read this page. Try reloading the tab.",
    };
  }
}

async function createAnalysis(
  request: AnalyzeRequest,
): Promise<AnalysisResult> {
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

async function fetchAnalysis(id: string): Promise<AnalysisResult> {
  const res = await fetch(analysisUrl(await getApiBase(), id));
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(analyzerErrorMessage(res.status, bodyText));
  }
  return res.json() as Promise<AnalysisResult>;
}

async function scanActivePage(): Promise<AnalysisResult> {
  const page = await readActivePageContents();
  if (!page.ok) {
    throw new Error(page.error);
  }

  return createAnalysis(pageHtmlToAnalyzeRequest(page.html, page.url));
}

chrome.runtime.onMessage.addListener(
  (
    message:
      | ReadActivePageMessage
      | ScanActivePageMessage
      | AnalyzeMessage
      | GetAnalysisMessage,
    _sender,
    sendResponse,
  ) => {
    if (message?.type === "readActivePage") {
      readActivePageContents()
        .then((result) => sendResponse(result))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not read this page.",
          } satisfies ReadPageResponse),
        );
      return true;
    }

    if (message?.type === "scanActivePage") {
      scanActivePage()
        .then((result) =>
          sendResponse({ ok: true, result } satisfies AnalyzeResponse),
        )
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Is the ScamHelp server running?",
          } satisfies AnalyzeResponse),
        );
      return true;
    }

    if (message?.type === "getAnalysis") {
      fetchAnalysis(message.id)
        .then((result) =>
          sendResponse({ ok: true, result } satisfies AnalyzeResponse),
        )
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not load analysis.",
          } satisfies AnalyzeResponse),
        );
      return true;
    }

    if (message?.type === "analyze") {
      createAnalysis(message.request)
        .then((result) =>
          sendResponse({ ok: true, result } satisfies AnalyzeResponse),
        )
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Is the ScamHelp server running?",
          } satisfies AnalyzeResponse),
        );
      return true;
    }

    return false;
  },
);
