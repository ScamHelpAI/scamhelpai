/**
 * Content for the "How it works" pipeline explorer. Mirrors api-server:
 * handlers/analyze.handler.ts, services/analyze/*, services/quick-analyze/*,
 * tools/index.ts and schemas/*. Update this file when those change.
 */

export type StepKind = "ui" | "det" | "ai" | "agent";

export type StepId =
  | "input"
  | "linkCheck"
  | "collector"
  | "decision"
  | "quick"
  | "reviewer"
  | "final"
  | "results";

export type PipelineStep = {
  id: StepId;
  num: string;
  kind: StepKind;
  kindLabel: string;
  title: string;
  sub: string;
  /** Back of the card. */
  in: string;
  does: string;
  out: string;
  /** Inspector panel. */
  why: string;
  inCode: string;
  outCode: string;
  steps: string[];
  tools: string[];
  /** Short tag used in the trace log. */
  logTag: string;
  /** Sample trace lines: seconds since submit (negative = before), then the message. */
  trace: [number, string][];
};

export const STAGE_WIDTH = 1360;
export const STAGE_HEIGHT = 720;
export const NODE_WIDTH = 232;
export const NODE_HEIGHT = 156;

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "input",
    num: "01",
    kind: "ui",
    kindLabel: "INPUT",
    title: "Submission",
    sub: "Website upload or browser extension",
    in: "Text, a page, an email, or a file",
    does: "Uploads files, builds an AnalyzeRequest",
    out: "POST /v1/analyses",
    why: "There are two front doors. The website takes pasted text or a file (image, PDF, audio, .txt, .eml); files go straight to S3 with a presigned URL so the API only ever sees an asset id. The extension's background worker sends the open page or Gmail message as text plus the page URL.",
    inCode: `// website: file upload
POST /v1/assets/presign → { assetId, uploadUrl }
PUT  uploadUrl  (bytes to S3)
POST /v1/assets/:assetId/complete`,
    outCode: `POST /v1/analyses
{
  "inputs": [
    { "type": "text", "content": "…" }
    // or { "type": "image" | "pdf" | "audio", "assetId" }
    // or { "type": "url", "url" }
  ],
  "context": {
    "source": "browser_extension",
    "pageUrl": "https://mail.google.com/…"
  }
}`,
    steps: [
      "The website proxies requests through its own /api routes; the extension calls the API from its background worker.",
      "Email and page text is capped at 20,000 characters by the extension.",
      "The API validates the body with analyzeRequestSchema and checks every asset is uploaded before starting.",
    ],
    tools: [],
    logTag: "client",
    trace: [
      [
        0.0,
        'POST /v1/analyses · inputs[0].type="text" · source="browser_extension"',
      ],
      [0.02, 'analyses row created · status="analyzing"'],
    ],
  },
  {
    id: "linkCheck",
    num: "02",
    kind: "det",
    kindLabel: "DETERMINISTIC",
    title: "Link check",
    sub: "Extension link badges, Redis cache first",
    in: "Links on the open page",
    does: "Cache lookup, then URL, domain, threat checks",
    out: "safe / warning / danger per link",
    why: "This runs beside the main analysis, not inside it: the extension badges every link on a page through POST /v1/check/urls. The same link always gets the same answer, so results live in Redis. Safe links are cached longer than dangerous ones, and popular links longer still.",
    inCode: `POST /v1/check/urls
{
  "urls": ["http://secure-acct-verify.co/login"]
}`,
    outCode: `{
  "results": [{
    "url": "http://secure-acct-verify.co/login",
    "status": "danger",      // safe | warning | danger
    "score": 95,             // 0–100
    "reasons": [
      "Flagged as malicious by threat intelligence.",
      "Domain appears newly registered."
    ],
    "checkedAt": "…",
    "cached": false
  }]
}`,
    steps: [
      "Normalizes each URL and looks it up in Redis.",
      "On a miss, runs the three checks in parallel and adds up a 0–100 score (danger at 70, warning at 35).",
      "Stores the URL result (1–4 h by status) and a domain entry (24 h), scaled up for frequently checked links.",
    ],
    tools: ["inspect_url", "lookup_domain", "check_threat_intel"],
    logTag: "check",
    trace: [
      // Negative: badges are checked when the page loads, before anything is submitted.
      [-0.9, "page load · POST /v1/check/urls · 1 link · redis GET → miss"],
      [-0.52, 'score=95 → status="danger" · cached for 1h'],
    ],
  },
  {
    id: "collector",
    num: "03",
    kind: "det",
    kindLabel: "DETERMINISTIC",
    title: "Evidence collector",
    sub: "Pulls out indicators and checks each one",
    in: "AnalyzeRequest",
    does: "Extracts URLs, domains, phones, brands; runs tools",
    out: "Evidence[]",
    why: "Facts first, opinions later. Plain code pulls every URL, domain, phone number, crypto address and known brand out of the text, then runs lookups on all of them in parallel. Files are read here too: OCR or transcription for images, PDFs and audio, plus a malware scan and QR decoding.",
    inCode: `{
  "inputs": [{ "type": "text", "content": "…" }],
  "context": { "source": "browser_extension" }
}`,
    outCode: `Evidence[] = [{
  "id": "ev-003",
  "type": "domain",   // url | domain | email | threat_intel
                      // identity | file | external | …
  "source": "tool",
  "summary": "secure-acct-verify.co was registered 3 days ago",
  "confidence": 0.8,
  "toolName": "lookup_domain",
  "createdAt": "…"
}, …]`,
    steps: [
      "Ingests any image, PDF or audio asset into text and file evidence.",
      "Extracts up to 10 URLs, 5 domains, 3 phones, 3 crypto addresses and 3 brands.",
      "Runs every lookup in parallel; a failed tool is skipped, not fatal.",
    ],
    tools: [
      "inspect_url",
      "check_threat_intel",
      "lookup_domain",
      "lookup_phone",
      "lookup_crypto_address",
      "verify_brand_identity",
      "scan_file",
      "decode_qr",
      "ingest_image",
      "ingest_pdf",
      "ingest_audio",
    ],
    logTag: "collect",
    trace: [
      [0.05, "indicators: 1 url · 1 domain · 1 brand (paypal)"],
      [0.41, "inspect_url → usesHttps=false · 2 redirects"],
      [0.62, "lookup_domain → registered 3 days ago"],
      [0.66, 'check_threat_intel → verdict="malicious"'],
      [
        0.71,
        "verify_brand_identity paypal on secure-acct-verify.co → likely impersonation",
      ],
    ],
  },
  {
    id: "decision",
    num: "04",
    kind: "ai",
    kindLabel: "AI MODEL",
    title: "Decision model",
    sub: "Answers fixed questions about the evidence",
    in: "Text + Evidence[]",
    does: "Answers 6 yes/no questions, a scam type and a risk score",
    out: "ClassifierResult",
    why: "Instead of free-form chat, an OpenAI decision model answers a fixed set of questions with probabilities. That keeps it fast, cheap and easy to check: every answer has a number we can threshold in code.",
    inCode: `buildCollectorState(request, evidences)
// text, indicators, evidence summaries
questions: impersonation, credential_harvest,
  payment_redirection, malware_delivery,
  urgency_manipulation, insufficient_evidence,
  scam_type (choice), risk (score 0–3)`,
    outCode: `{
  "answers": {
    "credential_harvest": { "type": "boolean", "probability": 0.93 },
    "impersonation":      { "type": "boolean", "probability": 0.88 },
    "scam_type": { "type": "choice", "choice": "credential_phishing" },
    "risk":      { "type": "score",  "score": 3 }
  },
  "providerConfidence": { "scam_type": 0.9 },
  "modelId": "gpt-6-luna"
}`,
    steps: [
      "Formats the submission text and every evidence summary into one prompt.",
      "Calls experimental_decide with 8 questions and their criteria.",
      "Keeps per-answer probabilities and the provider's confidence for later thresholds.",
    ],
    tools: [],
    logTag: "decide",
    trace: [
      [0.74, "decide ← 8 questions · 5 evidence items"],
      [1.52, "credential_harvest=0.93 · impersonation=0.88 · urgency=0.81"],
      [1.52, 'scam_type="credential_phishing" · risk=3'],
    ],
  },
  {
    id: "quick",
    num: "05",
    kind: "det",
    kindLabel: "DETERMINISTIC",
    title: "Quick verdict",
    sub: "A first answer, returned right away",
    in: "ClassifierResult + Evidence[]",
    does: "Combines probabilities, picks Don't/Do copy",
    out: 'AnalysisResult, status "reviewing"',
    why: "The person gets an answer in seconds. Plain code turns the classifier's numbers into a score, keeps the strongest evidence, and writes a provisional Don't/Do. It is saved to Postgres and returned with status \"reviewing\" while the reviewer keeps working.",
    inCode: `combineScamProbability(classifier)
  = max(high-impact probabilities, risk / 3)
toRiskLevel(score)
  ≥ 0.85 critical · ≥ 0.6 high · ≥ 0.3 medium · else low`,
    outCode: `201 Created
{
  "id": "…",
  "status": "reviewing",
  "risk": { "score": 0.93, "level": "critical", "confidence": 0.93 },
  "classification": { "primary": "credential_phishing" },
  "decision": {
    "title": "Trying to steal your login",
    "dont": "Don't enter passwords or codes from this message.",
    "do": "Do sign in only by opening the app or site yourself."
  },
  "riskyParts": [],
  "evidence": [{ "id": "ev-003", "summary": "…", "severity": "high" }]
}`,
    steps: [
      "Scores the message from the four high-impact flags and the risk answer.",
      "Keeps up to 5 evidence items with confidence ≥ 0.7 as supported claims.",
      "Saves the analysis, its evidence and the classifier run to Postgres, then returns 201.",
    ],
    tools: [],
    logTag: "quick",
    trace: [
      [1.53, 'score=0.93 → level="critical"'],
      [1.58, 'postgres UPDATE analyses · status="reviewing" · 201 sent'],
    ],
  },
  {
    id: "reviewer",
    num: "06",
    kind: "agent",
    kindLabel: "AGENT",
    title: "Reviewer agent",
    sub: "Fact-checks the first answer with tools",
    in: "Evidence[] + classifier prior",
    does: "Re-runs checks that would change the answer",
    out: "ReviewerAssessment",
    why: "A tool-using model runs in the background after the first answer is sent. It starts from the classifier's prior and only re-checks claims that would change the result if they were wrong, so it confirms or lightly adjusts rather than starting over. It also quotes the exact risky phrases for highlighting.",
    inCode: `buildReviewerPrompt({
  request, evidences, classifier,
  extractedTextByInputIndex
})
model: gpt-6-luna · up to 20 steps`,
    outCode: `{
  "verdict": "agree",  // agree | agree_with_adjustments
                       // disagree | insufficient_evidence
  "finalScamProbability": 0.94,
  "finalScamType": "credential_phishing",
  "supportedClaims": [{ "claim": "…", "evidenceIds": ["ev-003"] }],
  "unsupportedClaims": [],
  "contradictions": [],
  "confidenceAdjustment": 0.01,
  "decision": { "title": "…", "dont": "…", "do": "…" },
  "riskyParts": [{ "quote": "verify within 24 hours",
                   "message": "Rushes you with a fake deadline." }]
}`,
    steps: [
      "Reads the classifier prior and starts from agree.",
      "Calls tools only for claims that would change the verdict: brands, links, email headers, files.",
      "Returns a structured assessment: every supported claim must cite evidence ids.",
    ],
    tools: [
      "verify_evidence",
      "inspect_url",
      "lookup_domain",
      "check_threat_intel",
      "verify_brand_identity",
      "inspect_email",
      "decode_qr",
      "scan_file",
      "load_submission_asset",
      "web_search",
    ],
    logTag: "review",
    trace: [
      [1.6, "reviewer ← prior: credential_phishing @ 0.93"],
      [3.9, 'verify_evidence { type: "domain" } → confirmed'],
      [6.2, 'web_search "PayPal official login domain" → paypal.com'],
      [8.4, 'verdict="agree" · probability 0.93 → 0.94 · riskyParts=3'],
    ],
  },
  {
    id: "final",
    num: "07",
    kind: "det",
    kindLabel: "DETERMINISTIC",
    title: "Final verdict",
    sub: "Saved to Postgres, status completed",
    in: "ReviewerAssessment",
    does: "Maps score to level, saves, cleans up",
    out: 'AnalysisResult, status "completed"',
    why: "The reviewed assessment replaces the quick one. If the reviewer fails, the quick verdict is kept and marked completed, so the person always has an answer. Uploaded files from low- and medium-risk checks are deleted.",
    inCode: `saveReviewCompletion({
  id, assessment, evidences, reviewerModel
})`,
    outCode: `{
  "status": "completed",
  "risk": { "score": 0.94, "level": "critical" },
  "classification": { "primary": "credential_phishing" },
  "review": {
    "verdict": "agree",
    "unsupportedClaims": [],
    "contradictions": [],
    "confidenceAdjustment": 0.01
  },
  "completedAt": "…"
}`,
    steps: [
      "Maps the final probability to low, medium, high or critical.",
      "Writes the result and the reviewer run to Postgres.",
      "Records completion stats and purges uploaded assets when the risk is low or medium.",
    ],
    tools: [],
    logTag: "final",
    trace: [
      [8.45, 'level="critical" · type="credential_phishing"'],
      [8.5, 'postgres UPDATE analyses · status="completed"'],
    ],
  },
  {
    id: "results",
    num: "08",
    kind: "ui",
    kindLabel: "UI",
    title: "Results panel",
    sub: "Score, scam type, red flags, Don't/Do",
    in: "AnalysisResult",
    does: "Polls until completed, then renders",
    out: "Plain-English guidance",
    why: "The client shows the quick verdict immediately and polls GET /v1/analyses/:id until the review completes. In Gmail, each riskyParts quote becomes a red highlight with its own explanation.",
    inCode: `GET /v1/analyses/:id
{ "status": "completed", "risk": { … },
  "decision": { … }, "riskyParts": [ … ] }`,
    outCode: `HIGH RISK · 94 / 100
Scam type: PHISHING

What we found
 1. Rushes you with a fake deadline.
 …
What to do now
 ✗ Don't enter passwords or codes from this message.
 ✓ Do sign in only by opening the app or site yourself.`,
    steps: [
      "Shows the first answer with a “Double-checking…” note.",
      "Polls the analysis until status is completed.",
      "Maps the level to a word, an icon and a colour, never colour alone.",
    ],
    tools: [],
    logTag: "ui",
    trace: [
      [8.9, 'GET /v1/analyses/:id → status="completed"'],
      [8.95, "render panel · 3 red highlights"],
    ],
  },
];

/** [from, to, dashed]. Dashed edges are side paths, not the main flow. */
export const PIPELINE_EDGES: [StepId, StepId, boolean][] = [
  ["input", "linkCheck", true],
  ["input", "collector", false],
  ["collector", "decision", false],
  ["decision", "quick", false],
  ["quick", "reviewer", false],
  ["collector", "reviewer", true],
  ["reviewer", "final", false],
  ["final", "results", false],
  ["quick", "results", true],
];

export const STEP_POSITIONS: Record<StepId, { x: number; y: number }> = {
  input: { x: 24, y: 282 },
  linkCheck: { x: 300, y: 96 },
  collector: { x: 300, y: 470 },
  decision: { x: 568, y: 470 },
  quick: { x: 836, y: 470 },
  reviewer: { x: 568, y: 96 },
  final: { x: 836, y: 96 },
  results: { x: 1104, y: 282 },
};
