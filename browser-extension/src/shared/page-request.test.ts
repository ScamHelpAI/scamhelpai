import { describe, expect, it } from "vitest";
import { pageHtmlToAnalyzeRequest } from "./page-request.ts";

describe("pageHtmlToAnalyzeRequest", () => {
  it("sends cleaned HTML as text, not as a url input", () => {
    const html =
      "<main><h1>Verify your account</h1><a href='https://evil.example'>Login</a></main>";

    expect(
      pageHtmlToAnalyzeRequest(html, "https://evil.example/paypal"),
    ).toEqual({
      inputs: [{ type: "text", content: html }],
      context: {
        source: "browser_extension",
        pageUrl: "https://evil.example/paypal",
      },
    });
  });
});
