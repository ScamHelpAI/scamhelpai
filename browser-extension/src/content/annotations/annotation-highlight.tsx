import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { SCAMHELP_ANNOTATION } from "./constants.ts";
import type { AnalysisDecision } from "@/shared/types.ts";
import { cn } from "cn";

type AnnotationHighlightProps = {
  text: string;
  message: string;
  decision: AnalysisDecision;
  portalContainer: HTMLElement;
};

function AnnotationHighlight({
  text,
  message,
  decision,
  portalContainer,
}: AnnotationHighlightProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <mark
          data-slot="annotation-highlight"
          {...{ [SCAMHELP_ANNOTATION]: "highlight" }}
          tabIndex={0}
          className={cn(
            "cursor-pointer rounded-sm bg-risk-high-bg text-inherit",
            "underline decoration-risk-high decoration-[3px] underline-offset-2",
          )}
          onFocus={() => setOpen(true)}
        >
          {text}
        </mark>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer}
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-80 max-w-[min(20rem,calc(100vw-1rem))] gap-3 border-2 border-risk-high p-3.5"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <PopoverHeader className="gap-1.5">
          <PopoverTitle className="font-heading text-base font-bold text-risk-high">
            {decision.title}
          </PopoverTitle>
          <PopoverDescription className="text-[15px] leading-snug text-foreground">
            {message}
          </PopoverDescription>
        </PopoverHeader>
        <ul className="space-y-2 text-[15px] leading-snug">
          <li className="flex gap-2">
            <span className="shrink-0 font-bold text-risk-high">Don&apos;t</span>
            <span>{decision.dont}</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 font-bold text-risk-low">Do</span>
            <span>{decision.do}</span>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export { AnnotationHighlight };
