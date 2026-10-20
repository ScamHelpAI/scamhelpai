import type { AnalysisDecision, RiskyPart } from "../../shared/types.ts";
import {
  collectTextNodes,
  findMatchIndex,
  matchLength,
  wrapTextMatch,
} from "./highlight.ts";

export const SCAMHELP_MARK = "data-scamhelp";
export const SCAMHELP_ANNOTATION = "data-scamhelp-annotation";
export const STYLE_ID = "scamhelp-annotation-styles";
export const PAGE_GLOW_CLASS = "scamhelp-page-risk-outline";

const HIGHLIGHT_FILL = "#FCE4E1";
const HIGHLIGHT_UNDERLINE = "#C62828";

let activeDecision: AnalysisDecision | null = null;

export function ensureStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    mark[${SCAMHELP_ANNOTATION}="highlight"] {
      background: ${HIGHLIGHT_FILL};
      text-decoration: underline;
      text-decoration-color: ${HIGHLIGHT_UNDERLINE};
      text-decoration-thickness: 3px;
      text-underline-offset: 2px;
      cursor: pointer;
      border-radius: 2px;
    }
    body.${PAGE_GLOW_CLASS} {
      outline: 2px solid ${HIGHLIGHT_UNDERLINE};
      outline-offset: 4px;
      box-shadow: 0 0 0 6px rgba(198, 40, 40, 0.12);
    }
    [${SCAMHELP_MARK}="analysis-popover"] {
      position: absolute;
      z-index: 2147483646;
      max-width: 320px;
      padding: 12px 14px;
      border: 2px solid ${HIGHLIGHT_UNDERLINE};
      border-radius: 12px;
      background: #fff;
      color: #111;
      font: 14px/1.45 system-ui, sans-serif;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    }
    [${SCAMHELP_MARK}="analysis-popover"] h3 {
      margin: 0 0 8px;
      color: ${HIGHLIGHT_UNDERLINE};
      font: 700 15px/1.3 system-ui, sans-serif;
    }
    [${SCAMHELP_MARK}="analysis-popover"] p {
      margin: 0 0 10px;
    }
    [${SCAMHELP_MARK}="analysis-popover"] ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    [${SCAMHELP_MARK}="analysis-popover"] li {
      display: flex;
      gap: 8px;
      margin-top: 6px;
    }
    [${SCAMHELP_MARK}="analysis-popover"] li span {
      flex: 0 0 auto;
      font-weight: 700;
    }
  `;
  doc.documentElement.appendChild(style);
}

function closePopover(doc: Document = document): void {
  for (const node of doc.querySelectorAll(`[${SCAMHELP_MARK}="analysis-popover"]`)) {
    node.remove();
  }
}

function showAnnotationPopover(
  anchor: HTMLElement,
  decision: AnalysisDecision,
  message: string,
  doc: Document = document,
): void {
  closePopover(doc);

  const pop = doc.createElement("div");
  pop.setAttribute(SCAMHELP_MARK, "analysis-popover");
  pop.setAttribute("role", "dialog");

  const title = doc.createElement("h3");
  title.textContent = decision.title;
  pop.appendChild(title);

  const body = doc.createElement("p");
  body.textContent = message;
  pop.appendChild(body);

  const list = doc.createElement("ul");

  const dontItem = doc.createElement("li");
  const dontLabel = doc.createElement("span");
  dontLabel.textContent = "Don't";
  dontLabel.style.color = HIGHLIGHT_UNDERLINE;
  dontItem.append(dontLabel, doc.createTextNode(` ${decision.dont}`));
  list.appendChild(dontItem);

  const doItem = doc.createElement("li");
  const doLabel = doc.createElement("span");
  doLabel.textContent = "Do";
  doLabel.style.color = "#2e7d32";
  doItem.append(doLabel, doc.createTextNode(` ${decision.do}`));
  list.appendChild(doItem);

  pop.appendChild(list);

  const rect = anchor.getBoundingClientRect();
  pop.style.position = "fixed";
  pop.style.left = `${Math.max(8, rect.left)}px`;
  pop.style.top = `${Math.min(window.innerHeight - 8, rect.bottom + 6)}px`;
  doc.documentElement.appendChild(pop);
}

function createHighlightMark(
  doc: Document,
  message: string,
  decision: AnalysisDecision,
): (matchedText: string) => HTMLElement {
  return (matchedText: string) => {
    const mark = doc.createElement("mark");
    mark.setAttribute(SCAMHELP_ANNOTATION, "highlight");
    mark.setAttribute("tabindex", "0");
    mark.textContent = matchedText;

    const open = () => {
      showAnnotationPopover(mark, decision, message, doc);
    };
    mark.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      open();
    });
    mark.addEventListener("focus", open);

    return mark;
  };
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

export function clearAnnotations(doc: Document = document): void {
  closePopover(doc);
  doc.body?.classList.remove(PAGE_GLOW_CLASS);

  for (const mark of [...doc.querySelectorAll(`mark[${SCAMHELP_ANNOTATION}]`)]) {
    const text = mark.textContent ?? "";
    mark.replaceWith(doc.createTextNode(text));
  }
}

export function applyAnnotations(
  decision: AnalysisDecision,
  riskyParts: RiskyPart[],
  doc: Document = document,
): number {
  clearAnnotations(doc);
  activeDecision = decision;
  ensureStyles(doc);

  if (riskyParts.length === 0) {
    return 0;
  }

  const root = doc.body ?? doc.documentElement;
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
    doc.body?.classList.add(PAGE_GLOW_CLASS);
  }

  return applied;
}

export function getActiveDecision(): AnalysisDecision | null {
  return activeDecision;
}
