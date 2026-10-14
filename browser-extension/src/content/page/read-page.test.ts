import { describe, expect, it } from "vitest";
import { readPageContents } from "./read-page.ts";

describe("readPageContents", () => {
  it("prefers main content and strips scripts/nav noise", () => {
    const doc = new DOMParser().parseFromString(
      `<!doctype html>
      <html>
        <head><title>PayPal Alert</title></head>
        <body>
          <nav class="navbar">Home | Login</nav>
          <main>
            <h1>Verify your account</h1>
            <p>Click <a href="https://evil.example/login">here</a> immediately.</p>
            <script>alert("xss")</script>
          </main>
          <footer>Copyright</footer>
        </body>
      </html>`,
      "text/html",
    );

    const page = readPageContents(doc);

    expect(page.title).toBe("PayPal Alert");
    expect(page.html).toContain("<h1>Verify your account</h1>");
    expect(page.html).toContain('href="https://evil.example/login"');
    expect(page.html).not.toContain("<script>");
    expect(page.html).not.toContain("navbar");
    expect(page.html).not.toContain("Copyright");
  });
});
