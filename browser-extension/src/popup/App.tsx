import { useEffect, useState } from "react";
import { Loader2Icon, ScanSearchIcon, SettingsIcon } from "lucide-react";
import { VerdictIcon } from "@/components/verdict-icon.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  AnalyzeResponse,
  ApplyPageAnnotationsMessage,
} from "@/shared/messages.ts";
import {
  REVIEW_POLL_MAX_ATTEMPTS,
  REVIEW_POLL_MS,
} from "@/shared/analysis-poll.ts";
import type { AnalysisResult } from "@/shared/types.ts";
import { toVerdict, type VerdictTone } from "@/shared/verdict.ts";

function toneTextClass(tone: VerdictTone): string {
  switch (tone) {
    case "danger":
      return "text-risk-high";
    case "warn":
      return "text-risk-medium";
    case "safe":
      return "text-risk-low";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

/** Plain icon + title — no card, no evidence dump. */
function VerdictSummary({
  result,
  reviewing,
}: {
  result: AnalysisResult;
  reviewing: boolean;
}) {
  const verdict = toVerdict(result);

  return (
    <div
      className="animate-panel-in flex items-start gap-3"
      role="status"
      aria-live="polite"
    >
      <VerdictIcon tone={verdict.tone} confidence={result.risk.confidence} />
      <div className="min-w-0 space-y-1 pt-0.5">
        <p
          className={`font-heading text-lg leading-snug font-semibold ${toneTextClass(verdict.tone)}`}
        >
          {verdict.title}
        </p>
        {reviewing ? (
          <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Double-checking…
          </p>
        ) : (
          <p className="text-[15px] text-muted-foreground">
            {verdict.badgeLabel}
          </p>
        )}
      </div>
    </div>
  );
}

async function requestAnalysis(
  message: { type: "scanActivePage" } | { type: "getAnalysis"; id: string },
): Promise<AnalysisResult> {
  const response = (await chrome.runtime.sendMessage(message)) as
    | AnalyzeResponse
    | undefined;

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

  useEffect(() => {
    if (
      !result ||
      result.status !== "completed" ||
      !result.decision ||
      !result.riskyParts?.length
    ) {
      return;
    }

    const message: ApplyPageAnnotationsMessage = {
      type: "applyPageAnnotations",
      decision: result.decision,
      riskyParts: result.riskyParts,
    };

    void chrome.runtime.sendMessage(message);
  }, [result?.id, result?.status, result?.riskyParts, result?.decision]);

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
    <main className="flex w-88 flex-col gap-6 p-6">
      <header className="animate-stagger-in space-y-1.5">
        <h1 className="font-heading text-2xl leading-none font-bold tracking-tight text-foreground">
          ScamHelp AI
        </h1>
        <p className="text-[15px] leading-snug text-muted-foreground">
          Check the page you have open for scam signals.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <Button
          type="button"
          size="lg"
          onClick={() => void scanPage()}
          disabled={loading}
        >
          {loading ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <ScanSearchIcon data-icon="inline-start" />
          )}
          {loading ? "Scanning…" : "Scan this page"}
        </Button>

        {error ? (
          <Alert variant="destructive" className="animate-panel-in">
            <AlertTitle>Scan failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <VerdictSummary result={result} reviewing={reviewing} />
        ) : null}
      </div>

      <footer className="space-y-4">
        <Separator />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          <SettingsIcon data-icon="inline-start" />
          Settings
        </Button>
      </footer>
    </main>
  );
}
