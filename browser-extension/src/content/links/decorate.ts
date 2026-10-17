import type { CheckStatus, CheckUrlResult } from "../../shared/check.ts";

export const SCAMHELP_MARK = "data-scamhelp";
export const SCAMHELP_STATUS = "data-scamhelp-status";
export const SCAMHELP_HREF = "data-scamhelp-href";
export const SCAMHELP_BLOCKED = "data-scamhelp-blocked";
export const STYLE_ID = "scamhelp-link-scan-styles";

const ICON_WARNING = "⚠";
const ICON_DANGER = "⛔";

export function ensureStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    a[${SCAMHELP_STATUS}="warning"] {
      text-decoration-line: underline !important;
      text-decoration-color: #d97706 !important;
      text-decoration-thickness: 2px !important;
      text-underline-offset: 2px;
    }
    [${SCAMHELP_MARK}="icon"] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 0.25em;
      font-size: 0.85em;
      line-height: 1;
      vertical-align: middle;
      cursor: default;
      user-select: none;
      border: none;
      background: transparent;
      padding: 0;
      font-family: inherit;
    }
    [${SCAMHELP_MARK}="icon"][${SCAMHELP_STATUS}="warning"] { color: #d97706; }
    [${SCAMHELP_MARK}="icon"][${SCAMHELP_STATUS}="danger"] {
      color: #b91c1c;
      cursor: pointer;
    }
    [${SCAMHELP_BLOCKED}="1"] {
      display: inline;
      color: inherit;
    }
    [${SCAMHELP_MARK}="popover"] {
      position: absolute;
      z-index: 2147483646;
      max-width: 280px;
      margin-top: 4px;
      padding: 10px 12px;
      border: 2px solid #b91c1c;
      border-radius: 8px;
      background: #fff;
      color: #111;
      font: 13px/1.4 system-ui, sans-serif;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    }
    [${SCAMHELP_MARK}="popover"] strong {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
    }
    [${SCAMHELP_MARK}="popover"] ul {
      margin: 0 0 10px;
      padding-left: 1.1em;
    }
    [${SCAMHELP_MARK}="popover"] button[data-action="open"] {
      display: inline-block;
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      background: #b91c1c;
      color: #fff;
      font: 600 13px/1.2 system-ui, sans-serif;
      cursor: pointer;
    }
    [${SCAMHELP_MARK}="popover"] button[data-action="close"] {
      display: inline-block;
      margin-left: 8px;
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: #334155;
      font: 600 13px/1.2 system-ui, sans-serif;
      cursor: pointer;
    }
  `;
  doc.documentElement.appendChild(style);
}

export function removeStyles(doc: Document = document): void {
  doc.getElementById(STYLE_ID)?.remove();
  closePopover(doc);
}

function closePopover(doc: Document = document): void {
  for (const node of doc.querySelectorAll(`[${SCAMHELP_MARK}="popover"]`)) {
    node.remove();
  }
}

function createIcon(
  doc: Document,
  status: Exclude<CheckStatus, "safe">,
  title: string,
): HTMLElement {
  const isButton = status === "danger";
  const el = doc.createElement(isButton ? "button" : "span");
  el.setAttribute(SCAMHELP_MARK, "icon");
  el.setAttribute(SCAMHELP_STATUS, status);
  el.setAttribute("title", title);
  el.setAttribute(
    "aria-label",
    status === "warning"
      ? "Caution: this link may be risky"
      : "Blocked unsafe link",
  );
  if (isButton) {
    (el as HTMLButtonElement).type = "button";
  }
  el.textContent = status === "warning" ? ICON_WARNING : ICON_DANGER;
  return el;
}

function reasonSummary(result: CheckUrlResult): string {
  return result.reasons[0] ?? `Risk score ${result.score}`;
}

function showDangerPopover(
  anchorHost: HTMLElement,
  result: CheckUrlResult,
  href: string,
  doc: Document = document,
): void {
  closePopover(doc);

  const pop = doc.createElement("div");
  pop.setAttribute(SCAMHELP_MARK, "popover");
  pop.setAttribute("role", "dialog");

  const title = doc.createElement("strong");
  title.textContent = "Unsafe link blocked";
  pop.appendChild(title);

  const list = doc.createElement("ul");
  for (const reason of result.reasons.slice(0, 4)) {
    const item = doc.createElement("li");
    item.textContent = reason;
    list.appendChild(item);
  }
  if (result.reasons.length === 0) {
    const item = doc.createElement("li");
    item.textContent = `Risk score ${result.score} out of 100.`;
    list.appendChild(item);
  }
  pop.appendChild(list);

  const openBtn = doc.createElement("button");
  openBtn.type = "button";
  openBtn.dataset.action = "open";
  openBtn.textContent = "Open anyway";
  openBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePopover(doc);
    window.location.assign(href);
  });
  pop.appendChild(openBtn);

  const closeBtn = doc.createElement("button");
  closeBtn.type = "button";
  closeBtn.dataset.action = "close";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePopover(doc);
  });
  pop.appendChild(closeBtn);

  const rect = anchorHost.getBoundingClientRect();
  pop.style.position = "fixed";
  pop.style.left = `${Math.max(8, rect.left)}px`;
  pop.style.top = `${Math.min(window.innerHeight - 8, rect.bottom + 4)}px`;
  doc.documentElement.appendChild(pop);
}

export function isScamhelpNode(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  return (
    node.hasAttribute(SCAMHELP_MARK) ||
    node.hasAttribute(SCAMHELP_BLOCKED) ||
    node.hasAttribute(SCAMHELP_STATUS) ||
    Boolean(node.closest(`[${SCAMHELP_MARK}], [${SCAMHELP_BLOCKED}]`))
  );
}

export function clearDecorations(root: ParentNode = document): void {
  const doc = root instanceof Document ? root : root.ownerDocument ?? document;
  closePopover(doc);

  for (const icon of root.querySelectorAll(`[${SCAMHELP_MARK}="icon"]`)) {
    icon.remove();
  }

  for (const blocked of [
    ...root.querySelectorAll(`[${SCAMHELP_BLOCKED}="1"]`),
  ]) {
    const href = blocked.getAttribute(SCAMHELP_HREF);
    if (!href || !(blocked instanceof HTMLElement)) {
      blocked.removeAttribute(SCAMHELP_BLOCKED);
      blocked.removeAttribute(SCAMHELP_HREF);
      blocked.removeAttribute(SCAMHELP_MARK);
      continue;
    }

    const anchor = doc.createElement("a");
    anchor.href = href;
    while (blocked.firstChild) {
      const child = blocked.firstChild;
      if (
        child instanceof Element &&
        child.getAttribute(SCAMHELP_MARK) === "icon"
      ) {
        child.remove();
        continue;
      }
      anchor.appendChild(child);
    }
    blocked.replaceWith(anchor);
  }

  for (const link of root.querySelectorAll(`a[${SCAMHELP_STATUS}]`)) {
    link.removeAttribute(SCAMHELP_STATUS);
    link.removeAttribute(SCAMHELP_MARK);
  }
}

export function decorateAnchor(
  anchor: HTMLAnchorElement,
  result: CheckUrlResult,
  doc: Document = document,
): void {
  if (anchor.getAttribute(SCAMHELP_STATUS) === result.status) {
    return;
  }

  // Strip prior soft decorations (warning icon sibling) before re-applying.
  const existingIcon = anchor.parentElement?.querySelector(
    `:scope > [${SCAMHELP_MARK}="icon"]`,
  );
  const nextSibling = anchor.nextElementSibling;
  if (nextSibling?.getAttribute(SCAMHELP_MARK) === "icon") {
    nextSibling.remove();
  }
  if (existingIcon && existingIcon !== nextSibling) {
    existingIcon.remove();
  }

  // Safe links stay visually unchanged; only mark as checked.
  if (result.status === "safe") {
    anchor.setAttribute(SCAMHELP_STATUS, "safe");
    anchor.setAttribute(SCAMHELP_MARK, "link");
    return;
  }

  if (result.status === "danger") {
    const href = result.url;
    const wrapper = doc.createElement("span");
    wrapper.setAttribute(SCAMHELP_BLOCKED, "1");
    wrapper.setAttribute(SCAMHELP_HREF, href);
    wrapper.setAttribute(SCAMHELP_MARK, "blocked");

    while (anchor.firstChild) {
      wrapper.appendChild(anchor.firstChild);
    }
    // Preserve visible text if the anchor was empty but had text via CSS
    if (!wrapper.textContent?.trim() && anchor.textContent) {
      wrapper.append(anchor.textContent);
    }

    const icon = createIcon(doc, "danger", reasonSummary(result));
    icon.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showDangerPopover(wrapper, result, href, doc);
    });
    wrapper.appendChild(icon);

    anchor.replaceWith(wrapper);
    return;
  }

  anchor.setAttribute(SCAMHELP_STATUS, result.status);
  anchor.setAttribute(SCAMHELP_MARK, "link");

  const icon = createIcon(doc, result.status, reasonSummary(result));
  anchor.insertAdjacentElement("afterend", icon);
}
