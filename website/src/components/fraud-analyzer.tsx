"use client";

import { useEffect, useRef, useState } from "react";
import { FileUpIcon, Loader2Icon } from "lucide-react";

import { AnalysisVerdict } from "@/components/analysis-verdict";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_POLL_MAX_ATTEMPTS, REVIEW_POLL_MS } from "@/lib/analysis-poll";
import type { AnalysisResult } from "@/lib/analysis-types";
import {
  createAnalysis,
  getAnalysis,
  isTextFile,
  uploadFileForAnalysis,
} from "@/lib/analyzer-client";
import { cn } from "@/lib/utils";

const ACCEPTED_FILE_TYPES =
  "image/*,application/pdf,audio/*,.txt,.eml,text/plain";

type AnalyzerTab = "text" | "file";

export function FraudAnalyzer() {
  const [tab, setTab] = useState<AnalyzerTab>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reviewing, setReviewing] = useState(false);
  // Remembers that this result went through the in-depth pass, so "2 of 2" survives completion.
  const [sawReview, setSawReview] = useState(false);

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

    function showFirstResult(analysis: AnalysisResult) {
      setResult(analysis);
      setSawReview(analysis.status === "reviewing");
    }

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
          showFirstResult(analysis);
          return;
        }

        const assetInput = await uploadFileForAnalysis(file);
        const analysis = await createAnalysis({
          inputs: [assetInput],
          context,
        });
        showFirstResult(analysis);
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
      showFirstResult(analysis);
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
    !loading && (tab === "file" ? file !== null : text.trim().length > 0);

  const stage = !result
    ? null
    : result.status === "reviewing"
      ? reviewing
        ? "Analysis 1 of 2 done · running in-depth review (2 of 2)…"
        : "Analysis 1 of 2 · in-depth review did not finish"
      : sawReview
        ? "Analysis 2 of 2 · in-depth review complete"
        : "Analysis complete · no in-depth review needed";

  return (
    <div className="flex w-full flex-col items-start justify-center gap-6 lg:flex-row">
      <Card className="w-full max-w-2xl self-center lg:flex-1 lg:self-start">
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
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors",
                  dragging && "border-2 border-trust bg-accent",
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!loading) setDragging(true);
                }}
                onDragLeave={(event) => {
                  // Ignore leave events fired when moving over child elements.
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setDragging(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const dropped = event.dataTransfer.files;
                  if (loading || dropped.length === 0) return;
                  // Mirror the drop into the input so it shows the file name too.
                  if (fileInputRef.current) fileInputRef.current.files = dropped;
                  setFile(dropped[0]);
                }}
              >
                <FileUpIcon
                  className="size-8 text-muted-foreground"
                  aria-hidden
                />
                <p className="text-[15px] text-muted-foreground">
                  Drag a file here, or choose one below.
                  <br />
                  Image, PDF, audio, .txt, or .eml
                </p>
                <Input
                  ref={fileInputRef}
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
                  Running analysis 1 of 2…
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

      {result ? (
        <Card className="animate-results-in w-full max-w-2xl min-w-0 self-center overflow-hidden lg:sticky lg:top-6 lg:flex-1 lg:self-start">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-3xl text-[#b8650a]">
              <h2>Analysis Results</h2>
            </CardTitle>
            {stage ? (
              <p className="text-[17px] font-medium text-muted-foreground">
                {stage}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            <AnalysisVerdict
              result={result}
              reviewing={reviewing}
              onCheckAgain={() => {
                setResult(null);
                setSawReview(false);
                setError(null);
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
