export const LINK_SCAN_ENABLED_KEY = "linkScanEnabled";

export async function getLinkScanEnabled(): Promise<boolean> {
  const stored = await chrome.storage.sync.get(LINK_SCAN_ENABLED_KEY);
  return stored[LINK_SCAN_ENABLED_KEY] === true;
}

export async function setLinkScanEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.sync.set({ [LINK_SCAN_ENABLED_KEY]: enabled });
}
