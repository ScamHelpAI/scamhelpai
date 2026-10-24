import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type LegalDocumentProps = {
  title: string;
  effectiveDate: string;
  children: ReactNode;
  onBack: () => void;
};

export function LegalDocument({
  title,
  effectiveDate,
  children,
  onBack,
}: LegalDocumentProps) {
  return (
    <main className="mx-auto max-w-2xl bg-background px-6 py-8 sm:px-8">
      <div className="mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeftIcon data-icon="inline-start" className="size-4" />
          Back to Settings
        </Button>
      </div>

      <header className="mb-8 space-y-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-base text-muted-foreground">
          Effective date: {effectiveDate}
        </p>
        <Separator className="mt-6" />
      </header>

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
      <h2 className="font-heading text-xl font-semibold tracking-tight">
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
