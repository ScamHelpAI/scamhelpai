import { useEffect, useState } from "react";
import { CheckIcon, SaveIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_API_BASE } from "@/shared/api-url.ts";
import {
  getLinkScanEnabled,
  setLinkScanEnabled,
} from "@/shared/settings.ts";

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [linkScanEnabled, setLinkScanEnabledState] = useState(false);
  const [linkScanReady, setLinkScanReady] = useState(false);

  useEffect(() => {
    void chrome.storage.sync.get("apiBase").then(({ apiBase: stored }) => {
      if (typeof stored === "string" && stored.length > 0) {
        setApiBase(stored);
      }
    });
    void getLinkScanEnabled().then((enabled) => {
      setLinkScanEnabledState(enabled);
      setLinkScanReady(true);
    });
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    setError(null);

    const normalized = apiBase.trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(normalized)) {
      setError("Enter a full address starting with http:// or https://");
      setSaving(false);
      return;
    }

    await chrome.storage.sync.set({ apiBase: normalized });
    setApiBase(normalized);
    setStatus("Saved.");
    setSaving(false);
  }

  async function toggleLinkScan(next: boolean) {
    setLinkScanEnabledState(next);
    await setLinkScanEnabled(next);
  }

  return (
    <main className="mx-auto max-w-lg bg-background p-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Adjust how ScamHelp AI checks pages and where it connects.
        </p>
      </header>

      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4">
          <div className="space-y-1.5 pr-2">
            <Label htmlFor="link-scan" className="text-lg font-semibold">
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

        <Separator />

        <div className="space-y-3">
          <Label htmlFor="api-base" className="text-lg font-semibold">
            Analyzer address
          </Label>
          <p className="text-base leading-relaxed text-muted-foreground">
            Point the extension at your ScamHelp analyzer.
          </p>
          <Input
            id="api-base"
            type="url"
            className="h-12 text-base"
            value={apiBase}
            onChange={(event) => setApiBase(event.target.value)}
            placeholder={DEFAULT_API_BASE}
            autoComplete="off"
          />
        </div>

        {error ? (
          <Alert variant="destructive" className="text-base shadow-none">
            <AlertDescription className="text-base">{error}</AlertDescription>
          </Alert>
        ) : null}

        {status ? (
          <Alert className="border-risk-low bg-risk-low-bg text-risk-low-foreground shadow-none">
            <CheckIcon />
            <AlertDescription className="text-base text-risk-low-foreground">
              {status}
            </AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="button"
          className="w-full text-lg shadow-none"
          size="lg"
          onClick={() => void save()}
          disabled={saving}
        >
          <SaveIcon data-icon="inline-start" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </section>
    </main>
  );
}
