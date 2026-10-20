import type { ConnectionKind } from "@/lib/api/services/fetch-data-connections";

interface Token {
  value: string;
  start: number;
  end: number;
  quoted: boolean;
  closed?: boolean;
}
export interface SqlTableReference {
  schema: string;
  name: string;
  alias: string;
  aliasQuoted?: boolean;
  project?: string;
}
export interface SqlCompletionContext {
  kind: "table" | "column";
  prefix: string;
  qualifier: string;
  start: number;
  end: number;
  references: SqlTableReference[];
  quotedPath: boolean;
}
export interface SqlSuggestion {
  key: string;
  label: string;
  detail: string;
  insert: string;
  kind: "schema" | "table" | "column";
}

const reserved = new Set([
  "WHERE",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "FULL",
  "CROSS",
  "ON",
  "GROUP",
  "ORDER",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "UNION",
  "EXCEPT",
  "INTERSECT",
  "WINDOW",
  "QUALIFY",
  "USING",
  "FETCH",
]);
const sqlKeywords = new Set([
  "SELECT",
  "FROM",
  "AS",
  "DISTINCT",
  "BY",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  ...reserved,
]);
const wordCharacter = (character: string) => /[a-zA-Z0-9_$]/.test(character) || character.charCodeAt(0) > 127;

// This lexer keeps quoted identifiers and ignores literals/comments; it never executes or validates SQL.
function tokenize(sql: string) {
  const tokens: Token[] = [];
  let protectedPosition = false;
  for (let index = 0; index < sql.length; ) {
    if (/\s/.test(sql[index])) {
      index++;
      continue;
    }
    if (sql.startsWith("--", index)) {
      const end = sql.indexOf("\n", index + 2);
      if (end < 0) {
        protectedPosition = true;
        break;
      }
      index = end + 1;
      continue;
    }
    if (sql.startsWith("/*", index)) {
      const end = sql.indexOf("*/", index + 2);
      if (end < 0) {
        protectedPosition = true;
        break;
      }
      index = end + 2;
      continue;
    }
    const start = index;
    const quote = sql[index];
    if (quote === "'" || quote === '"' || quote === "`") {
      index++;
      let value = "";
      let closed = false;
      while (index < sql.length) {
        if (sql[index] === quote) {
          if (sql[index + 1] === quote) {
            value += quote;
            index += 2;
            continue;
          }
          index++;
          closed = true;
          break;
        }
        if (sql[index] === "\\" && quote !== '"' && index + 1 < sql.length) {
          value += sql[index + 1];
          index += 2;
        } else value += sql[index++];
      }
      if (quote === "'") {
        if (!closed) protectedPosition = true;
        else tokens.push({ value: "'", start, end: index, quoted: false });
      } else tokens.push({ value, start, end: index, quoted: true, closed });
      continue;
    }
    if (wordCharacter(sql[index])) {
      while (index < sql.length && wordCharacter(sql[index])) index++;
      tokens.push({ value: sql.slice(start, index), start, end: index, quoted: false });
    } else {
      tokens.push({ value: sql[index], start, end: ++index, quoted: false });
    }
  }
  return { tokens, protectedPosition };
}

function readReferences(tokens: Token[], defaultSchema: string): SqlTableReference[] {
  const references: SqlTableReference[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.quoted || !["FROM", "JOIN"].includes(token.value.toUpperCase())) continue;
    let cursor = index + 1;
    const first = tokens[cursor];
    if (!first || (!first.quoted && !wordCharacter(first.value[0]))) continue;
    const parts = first.quoted && first.value.includes(".") ? first.value.split(".") : [first.value];
    while (tokens[cursor + 1]?.value === "." && tokens[cursor + 2]) {
      parts.push(tokens[cursor + 2].value);
      cursor += 2;
    }
    if (tokens[cursor + 1]?.value.toUpperCase() === "AS") cursor++;
    const aliasToken = tokens[cursor + 1];
    const alias =
      aliasToken &&
      (aliasToken.quoted || /^[a-zA-Z_]/.test(aliasToken.value)) &&
      !reserved.has(aliasToken.value.toUpperCase())
        ? aliasToken.value
        : parts[parts.length - 1];
    references.push({
      name: parts[parts.length - 1],
      schema: parts.length > 1 ? parts[parts.length - 2] : defaultSchema,
      alias,
      aliasQuoted: aliasToken && alias === aliasToken.value ? aliasToken.quoted : tokens[cursor].quoted,
      ...(parts.length > 2 ? { project: parts[0] } : {}),
    });
  }
  return references;
}

export function sqlCompletionContext(
  sql: string,
  caret: number,
  schema: string,
  forced = false,
  kind: ConnectionKind = "postgres",
): SqlCompletionContext | null {
  const before = tokenize(sql.slice(0, caret));
  if (before.protectedPosition) return null;
  const last = before.tokens[before.tokens.length - 1];
  const active = last && last.end === caret && (last.quoted || wordCharacter(last.value[0])) ? last : undefined;
  const tokens = active ? before.tokens.slice(0, -1) : before.tokens;
  const previous = tokens[tokens.length - 1];
  const references = readReferences(tokenize(sql).tokens, schema);
  let qualifier = "";
  let qualifierStart = tokens.length;
  if (previous?.value === ".") {
    const parts: string[] = [];
    for (let index = tokens.length - 2; index >= 0; index -= 2) {
      parts.unshift(tokens[index].value);
      qualifierStart = index;
      if (tokens[index - 1]?.value !== ".") break;
    }
    qualifier = parts.join(".");
  }
  const relationToken = qualifier ? tokens[qualifierStart - 1] : previous;
  const tableContext =
    relationToken && !relationToken.quoted && ["FROM", "JOIN"].includes(relationToken.value.toUpperCase());
  let prefix = active?.value ?? "";
  const quotedPath = Boolean(tableContext && kind === "bigquery" && active?.quoted && prefix.includes("."));
  if (quotedPath) {
    const parts = prefix.split(".");
    prefix = parts.pop() ?? "";
    qualifier = parts.join(".");
  }
  const afterClause = previous && ["SELECT", "WHERE", "ON", "BY", ","].includes(previous.value.toUpperCase());
  if (!forced && !prefix && !qualifier && !tableContext && !afterClause) return null;
  if (!forced && active && !active.quoted && ["SELECT", "FROM", "JOIN", ...reserved].includes(prefix.toUpperCase()))
    return null;
  if (!forced && active && !active.quoted && /^\d/.test(prefix)) return null;
  const start = active?.start ?? caret;
  const whole = tokenize(sql).tokens.find((token) => token.start === start);
  return {
    kind: tableContext || (forced && !references.length && !afterClause && !qualifier) ? "table" : "column",
    prefix,
    qualifier,
    start,
    end: active && !(whole?.quoted && !whole.closed) ? (whole?.end ?? caret) : caret,
    references,
    quotedPath,
  };
}

export function sqlIdentifier(name: string, kind: ConnectionKind) {
  if (/^[a-z_][a-z0-9_$]*$/.test(name) && !sqlKeywords.has(name.toUpperCase())) return name;
  const quote = kind === "postgres" ? '"' : "`";
  return quote + name.replaceAll(quote, quote + quote) + quote;
}

export function sqlTableIdentifier(schema: string, table: string, kind: ConnectionKind) {
  return kind === "bigquery"
    ? "`" + `${schema}.${table}`.replaceAll("`", "\\`") + "`"
    : `${sqlIdentifier(schema, kind)}.${sqlIdentifier(table, kind)}`;
}
