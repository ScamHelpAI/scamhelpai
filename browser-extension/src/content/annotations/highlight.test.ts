import { describe, expect, it } from "vitest";
import { findMatchIndex, matchLength } from "./highlight.ts";

describe("findMatchIndex", () => {
  it("finds a case-sensitive match", () => {
    expect(findMatchIndex("verify within 24 hours", "within 24 hours", true)).toBe(
      7,
    );
  });

  it("finds a case-insensitive match", () => {
    expect(
      findMatchIndex("Verify WITHIN 24 hours", "within 24 hours", false),
    ).toBe(7);
  });

  it("returns -1 when the quote is missing", () => {
    expect(findMatchIndex("hello", "goodbye", true)).toBe(-1);
  });
});

describe("matchLength", () => {
  it("trims whitespace before measuring", () => {
    expect(matchLength("  within 24 hours  ")).toBe(15);
  });
});
