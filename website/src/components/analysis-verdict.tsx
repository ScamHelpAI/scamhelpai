import type { LucideIcon } from "lucide-react";
import {
  BanknoteIcon,
  BriefcaseIcon,
  BugIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  CoinsIcon,
  FishIcon,
  HeartIcon,
  Loader2Icon,
  ShieldAlertIcon,
  TriangleAlertIcon,
  UserRoundXIcon,
  WrenchIcon,
} from "lucide-react";

import { ScoreGauge } from "@/components/score-gauge";
import type { AnalysisResult } from "@/lib/analysis-types";
import {
  classificationLabel,
  toVerdict,
  type VerdictTone,
} from "@/lib/verdict";
import { cn } from "@/lib/utils";

const toneBorderClass: Record<VerdictTone, string> = {
  danger: "border-risk-high text-foreground",
  warn: "border-risk-medium text-foreground",
  safe: "border-risk-low text-foreground",
};

const toneIconClass: Record<VerdictTone, string> = {
  danger: "text-risk-high",
  warn: "text-risk-medium",
  safe: "text-risk-low",
};

const toneFillClass: Record<VerdictTone, string> = {
  danger: "bg-risk-high text-white",
  warn: "bg-risk-medium text-white",
  safe: "bg-risk-low text-white",
};

function riskBadgeIcon(tone: VerdictTone): LucideIcon {
  switch (tone) {
    case "danger":
      return TriangleAlertIcon;
    case "warn":
      return CircleAlertIcon;
    case "safe":
      return CircleCheckIcon;
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function classificationIcon(primary: string): LucideIcon {
  switch (primary) {
    case "credential_phishing":
      return FishIcon;
    case "account_takeover":
      return UserRoundXIcon;
    case "tech_support":
      return WrenchIcon;
    case "impersonation":
      return UserRoundXIcon;
    case "investment":
    case "crypto":
      return CoinsIcon;
    case "romance":
      return HeartIcon;
    case "job":
      return BriefcaseIcon;
    case "invoice":
    case "payment":
      return BanknoteIcon;
    case "malware":
      return BugIcon;
    case "other":
      return ShieldAlertIcon;
    case "unknown":
      return CircleHelpIcon;
    default:
      return ShieldAlertIcon;
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
  const RiskIcon = riskBadgeIcon(verdict.tone);
  const ClassIcon = classificationIcon(result.classification.primary);
  const classLabel = classificationLabel(result.classification.primary);

  return (
    <div
      className="animate-panel-in flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-5 py-6"
      role="status"
      aria-live="polite"
      aria-busy={reviewing}
    >
      <span
        className={cn(
          "inline-flex h-10 w-full max-w-56 items-center justify-center gap-2 rounded-full border-2 bg-card px-4 font-heading text-sm font-semibold tracking-wide",
          toneBorderClass[verdict.tone],
        )}
      >
        <RiskIcon
          className={cn("size-5 stroke-[2.5]", toneIconClass[verdict.tone])}
          aria-hidden
        />
        {verdict.badgeLabel}
      </span>

      <ScoreGauge score={result.risk.score} tone={verdict.tone} />

      {reviewing ? (
        <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          Double-checking…
        </p>
      ) : (
        <span
          className={cn(
            "inline-flex h-10 w-full max-w-56 items-center justify-center gap-2 rounded-full px-4 font-heading text-sm font-semibold tracking-wide",
            toneFillClass[verdict.tone],
          )}
        >
          <ClassIcon className="size-5 stroke-[2.5]" aria-hidden />
          {classLabel}
        </span>
      )}
    </div>
  );
}
