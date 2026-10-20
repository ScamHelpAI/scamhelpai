import { useEffect, useState } from "react";
import { Loader2Icon, ScanSearchIcon, SettingsIcon } from "lucide-react";
import { VerdictIcon, iconForTone } from "@/components/verdict-icon.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AnalyzeResponse } from "@/shared/messages.ts";
import type { AnalysisResult } from "@/shared/types.ts";
import { toVerdict, type VerdictTone } from "@/shared/verdict.ts";

const REVIEW_POLL_MS = 1500;
const REVIEW_POLL_MAX_ATTEMPTS = 20;

function toneBadgeVariant(
  tone: VerdictTone,
): "danger" | "warn" | "safe" {
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
              {verdict.riskScore}/100
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviewing ? (
          <p className="flex items-center gap-2 text-base text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Initial result — checking for review updates…
          </p>
        ) : null}
        {verdict.reviewNote ? (
          <p className="text-base text-muted-foreground">{verdict.reviewNote}</p>
        ) : null}
        {verdict.reasons.length > 0 ? (
          <div>
            <p className="mb-2 text-base font-semibold">Why we think so</p>
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
    <main className="w-96 p-5">
      <Card size="sm" className="border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="animate-stagger-in gap-2 px-0 pt-0">
          <CardTitle className="text-3xl leading-tight font-bold tracking-tight">
            ScamHelp AI
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Check the page you have open for scam signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <Button
            type="button"
            className="animate-stagger-in w-full text-lg shadow-md"
            style={{ animationDelay: "var(--duration-stagger)" }}
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
            <Alert variant="destructive" className="animate-panel-in text-base">
              <AlertTitle className="text-base">Scan failed</AlertTitle>
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          ) : null}

          {result ? <VerdictCard result={result} reviewing={reviewing} /> : null}
        </CardContent>
        <Separator className="my-2" />
        <CardFooter className="justify-start border-0 bg-transparent px-0">
          <Button
            type="button"
            variant="ghost"
            size="default"
            className="text-base"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            <SettingsIcon data-icon="inline-start" />
            Settings
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
