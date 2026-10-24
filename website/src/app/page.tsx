import { FraudAnalyzer } from "@/components/fraud-analyzer";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center px-5 pt-10 pb-8 text-center sm:px-8 sm:pt-14 sm:pb-10">
        <h1 className="animate-panel-in font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Detect Online Scams
        </h1>
      </section>

      <section
        id="analyze"
        className="mx-auto w-full max-w-2xl flex-1 scroll-mt-6 px-5 pb-24 sm:px-8"
      >
        <FraudAnalyzer />
      </section>
    </main>
  );
}
