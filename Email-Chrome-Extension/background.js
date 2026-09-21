// Service worker: the only place that talks to the ScamHelp API.
// Content scripts and the popup send a message here so the page's own
// CSP and CORS rules never block an analysis.

const DEFAULT_API_BASE = "http://localhost:3000";

async function getApiBase() {
  const { apiBase } = await chrome.storage.sync.get("apiBase");
  return (apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");
}

async function analyze(payload) {
  const base = await getApiBase();
  const res = await fetch(`${base}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Analyzer returned ${res.status}. ${detail.slice(0, 200)}`);
  }
  return res.json();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "analyze") return false;

  analyze(message.payload)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));

  // Keep the message channel open for the async response.
  return true;
});
