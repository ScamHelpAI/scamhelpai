export const DEFAULT_API_BASE = "http://localhost:3000";

export function analysesUrl(apiBase: string): string {
  return `${apiBase.replace(/\/+$/, "")}/v1/analyses`;
}

export function analyzerErrorMessage(status: number, bodyText: string): string {
  try {
    const data = JSON.parse(bodyText) as {
      message?: unknown;
      error?: unknown;
    };
    if (typeof data.message === "string" && data.message.length > 0) {
      return data.message;
    }
    if (typeof data.error === "string" && data.error.length > 0) {
      return data.error;
    }
  } catch {
    const trimmed = bodyText.trim();
    if (trimmed) return trimmed.slice(0, 200);
  }
  return `Analyzer returned ${status}.`;
}

