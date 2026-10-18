// Shared by popup.js and content/gmail.js so the verdict card and
// read-aloud button exist in exactly one place. Plain script (no module),
// loaded before its caller, so it just defines globals in the shared scope.

const SCAMHELP_LEVELS = {
  high: { title: "This looks like a scam", tone: "danger", icon: "⛔" },
  medium: { title: "Be careful with this email", tone: "warn", icon: "⚠️" },
  low: { title: "No clear scam signs found", tone: "safe", icon: "✅" },
};

function scamhelpCopy(level) {
  return SCAMHELP_LEVELS[level] || SCAMHELP_LEVELS.medium;
}

function scamhelpSpeak(result, copy) {
  speechSynthesis.cancel();
  const text = `${copy.title}. ${result.recommendation} Warning signs: ${result.reasons.join(". ")}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  speechSynthesis.speak(utterance);
}

// Builds the verdict nodes (heading, advice, reasons list, score, read-aloud
// button). Caller assigns its own classes/container so popup and the Gmail
// panel keep their own CSS.
function scamhelpRenderVerdict(result, readClass) {
  const copy = scamhelpCopy(result.level);

  const heading = document.createElement("h2");
  heading.textContent = `${copy.icon} ${copy.title}`;

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

  const readBtn = document.createElement("button");
  readBtn.className = readClass;
  readBtn.type = "button";
  readBtn.textContent = "🔊 Read this to me";
  readBtn.addEventListener("click", () => scamhelpSpeak(result, copy));

  return { copy, heading, advice, list, score, readBtn };
}
