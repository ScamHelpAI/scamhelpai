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

function renderResult(result) {
  const panel = ensurePanel();
  const { copy, heading, advice, list, score, readBtn } = scamhelpRenderVerdict(
    result,
    "scamhelp-read",
  );
  panel.className = `scamhelp-panel scamhelp-${copy.tone}`;
  panel.innerHTML = "";

  heading.className = "scamhelp-title";
  advice.className = "scamhelp-advice";
  list.className = "scamhelp-reasons";
  score.className = "scamhelp-score";

  const reasonsTitle = document.createElement("h3");
  reasonsTitle.className = "scamhelp-subtitle";
  reasonsTitle.textContent = "Why we think so";

  panel.append(closeButton(), heading, advice, reasonsTitle, list, score, readBtn);
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
