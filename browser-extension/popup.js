const API_URL = "http://localhost:3000/analyze";

const checkBtn = document.getElementById("check-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

function categoryLabel(category) {
  switch (category) {
    case "phishing":
      return "Phishing";
    case "social_engineering":
      return "Social engineering";
    case "malware":
      return "Malware";
    case "legitimate":
      return "Looks legitimate";
    case "unknown":
      return "Unclear";
    default: {
      const _exhaustive = category;
      return _exhaustive;
    }
  }
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("hidden", !message);
  statusEl.classList.toggle("status--error", isError);
}

function hideResult() {
  resultEl.classList.add("hidden");
  resultEl.innerHTML = "";
}

function showResult(data) {
  resultEl.className = `result result--${data.level}`;
  resultEl.innerHTML = `
    <div class="score-row">
      <span class="score-value">${data.riskScore}</span>
      <span class="score-meta">
        <span class="score-level">${data.level} risk</span>
        <span class="score-category">${categoryLabel(data.category)}</span>
      </span>
    </div>
    <p class="recommendation">${escapeHtml(data.recommendation)}</p>
    <ul class="reasons">
      ${data.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
    </ul>
  `;
  resultEl.classList.remove("hidden");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isRestrictedUrl(url) {
  if (!url) return true;
  try {
    const { protocol } = new URL(url);
    return !["http:", "https:"].includes(protocol);
  } catch {
    return true;
  }
}

async function scrapeActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  if (isRestrictedUrl(tab.url)) {
    throw new Error("This page cannot be checked. Open a normal website first.");
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["page-scraper.js"],
  });

  if (!result?.url) {
    throw new Error("Could not read page content.");
  }

  return result;
}

async function analyzePage(pageData) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "webpage",
      url: pageData.url,
      pageTitle: pageData.pageTitle,
      text: pageData.text,
      forms: pageData.forms,
    }),
  });

  if (!response.ok) {
    throw new Error("Analysis failed. Is the API server running on port 3000?");
  }

  return response.json();
}

checkBtn.addEventListener("click", async () => {
  checkBtn.disabled = true;
  hideResult();
  setStatus("Reading this page…");

  try {
    const pageData = await scrapeActiveTab();
    setStatus("Checking for scam signals…");
    const result = await analyzePage(pageData);
    setStatus("");
    showResult(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong. Try again.";
    setStatus(message, true);
  } finally {
    checkBtn.disabled = false;
  }
});
