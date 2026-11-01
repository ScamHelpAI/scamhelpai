import { ClockIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "The Extension | Scam Help.AI",
  description: "How to add the Scam Help.AI extension to Google Chrome.",
};

const steps = [
  {
    title: "Open the Chrome Web Store page",
    body: "Use Google Chrome on a computer. Once the extension is published, the button on this page will take you straight to it.",
  },
  {
    title: "Click “Add to Chrome”",
    body: "Chrome will ask if you want to add ScamHelp AI. Click “Add extension” to confirm.",
  },
  {
    title: "Pin it to your toolbar",
    body: "Click the puzzle-piece icon at the top right of Chrome, then click the pin next to ScamHelp AI so it is always easy to find.",
  },
  {
    title: "Check a page or an email",
    body: "On any website, click the ScamHelp AI icon and press “Scan this page”. In Gmail, open an email and press “Check with ScamHelp”.",
  },
];

export default function ExtensionPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-10 pb-24 sm:px-8 sm:pt-14">
      <article className="animate-panel-in">
        <header className="mb-10 border-b border-border pb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Get the Chrome extension
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            The extension checks websites and Gmail messages for you, right
            where you read them.
          </p>

          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-brand-light bg-accent px-5 py-4 text-[17px] leading-snug text-accent-foreground"
          >
            <ClockIcon className="mt-0.5 size-6 shrink-0" aria-hidden />
            <p>
              <strong>Coming soon.</strong> We are uploading the extension to
              the Chrome Web Store. It is not available to download yet.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" disabled>
              Uploading to the Chrome Web Store…
            </Button>
            <Button asChild variant="outline" size="lg" className="border-2">
              <Link href="/#analyze">Check a message now</Link>
            </Button>
          </div>
        </header>

        <h2 className="mb-8 font-heading text-2xl font-bold tracking-tight text-foreground">
          How to install it
        </h2>
        <ol className="flex flex-col gap-10 text-[1.05rem] leading-relaxed text-foreground">
          {steps.map((step, i) => (
            <li key={step.title}>
              <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">
                <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                {step.title}
              </h3>
              <p className="mt-3 text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <aside className="mt-10 border-t border-border pt-8 text-muted-foreground">
          Want to know what happens when you press check?{" "}
          <Link
            href="/how-it-works"
            className="font-semibold text-trust underline-offset-4 hover:underline"
          >
            Read how it works
          </Link>
          .
        </aside>
      </article>
    </main>
  );
}
