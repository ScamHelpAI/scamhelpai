import { describe, expect, it } from "vitest";
import { analysesUrl, analyzerErrorMessage } from "./api-url.ts";

describe("analysesUrl", () => {
  it("points at the current analyses endpoint and strips trailing slashes", () => {
    expect(analysesUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/v1/analyses",
    );
    expect(analysesUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000/v1/analyses",
    );
  });
});

describe("analyzerErrorMessage", () => {
  it("prefers a JSON message, then error, then the raw body", () => {
    expect(
      analyzerErrorMessage(400, JSON.stringify({ message: "Analysis id is required" })),
    ).toBe("Analysis id is required");
    expect(
      analyzerErrorMessage(400, JSON.stringify({ error: "validation_error" })),
    ).toBe("validation_error");
    expect(analyzerErrorMessage(500, "upstream failed")).toBe("upstream failed");
    expect(analyzerErrorMessage(502, "")).toBe("Analyzer returned 502.");
  });
});
