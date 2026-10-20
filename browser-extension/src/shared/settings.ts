import { DEFAULT_API_BASE } from "./api-url.ts";

export const LINK_SCAN_ENABLED_KEY = "linkScanEnabled";
export const API_BASE_KEY = "apiBase";

export function normalizeApiBase(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export async function getApiBaseSetting(): Promise<string> {
  const stored = await chrome.storage.sync.get(API_BASE_KEY);
  const raw = stored[API_BASE_KEY];
  if (typeof raw === "string" && raw.length > 0) {
    return normalizeApiBase(raw);
  }
  return DEFAULT_API_BASE;
}

export async function setApiBaseSetting(value: string): Promise<void> {
  const normalized = normalizeApiBase(value);
  if (!normalized || normalized === DEFAULT_API_BASE) {
    await chrome.storage.sync.remove(API_BASE_KEY);
    return;
  }
  await chrome.storage.sync.set({ [API_BASE_KEY]: normalized });
}

export async function getLinkScanEnabled(): Promise<boolean> {
  const stored = await chrome.storage.sync.get(LINK_SCAN_ENABLED_KEY);
  return stored[LINK_SCAN_ENABLED_KEY] === true;
}

export async function setLinkScanEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.sync.set({ [LINK_SCAN_ENABLED_KEY]: enabled });
}
