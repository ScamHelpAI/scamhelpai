export const DEFAULT_API_BASE = "http://localhost:3000";

export function analysesUrl(apiBase: string): string {
  return `${apiBase.replace(/\/+$/, "")}/v1/analyses`;
}

export function analysisUrl(apiBase: string, id: string): string {
  return `${analysesUrl(apiBase)}/${id}`;
}

export function checkUrlsUrl(apiBase: string): string {
  return `${apiBase.replace(/\/+$/, "")}/v1/check/urls`;
}

export function analyzerErrorMessage(status: number, bodyText: string): string {
  if (status === 0) {
    return "Could not reach the ScamHelp server. Is it running?";
  }
  if (bodyText.trim()) {
    try {
      const parsed = JSON.parse(bodyText) as { message?: string; error?: string };
      if (typeof parsed.message === "string" && parsed.message) {
        return parsed.message;
      }
      if (typeof parsed.error === "string" && parsed.error) {
        return parsed.error;
      }
    } catch {
      // fall through
    }
  }
  return `Analyzer returned ${status}.`;
}
