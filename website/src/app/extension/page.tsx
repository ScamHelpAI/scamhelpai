import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "The Extension | Scam Help.AI",
  description: "How the Scam Help.AI extension checks a page in five steps.",
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

export default function ExtensionPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 pt-10 pb-24 sm:px-8 sm:pt-14">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="animate-panel-in font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          How the extension works
        </h1>
        <p className="text-lg text-muted-foreground">
          Every page you check goes through the same five steps.
        </p>
      </header>

      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={step.title}>
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl">
                  {i + 1}. {step.title}
                </CardTitle>
                <CardDescription className="text-base">
                  {step.body}
                </CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="text-base text-muted-foreground">
          Confirmed scams are turned into lessons that help both AIs and our
          users spot the next one.
        </CardContent>
      </Card>
    </main>
  );
}
