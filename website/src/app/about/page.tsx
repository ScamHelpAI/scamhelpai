import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Scam Help.AI",
  description:
    "What Scam Help.AI is and who makes it: a free scam checker from Students Against Scams.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-10 pb-24 sm:px-8 sm:pt-14">
      <article className="animate-panel-in">
        <header className="mb-10 border-b border-border pb-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            About Scam Help.AI
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Scam Help.AI is a free tool that helps you spot online scams before
            they catch you. Paste a message, link or email, or use our Chrome
            extension, and two AI checks look at the evidence: where links
            lead, who owns a website, and whether a phone number or brand shows
            up in known scam reports. You get a plain answer, a risk score from
            0 to 100, the warning signs we found, and what to do next.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            It is built by Students Against Scams, a 501(c)(3) non-profit, to
            protect people who are often targeted by scammers, like seniors and
            their families.
          </p>
        </header>

        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border">
          <iframe
            className="size-full"
            src="https://www.youtube-nocookie.com/embed/wN7gOKo17Ks"
            title="Scam Help.AI video"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        <aside className="mt-10 border-t border-border pt-8 text-muted-foreground">
          Want the details?{" "}
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
