// Reads the email Gmail currently has open and shows a plain-language verdict.
// Gmail's DOM is generated, so every selector here is best-effort with fallbacks.

const PANEL_ID = "scamhelp-panel";
const BUTTON_ID = "scamhelp-check-button";

function openedMessageNode() {
  // The last expanded message in the thread is the one the reader is looking at.
  const messages = document.querySelectorAll("div.adn.ads");
  return messages[messages.length - 1] || null;
}

function readEmail() {
  const node = openedMessageNode();
  if (!node) return null;

  const subject = document.querySelector("h2.hP")?.innerText?.trim() || "";
  const senderEl = node.querySelector("span.gD, span[email]");
  const senderName = senderEl?.getAttribute("name") || senderEl?.innerText || "";
  const senderAddress = senderEl?.getAttribute("email") || "";

  const bodyEl = node.querySelector("div.a3s");
  const body = bodyEl?.innerText?.trim() || "";

  const links = [...(bodyEl?.querySelectorAll("a[href]") || [])]
    .map((a) => a.href)
    .filter((href) => /^https?:/i.test(href))
    .filter((href) => !href.startsWith("https://mail.google.com/"));

  if (!body && !subject) return null;

  return { subject, senderName, senderAddress, body, links: [...new Set(links)] };
}

function toRequest(email) {
  const text = [
    `From: ${email.senderName} <${email.senderAddress}>`,
    `Subject: ${email.subject}`,
    "",
    email.body,
    email.links.length ? `\nLinks in this email:\n${email.links.join("\n")}` : "",
  ].join("\n");

  // The API takes a single url alongside the text; the first link is the one
  // the reader is most likely to click.
  return { type: "text", text: text.slice(0, 20000), url: email.links[0] };
}

const LEVEL_COPY = {
  high: { title: "This looks like a scam", tone: "danger", icon: "⛔" },
  medium: { title: "Be careful with this email", tone: "warn", icon: "⚠️" },
  low: { title: "No clear scam signs found", tone: "safe", icon: "✅" },
};

function ensurePanel() {
  let panel = document.getElementById(PANEL_ID);
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-live", "polite");
  document.body.appendChild(panel);
  return panel;
}

function closePanel() {
  speechSynthesis.cancel();
  document.getElementById(PANEL_ID)?.remove();
}

function closeButton() {
  const btn = document.createElement("button");
  btn.className = "scamhelp-close";
  btn.type = "button";
  btn.textContent = "✕";
  btn.setAttribute("aria-label", "Close ScamHelp result");
  btn.addEventListener("click", closePanel);
  return btn;
}

function renderMessage(text, tone = "neutral") {
  const panel = ensurePanel();
  panel.className = `scamhelp-panel scamhelp-${tone}`;
  panel.innerHTML = "";

  const p = document.createElement("p");
  p.className = "scamhelp-body";
  p.textContent = text;
  panel.append(closeButton(), p);
}

function spokenSummary(result, copy) {
  return [
    copy.title + ".",
    result.recommendation,
    "Warning signs: " + result.reasons.join(". "),
  ].join(" ");
}

function renderResult(result) {
  const copy = LEVEL_COPY[result.level] || LEVEL_COPY.medium;
  const panel = ensurePanel();
  panel.className = `scamhelp-panel scamhelp-${copy.tone}`;
  panel.innerHTML = "";

  const heading = document.createElement("h2");
  heading.className = "scamhelp-title";
  heading.textContent = `${copy.icon} ${copy.title}`;

  const advice = document.createElement("p");
  advice.className = "scamhelp-advice";
  advice.textContent = result.recommendation;

  const reasonsTitle = document.createElement("h3");
  reasonsTitle.className = "scamhelp-subtitle";
  reasonsTitle.textContent = "Why we think so";

  const list = document.createElement("ul");
  list.className = "scamhelp-reasons";
  for (const reason of result.reasons) {
    const li = document.createElement("li");
    li.textContent = reason;
    list.appendChild(li);
  }

  const score = document.createElement("p");
  score.className = "scamhelp-score";
  score.textContent = `Risk score: ${result.riskScore} out of 100`;

  const readAloud = document.createElement("button");
  readAloud.className = "scamhelp-read";
  readAloud.type = "button";
  readAloud.textContent = "🔊 Read this to me";
  readAloud.addEventListener("click", () => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenSummary(result, copy));
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  });

  panel.append(closeButton(), heading, advice, reasonsTitle, list, score, readAloud);
}

async function checkOpenEmail() {
  const email = readEmail();
  if (!email) {
    renderMessage("Open an email first, then press Check this email.");
    return;
  }

  renderMessage("Checking this email… one moment.");

  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "analyze",
      payload: toRequest(email),
    });
  } catch {
    renderMessage("ScamHelp could not run. Try reloading the Gmail tab.", "warn");
    return;
  }

  if (!response?.ok) {
    renderMessage(
      `ScamHelp could not check this email. ${response?.error || ""}`.trim(),
      "warn",
    );
    return;
  }

  renderResult(response.result);
}

function ensureButton() {
  if (document.getElementById(BUTTON_ID)) return;
  if (!openedMessageNode()) return;

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.type = "button";
  btn.textContent = "🛡️ Check this email";
  btn.addEventListener("click", checkOpenEmail);
  document.body.appendChild(btn);
}

// Gmail swaps views without navigating, so watch for the reading pane.
const observer = new MutationObserver(() => {
  if (openedMessageNode()) {
    ensureButton();
  } else {
    document.getElementById(BUTTON_ID)?.remove();
    closePanel();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
ensureButton();

// The popup asks the page for the open email so it can check it too.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "readOpenEmail") return false;
  const email = readEmail();
  sendResponse(email ? { ok: true, payload: toRequest(email) } : { ok: false });
  return false;
});
