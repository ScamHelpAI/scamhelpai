export const DEFAULT_SCAMHELP_API_BASE = "https://api.scamhelp.ai";

export function getScamhelpApiBase(): string {
  const raw =
    process.env.SCAMHELP_API_BASE ??
    process.env.NEXT_PUBLIC_SCAMHELP_API_BASE ??
    DEFAULT_SCAMHELP_API_BASE;
  return raw.replace(/\/+$/, "");
}

export function analyzerErrorMessage(status: number, bodyText: string): string {
  if (status === 0) {
    return "Could not reach the ScamHelp server. Try again in a moment.";
  }
  if (bodyText.trim()) {
    try {
      const parsed = JSON.parse(bodyText) as {
        message?: string;
        error?: string;
      };
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
