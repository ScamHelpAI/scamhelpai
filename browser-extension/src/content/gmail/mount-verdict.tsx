import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  GmailVerdictView,
  type GmailVerdictViewProps,
} from "./verdict-view.tsx";
import { BUTTON_HOST_ATTR } from "./button.ts";

export const GMAIL_VERDICT_ATTR = "data-scamhelp-gmail-verdict";

const roots = new WeakMap<HTMLElement, Root>();

function stylesheetHref(): string | null {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL("content/annotations.css");
  }
  return null;
}

function ensureVerdictShell(
  doc: Document,
  button: HTMLButtonElement,
): { outer: HTMLElement; mount: HTMLElement } {
  const host = button.closest(`[${BUTTON_HOST_ATTR}]`);
  if (!host) {
    throw new Error("ScamHelp button host not found.");
  }

  let outer = host.querySelector<HTMLElement>(`[${GMAIL_VERDICT_ATTR}]`);
  if (!outer) {
    outer = doc.createElement("div");
    outer.setAttribute(GMAIL_VERDICT_ATTR, "1");
    outer.style.width = "100%";
    host.append(outer);
  }

  const shadow = outer.shadowRoot ?? outer.attachShadow({ mode: "open" });

  if (!shadow.querySelector("[data-scamhelp-gmail-verdict-styles]")) {
    const href = stylesheetHref();
    if (href) {
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-scamhelp-gmail-verdict-styles", "1");
      shadow.append(link);
    }
  }

  let mount = shadow.querySelector<HTMLElement>("[data-scamhelp-gmail-verdict-root]");
  if (!mount) {
    mount = doc.createElement("div");
    mount.setAttribute("data-scamhelp-gmail-verdict-root", "1");
    mount.className = "text-foreground";
    shadow.append(mount);
  }

  return { outer, mount };
}

export function renderGmailVerdict(
  doc: Document,
  button: HTMLButtonElement,
  props: GmailVerdictViewProps,
): void {
  const { outer, mount } = ensureVerdictShell(doc, button);

  const visible = props.loading || props.result !== null;
  outer.style.display = visible ? "block" : "none";

  if (!visible) {
    return;
  }

  let root = roots.get(mount);
  if (!root) {
    root = createRoot(mount);
    roots.set(mount, root);
  }

  flushSync(() => {
    root.render(<GmailVerdictView {...props} />);
  });
}

export function clearGmailVerdict(doc: Document, button: HTMLButtonElement): void {
  renderGmailVerdict(doc, button, {
    loading: false,
    reviewing: false,
    result: null,
  });
  const host = button.closest(`[${BUTTON_HOST_ATTR}]`);
  const outer = host?.querySelector<HTMLElement>(`[${GMAIL_VERDICT_ATTR}]`);
  if (outer) {
    outer.style.display = "none";
  }
}
