import { useEffect, useState } from "react";
import { Loader2Icon, ScanSearchIcon, SettingsIcon } from "lucide-react";
import { VerdictIcon, iconForTone } from "@/components/verdict-icon.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function toneBadgeVariant(tone: VerdictTone): "danger" | "warn" | "safe" {
  switch (tone) {
    case "danger":
      return "danger";
    case "warn":
      return "warn";
    case "safe":
      return "safe";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function toneCardClass(tone: VerdictTone): string {
  switch (tone) {
    case "danger":
      return "bg-risk-high-bg ring-risk-high/35";
    case "warn":
      return "bg-risk-medium-bg ring-risk-medium/35";
    case "safe":
      return "bg-risk-low-bg ring-risk-low/35";
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
  const ToneIcon = iconForTone(verdict.tone);

  return (
    <Card
      className={`animate-panel-in ${toneCardClass(verdict.tone)}`}
      size="sm"
      role="status"
      aria-live="polite"
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <VerdictIcon tone={verdict.tone} />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <CardTitle className="text-lg leading-snug font-semibold">
              {verdict.title}
            </CardTitle>
            <Badge
              variant={toneBadgeVariant(verdict.tone)}
              className="shrink-0 gap-1.5 px-3 py-1 text-sm"
            >
              <ToneIcon className="size-4 stroke-[2.25]" aria-hidden />
              {verdict.badgeLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviewing ? (
          <p className="flex items-center gap-2 text-base text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Double-checking…
          </p>
        ) : null}
        {verdict.reasons.length > 0 ? (
          <div>
            <p className="mb-2 font-heading text-base font-semibold">
              Why we think so
            </p>
            <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
              {verdict.reasons.slice(0, 6).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
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
            <Loader2Icon
              data-icon="inline-start"
              className="size-5 animate-spin"
            />
          ) : (
            <ScanSearchIcon data-icon="inline-start" className="size-5" />
          )}
          {loading ? "Scanning…" : "Scan this page"}
        </Button>

        {error ? (
          <Alert variant="destructive" className="animate-panel-in text-base">
            <AlertTitle className="text-base">Scan failed</AlertTitle>
            <AlertDescription className="text-base">{error}</AlertDescription>
          </Alert>
        ) : null}

        {result ? <VerdictCard result={result} reviewing={reviewing} /> : null}
      </div>

      <footer className="space-y-4">
        <Separator className="opacity-80" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 text-[15px] font-medium text-muted-foreground"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          <SettingsIcon data-icon="inline-start" className="size-4" />
          Settings
        </Button>
      </footer>
    </main>
  );
}
