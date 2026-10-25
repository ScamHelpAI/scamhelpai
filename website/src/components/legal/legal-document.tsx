import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type LegalDocumentProps = {
  title: string;
  effectiveDate: string;
  children: ReactNode;
};

export function LegalDocument({
  title,
  effectiveDate,
  children,
}: LegalDocumentProps) {
  return (
    <main className="mx-auto max-w-2xl space-y-8 bg-background px-6 py-8 sm:px-8">
      <Button type="button" variant="ghost" size="sm" asChild>
        <Link href="/">
          <ArrowLeftIcon data-icon="inline-start" />
          Back to home
        </Link>
      </Button>

      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground">
          Effective date: {effectiveDate}
        </p>
      </header>

      <hr className="border-border" />

      <article className="legal-prose space-y-6 text-base leading-relaxed text-foreground">
        {children}
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl font-bold tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 text-foreground/90">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
