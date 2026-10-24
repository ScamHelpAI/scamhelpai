import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { AnalysisDecision } from "@/shared/types.ts";
import { ensureContentUiHost } from "../ui/host.ts";
import { AnnotationHighlight } from "./annotation-highlight.tsx";
import { ANNOTATION_HOST_ATTR } from "./constants.ts";

const roots = new WeakMap<HTMLElement, Root>();

export function mountAnnotationHighlight(
  doc: Document,
  matchedText: string,
  message: string,
  decision: AnalysisDecision,
): HTMLElement {
  const portalContainer = ensureContentUiHost(doc);

  const host = doc.createElement("span");
  host.setAttribute(ANNOTATION_HOST_ATTR, "1");
  host.style.display = "inline";

  const root = createRoot(host);
  roots.set(host, root);
  flushSync(() => {
    root.render(
      <AnnotationHighlight
        text={matchedText}
        message={message}
        decision={decision}
        portalContainer={portalContainer}
      />,
    );
  });

  return host;
}

export function unmountAnnotationHighlight(host: HTMLElement): void {
  const root = roots.get(host);
  if (root) {
    root.unmount();
    roots.delete(host);
  }
}
