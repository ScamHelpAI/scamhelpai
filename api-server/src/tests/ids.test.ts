/**
 * Tests for sequential id helpers used when labeling evidence rows.
 */
import { describe, expect, it } from "vitest";
import { createSequentialId } from "../services/ids.js";

describe("createSequentialId", () => {
  it("allocates unique ids from a shared counter", () => {
    const nextId = createSequentialId("ev");

    expect(nextId()).toBe("ev-001");
    expect(nextId()).toBe("ev-002");
    expect(nextId()).toBe("ev-003");
  });
});
