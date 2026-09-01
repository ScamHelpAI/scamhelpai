import type { AnalysisResult, AnalyzeRequest } from "./types.ts";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function isPageUrl(url: string | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export async function getActiveTabUrl(): Promise<string> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!isPageUrl(tab?.url)) {
    throw new Error("Open a normal http or https page first.");
  }

  return tab.url;
}

export async function scanPageUrl(pageUrl: string): Promise<AnalysisResult> {
  const body: AnalyzeRequest = {
    inputs: [{ type: "url", url: pageUrl }],
    context: {
      source: "browser_extension",
      pageUrl,
    },
  };

  const response = await fetch(`${API_BASE}/v1/analyses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((data: { message?: string }) => data.message)
      .catch(() => undefined);

    throw new Error(message ?? `Scan failed (${response.status})`);
  }

  return response.json() as Promise<AnalysisResult>;
}
