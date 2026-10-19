import { describe, expect, it } from "vitest";
import { normalizeScannerEvidences } from "../schemas/scanner.js";
import type { Evidence } from "../schemas/evidence.js";

const generatedAt = "2026-01-01T00:00:00.000Z";

function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "",
    type: "text",
    source: "user_input",
    summary: "Submitted text",
    confidence: 1,
    createdAt: generatedAt,
    ...overrides,
  };
}

describe("normalizeScannerEvidences", () => {
  it("fills blank ids without colliding inside one output", () => {
    const [first, second] = normalizeScannerEvidences(
      [evidence(), evidence({ summary: "Second observation" })],
      generatedAt,
    );

    expect(first?.id).toBe("ev-001");
    expect(second?.id).toBe("ev-002");
  });
});
