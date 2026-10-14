import type { AnalyzeRequest } from "./types.ts";

const MAX_HTML_CHARS = 20_000;

export function pageHtmlToAnalyzeRequest(
  html: string,
  pageUrl?: string,
): AnalyzeRequest {
  const content = html.trim().slice(0, MAX_HTML_CHARS);
  if (!content) {
    throw new Error("This page had no readable content.");
  }

  return {
    inputs: [{ type: "text", content }],
    context: {
      source: "browser_extension",
      ...(pageUrl ? { pageUrl } : {}),
    },
  };
}
