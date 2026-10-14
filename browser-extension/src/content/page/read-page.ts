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

function isNoiseElement(el: Element): boolean {
  const tag = el.tagName;
  if (tag === "NAV" || tag === "FOOTER" || tag === "ASIDE") return true;

  const role = el.getAttribute("role")?.toLowerCase() ?? "";
  if (role === "navigation" || role === "contentinfo" || role === "banner") {
    return true;
  }

  const hint = `${el.className} ${el.id}`.toLowerCase();
  return /\b(nav|navbar|footer|cookie|consent|sidebar|menu|advert|ads?)\b/.test(
    hint,
  );
}

/** Prefer main/article content when present; otherwise use body. */
export function selectPageRoot(doc: Document): Element {
  return (
    doc.querySelector("main") ??
    doc.querySelector("article") ??
    doc.body ??
    doc.documentElement
  );
}

function cleanClone(root: Element): Element {
  const clone = root.cloneNode(true) as Element;
  for (const el of [...clone.querySelectorAll("*")]) {
    if (SKIP_TAGS.has(el.tagName) || isNoiseElement(el)) {
      el.remove();
    }
  }
  return clone;
}

export type PageContents = {
  url: string;
  title: string;
  html: string;
};

export function readPageContents(doc: Document = document): PageContents {
  const root = selectPageRoot(doc);
  const cleaned = cleanClone(root);

  return {
    url: doc.location?.href ?? "",
    title: doc.title.trim(),
    html: cleaned.outerHTML.trim(),
  };
}
