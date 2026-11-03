import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { ensureContentUiHost } from "../ui/host.ts";
import {
  GmailVerdictView,
  type GmailVerdictViewProps,
} from "./verdict-view.tsx";

export const GMAIL_VERDICT_ATTR = "data-scamhelp-gmail-verdict";

let root: Root | null = null;
let mount: HTMLElement | null = null;

/** The results panel is position:fixed inside the shared content-UI shadow root. */
function ensureVerdictRoot(doc: Document): Root {
  if (root && mount?.isConnected) return root;
  root?.unmount();

  const container = ensureContentUiHost(doc);
  mount = doc.createElement("div");
  mount.setAttribute(GMAIL_VERDICT_ATTR, "1");
  container.append(mount);
  root = createRoot(mount);
  return root;
}

export function renderGmailVerdict(
  doc: Document,
  button: HTMLButtonElement,
  props: Omit<GmailVerdictViewProps, "returnFocusTo">,
): void {
  const verdictRoot = ensureVerdictRoot(doc);
  flushSync(() => {
    verdictRoot.render(<GmailVerdictView {...props} returnFocusTo={button} />);
  });
}

export function clearGmailVerdict(doc: Document, button: HTMLButtonElement): void {
  renderGmailVerdict(doc, button, {
    loading: false,
    reviewing: false,
    result: null,
  });
}
