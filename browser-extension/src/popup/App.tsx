import { useEffect, useState } from "react";
import { Loader2Icon, ScanSearchIcon, SettingsIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { AnalyzeResponse } from "@/shared/messages.ts";
import {
  getLinkScanEnabled,
  setLinkScanEnabled,
} from "@/shared/settings.ts";
import type { AnalysisResult } from "@/shared/types.ts";
import { toVerdict, type VerdictTone } from "@/shared/verdict.ts";

const REVIEW_POLL_MS = 1500;
const REVIEW_POLL_MAX_ATTEMPTS = 20;

function toneBadgeVariant(
  tone: VerdictTone,
): "destructive" | "secondary" | "outline" {
  switch (tone) {
    case "danger":
      return "destructive";
    case "warn":
      return "secondary";
    case "safe":
      return "outline";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function toneCardClass(tone: VerdictTone): string {
  switch (tone) {
    case "danger":
      return "ring-destructive/40 bg-destructive/5";
    case "warn":
      return "ring-amber-500/40 bg-amber-50 dark:bg-amber-950/30";
    case "safe":
      return "ring-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30";
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
    <Card
      className={toneCardClass(verdict.tone)}
      size="sm"
      role="status"
      aria-live="polite"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">
            {verdict.icon} {verdict.title}
          </CardTitle>
          <Badge variant={toneBadgeVariant(verdict.tone)}>
            {verdict.riskScore}/100
          </Badge>
        </div>
        <CardDescription className="text-foreground/80">
          {verdict.recommendation}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviewing ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            Initial result — checking for review updates…
          </p>
        ) : null}
        {verdict.reviewNote ? (
          <p className="text-sm text-muted-foreground">{verdict.reviewNote}</p>
        ) : null}
        {verdict.reasons.length > 0 ? (
          <div>
            <p className="mb-1.5 text-sm font-medium">Why we think so</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
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
  const [linkScanEnabled, setLinkScanEnabledState] = useState(false);
  const [linkScanReady, setLinkScanReady] = useState(false);

  useEffect(() => {
    void getLinkScanEnabled().then((enabled) => {
      setLinkScanEnabledState(enabled);
      setLinkScanReady(true);
    });
  }, []);

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

  async function toggleLinkScan(next: boolean) {
    setLinkScanEnabledState(next);
    await setLinkScanEnabled(next);
  }

  return (
    <main className="w-80 p-4">
      <Card size="sm" className="border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg">ScamHelp AI</CardTitle>
          <CardDescription>
            Check the page you have open for scam signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-0">
          <div className="flex items-start justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-3">
            <div className="space-y-1 pr-2">
              <Label htmlFor="link-scan" className="text-sm font-medium">
                Scan links on pages
              </Label>
              <p className="text-xs leading-snug text-muted-foreground">
                Amber caution on risky links; block unsafe ones.
              </p>
            </div>
            <Switch
              id="link-scan"
              checked={linkScanEnabled}
              disabled={!linkScanReady}
              onCheckedChange={(checked) => void toggleLinkScan(checked)}
            />
          </div>

          <Button
            type="button"
            className="w-full"
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
            <Alert variant="destructive">
              <AlertTitle>Scan failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {result ? <VerdictCard result={result} reviewing={reviewing} /> : null}
        </CardContent>
        <Separator className="my-1" />
        <CardFooter className="justify-start border-0 bg-transparent px-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
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
