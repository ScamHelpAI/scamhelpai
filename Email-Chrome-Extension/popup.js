const LEVEL_COPY = {
  high: { title: "⛔ This looks like a scam", tone: "danger" },
  medium: { title: "⚠️ Be careful with this email", tone: "warn" },
  low: { title: "✅ No clear scam signs found", tone: "safe" },
};

const resultEl = document.getElementById("result");

function showText(text) {
  resultEl.textContent = "";
  const card = document.createElement("div");
  card.className = "card";
  card.textContent = text;
  resultEl.appendChild(card);
}

function showResult(result) {
  const copy = LEVEL_COPY[result.level] || LEVEL_COPY.medium;
  resultEl.textContent = "";

  const card = document.createElement("div");
  card.className = `card ${copy.tone}`;

  const h2 = document.createElement("h2");
  h2.textContent = copy.title;

  const advice = document.createElement("p");
  advice.textContent = result.recommendation;

  const list = document.createElement("ul");
  for (const reason of result.reasons) {
    const li = document.createElement("li");
    li.textContent = reason;
    list.appendChild(li);
  }

  const score = document.createElement("p");
  score.textContent = `Risk score: ${result.riskScore} out of 100`;

  const read = document.createElement("button");
  read.className = "read";
  read.type = "button";
  read.textContent = "🔊 Read this to me";
  read.addEventListener("click", () => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${copy.title}. ${result.recommendation} Warning signs: ${result.reasons.join(". ")}`,
    );
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  });

  card.append(h2, advice, list, score, read);
  resultEl.appendChild(card);
}

async function runAnalysis(payload) {
  showText("Checking… one moment.");
  const response = await chrome.runtime.sendMessage({ type: "analyze", payload });
  if (!response?.ok) {
    showText(
      `Could not check this. ${response?.error || "Is the ScamHelp server running?"}`,
    );
    return;
  }
  showResult(response.result);
}

document.getElementById("check-open").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith("https://mail.google.com/")) {
    showText("Open Gmail and click on an email first, then try again.");
    return;
  }

  let email;
  try {
    email = await chrome.tabs.sendMessage(tab.id, { type: "readOpenEmail" });
  } catch {
    showText("Please reload the Gmail tab, then try again.");
    return;
  }

  if (!email?.ok) {
    showText("Open an email in Gmail first, then try again.");
    return;
  }

  await runAnalysis(email.payload);
});

document.getElementById("check-pasted").addEventListener("click", async () => {
  const text = document.getElementById("pasted").value.trim();
  if (!text) {
    showText("Paste the email text into the box first.");
    return;
  }
  await runAnalysis({ type: "text", text: text.slice(0, 20000) });
});

document.getElementById("settings").addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});
