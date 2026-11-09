import {
  analysesUrl,
  analysisUrl,
  analyzerErrorMessage,
  checkUrlsUrl,
  DEFAULT_API_BASE,
} from "../shared/api-url.ts";
import {
  CHECK_URLS_BATCH_SIZE,
  chunkUrls,
  type CheckUrlResult,
} from "../shared/check.ts";
import type {
  AnalyzeMessage,
  AnalyzeOpenEmailMessage,
  AnalyzeResponse,
  ApplyPageAnnotationsMessage,
  ApplyPageAnnotationsResponse,
  CheckUrlsMessage,
  CheckUrlsResponseMessage,
  GetAnalysisMessage,
  ReadActivePageMessage,
  ReadPageResponse,
  ScanActivePageMessage,
} from "../shared/messages.ts";
import { pageHtmlToAnalyzeRequest } from "../shared/page-request.ts";
import {
  ALL_SITES,
  getLinkScanEnabled,
  LINK_SCAN_ENABLED_KEY,
  setLinkScanEnabled,
} from "../shared/settings.ts";
import type { AnalysisResult, AnalyzeRequest } from "../shared/types.ts";

async function injectLinkScannerIntoOpenTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) return;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content/links.js"],
        });
      } catch {
        // Restricted pages (chrome://, Web Store, etc.) cannot be scripted.
      }
    }),
  );
}

const LINK_SCRIPT_ID = "links";

/** Runs the link scanner on every page only while it is on and site access is granted. */
async function syncLinkScanner(): Promise<void> {
  const enabled = await getLinkScanEnabled();
  const granted = await chrome.permissions.contains({ origins: ALL_SITES });
  if (enabled && !granted) {
    // Access was revoked (or never granted after an update): turn the setting off to match.
    await setLinkScanEnabled(false);
    return;
  }
  const registered = await chrome.scripting.getRegisteredContentScripts({
    ids: [LINK_SCRIPT_ID],
  });
  if (enabled && registered.length === 0) {
    await chrome.scripting.registerContentScripts([
      {
        id: LINK_SCRIPT_ID,
        js: ["content/links.js"],
        matches: ALL_SITES,
        runAt: "document_idle",
      },
    ]);
    await injectLinkScannerIntoOpenTabs();
  } else if (!enabled && registered.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [LINK_SCRIPT_ID] });
  }
}

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
    throw new Error("Please go to a webpage first.");
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
    const response = (await chrome.tabs.sendMessage(tabId, request)) as
      ReadPageResponse | undefined;
    if (response) return response;
  } catch {
    // Content script not injected yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/page.js"],
    });
    const response = (await chrome.tabs.sendMessage(tabId, request)) as
      ReadPageResponse | undefined;

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

async function applyPageAnnotations(
  message: ApplyPageAnnotationsMessage,
): Promise<ApplyPageAnnotationsResponse> {
  const tab = await getActiveTab();
  const tabId = tab.id;
  if (tabId === undefined) {
    return { ok: false, error: "No active tab found." };
  }

  try {
    const response = (await chrome.tabs.sendMessage(tabId, message)) as
      ApplyPageAnnotationsResponse | undefined;
    if (response?.ok) return response;
  } catch {
    // Content script not injected yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/annotations.js"],
    });
    const response = (await chrome.tabs.sendMessage(tabId, message)) as
      ApplyPageAnnotationsResponse | undefined;

    if (!response?.ok) {
      return {
        ok: false,
        error: response?.error ?? "Annotation script did not respond.",
      };
    }
    return response;
  } catch {
    return {
      ok: false,
      error: "Could not annotate this page. Try reloading the tab.",
    };
  }
}

async function scanActivePage(): Promise<AnalysisResult> {
  const page = await readActivePageContents();
  if (!page.ok) {
    throw new Error(page.error);
  }

  return createAnalysis(pageHtmlToAnalyzeRequest(page.html, page.url));
}

async function checkUrls(urls: string[]): Promise<CheckUrlResult[]> {
  const unique = [...new Set(urls)];
  const apiBase = await getApiBase();
  const results: CheckUrlResult[] = [];

  for (const batch of chunkUrls(unique, CHECK_URLS_BATCH_SIZE)) {
    const res = await fetch(checkUrlsUrl(apiBase), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: batch,
        context: { source: "browser_extension" },
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new Error(analyzerErrorMessage(res.status, bodyText));
    }

    const body = (await res.json()) as { results: CheckUrlResult[] };
    results.push(...body.results);
  }

  return results;
}

const ANALYZE_EMAIL_MENU_ID = "scamhelp-analyze-email";

chrome.runtime.onInstalled.addListener(() => {
  void syncLinkScanner();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: ANALYZE_EMAIL_MENU_ID,
      title: "Analyze Email",
      contexts: ["all"],
      documentUrlPatterns: ["https://mail.google.com/*"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== ANALYZE_EMAIL_MENU_ID || tab?.id === undefined) return;
  // Same scan → panel sequence as the in-page button (handled by content/gmail.js).
  chrome.tabs
    .sendMessage(tab.id, {
      type: "analyzeOpenEmail",
    } satisfies AnalyzeOpenEmailMessage)
    .catch(() => {
      // Gmail tab opened before the extension loaded; a reload injects the script.
    });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !(LINK_SCAN_ENABLED_KEY in changes)) return;
  void syncLinkScanner();
});

chrome.permissions.onRemoved.addListener(() => void syncLinkScanner());

chrome.runtime.onMessage.addListener(
  (
    message:
      | ReadActivePageMessage
      | ScanActivePageMessage
      | AnalyzeMessage
      | GetAnalysisMessage
      | CheckUrlsMessage
      | ApplyPageAnnotationsMessage,
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

    if (message?.type === "applyPageAnnotations") {
      applyPageAnnotations(message)
        .then((response) => sendResponse(response))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not annotate this page.",
          } satisfies ApplyPageAnnotationsResponse),
        );
      return true;
    }

    if (message?.type === "checkUrls") {
      checkUrls(message.urls)
        .then((results) =>
          sendResponse({
            ok: true,
            results,
          } satisfies CheckUrlsResponseMessage),
        )
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Is the ScamHelp server running?",
          } satisfies CheckUrlsResponseMessage),
        );
      return true;
    }

    return false;
  },
);
