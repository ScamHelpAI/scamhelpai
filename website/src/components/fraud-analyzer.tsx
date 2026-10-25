"use client";

import { useEffect, useState } from "react";
import { FileUpIcon, Loader2Icon } from "lucide-react";

import { AnalysisVerdict } from "@/components/analysis-verdict";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  REVIEW_POLL_MAX_ATTEMPTS,
  REVIEW_POLL_MS,
} from "@/lib/analysis-poll";
import type { AnalysisResult } from "@/lib/analysis-types";
import {
  createAnalysis,
  getAnalysis,
  isTextFile,
  uploadFileForAnalysis,
} from "@/lib/analyzer-client";

const ACCEPTED_FILE_TYPES =
  "image/*,application/pdf,audio/*,.txt,.eml,text/plain";

type AnalyzerTab = "text" | "file";

export function FraudAnalyzer() {
  const [tab, setTab] = useState<AnalyzerTab>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!result || result.status !== "reviewing") {
      setReviewing(false);
      return;
    }

    setReviewing(true);
    let cancelled = false;
    let attempts = 0;

    const timer = window.setInterval(() => {
      void (async () => {
        attempts += 1;
        if (attempts > REVIEW_POLL_MAX_ATTEMPTS) {
          window.clearInterval(timer);
          if (!cancelled) setReviewing(false);
          return;
        }

        try {
          const latest = await getAnalysis(result.id);
          if (cancelled) return;

          setResult(latest);
          if (latest.status !== "reviewing") {
            window.clearInterval(timer);
            setReviewing(false);
          }
        } catch {
          window.clearInterval(timer);
          if (!cancelled) setReviewing(false);
        }
      })();
    }, REVIEW_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [result]);

  async function runAnalysis() {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const context = {
        source: "web_app" as const,
        pageUrl: window.location.href,
        locale: navigator.language,
      };

      if (tab === "file") {
        if (!file) {
          throw new Error("Choose a file to analyze.");
        }

        if (isTextFile(file)) {
          const content = await file.text();
          if (!content.trim()) {
            throw new Error("That file looks empty. Paste the text instead.");
          }
          const analysis = await createAnalysis({
            inputs: [{ type: "text", content }],
            context,
          });
          setResult(analysis);
          return;
        }

        const assetInput = await uploadFileForAnalysis(file);
        const analysis = await createAnalysis({
          inputs: [assetInput],
          context,
        });
        setResult(analysis);
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) {
        throw new Error("Paste some suspicious text to analyze.");
      }

      const analysis = await createAnalysis({
        inputs: [{ type: "text", content: trimmed }],
        context,
      });
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onTabChange(next: string) {
    if (next !== "text" && next !== "file") return;
    setTab(next);
    if (next === "text") {
      setFile(null);
    } else {
      setText("");
    }
  }

  const canSubmit =
    !loading &&
    (tab === "file" ? file !== null : text.trim().length > 0);

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Analyze suspicious content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs
            value={tab}
            onValueChange={onTabChange}
            className="w-full gap-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Paste text</TabsTrigger>
              <TabsTrigger value="file">Upload file</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-2">
              <Label htmlFor="scam-text">Text to analyze</Label>
              <Textarea
                id="scam-text"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                }}
                placeholder="Paste the text from a suspicious email, text message, or letter here…"
                className="min-h-44 resize-y text-[16px] leading-relaxed"
                disabled={loading}
              />
            </TabsContent>

            <TabsContent value="file" className="space-y-3">
              <Label htmlFor="scam-file">File upload</Label>
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center"
              >
                <FileUpIcon className="size-8 text-muted-foreground" aria-hidden />
                <p className="text-[15px] text-muted-foreground">
                  Image, PDF, audio, .txt, or .eml
                </p>
                <Input
                  id="scam-file"
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  className="max-w-xs"
                  disabled={loading}
                  onChange={(event) => {
                    const picked = event.target.files?.[0] ?? null;
                    setFile(picked);
                  }}
                />
                {file ? (
                  <p className="text-sm font-medium text-foreground">
                    Selected: {file.name}
                  </p>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="trust"
              size="lg"
              disabled={!canSubmit}
              onClick={() => void runAnalysis()}
            >
              {loading ? (
                <>
                  <Loader2Icon className="animate-spin" aria-hidden />
                  Analyzing…
                </>
              ) : tab === "file" ? (
                "Analyze file"
              ) : (
                "Analyze text"
              )}
            </Button>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not analyze</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {result ? (
            <AnalysisVerdict result={result} reviewing={reviewing} />
          ) : null}

          <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
            <p>
              Paste a message or upload a screenshot, PDF, audio, plain text
              (.txt), or email (.eml).
            </p>
            <p>
              We send your submission to Scam Help for a risk review. Do not
              include passwords or payment details.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
