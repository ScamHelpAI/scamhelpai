import { useEffect, useState } from "react";
import { ChevronRightIcon, FileTextIcon, ScaleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_API_BASE } from "@/shared/api-url.ts";
import {
  getApiBaseSetting,
  getLinkScanEnabled,
  setApiBaseSetting,
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
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [apiBaseReady, setApiBaseReady] = useState(false);
  const [apiBaseSaved, setApiBaseSaved] = useState(false);

  useEffect(() => {
    void getLinkScanEnabled().then((enabled) => {
      setLinkScanEnabledState(enabled);
      setLinkScanReady(true);
    });
    void getApiBaseSetting().then((base) => {
      setApiBase(base);
      setApiBaseReady(true);
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

  async function saveApiBase() {
    await setApiBaseSetting(apiBase);
    const saved = await getApiBaseSetting();
    setApiBase(saved);
    setApiBaseSaved(true);
    window.setTimeout(() => setApiBaseSaved(false), 2000);
  }

  function resetApiBase() {
    setApiBase(DEFAULT_API_BASE);
    void setApiBaseSetting(DEFAULT_API_BASE).then(() => {
      setApiBaseSaved(true);
      window.setTimeout(() => setApiBaseSaved(false), 2000);
    });
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
        <Card size="sm">
          <CardHeader>
            <CardTitle>Scan links on pages</CardTitle>
            <CardDescription>
              Show a caution on risky links and block ones that look unsafe.
            </CardDescription>
            <CardAction>
              <Switch
                checked={linkScanEnabled}
                disabled={!linkScanReady}
                onCheckedChange={(checked) => void toggleLinkScan(checked)}
                aria-label="Scan links on pages"
              />
            </CardAction>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-8">
        <details className="group space-y-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-heading text-lg font-bold tracking-tight marker:content-none [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
              aria-hidden
            />
            Debug
          </summary>
          <Card size="sm">
            <CardHeader>
              <CardTitle>API URL</CardTitle>
              <CardDescription>
                Base URL for the ScamHelp server (no trailing slash). Default is{" "}
                {DEFAULT_API_BASE}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                id="api-base"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder={DEFAULT_API_BASE}
                value={apiBase}
                disabled={!apiBaseReady}
                onChange={(event) => setApiBase(event.target.value)}
                aria-label="API URL"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!apiBaseReady}
                  onClick={() => void saveApiBase()}
                >
                  Save API URL
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!apiBaseReady}
                  onClick={() => resetApiBase()}
                >
                  Reset to default
                </Button>
                {apiBaseSaved ? (
                  <span className="text-sm text-muted-foreground">Saved.</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </details>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-heading text-lg font-bold tracking-tight">
          Legal
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          How we handle data and the rules for using ScamHelp AI.
        </p>
        <Card size="sm">
          <CardContent className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("privacy")}
            >
              <FileTextIcon data-icon="inline-start" />
              Privacy Policy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("terms")}
            >
              <ScaleIcon data-icon="inline-start" />
              Terms of Service
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
