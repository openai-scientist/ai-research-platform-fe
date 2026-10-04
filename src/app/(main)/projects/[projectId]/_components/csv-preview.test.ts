import { describe, expect, it } from "vitest";

import { previewRows } from "./csv-preview";

describe("CSV preview", () => {
  it("reads UTF-8 headers with a BOM and Windows line endings", () => {
    expect(previewRows("\uFEFFname,score\r\nAlice,85\r\nBob,90", ",")).toEqual([
      ["name", "score"],
      ["Alice", "85"],
      ["Bob", "90"],
    ]);
  });

  it("preserves quoted commas, escaped quotes and multiline values", () => {
    expect(previewRows('name,note\nAlice,"First, second\nShe said ""hello"""', ",")).toEqual([
      ["name", "note"],
      ["Alice", 'First, second\nShe said "hello"'],
    ]);
  });

  it("omits an incomplete row when a file is cut at the byte preview limit", () => {
    expect(previewRows('name,note\nAlice,complete\nBob,"part', ",", false)).toEqual([
      ["name", "note"],
      ["Alice", "complete"],
    ]);
  });

  it("bounds rendering to the header and 100 rows with at most 50 columns", () => {
    const line = Array.from({ length: 60 }, (_, index) => `column${index}`).join(",");
    const rows = previewRows(Array.from({ length: 150 }, () => line).join("\n"), ",");
    expect(rows).toHaveLength(101);
    expect(rows.every((row) => row.length === 50)).toBe(true);
  });

  it("continues to support tab-separated artifact previews and empty cells", () => {
    expect(previewRows("name\tnote\nAlice\t\nBob\ttext", "\t")).toEqual([
      ["name", "note"],
      ["Alice", ""],
      ["Bob", "text"],
    ]);
  });
});
