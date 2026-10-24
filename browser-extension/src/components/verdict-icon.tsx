import type { ReactNode } from "react";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  OctagonAlertIcon,
} from "lucide-react";
import type { VerdictTone } from "@/shared/verdict.ts";
import { cn } from "cn";

const toneIconClass: Record<VerdictTone, string> = {
  danger: "bg-risk-high-bg text-risk-high ring-risk-high/35",
  warn: "bg-risk-medium-bg text-risk-medium ring-risk-medium/35",
  safe: "bg-risk-low-bg text-risk-low ring-risk-low/35",
};

const toneRingClass: Record<VerdictTone, string> = {
  danger: "text-risk-high",
  warn: "text-risk-medium",
  safe: "text-risk-low",
};

const toneRingTrackClass: Record<VerdictTone, string> = {
  danger: "text-risk-high/25",
  warn: "text-risk-medium/25",
  safe: "text-risk-low/25",
};

const RING_SIZE = 48;
const RING_STROKE = 3.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2 - 1;

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function ConfidenceRing({
  tone,
  confidence,
  children,
  className,
}: {
  tone: VerdictTone;
  confidence: number;
  children: ReactNode;
  className?: string;
}) {
  const value = clampConfidence(confidence);
  const circumference = 2 * Math.PI * RING_RADIUS;
  const dashOffset = circumference * (1 - value);
  const percent = Math.round(value * 100);
  const center = RING_SIZE / 2;

  return (
    <span
      className={cn(
        "relative inline-flex size-12 shrink-0 items-center justify-center",
        className,
      )}
      role="img"
      aria-label={`${percent}% confidence`}
    >
      <svg
        className="absolute inset-0 -rotate-90"
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        aria-hidden
      >
        <circle
          cx={center}
          cy={center}
          r={RING_RADIUS}
          fill="none"
          className={toneRingTrackClass[tone]}
          stroke="currentColor"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={center}
          cy={center}
          r={RING_RADIUS}
          fill="none"
          className={toneRingClass[tone]}
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      {children}
    </span>
  );
}

function iconForTone(tone: VerdictTone) {
  switch (tone) {
    case "danger":
      return OctagonAlertIcon;
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

type VerdictIconProps = {
  tone: VerdictTone;
  /** When set, draws a circular confidence ring (0–1) in the risk tone colors. */
  confidence?: number;
  className?: string;
  iconClassName?: string;
};

/** Rounded icon tile matching the senior design system risk levels. */
function VerdictIcon({
  tone,
  confidence,
  className,
  iconClassName,
}: VerdictIconProps) {
  const Icon = iconForTone(tone);

  if (confidence !== undefined) {
    return (
      <ConfidenceRing tone={tone} confidence={confidence} className={className}>
        <Icon
          className={cn(
            "relative size-5 stroke-[2.25]",
            toneRingClass[tone],
            iconClassName,
          )}
          aria-hidden
        />
      </ConfidenceRing>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
        toneIconClass[tone],
        className,
      )}
      aria-hidden
    >
      <Icon className={cn("size-6 stroke-[2.25]", iconClassName)} />
    </span>
  );
}

export { VerdictIcon, iconForTone };
