const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "SVG",
  "CANVAS",
  "IFRAME",
  "OBJECT",
  "EMBED",
]);

export function findMatchIndex(
  text: string,
  quote: string,
  caseSensitive: boolean,
): number {
  const trimmed = quote.trim();
  if (!trimmed) return -1;
  if (caseSensitive) {
    return text.indexOf(trimmed);
  }
  return text.toLowerCase().indexOf(trimmed.toLowerCase());
}

export function matchLength(quote: string): number {
  return quote.trim().length;
}

export function shouldSkipTextParent(parent: Element | null): boolean {
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest("[data-scamhelp-annotation]")) return true;
  if (parent.closest("[data-scamhelp-annotation-host]")) return true;
  return false;
}

export function collectTextNodes(root: ParentNode): Text[] {
  const doc =
    root instanceof Document ? root : (root.ownerDocument ?? document);
  const nodes: Text[] = [];
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      if (shouldSkipTextParent(node.parentElement)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text) {
      nodes.push(current);
    }
    current = walker.nextNode();
  }

  return nodes;
}

export function wrapTextMatch(
  textNode: Text,
  start: number,
  length: number,
  createMark: (matchedText: string) => HTMLElement,
): HTMLElement | null {
  const text = textNode.textContent ?? "";
  const matched = text.slice(start, start + length);
  if (!matched) return null;

  const parent = textNode.parentNode;
  if (!parent) return null;

  const before = text.slice(0, start);
  const after = text.slice(start + length);
  const mark = createMark(matched);

  if (before) {
    parent.insertBefore(
      textNode.ownerDocument.createTextNode(before),
      textNode,
    );
  }
  parent.insertBefore(mark, textNode);
  if (after) {
    parent.insertBefore(textNode.ownerDocument.createTextNode(after), textNode);
  }
  textNode.remove();

  return mark;
}
