import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getLinkScanEnabled,
  setLinkScanEnabled,
} from "@/shared/settings.ts";

export default function App() {
  const [linkScanEnabled, setLinkScanEnabledState] = useState(false);
  const [linkScanReady, setLinkScanReady] = useState(false);

  useEffect(() => {
    void getLinkScanEnabled().then((enabled) => {
      setLinkScanEnabledState(enabled);
      setLinkScanReady(true);
    });
  }, []);

  async function toggleLinkScan(next: boolean) {
    setLinkScanEnabledState(next);
    await setLinkScanEnabled(next);
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

      <section>
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
    </main>
  );
}
