const MARKER_HOST_ATTRIBUTE = "data-scamhelp-test-marker";
const WRAPPER_ATTRIBUTE = "data-scamhelp-link-wrapper";

function isHttpUrl(href: string | null): boolean {
  if (!href) return false;

  try {
    const url = new URL(href, window.location.href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createMarker(anchor: HTMLAnchorElement): HTMLSpanElement {
  const host = document.createElement("span");
  host.setAttribute(MARKER_HOST_ATTRIBUTE, "");
  host.setAttribute("aria-label", "ScamHelp test marker");

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { display: inline-flex; align-items: center; gap: 4px; margin: 0 0 2px; }
    .pill { padding: 1px 5px; border-radius: 999px; color: #064e3b; background: #bbf7d0; font: 600 10px/1.4 system-ui, sans-serif; letter-spacing: .02em; }
    input { width: 12px; height: 12px; margin: 0; accent-color: #16a34a; }
  `;

  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = "Test";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("aria-label", `Select ${anchor.href}`);

  shadow.append(style, pill, checkbox);
  return host;
}

function decorateLinks(): number {
  let count = 0;

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (
      !isHttpUrl(anchor.getAttribute("href")) ||
      anchor.closest(`[${WRAPPER_ATTRIBUTE}]`) ||
      anchor.previousElementSibling?.hasAttribute(MARKER_HOST_ATTRIBUTE)
    ) {
      continue;
    }

    const wrapper = document.createElement("span");
    wrapper.setAttribute(WRAPPER_ATTRIBUTE, "");
    wrapper.style.display = "inline-flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "flex-start";
    wrapper.style.verticalAlign = "baseline";

    anchor.parentNode?.insertBefore(wrapper, anchor);
    wrapper.append(createMarker(anchor), anchor);
    count += 1;
  }

  return count;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "analyze-page") {
    sendResponse({ count: decorateLinks() });
  }
});
