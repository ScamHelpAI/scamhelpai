import { useState } from "react";

type AnalyzeMessageResponse = {
  count: number;
};

function isPageUrl(url: string | undefined): boolean {
  return Boolean(url && /^https?:\/\//i.test(url));
}

async function requestPageAnalysis(tabId: number): Promise<AnalyzeMessageResponse> {
  try {
    return await chrome.tabs.sendMessage<
      { type: "analyze-page" },
      AnalyzeMessageResponse
    >(tabId, { type: "analyze-page" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });

    return chrome.tabs.sendMessage<
      { type: "analyze-page" },
      AnalyzeMessageResponse
    >(tabId, { type: "analyze-page" });
  }
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyzePage() {
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id || !isPageUrl(tab.url)) {
        throw new Error("Open a normal http or https page first.");
      }

      const result = await requestPageAnalysis(tab.id);

      setStatus(
        `Added test markers to ${result.count} URL${result.count === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not analyze this page. Try refreshing it.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <p className="brand">ScamHelp</p>
      <h1>Analyze this page</h1>
      <p className="lede">
        Add temporary test markers above every URL so we can validate the page
        experience.
      </p>

      <button
        className="analyze-button"
        type="button"
        onClick={analyzePage}
        disabled={loading}
      >
        {loading ? "Analyzing…" : "Analyze page"}
      </button>

      {status ? (
        <p className="status" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
