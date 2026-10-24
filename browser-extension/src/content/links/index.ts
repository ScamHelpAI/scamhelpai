import {
  CHECK_URLS_BATCH_SIZE,
  chunkUrls,
  type CheckUrlResult,
} from "../../shared/check.ts";
import type { CheckUrlsResponseMessage } from "../../shared/messages.ts";
import {
  LINK_SCAN_ENABLED_KEY,
  getLinkScanEnabled,
} from "../../shared/settings.ts";
import {
  clearDecorations,
  decorateAnchor,
  ensureStyles,
  isScamhelpNode,
  removeStyles,
} from "./decorate.ts";
import { resolveAnchorUrl } from "./urls.ts";

const INSTALLED_FLAG = "__scamhelpLinkScannerInstalled";

type PageWindow = Window & {
  [INSTALLED_FLAG]?: boolean;
};

const resultCache = new Map<string, CheckUrlResult>();
const inFlight = new Set<string>();
let enabled = false;
let observer: MutationObserver | null = null;
let scanTimer: number | null = null;
let scanning = false;

async function requestChecks(urls: string[]): Promise<CheckUrlResult[]> {
  if (urls.length === 0) return [];

  const response = (await chrome.runtime.sendMessage({
    type: "checkUrls",
    urls,
  })) as CheckUrlsResponseMessage | undefined;

  if (!response?.ok) {
    throw new Error(
      response && "error" in response
        ? response.error
        : "Could not check links.",
    );
  }

  return response.results;
}

function collectUncheckedAnchors(root: ParentNode = document): {
  anchors: HTMLAnchorElement[];
  urls: string[];
} {
  const anchors: HTMLAnchorElement[] = [];
  const urlSet = new Set<string>();

  for (const node of root.querySelectorAll("a[href]")) {
    if (!(node instanceof HTMLAnchorElement)) continue;
    if (isScamhelpNode(node) && node.hasAttribute("data-scamhelp-status")) {
      continue;
    }
    if (node.closest("[data-scamhelp-blocked]")) continue;

    const url = resolveAnchorUrl(node);
    if (!url) continue;
    if (resultCache.has(url)) {
      anchors.push(node);
      continue;
    }
    if (inFlight.has(url)) {
      anchors.push(node);
      continue;
    }

    anchors.push(node);
    urlSet.add(url);
  }

  return { anchors, urls: [...urlSet] };
}

function applyCachedResults(anchors: HTMLAnchorElement[]): void {
  for (const anchor of anchors) {
    const url = resolveAnchorUrl(anchor);
    if (!url) continue;
    const result = resultCache.get(url);
    if (!result) continue;
    if (anchor.isConnected) {
      decorateAnchor(anchor, result);
    }
  }
}

async function scanLinks(root: ParentNode = document): Promise<void> {
  if (!enabled) return;
  if (scanning) {
    scheduleScan(root);
    return;
  }

  scanning = true;
  try {
    ensureStyles();
    const { anchors, urls } = collectUncheckedAnchors(root);
    applyCachedResults(anchors);

    const missing = urls.filter((url) => !resultCache.has(url));
    for (const url of missing) inFlight.add(url);

    try {
      for (const batch of chunkUrls(missing, CHECK_URLS_BATCH_SIZE)) {
        if (!enabled) break;
        const results = await requestChecks(batch);
        for (const result of results) {
          resultCache.set(result.url, result);
          inFlight.delete(result.url);
        }
        for (const url of batch) {
          inFlight.delete(url);
          if (!resultCache.has(url)) {
            const match = results.find((r) => r.url === url);
            if (match) resultCache.set(url, match);
          }
        }
      }
    } finally {
      for (const url of missing) inFlight.delete(url);
    }

    if (enabled) {
      const again = collectUncheckedAnchors(document);
      applyCachedResults(again.anchors);
    }
  } catch (error) {
    console.warn("[ScamHelp] link scan failed:", error);
  } finally {
    scanning = false;
  }
}

function scheduleScan(root: ParentNode = document): void {
  if (scanTimer !== null) {
    window.clearTimeout(scanTimer);
  }
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    void scanLinks(root);
  }, 250);
}

function startObserver(): void {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    if (!enabled) return;
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.target instanceof Element
      ) {
        if (
          mutation.target.tagName === "A" &&
          !isScamhelpNode(mutation.target)
        ) {
          scheduleScan(document);
          return;
        }
      }
      for (const node of mutation.addedNodes) {
        if (isScamhelpNode(node)) continue;
        if (node instanceof HTMLAnchorElement) {
          scheduleScan(document);
          return;
        }
        if (node instanceof Element && node.querySelector?.("a[href]")) {
          scheduleScan(document);
          return;
        }
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });
}

function stopObserver(): void {
  observer?.disconnect();
  observer = null;
}

async function enableScanning(): Promise<void> {
  enabled = true;
  ensureStyles();
  startObserver();
  await scanLinks(document);
}

function disableScanning(): void {
  enabled = false;
  stopObserver();
  if (scanTimer !== null) {
    window.clearTimeout(scanTimer);
    scanTimer = null;
  }
  clearDecorations(document);
  removeStyles();
}

const pageWindow = window as PageWindow;
if (!pageWindow[INSTALLED_FLAG]) {
  pageWindow[INSTALLED_FLAG] = true;

  void getLinkScanEnabled().then((on) => {
    if (on) void enableScanning();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !(LINK_SCAN_ENABLED_KEY in changes)) return;
    const next = changes[LINK_SCAN_ENABLED_KEY]?.newValue === true;
    if (next) {
      void enableScanning();
    } else {
      disableScanning();
    }
  });
}
