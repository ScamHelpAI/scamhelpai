import { useEffect, useState } from "react";
import type { AnalyzeResponse } from "../shared/messages.ts";
import type { AnalysisResult } from "../shared/types.ts";
import { toVerdict, type VerdictTone } from "../shared/verdict.ts";

const REVIEW_POLL_MS = 1500;
const REVIEW_POLL_MAX_ATTEMPTS = 20;

function toneClass(tone: VerdictTone): string {
  switch (tone) {
    case "danger":
      return "border-red-700 bg-red-50";
    case "warn":
      return "border-amber-700 bg-amber-50";
    case "safe":
      return "border-green-700 bg-green-50";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function VerdictCard({
  result,
  reviewing,
}: {
  result: AnalysisResult;
  reviewing: boolean;
}) {
  const verdict = toVerdict(result);

  return (
    <section
      className={`mt-5 rounded-xl border-[3px] p-4 ${toneClass(verdict.tone)}`}
      role="status"
      aria-live="polite"
    >
      <h2 className="mb-2 pr-2 text-xl font-bold leading-tight">
        {verdict.icon} {verdict.title}
      </h2>
      <p className="mb-3 text-base font-semibold leading-snug">
        {verdict.recommendation}
      </p>
      {reviewing ? (
        <p className="mb-3 text-sm font-medium text-slate-700">
          Initial result — checking for review updates…
        </p>
      ) : null}
      {verdict.reviewNote ? (
        <p className="mb-3 text-sm font-medium text-slate-700">
          {verdict.reviewNote}
        </p>
      ) : null}
      {verdict.reasons.length > 0 ? (
        <>
          <h3 className="mb-1 text-base font-bold">Why we think so</h3>
          <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[15px] leading-snug">
            {verdict.reasons.slice(0, 6).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="text-sm text-slate-600">
        Risk score: {verdict.riskScore} out of 100
      </p>
    </section>
  );
}

async function requestAnalysis(
  message: { type: "scanActivePage" } | { type: "getAnalysis"; id: string },
): Promise<AnalysisResult> {
  const response = (await chrome.runtime.sendMessage(
    message,
  )) as AnalyzeResponse | undefined;

  if (!response?.ok) {
    throw new Error(
      response && "error" in response
        ? response.error
        : "Is the ScamHelp server running?",
    );
  }

  return response.result;
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!result || result.status !== "reviewing") {
      setReviewing(false);
      return;
    }

    setReviewing(true);
    let cancelled = false;
    let attempts = 0;

    const timer = window.setInterval(() => {
      void (async () => {
        attempts += 1;
        if (attempts > REVIEW_POLL_MAX_ATTEMPTS) {
          window.clearInterval(timer);
          if (!cancelled) setReviewing(false);
          return;
        }

        try {
          const latest = await requestAnalysis({
            type: "getAnalysis",
            id: result.id,
          });
          if (cancelled) return;

          setResult(latest);
          if (latest.status === "completed" || latest.status === "failed") {
            window.clearInterval(timer);
            setReviewing(false);
          }
        } catch {
          // Keep showing the initial decision-model result.
          window.clearInterval(timer);
          if (!cancelled) setReviewing(false);
        }
      })();
    }, REVIEW_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [result?.id, result?.status]);

  async function scanPage() {
    setLoading(true);
    setError(null);
    setResult(null);
    setReviewing(false);

    try {
      const initial = await requestAnalysis({ type: "scanActivePage" });
      setResult(initial);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not scan this page.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-5">
      <h1 className="mb-1 text-2xl font-semibold leading-tight">ScamHelp AI</h1>
      <p className="mb-4 text-[15px] leading-relaxed text-slate-600">
        Check the page you have open for scam signals.
      </p>

      <button
        type="button"
        onClick={() => void scanPage()}
        disabled={loading}
        className="w-full rounded-xl bg-teal-800 px-4 py-3.5 text-[17px] font-semibold text-white hover:bg-teal-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Scanning…" : "Scan this page"}
      </button>

      {error ? (
        <p className="mt-3 text-[15px] font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {result ? <VerdictCard result={result} reviewing={reviewing} /> : null}

      <button
        type="button"
        className="mt-4 text-[15px] font-medium text-teal-800 hover:underline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        Settings
      </button>
    </main>
  );
}
