import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { analysisInputs, evidence } from "./schema.js";

function primaryKeyColumns(table: Parameters<typeof getTableConfig>[0]) {
  const config = getTableConfig(table);
  if (config.primaryKeys.length > 0) {
    return config.primaryKeys[0]?.columns.map((column) => column.name) ?? [];
  }

  return config.columns
    .filter((column) => column.primary)
    .map((column) => column.name);
}

describe("evidence primary key", () => {
  it("is unique per analysis, not globally on evidence id", () => {
    expect(primaryKeyColumns(evidence).sort()).toEqual([
      "analysis_id",
      "id",
    ]);
  });
});

describe("analysis_inputs primary key", () => {
  it("uses a globally unique row id", () => {
    expect(primaryKeyColumns(analysisInputs)).toEqual(["id"]);
  });
});
