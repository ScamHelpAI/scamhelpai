const DECORATED_ATTRIBUTE = "data-scamhelp-decorated";
const WRAPPER_ATTRIBUTE = "data-scamhelp-link-wrapper";
const MARKER_HOST_ATTRIBUTE = "data-scamhelp-marker";

function createMarker(): HTMLSpanElement {
  const host = document.createElement("span");
  host.setAttribute(MARKER_HOST_ATTRIBUTE, "");
  host.setAttribute("aria-label", "ScamHelp link marker");

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { display: inline-flex; align-items: center; margin: 0 0 2px; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 6px;
      border-radius: 999px;
      color: #064e3b;
      background: #bbf7d0;
      font: 600 10px/1.4 system-ui, sans-serif;
      letter-spacing: .02em;
    }
    .check { font-size: 9px; line-height: 1; }
  `;

  const pill = document.createElement("span");
  pill.className = "pill";
  pill.innerHTML = `<span class="check" aria-hidden="true">✓</span>`;

  shadow.append(style, pill);
  return host;
}

function decorateAnchor(anchor: HTMLAnchorElement): void {
  if (
    !anchor.getAttribute("href") ||
    anchor.hasAttribute(DECORATED_ATTRIBUTE) ||
    anchor.closest(`[${WRAPPER_ATTRIBUTE}]`)
  ) {
    return;
  }

  anchor.setAttribute(DECORATED_ATTRIBUTE, "");
  anchor.style.outline = "2px solid #4ade80";
  anchor.style.outlineOffset = "2px";
  anchor.style.borderRadius = "3px";

  const wrapper = document.createElement("span");
  wrapper.setAttribute(WRAPPER_ATTRIBUTE, "");
  wrapper.style.display = "inline-flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "flex-start";
  wrapper.style.verticalAlign = "baseline";

  anchor.parentNode?.insertBefore(wrapper, anchor);
  wrapper.append(createMarker(), anchor);
}

function decorateLinks(root: ParentNode = document): void {
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>(
    `a[href]:not([${DECORATED_ATTRIBUTE}])`,
  )) {
    decorateAnchor(anchor);
  }
}

function startAutoDecoration(): void {
  decorateLinks();

  let pending = false;
  const observer = new MutationObserver((mutations) => {
    if (pending) return;
    pending = true;

    requestAnimationFrame(() => {
      pending = false;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLAnchorElement) {
            decorateAnchor(node);
          } else if (node instanceof Element) {
            decorateLinks(node);
          }
        }
      }
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAutoDecoration, {
    once: true,
  });
} else {
  startAutoDecoration();
}
