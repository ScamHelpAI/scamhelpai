import { describe, expect, it } from "vitest";
import { openedMessageNode, readEmail } from "./gmail-read.ts";

function gmailDocument(html: string): Document {
  return new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    "text/html",
  );
}

describe("readEmail", () => {
  it("reads the last expanded Gmail message", () => {
    const doc = gmailDocument(`
      <h2 class="hP">Verify your account</h2>
      <div class="adn ads">
        <span class="gD" name="Old" email="old@example.com">Old</span>
        <div class="a3s">Earlier message</div>
      </div>
      <div class="adn ads">
        <span class="gD" name="PayPal" email="noreply@paypa1.com">PayPal</span>
        <div class="a3s">
          Click here to verify
          <a href="https://paypa1.com/login">login</a>
          <a href="https://mail.google.com/mail">inbox</a>
          <a href="https://bit.ly/x">short</a>
        </div>
      </div>
    `);

    expect(openedMessageNode(doc)?.querySelector("span.gD")?.getAttribute("name")).toBe(
      "PayPal",
    );
    expect(readEmail(doc)).toEqual({
      subject: "Verify your account",
      senderName: "PayPal",
      senderAddress: "noreply@paypa1.com",
      body: expect.stringContaining("Click here to verify"),
      links: ["https://paypa1.com/login", "https://bit.ly/x"],
    });
  });

  it("returns null when no message is open", () => {
    const doc = gmailDocument(`<h2 class="hP">Inbox</h2>`);
    expect(readEmail(doc)).toBeNull();
  });
});
