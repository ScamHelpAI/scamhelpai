const resultEl = document.getElementById("result");

function showText(text) {
  resultEl.textContent = "";
  const card = document.createElement("div");
  card.className = "card";
  card.textContent = text;
  resultEl.appendChild(card);
}

function showResult(result) {
  resultEl.textContent = "";

  const { copy, heading, advice, list, score, readBtn } = scamhelpRenderVerdict(result, "read");
  const card = document.createElement("div");
  card.className = `card ${copy.tone}`;
  card.append(heading, advice, list, score, readBtn);
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
