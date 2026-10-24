import { SCAMHELP_MARK } from "../annotations/constants.ts";

const HOST_ID = "scamhelp-content-ui-host";
const PORTAL_ATTR = "data-scamhelp-portal";

let portalContainer: HTMLElement | null = null;

function stylesheetHref(): string | null {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL("content/annotations.css");
  }
  return null;
}

/** Shadow-root portal target for Radix popovers injected into web pages. */
export function ensureContentUiHost(doc: Document = document): HTMLElement {
  if (portalContainer?.isConnected) {
    return portalContainer;
  }

  let host = doc.getElementById(HOST_ID);
  if (!host) {
    host = doc.createElement("div");
    host.id = HOST_ID;
    host.setAttribute(SCAMHELP_MARK, "ui-host");
    Object.assign(host.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "0",
      height: "0",
      overflow: "visible",
      zIndex: "2147483647",
      pointerEvents: "none",
    });
    doc.documentElement.appendChild(host);
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });

  if (!shadow.querySelector("[data-scamhelp-ui-styles]")) {
    const href = stylesheetHref();
    if (href) {
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-scamhelp-ui-styles", "1");
      shadow.appendChild(link);
    }
  }

  let container = shadow.querySelector<HTMLElement>(`[${PORTAL_ATTR}]`);
  if (!container) {
    container = doc.createElement("div");
    container.setAttribute(PORTAL_ATTR, "1");
    container.style.pointerEvents = "auto";
    shadow.appendChild(container);
  }

  portalContainer = container;
  return container;
}

export function resetContentUiHost(): void {
  portalContainer = null;
}
