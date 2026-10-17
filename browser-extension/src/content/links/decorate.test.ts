import { afterEach, describe, expect, it } from "vitest";
import type { CheckUrlResult } from "../../shared/check.ts";
import {
  SCAMHELP_BLOCKED,
  SCAMHELP_STATUS,
  clearDecorations,
  decorateAnchor,
  ensureStyles,
  removeStyles,
} from "./decorate.ts";

function result(
  overrides: Partial<CheckUrlResult> & Pick<CheckUrlResult, "status">,
): CheckUrlResult {
  return {
    url: overrides.url ?? "https://example.com/x",
    status: overrides.status,
    score: overrides.score ?? 10,
    reasons: overrides.reasons ?? ["test reason"],
    checkedAt: overrides.checkedAt ?? new Date().toISOString(),
    cached: overrides.cached ?? false,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  removeStyles();
});

describe("decorateAnchor", () => {
  it("leaves safe links visually unchanged", () => {
    ensureStyles();
    const anchor = document.createElement("a");
    anchor.href = "https://example.com/safe";
    anchor.textContent = "Safe";
    document.body.appendChild(anchor);

    decorateAnchor(
      anchor,
      result({ status: "safe", url: "https://example.com/safe" }),
    );

    expect(anchor.getAttribute(SCAMHELP_STATUS)).toBe("safe");
    expect(anchor.nextElementSibling).toBeNull();
    expect(anchor.textContent).toBe("Safe");
  });

  it("marks warning links without removing the anchor", () => {
    const anchor = document.createElement("a");
    anchor.href = "https://example.com/warn";
    anchor.textContent = "Warn";
    document.body.appendChild(anchor);

    decorateAnchor(
      anchor,
      result({ status: "warning", url: "https://example.com/warn" }),
    );

    expect(document.body.querySelector("a")).toBe(anchor);
    expect(anchor.getAttribute(SCAMHELP_STATUS)).toBe("warning");
    expect(anchor.nextElementSibling?.textContent).toBe("⚠");
  });

  it("blocks danger links and restores them on clear", () => {
    const anchor = document.createElement("a");
    anchor.href = "https://evil.example/phish";
    anchor.textContent = "Click";
    document.body.appendChild(anchor);

    decorateAnchor(
      anchor,
      result({
        status: "danger",
        url: "https://evil.example/phish",
        score: 90,
      }),
    );

    expect(document.body.querySelector("a")).toBeNull();
    const blocked = document.body.querySelector(`[${SCAMHELP_BLOCKED}="1"]`);
    expect(blocked).not.toBeNull();
    expect(blocked?.textContent).toContain("Click");
    expect(blocked?.textContent).toContain("⛔");

    clearDecorations(document);
    const restored = document.body.querySelector("a");
    expect(restored).not.toBeNull();
    expect(restored?.getAttribute("href")).toBe("https://evil.example/phish");
    expect(restored?.textContent).toBe("Click");
  });
});
