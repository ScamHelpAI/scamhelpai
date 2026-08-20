import { useState, type FormEvent } from "react";
import type { AnalyzeResponse } from "./types";

const ANALYZE_ENDPOINT = import.meta.env.VITE_API_URL ?? "/api/analyze";

function categoryLabel(category: AnalyzeResponse["category"]): string {
  switch (category) {
    case "phishing":
      return "Phishing";
    case "social_engineering":
      return "Social engineering";
    case "malware":
      return "Malware";
    case "legitimate":
      return "Looks legitimate";
    case "unknown":
      return "Unclear";
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

export default function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Paste a message or URL to check.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const looksLikeUrl = /^https?:\/\//i.test(trimmed) && !/\s/.test(trimmed);
      const body = looksLikeUrl
        ? { type: "url" as const, url: trimmed }
        : { type: "text" as const, text: trimmed };

      const response = await fetch(ANALYZE_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Analysis failed. Is the API server running?");
      }

      setResult((await response.json()) as AnalyzeResponse);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <p className="brand">ScamHelp</p>
      <h1>Paste a suspicious message.</h1>
      <p className="lede">
        We check the wording, links, and common scam patterns, then explain what
        looks off.
      </p>

      <form className="check-form" onSubmit={onSubmit}>
        <label htmlFor="message">Message or URL</label>
        <textarea
          id="message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Your account will be suspended in 24 hours. Verify now at…"
          rows={7}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Checking…" : "Check for scams"}
        </button>
      </form>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className={`result result--${result.level}`} aria-live="polite">
          <div className="result-score">
            <span className="score-value">{result.riskScore}</span>
            <span>
              <strong>{result.level} risk</strong>
              <span className="score-category">{categoryLabel(result.category)}</span>
            </span>
          </div>
          <p className="recommendation">{result.recommendation}</p>
          <ul>
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
