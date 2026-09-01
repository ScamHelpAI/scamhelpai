import { useState } from "react";
import { getActiveTabUrl, scanPageUrl } from "./api.ts";
import type { AnalysisResult, RiskLevel } from "./types.ts";

const riskStyles: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

function formatRiskLevel(level: RiskLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const pageUrl = await getActiveTabUrl();
      const analysis = await scanPageUrl(pageUrl);
      setResult(analysis);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not scan this page. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6">
      <h1 className="mb-2 text-xl font-semibold leading-tight">ScamHelp AI</h1>
      <p className="text-sm leading-relaxed text-muted">
        Check suspicious messages and URLs for scam signals.
      </p>

      <button
        type="button"
        onClick={handleScan}
        disabled={loading}
        className="mt-4 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Scanning…" : "Scan this page"}
      </button>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskStyles[result.risk.level]}`}
            >
              {formatRiskLevel(result.risk.level)} risk
            </span>
            <span className="text-xs text-muted">
              {Math.round(result.risk.score * 100)}% score
            </span>
          </div>
          <p className="text-sm leading-relaxed">{result.summary}</p>
          {result.evidence.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-muted">
              {result.evidence.slice(0, 3).map((item) => (
                <li key={item.id} className="leading-snug">
                  {item.summary}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
