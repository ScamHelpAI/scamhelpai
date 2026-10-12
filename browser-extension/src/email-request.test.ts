import { describe, expect, it } from "vitest";
import {
  emailToAnalyzeRequest,
  textToAnalyzeRequest,
  urlToAnalyzeRequest,
} from "./email-request.ts";
import type { GmailEmail } from "./content/gmail-read.ts";

const email: GmailEmail = {
  subject: "Verify your account",
  senderName: "PayPal",
  senderAddress: "noreply@paypa1.com",
  body: "Click the link to verify.",
  links: ["https://paypa1.com/login", "https://bit.ly/x"],
};

describe("emailToAnalyzeRequest", () => {
  it("sends the Gmail message as an email input with From and Subject headers", () => {
    const request = emailToAnalyzeRequest(
      email,
      "https://mail.google.com/mail/u/0/#inbox/abc",
    );
    const input = request.inputs[0];

    expect(input).toMatchObject({
      type: "email",
      headers: {
        From: "PayPal <noreply@paypa1.com>",
        Subject: "Verify your account",
      },
    });
    expect(input?.type).toBe("email");
    if (input?.type === "email") {
      expect(input.body).toContain("Click the link to verify.");
      expect(input.body).toContain("https://paypa1.com/login");
      expect(input.body).toContain("https://bit.ly/x");
    }
    expect(request.context).toEqual({
      source: "browser_extension",
      pageUrl: "https://mail.google.com/mail/u/0/#inbox/abc",
    });
  });

  it("uses the sender name alone when Gmail has no email address", () => {
    const request = emailToAnalyzeRequest({
      ...email,
      senderAddress: "",
    });
    const input = request.inputs[0];
    expect(input?.type).toBe("email");
    if (input?.type === "email") {
      expect(input.headers?.From).toBe("PayPal");
    }
  });

  it("caps the email body at 20000 characters", () => {
    const request = emailToAnalyzeRequest({
      ...email,
      body: "x".repeat(25000),
      links: [],
    });
    const input = request.inputs[0];
    expect(input?.type).toBe("email");
    if (input?.type === "email") {
      expect(input.body?.length).toBe(20000);
    }
  });
});

describe("textToAnalyzeRequest", () => {
  it("wraps pasted text as a text input", () => {
    expect(textToAnalyzeRequest("Urgent: send gift cards")).toEqual({
      inputs: [{ type: "text", content: "Urgent: send gift cards" }],
      context: { source: "browser_extension" },
    });
  });

  it("caps pasted text at 20000 characters", () => {
    const request = textToAnalyzeRequest("y".repeat(21000));
    const input = request.inputs[0];
    expect(input?.type).toBe("text");
    if (input?.type === "text") {
      expect(input.content.length).toBe(20000);
    }
  });
});

describe("urlToAnalyzeRequest", () => {
  it("wraps the current page URL as a url input", () => {
    expect(urlToAnalyzeRequest("https://example.com/login")).toEqual({
      inputs: [{ type: "url", url: "https://example.com/login" }],
      context: {
        source: "browser_extension",
        pageUrl: "https://example.com/login",
      },
    });
  });
});
