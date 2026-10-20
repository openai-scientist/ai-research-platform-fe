import { describe, expect, it } from "vitest";

import { sqlCompletionContext, sqlIdentifier, sqlTableIdentifier } from "./sql-completion";

describe("SQL autocomplete context", () => {
  it("suggests relations after FROM and JOIN", () => {
    for (const sql of ["SELECT * FROM ", "SELECT * FROM family f JOIN "]) {
      expect(sqlCompletionContext(sql, sql.length, "Rfam")?.kind).toBe("table");
    }
  });

  it("keeps a schema qualifier outside the replaced table name", () => {
    const sql = "SELECT * FROM Rfam.fa";
    const context = sqlCompletionContext(sql, sql.length, "Rfam");
    expect(context).toMatchObject({ kind: "table", qualifier: "Rfam", prefix: "fa" });
    expect(sql.slice(0, context?.start)).toBe("SELECT * FROM Rfam.");
  });

  it("resolves a column alias from a FROM clause following the cursor", () => {
    const sql = "SELECT f.rf FROM Rfam.family AS f";
    const context = sqlCompletionContext(sql, sql.indexOf("rf") + 2, "public");
    expect(context).toMatchObject({
      kind: "column",
      qualifier: "f",
      prefix: "rf",
      references: [{ schema: "Rfam", name: "family", alias: "f", aliasQuoted: false }],
    });
  });

  it("resolves multiple joined relations without treating ON or WHERE as aliases", () => {
    const sql = "SELECT c. FROM Rfam.family f JOIN Rfam.clan AS c ON f.id = c.id WHERE f.id > 1";
    const context = sqlCompletionContext(sql, sql.indexOf("c.") + 2, "Rfam");
    expect(context?.references).toEqual([
      { schema: "Rfam", name: "family", alias: "f", aliasQuoted: false },
      { schema: "Rfam", name: "clan", alias: "c", aliasQuoted: false },
    ]);
  });

  it("preserves quoted aliases", () => {
    const sql = 'SELECT "MyAlias". FROM public.family AS "MyAlias"';
    expect(sqlCompletionContext(sql, sql.indexOf(". ") + 1, "public")?.references[0]).toMatchObject({
      alias: "MyAlias",
      aliasQuoted: true,
    });
  });

  it("does not suggest identifiers inside literals and comments", () => {
    for (const sql of ["SELECT 'FROM fa", "SELECT 'it''s a string", "SELECT 1 -- FROM fa", "SELECT /* JOIN fa"]) {
      expect(sqlCompletionContext(sql, sql.length, "public", true)).toBeNull();
    }
  });

  it("ignores FROM clauses inside completed strings", () => {
    const sql = "SELECT 'FROM secret' AS label, f. FROM public.family f";
    expect(sqlCompletionContext(sql, sql.indexOf("f.") + 2, "public")?.references).toEqual([
      { schema: "public", name: "family", alias: "f", aliasQuoted: false },
    ]);
  });

  it("replaces the remainder of a word when editing at its middle", () => {
    const sql = "SELECT * FROM famly WHERE id = 1";
    const context = sqlCompletionContext(sql, sql.indexOf("famly") + 3, "public");
    expect(context?.prefix).toBe("fam");
    expect(sql.slice(context?.end)).toBe(" WHERE id = 1");
  });

  it("preserves the remainder of the query when a quoted identifier is incomplete", () => {
    const sql = 'SELECT * FROM "fam WHERE id = 1';
    const caret = sql.indexOf(" WHERE");
    expect(sqlCompletionContext(sql, caret, "public")?.end).toBe(caret);
  });

  it("recognizes a partial BigQuery backtick path", () => {
    const sql = "SELECT * FROM `billing.Rfam.fa";
    expect(sqlCompletionContext(sql, sql.length, "Rfam", false, "bigquery")).toMatchObject({
      kind: "table",
      qualifier: "billing.Rfam",
      prefix: "fa",
      quotedPath: true,
    });
  });
});

describe("SQL identifier insertion", () => {
  it("quotes reserved words and names containing spaces or quote characters", () => {
    expect(sqlIdentifier("order", "postgres")).toBe('"order"');
    expect(sqlIdentifier('a"b', "postgres")).toBe('"a""b"');
    expect(sqlIdentifier("a`b", "mysql")).toBe("`a``b`");
    expect(sqlIdentifier("two words", "mysql")).toBe("`two words`");
    expect(sqlIdentifier("rfam_acc", "postgres")).toBe("rfam_acc");
  });

  it("uses the correct qualified table format for each database", () => {
    expect(sqlTableIdentifier("Rfam", "family", "postgres")).toBe('"Rfam".family');
    expect(sqlTableIdentifier("Rfam", "family", "mysql")).toBe("`Rfam`.family");
    expect(sqlTableIdentifier("billing.Rfam", "family", "bigquery")).toBe("`billing.Rfam.family`");
  });
});
