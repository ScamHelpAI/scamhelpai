import { useEffect, useState } from "react";
import { FileTextIcon, ScaleIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getLinkScanEnabled,
  setLinkScanEnabled,
} from "@/shared/settings.ts";
import {
  hashForLegalView,
  legalViewFromHash,
  type LegalView,
} from "./legal/constants.ts";
import { PrivacyPolicy } from "./legal/PrivacyPolicy.tsx";
import { TermsOfService } from "./legal/TermsOfService.tsx";

export default function App() {
  const [view, setView] = useState<LegalView>(() =>
    legalViewFromHash(window.location.hash),
  );
  const [linkScanEnabled, setLinkScanEnabledState] = useState(false);
  const [linkScanReady, setLinkScanReady] = useState(false);

  useEffect(() => {
    void getLinkScanEnabled().then((enabled) => {
      setLinkScanEnabledState(enabled);
      setLinkScanReady(true);
    });
  }, []);

  useEffect(() => {
    function onHashChange() {
      setView(legalViewFromHash(window.location.hash));
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(next: LegalView) {
    const hash = hashForLegalView(next);
    if (hash) {
      window.location.hash = hash;
    } else if (window.location.hash) {
      history.pushState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
    setView(next);
  }

  async function toggleLinkScan(next: boolean) {
    setLinkScanEnabledState(next);
    await setLinkScanEnabled(next);
  }

  if (view === "privacy") {
    return <PrivacyPolicy onBack={() => navigate("settings")} />;
  }

  if (view === "terms") {
    return <TermsOfService onBack={() => navigate("settings")} />;
  }

  return (
    <main className="mx-auto max-w-lg bg-background p-8">
      <header className="mb-8 space-y-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Adjust how ScamHelp AI checks pages you visit.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4">
          <div className="space-y-1.5 pr-2">
            <Label
              htmlFor="link-scan"
              className="font-heading text-lg font-semibold"
            >
              Scan links on pages
            </Label>
            <p className="text-base leading-relaxed text-muted-foreground">
              Show a caution on risky links and block ones that look unsafe.
            </p>
          </div>
          <Switch
            id="link-scan"
            className="mt-1"
            checked={linkScanEnabled}
            disabled={!linkScanReady}
            onCheckedChange={(checked) => void toggleLinkScan(checked)}
          />
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Legal
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          How we handle data and the rules for using ScamHelp AI.
        </p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => navigate("privacy")}
          >
            <FileTextIcon
              className="size-5 shrink-0 text-trust"
              aria-hidden
            />
            <span className="flex-1">
              <span className="block font-heading text-base font-semibold">
                Privacy Policy
              </span>
              <span className="block text-sm text-muted-foreground">
                What we collect and how we use it
              </span>
            </span>
          </button>
          <div className="border-t border-border" />
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => navigate("terms")}
          >
            <ScaleIcon className="size-5 shrink-0 text-trust" aria-hidden />
            <span className="flex-1">
              <span className="block font-heading text-base font-semibold">
                Terms of Service
              </span>
              <span className="block text-sm text-muted-foreground">
                Rules for using the extension and API
              </span>
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
