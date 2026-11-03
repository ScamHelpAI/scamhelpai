import { XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { VerdictSummary } from "@/components/verdict-summary.tsx";
import type { AnalysisResult } from "@/shared/types.ts";

export type GmailVerdictViewProps = {
  /** While loading the scan overlay + button status show progress; the panel stays closed. */
  loading: boolean;
  reviewing: boolean;
  result: AnalysisResult | null;
  footerMessage?: string;
  /** Focus goes back here when the user closes the panel. */
  returnFocusTo?: HTMLElement;
};

type Shown = {
  result: AnalysisResult;
  reviewing: boolean;
  footerMessage?: string;
};

function logoUrl(): string | null {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL("icons/icon-48.png");
  }
  return null;
}

/** Full-height results side panel: slides in from the right, slides back out on close. */
export function GmailVerdictView({
  reviewing,
  result,
  footerMessage,
  returnFocusTo,
}: GmailVerdictViewProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const open = result !== null && result.id !== dismissedId;

  // Keep the last result on screen while the panel slides out.
  const [shown, setShown] = useState<Shown | null>(null);
  if (
    result &&
    open &&
    (shown?.result !== result ||
      shown.reviewing !== reviewing ||
      shown.footerMessage !== footerMessage)
  ) {
    setShown({ result, reviewing, footerMessage });
  }

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!shown) return null;

  const close = () => {
    setDismissedId(shown.result.id);
    returnFocusTo?.focus();
  };
  const logo = logoUrl();

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-label="ScamHelp analysis results"
      tabIndex={-1}
      data-state={open ? "open" : "closed"}
      className="sh-panel pointer-events-auto fixed inset-y-0 right-0 z-50 flex w-[460px] max-w-full flex-col border-l-2 border-brand-light bg-card font-sans text-[17px] leading-relaxed text-foreground shadow-[-18px_0_48px_rgba(28,28,28,0.14)] outline-none"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        close();
      }}
      onAnimationEnd={(event) => {
        if (!open && event.target === event.currentTarget) setShown(null);
      }}
    >
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border pr-4 pl-6">
        {logo ? <img src={logo} alt="" className="size-8.5 rounded-lg" /> : null}
        <span className="flex-1 font-heading text-lg font-semibold">
          ScamHelp.AI
        </span>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Close results"
          onClick={close}
        >
          <XIcon className="size-5.5 stroke-[2.4]" aria-hidden />
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto px-7 pt-6 pb-7">
        <VerdictSummary result={shown.result} reviewing={shown.reviewing} />
        {shown.footerMessage ? (
          <p
            className="sh-up sh-d5 mt-4 text-center text-[15px] leading-snug text-muted-foreground"
            role="status"
          >
            {shown.footerMessage}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
