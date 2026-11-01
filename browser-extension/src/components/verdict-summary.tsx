import type { LucideIcon } from "lucide-react";
import {
  BanknoteIcon,
  BriefcaseIcon,
  BugIcon,
  CheckIcon,
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
  XIcon,
} from "lucide-react";
import { ScoreGauge } from "@/components/score-gauge.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { AnalysisResult } from "@/shared/types.ts";
import {
  classificationLabel,
  toVerdict,
  type VerdictTone,
} from "@/shared/verdict.ts";
import { cn } from "cn";

const MAX_FINDINGS = 5;

const tonePillClass: Record<VerdictTone, string> = {
  danger: "border-risk-high/30 bg-risk-high-bg text-risk-high",
  warn: "border-risk-medium/30 bg-risk-medium-bg text-risk-medium",
  safe: "border-risk-low/30 bg-risk-low-bg text-risk-low",
};

const toneNumberClass: Record<VerdictTone, string> = {
  danger: "bg-risk-high-bg text-risk-high",
  warn: "bg-risk-medium-bg text-risk-medium",
  safe: "bg-risk-low-bg text-risk-low",
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

const FTC_REPORT_URL = "https://reportfraud.ftc.gov/";

/** Results panel: risk pill, score ring, scam type, findings, and Don't/Do guidance. */
function VerdictSummary({
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
  const decision = result.decision;

  return (
    <div
      className="animate-panel-in flex flex-col items-center gap-4 py-1"
      role="status"
      aria-live="polite"
    >
      <h2 className="font-heading text-[1.75rem] font-bold text-[#b8650a]">
        Analysis Results
      </h2>

      <span
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2.5 rounded-full border-2 px-6 font-heading text-lg font-bold tracking-wide",
          tonePillClass[verdict.tone],
        )}
      >
        <RiskIcon className="size-6 stroke-[2.4]" aria-hidden />
        {verdict.badgeLabel}
      </span>

      <ScoreGauge score={result.risk.score} tone={verdict.tone} />

      {reviewing ? (
        <p className="flex items-center gap-2 text-[17px] text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" aria-hidden />
          Double-checking…
        </p>
      ) : result.classification.primary !== "unknown" ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[17px] font-semibold">Scam type detected:</p>
          <span
            className={cn(
              "inline-flex h-13 items-center gap-2.5 rounded-full px-6 font-heading text-lg font-bold tracking-wide shadow-md",
              toneFillClass[verdict.tone],
            )}
          >
            <ClassIcon className="size-6 stroke-[2.2]" aria-hidden />
            {classLabel}
          </span>
        </div>
      ) : null}

      {verdict.reasons.length > 0 ? (
        <section className="w-full space-y-2.5 border-t border-border pt-3">
          <h3 className="font-heading text-xl font-semibold">What we found</h3>
          <ol className="space-y-2.5">
            {verdict.reasons.slice(0, MAX_FINDINGS).map((reason, i) => (
              <li key={reason} className="flex gap-3 text-[17px] leading-snug">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[15px] font-bold",
                    toneNumberClass[verdict.tone],
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                {reason}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {decision ? (
        <section className="w-full space-y-2.5 rounded-2xl bg-next-steps px-4 py-4">
          <h3 className="font-heading text-xl font-semibold text-trust">
            What to do now
          </h3>
          <ul className="space-y-2.5 text-[17px] leading-snug">
            <li className="flex gap-2.5">
              <XIcon
                className="mt-0.5 size-5.5 shrink-0 stroke-[2.6] text-risk-high"
                aria-hidden
              />
              <span>
                <span className="sr-only">Don&apos;t: </span>
                {decision.dont}
              </span>
            </li>
            <li className="flex gap-2.5">
              <CheckIcon
                className="mt-0.5 size-5.5 shrink-0 stroke-[2.6] text-risk-low"
                aria-hidden
              />
              <span>
                <span className="sr-only">Do: </span>
                {decision.do}
              </span>
            </li>
          </ul>
        </section>
      ) : null}

      {verdict.tone !== "safe" ? (
        <Button asChild variant="trust" size="lg" className="w-full">
          <a href={FTC_REPORT_URL} target="_blank" rel="noopener noreferrer">
            Report this scam to the FTC
          </a>
        </Button>
      ) : null}
    </div>
  );
}

export { VerdictSummary };
