import type { Verdict, VerdictTone } from "../verdict.ts";

const PANEL_ID = "scamhelp-panel";
export const BUTTON_ID = "scamhelp-check-button";

export function closePanel(): void {
  speechSynthesis.cancel();
  document.getElementById(PANEL_ID)?.remove();
}

function ensurePanel(): HTMLElement {
  let panel = document.getElementById(PANEL_ID);
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-live", "polite");
  document.body.appendChild(panel);
  return panel;
}

function closeButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "scamhelp-close";
  btn.type = "button";
  btn.textContent = "✕";
  btn.setAttribute("aria-label", "Close ScamHelp result");
  btn.addEventListener("click", closePanel);
  return btn;
}

export function renderMessage(
  text: string,
  tone: VerdictTone | "neutral" = "neutral",
): void {
  const panel = ensurePanel();
  panel.className = `scamhelp-panel scamhelp-${tone}`;
  panel.replaceChildren();

  const p = document.createElement("p");
  p.className = "scamhelp-body";
  p.textContent = text;
  panel.append(closeButton(), p);
}

export function renderResult(verdict: Verdict): void {
  const panel = ensurePanel();
  panel.className = `scamhelp-panel scamhelp-${verdict.tone}`;
  panel.replaceChildren();

  const heading = document.createElement("h2");
  heading.className = "scamhelp-title";
  heading.textContent = `${verdict.icon} ${verdict.title}`;

  const advice = document.createElement("p");
  advice.className = "scamhelp-advice";
  advice.textContent = verdict.recommendation;

  const reasonsTitle = document.createElement("h3");
  reasonsTitle.className = "scamhelp-subtitle";
  reasonsTitle.textContent = "Why we think so";

  const list = document.createElement("ul");
  list.className = "scamhelp-reasons";
  for (const reason of verdict.reasons) {
    const li = document.createElement("li");
    li.textContent = reason;
    list.appendChild(li);
  }

  const score = document.createElement("p");
  score.className = "scamhelp-score";
  score.textContent = `Risk score: ${verdict.riskScore} out of 100`;

  const readAloud = document.createElement("button");
  readAloud.className = "scamhelp-read";
  readAloud.type = "button";
  readAloud.textContent = "Read this to me";
  readAloud.addEventListener("click", () => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(verdict.spoken);
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  });

  panel.append(
    closeButton(),
    heading,
    advice,
    reasonsTitle,
    list,
    score,
    readAloud,
  );
}

export function ensureCheckButton(onClick: () => void): void {
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.type = "button";
  btn.textContent = "Check this email";
  btn.addEventListener("click", onClick);
  document.body.appendChild(btn);
}

export function removeCheckButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
}
