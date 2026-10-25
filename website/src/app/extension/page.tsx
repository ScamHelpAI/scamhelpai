import type { Metadata } from "next";

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
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-10 pb-24 sm:px-8 sm:pt-14">
      <article className="animate-panel-in">
        <header className="mb-10 border-b border-border pb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How the extension works
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Every page you check goes through the same five steps.
          </p>
        </header>

        <div className="flex flex-col gap-10 text-[1.05rem] leading-relaxed text-foreground">
          {steps.map((step, i) => (
            <section key={step.title} aria-labelledby={`step-${i + 1}`}>
              <h2
                id={`step-${i + 1}`}
                className="font-heading text-xl font-semibold tracking-tight text-foreground"
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
      </article>
    </main>
  );
}
