import {
  CircleAlertIcon,
  CircleCheckIcon,
  Loader2Icon,
  OctagonAlertIcon,
} from "lucide-react";

import type { AnalysisResult } from "@/lib/analysis-types";
import { toneTextClass, toVerdict, type VerdictTone } from "@/lib/verdict";
import { cn } from "@/lib/utils";

function VerdictGlyph({ tone }: { tone: VerdictTone }) {
  const className = "size-6";
  switch (tone) {
    case "danger":
      return <OctagonAlertIcon className={className} aria-hidden />;
    case "warn":
      return <CircleAlertIcon className={className} aria-hidden />;
    case "safe":
      return <CircleCheckIcon className={className} aria-hidden />;
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function toneSurfaceClass(tone: VerdictTone): string {
  switch (tone) {
    case "danger":
      return "bg-risk-high-bg text-risk-high";
    case "warn":
      return "bg-risk-medium-bg text-risk-medium";
    case "safe":
      return "bg-risk-low-bg text-risk-low";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function AnalysisVerdict({
  result,
  reviewing,
}: {
  result: AnalysisResult;
  reviewing: boolean;
}) {
  const verdict = toVerdict(result);

  return (
    <div
      className="animate-panel-in space-y-4 rounded-xl border border-border bg-card p-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
            toneSurfaceClass(verdict.tone),
          )}
        >
          <VerdictGlyph tone={verdict.tone} />
        </span>
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              "font-heading text-lg font-semibold leading-snug",
              toneTextClass(verdict.tone),
            )}
          >
            {verdict.title}
          </p>
          {reviewing ? (
            <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              Double-checking…
            </p>
          ) : (
            <p className="text-[15px] text-muted-foreground">
              {verdict.badgeLabel}
            </p>
          )}
        </div>
      </div>

      <p className="text-[15px] leading-relaxed text-foreground">
        {result.summary}
      </p>

      {verdict.reasons.length > 0 && (
        <ul className="space-y-2 text-[15px] text-muted-foreground">
          {verdict.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span aria-hidden className="text-brand">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
