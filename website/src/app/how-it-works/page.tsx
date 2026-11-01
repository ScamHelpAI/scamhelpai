import { ArrowDownIcon, InfoIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PipelineExplorer } from "@/components/pipeline-explorer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works | Scam Help.AI",
  description:
    "How Scam Help.AI checks a message in five steps, plus a technical tour for builders.",
};

const steps = [
  {
    title: "You open a page",
    body: "The browser extension reads the text, links and files on the page you are viewing. It only does this with your permission.",
  },
  {
    title: "We gather the facts",
    body: "Our server tidies up what the extension sent and collects evidence: where the links lead, who owns the website, and what is inside any images or attachments.",
  },
  {
    title: "A fast first opinion",
    body: "An AI model reads the evidence and quickly says whether the page looks like a scam, how sure it is, and why.",
  },
  {
    title: "A second AI double-checks",
    body: "A reviewer AI does not just trust the first opinion. It uses specialized tools to look up websites, phone numbers, brands and known scam reports, and tests every claim.",
  },
  {
    title: "You get a clear answer",
    body: "The extension shows whether the page is a scam, a risk score from 0 to 100, the type of scam, the warning signs it found, and what to do next.",
  },
];

const BUILT_WITH = [
  "Next.js",
  "Bun + Hono",
  "Vercel AI SDK",
  "OpenAI",
  "PostgreSQL + Drizzle",
  "Redis",
  "S3",
];

export default function HowItWorksPage() {
  return (
    <main className="flex flex-1 flex-col">
      <article className="animate-panel-in mx-auto w-full max-w-2xl px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
        <header className="mb-10 border-b border-border pb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How it works
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Every page or message you check goes through the same five steps.
          </p>
        </header>

        <div className="flex flex-col gap-10 text-[1.05rem] leading-relaxed text-foreground">
          {steps.map((step, i) => (
            <section key={step.title} aria-labelledby={`step-${i + 1}`}>
              <h2
                id={`step-${i + 1}`}
                className="font-heading text-xl font-bold tracking-tight text-foreground"
              >
                <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                {step.title}
              </h2>
              <p className="mt-3 text-muted-foreground">{step.body}</p>
            </section>
          ))}

          <aside className="border-t border-border pt-8 text-muted-foreground">
            Confirmed scams are turned into lessons that help both AIs and our
            users spot the next one.
          </aside>
        </div>

        <div
          role="note"
          className="mt-16 flex flex-col gap-5 rounded-3xl border-2 border-brand-light bg-card px-6 py-8 shadow-sm sm:px-10"
        >
          <div className="flex items-center gap-3">
            <InfoIcon className="size-8 shrink-0 text-[#b8650a]" aria-hidden />
            <h2 className="text-2xl tracking-tight sm:text-3xl">
              The rest of this page is for software builders
            </h2>
          </div>
          <p className="text-xl leading-relaxed">
            Below is a technical tour of the AI models, code and servers.{" "}
            <strong>You do not need any of it to stay safe.</strong>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg">
              <Link href="/#analyze">Check a message</Link>
            </Button>
          </div>
          <a
            href="#builders"
            className="inline-flex min-h-11 items-center gap-2 self-start text-lg font-semibold text-trust underline-offset-4 hover:underline"
          >
            <ArrowDownIcon className="size-5" aria-hidden />
            I&apos;m a builder, show me the details
          </a>
        </div>
      </article>

      <section
        id="builders"
        aria-label="How it works, for builders"
        className="mx-auto w-full max-w-[1440px] scroll-mt-6 px-5 sm:px-10"
      >
        <PipelineExplorer />

        <div className="flex flex-wrap items-center gap-3 pb-16 text-base text-[#56534b]">
          <b className="text-foreground">Built with</b>
          {BUILT_WITH.map((name) => (
            <span
              key={name}
              className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 font-mono text-sm font-medium text-foreground"
            >
              {name}
            </span>
          ))}
          <span className="sm:ml-auto">
            The trace uses a sample phishing email. Values are illustrative.
          </span>
        </div>
      </section>
    </main>
  );
}
