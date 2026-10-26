import type { CSSProperties } from "react";

import type { VerdictTone } from "@/lib/verdict";
import { cn } from "@/lib/utils";

const RING_SIZE = 132;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2 - 2;

const toneRingClass: Record<VerdictTone, string> = {
  danger: "text-risk-high",
  warn: "text-risk-medium",
  safe: "text-risk-low",
};

const toneTrackClass: Record<VerdictTone, string> = {
  danger: "text-risk-high/20",
  warn: "text-risk-medium/20",
  safe: "text-risk-low/20",
};

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Circular 0–100 risk score gauge matching the extension analyze layout. */
export function ScoreGauge({
  score,
  tone,
  className,
}: {
  /** Risk score on a 0–1 scale from the API. */
  score: number;
  tone: VerdictTone;
  className?: string;
}) {
  const value = clampUnit(score);
  const display = Math.round(value * 100);
  const circumference = 2 * Math.PI * RING_RADIUS;
  const dashOffset = circumference * (1 - value);
  const center = RING_SIZE / 2;

  return (
    <span
      className={cn(
        "relative inline-flex size-[132px] shrink-0 items-center justify-center",
        className,
      )}
      role="img"
      aria-label={`Risk score ${display} out of 100`}
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
          className={toneTrackClass[tone]}
          stroke="currentColor"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={center}
          cy={center}
          r={RING_RADIUS}
          fill="none"
          className={cn(toneRingClass[tone], "animate-score-ring")}
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={
            {
              "--score-circumference": circumference,
              "--score-offset": dashOffset,
            } as CSSProperties
          }
        />
      </svg>
      <span className="relative flex flex-col items-center leading-none">
        <span className="font-heading text-[2.75rem] font-semibold tracking-tight text-foreground tabular-nums">
          {display}
        </span>
        <span className="mt-0.5 text-sm font-semibold text-muted-foreground">
          / 100
        </span>
      </span>
    </span>
  );
}
