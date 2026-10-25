import { Loader2Icon } from "lucide-react";
import { VerdictSummary } from "@/components/verdict-summary.tsx";
import type { AnalysisResult } from "@/shared/types.ts";

export type GmailVerdictViewProps = {
  loading: boolean;
  reviewing: boolean;
  result: AnalysisResult | null;
  footerMessage?: string;
};

export function GmailVerdictView({
  loading,
  reviewing,
  result,
  footerMessage,
}: GmailVerdictViewProps) {
  if (loading) {
    return (
      <div
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-8"
        role="status"
        aria-live="polite"
      >
        <Loader2Icon className="size-8 animate-spin text-primary" aria-hidden />
        <p className="text-center text-[15px] text-muted-foreground">
          Checking this email…
        </p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <div className="w-full rounded-2xl border border-border bg-card px-4 py-5 shadow-sm">
        <VerdictSummary result={result} reviewing={reviewing} />
      </div>
      {footerMessage ? (
        <p className="max-w-sm text-center text-[13px] leading-snug text-muted-foreground">
          {footerMessage}
        </p>
      ) : null}
    </div>
  );
}
