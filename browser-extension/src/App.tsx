import { useEffect, useState } from "react";
import {
  analyze,
  checkOpenEmail,
  getActiveTab,
  getActiveTabUrl,
  isGmailUrl,
} from "./api.ts";
import { textToAnalyzeRequest, urlToAnalyzeRequest } from "./email-request.ts";
import type { AnalysisResult } from "./types.ts";
import { toVerdict, type VerdictTone } from "./verdict.ts";

function toneClass(tone: VerdictTone): string {
  switch (tone) {
    case "danger":
      return "border-red-700 bg-red-50";
    case "warn":
      return "border-amber-700 bg-amber-50";
    case "safe":
      return "border-green-700 bg-green-50";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function speak(text: string): void {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  speechSynthesis.speak(utterance);
}

function VerdictCard({ result }: { result: AnalysisResult }) {
  const verdict = toVerdict(result);

  return (
    <section
      className={`mt-5 rounded-xl border-[3px] p-4 ${toneClass(verdict.tone)}`}
      role="status"
      aria-live="polite"
    >
      <h2 className="mb-2 pr-2 text-xl font-bold leading-tight">
        {verdict.icon} {verdict.title}
      </h2>
      <p className="mb-3 text-base font-semibold leading-snug">
        {verdict.recommendation}
      </p>
      {verdict.reasons.length > 0 ? (
        <>
          <h3 className="mb-1 text-base font-bold">Why we think so</h3>
          <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[15px] leading-snug">
            {verdict.reasons.slice(0, 6).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="mb-3 text-sm text-muted">
        Risk score: {verdict.riskScore} out of 100
      </p>
      <button
        type="button"
        className="w-full rounded-[10px] bg-slate-700 px-3 py-3 text-base font-semibold text-white hover:bg-slate-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        onClick={() => speak(verdict.spoken)}
      >
        Read this to me
      </button>
    </section>
  );
}

export default function App() {
  const [onGmail, setOnGmail] = useState(false);
  const [pasted, setPasted] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getActiveTab().then((tab) => {
      setOnGmail(isGmailUrl(tab?.url));
    });
  }, []);

  async function run(action: () => Promise<AnalysisResult>) {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      setResult(await action());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not check this. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-5">
      <h1 className="mb-1 text-2xl font-semibold leading-tight">ScamHelp AI</h1>
      <p className="mb-4 text-[15px] leading-relaxed text-muted">
        {onGmail
          ? "Not sure about an email? Let's check it together."
          : "Check suspicious messages and URLs for scam signals."}
      </p>

      {onGmail ? (
        <button
          type="button"
          onClick={() => void run(checkOpenEmail)}
          disabled={loading}
          className="w-full rounded-xl bg-brand px-4 py-3.5 text-[17px] font-semibold text-white hover:bg-brand-hover focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Checking…" : "Check the email I have open"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            void run(async () => {
              const pageUrl = await getActiveTabUrl();
              return analyze(urlToAnalyzeRequest(pageUrl));
            })
          }
          disabled={loading}
          className="w-full rounded-xl bg-brand px-4 py-3.5 text-[17px] font-semibold text-white hover:bg-brand-hover focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Scanning…" : "Scan this page"}
        </button>
      )}

      <p className="my-3 text-center text-sm font-semibold text-muted">
        or paste the message here
      </p>
      <label className="sr-only" htmlFor="pasted">
        Paste a suspicious message
      </label>
      <textarea
        id="pasted"
        rows={5}
        value={pasted}
        placeholder="Paste the email text here..."
        onChange={(event) => setPasted(event.target.value)}
        className="mb-3 w-full resize-y rounded-[10px] border-2 border-slate-400 p-3 text-base leading-snug focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
      />
      <button
        type="button"
        onClick={() => {
          const text = pasted.trim();
          if (!text) {
            setError("Paste the email text into the box first.");
            setResult(null);
            return;
          }
          void run(() => analyze(textToAnalyzeRequest(text)));
        }}
        disabled={loading}
        className="w-full rounded-xl bg-brand px-4 py-3.5 text-[17px] font-semibold text-white hover:bg-brand-hover focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Checking…" : "Check this text"}
      </button>

      {error ? (
        <p className="mt-3 text-[15px] font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {result ? <VerdictCard result={result} /> : null}

      <button
        type="button"
        className="mt-4 text-[15px] font-medium text-brand hover:underline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        Settings
      </button>
    </main>
  );
}
