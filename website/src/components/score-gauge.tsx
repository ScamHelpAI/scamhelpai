import type { CSSProperties } from "react";

import type { VerdictTone } from "@/lib/verdict";
import { cn } from "@/lib/utils";

const RING_SIZE = 140;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2 - 2;

const toneRingClass: Record<VerdictTone, string> = {
  danger: "text-risk-high",
  warn: "text-risk-medium",
  safe: "text-risk-low",
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
        "relative inline-flex size-[140px] shrink-0 items-center justify-center",
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
          className="text-muted"
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
        <span
          className={cn(
            "font-heading text-[2.5rem] font-bold tracking-tight tabular-nums",
            toneRingClass[tone],
          )}
        >
          {display}
        </span>
        <span className="mt-1 text-base text-muted-foreground">/ 100</span>
      </span>
    </span>
  );
}
