import type { AnalysisDecision, RiskyPart } from "../../shared/types.ts";
import {
  ANNOTATION_HOST_ATTR,
  PAGE_GLOW_CLASS,
  STYLE_ID,
} from "./constants.ts";
import {
  collectTextNodes,
  findMatchIndex,
  matchLength,
  wrapTextMatch,
} from "./highlight.ts";
import {
  mountAnnotationHighlight,
  unmountAnnotationHighlight,
} from "./mount-highlight.tsx";

export {
  ANNOTATE_ROOT_ATTR,
  PAGE_GLOW_CLASS,
  SCAMHELP_ANNOTATION,
  SCAMHELP_MARK,
  STYLE_ID,
} from "./constants.ts";

const HIGHLIGHT_UNDERLINE = "#C62828";

let activeDecision: AnalysisDecision | null = null;

export type ApplyAnnotationsOptions = {
  doc?: Document;
  /** Limit search/clear/glow to this subtree. Defaults to document.body. */
  root?: ParentNode;
  /** CSS selector resolved against doc when root is not passed. */
  rootSelector?: string;
};

export function ensureStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${PAGE_GLOW_CLASS} {
      outline: 2px solid ${HIGHLIGHT_UNDERLINE};
      outline-offset: 4px;
      box-shadow: 0 0 0 6px rgba(198, 40, 40, 0.12);
    }
  `;
  doc.documentElement.appendChild(style);
}

function createHighlightMark(
  doc: Document,
  message: string,
  decision: AnalysisDecision,
): (matchedText: string) => HTMLElement {
  return (matchedText: string) =>
    mountAnnotationHighlight(doc, matchedText, message, decision);
}

function wrapQuoteInDom(
  doc: Document,
  root: ParentNode,
  quote: string,
  message: string,
  decision: AnalysisDecision,
): boolean {
  const length = matchLength(quote);
  if (length === 0) return false;

  for (const caseSensitive of [true, false]) {
    for (const textNode of collectTextNodes(root)) {
      const text = textNode.textContent ?? "";
      const index = findMatchIndex(text, quote, caseSensitive);
      if (index === -1) continue;

      const mark = wrapTextMatch(
        textNode,
        index,
        length,
        createHighlightMark(doc, message, decision),
      );
      if (mark) return true;
    }
  }

  return false;
}

function resolveRoot(
  doc: Document,
  options: ApplyAnnotationsOptions,
): ParentNode {
  if (options.root) return options.root;
  if (options.rootSelector) {
    const found = doc.querySelector(options.rootSelector);
    if (found) return found;
  }
  return doc.body ?? doc.documentElement;
}

function glowTargetForRoot(root: ParentNode, doc: Document): Element | null {
  if (root instanceof Element) return root;
  if (root instanceof Document) return root.body ?? root.documentElement;
  return doc.body;
}

function removeAnnotationHosts(
  scope: ParentNode,
  doc: Document,
): void {
  const hosts =
    scope instanceof Element || scope instanceof Document
      ? scope.querySelectorAll(`[${ANNOTATION_HOST_ATTR}]`)
      : doc.querySelectorAll(`[${ANNOTATION_HOST_ATTR}]`);

  for (const host of [...hosts]) {
    if (!(host instanceof HTMLElement)) continue;
    unmountAnnotationHighlight(host);
    const text = host.textContent ?? "";
    host.replaceWith(doc.createTextNode(text));
  }
}

export function clearAnnotations(
  options: ApplyAnnotationsOptions | Document = {},
): void {
  const opts: ApplyAnnotationsOptions =
    options instanceof Document ? { doc: options } : options;
  const doc = opts.doc ?? document;
  const root = resolveRoot(doc, opts);
  const glow = glowTargetForRoot(root, doc);

  const scope: ParentNode =
    root instanceof Document ? root : (root as ParentNode);

  removeAnnotationHosts(scope, doc);
  glow?.classList.remove(PAGE_GLOW_CLASS);
  doc.body?.classList.remove(PAGE_GLOW_CLASS);
}

export function applyAnnotations(
  decision: AnalysisDecision,
  riskyParts: RiskyPart[],
  options: ApplyAnnotationsOptions | Document = {},
): number {
  const opts: ApplyAnnotationsOptions =
    options instanceof Document ? { doc: options } : options;
  const doc = opts.doc ?? document;
  const root = resolveRoot(doc, opts);

  clearAnnotations(opts);
  activeDecision = decision;
  ensureStyles(doc);

  if (riskyParts.length === 0) {
    return 0;
  }

  const sorted = [...riskyParts].sort(
    (a, b) => b.quote.trim().length - a.quote.trim().length,
  );

  let applied = 0;
  for (const part of sorted) {
    if (wrapQuoteInDom(doc, root, part.quote, part.message, decision)) {
      applied += 1;
    }
  }

  if (applied > 0) {
    glowTargetForRoot(root, doc)?.classList.add(PAGE_GLOW_CLASS);
  }

  return applied;
}

export function getActiveDecision(): AnalysisDecision | null {
  return activeDecision;
}
