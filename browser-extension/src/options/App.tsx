import { useEffect, useState } from "react";
import { CheckIcon, SaveIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_API_BASE } from "@/shared/api-url.ts";

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void chrome.storage.sync.get("apiBase").then(({ apiBase: stored }) => {
      if (typeof stored === "string" && stored.length > 0) {
        setApiBase(stored);
      }
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

  return (
    <main className="mx-auto max-w-lg p-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Point the extension at your ScamHelp analyzer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-base">Analyzer address</Label>
            <Input
              id="api-base"
              type="url"
              value={apiBase}
              onChange={(event) => setApiBase(event.target.value)}
              placeholder={DEFAULT_API_BASE}
              autoComplete="off"
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {status ? (
            <Alert>
              <CheckIcon />
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            className="w-full"
            onClick={() => void save()}
            disabled={saving}
          >
            <SaveIcon data-icon="inline-start" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
