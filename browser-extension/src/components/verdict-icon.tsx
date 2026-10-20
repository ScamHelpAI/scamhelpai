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
  className?: string;
  iconClassName?: string;
};

/** Rounded icon tile matching the senior design system risk levels. */
function VerdictIcon({ tone, className, iconClassName }: VerdictIconProps) {
  const Icon = iconForTone(tone);

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
