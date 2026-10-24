import { describe, expect, it } from "vitest";
import {
  annotateRootSelector,
  findOpenMessage,
  markAnnotateRoot,
} from "./dom.ts";
import { ANNOTATE_ROOT_ATTR } from "../annotations/decorate.ts";

describe("gmail dom", () => {
  it("finds the newest visible message body and extracts text", () => {
    document.body.innerHTML = `
      <h2 data-thread-perm-id="t1">Account alert</h2>
      <div data-legacy-message-id="m1" style="display:block">
        <span email="bank@example.com" name="Your Bank"></span>
        <div class="a3s">Old body within 24 hours</div>
      </div>
      <div data-legacy-message-id="m2" style="display:block">
        <span email="scam@evil.test" name="Fake Bank"></span>
        <span email="boss@acme.com" name="Boss"></span>
        <span email="team@acme.com" name="Team"></span>
        <div class="a3s">New body: verify within 24 hours or closed</div>
      </div>
    `;

    // jsdom: getClientRects is empty by default — stub visibility via offsetParent-like path
    for (const el of document.querySelectorAll(
      "[data-legacy-message-id], .a3s",
    )) {
      Object.defineProperty(el, "getClientRects", {
        value: () => [{ width: 10, height: 10 }],
      });
    }

    const open = findOpenMessage(document);
    expect(open).not.toBeNull();
    expect(open!.text).toBe(
      [
        "From: Fake Bank <scam@evil.test>",
        "CC: Boss <boss@acme.com>, Team <team@acme.com>",
        "Subject: Account alert",
        "",
        "New body: verify within 24 hours or closed",
      ].join("\n"),
    );
    expect(open!.text).not.toContain("Old body");
  });

  it("picks the a3s block with the most text, not the first one", () => {
    document.body.innerHTML = `
      <div data-legacy-message-id="m1">
        <div class="a3s">-</div>
        <div class="a3s" id="main">Your account will be closed within 24 hours.</div>
      </div>
    `;
    for (const el of document.querySelectorAll(
      "[data-legacy-message-id], .a3s",
    )) {
      Object.defineProperty(el, "getClientRects", {
        value: () => [{ width: 10, height: 10 }],
      });
    }

    const open = findOpenMessage(document);
    expect(open?.body.id).toBe("main");
    expect(open?.text).toContain("closed within 24 hours");
  });

  it("marks a single annotate root", () => {
    document.body.innerHTML = `
      <div id="a"></div>
      <div id="b"></div>
    `;
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;
    markAnnotateRoot(a, document);
    markAnnotateRoot(b, document);
    expect(a.hasAttribute(ANNOTATE_ROOT_ATTR)).toBe(false);
    expect(b.getAttribute(ANNOTATE_ROOT_ATTR)).toBe("1");
    expect(annotateRootSelector()).toBe(`[${ANNOTATE_ROOT_ATTR}]`);
  });
});
