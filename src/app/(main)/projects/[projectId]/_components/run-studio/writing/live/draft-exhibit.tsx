"use client";
"use no memo";

/* ===== A table or figure of the draft as the paper sets it: a table under its caption, a figure above its caption,
   each placed after the paragraph that first names it ===== */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn, M } from "../lib";
import { pieces } from "./draft-data";
import { file } from "./run";
import type { WrittenParagraph } from "./types";

const ALIGN: Record<string, string> = { l: "text-left", r: "text-right", c: "text-center" };

/** The exhibits a paragraph names that no paragraph before it named, in the order it names them; each joins `placed`. */
export function firstNamed(p: WrittenParagraph, upTo: number, placed: Set<string>): string[] {
  const out: string[] = [];
  for (const s of p.sentences.slice(0, upTo))
    for (const x of pieces(s.text))
      if (x.k === "exhibit" && !placed.has(x.key)) {
        placed.add(x.key);
        out.push(x.key);
      }
  return out;
}

/** Where a page sets each exhibit: by paragraph, the ones it names first, as far as `on` sentences of the section
    are shown. Worked out by the page as it renders, never by a paragraph, so a render run twice sets each once. */
export function placements(paras: WrittenParagraph[], on: number, placed: Set<string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let k = 0;
  for (const p of paras) {
    const upTo = Math.max(0, Math.min(p.sentences.length, on - k));
    k += p.sentences.length;
    if (upTo > 0) out[p.paragraph_id] = firstNamed(p, upTo, placed);
  }
  return out;
}

/** A table as the printed paper sets it: its caption above, three rules (top, under the header, bottom) and no
 * others, in the paper's own type. */
function PaperTable({
  k,
  table,
  label,
}: {
  k: string;
  table: { caption: string; header: string[]; rows: string[][]; align: string };
  label: string;
}) {
  return (
    // A table's words are not hyphenated, as a set table keeps them.
    <figure data-exhibit={k} className="my-[5mm] text-[10pt] leading-snug [hyphens:manual]">
      <figcaption className="mb-2 text-pretty text-left">
        {label}: {table.caption}
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-foreground border-y-[1.5px] tabular-nums">
          <thead>
            <tr className="border-foreground border-b-[0.75px]">
              {table.header.map((h, i) => (
                <th
                  // biome-ignore lint/suspicious/noArrayIndexKey: a table's columns never reorder
                  key={i}
                  className={cn(
                    ALIGN[table.align[i]] ?? "text-left",
                    "px-2 py-1 align-bottom font-bold first:pl-0 last:pr-0",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a table's rows never reorder
              <tr key={r}>
                {row.map((cell, i) => (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: a table's columns never reorder
                    key={i}
                    className={cn(
                      ALIGN[table.align[i]] ?? "text-left",
                      i > 0 && table.align[i] === "l" ? "whitespace-normal" : "whitespace-nowrap",
                      "px-2 py-0.5 align-top first:pl-0 last:pr-0",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** A table or figure: `paper`, set as the printed paper sets it; else as the run's screens show it. */
export function ExhibitBlock({ k, n, paper = false }: { k: string; n?: string; paper?: boolean }) {
  const shown = file("Exhibits.json");
  const table = shown?.tables.find((t) => t.key === k);
  const figure = shown?.figures.find((f) => f.key === k);
  if (!table && !figure) return null;
  const label = n ?? (table ? "Table" : "Figure");
  if (table && paper) return <PaperTable k={k} table={table} label={label} />;
  if (figure && paper)
    return (
      <figure data-exhibit={k} className="my-[5mm] text-[10pt] leading-snug">
        {/* biome-ignore lint/performance/noImgElement: the figure is an inline PNG the run wrote, nothing to optimise */}
        <img
          src={`data:image/png;base64,${figure.png}`}
          alt={figure.caption}
          className="mx-auto block h-auto max-w-full bg-white"
        />
        <figcaption className="mt-2 text-pretty text-left">
          {label}: {figure.caption}
        </figcaption>
      </figure>
    );
  if (table)
    return (
      <M as="figure" in="fade" data-exhibit={k} className="my-5 font-sans">
        <figcaption className="mb-2 text-pretty text-[12.5px] leading-snug">
          <b className="font-semibold">{label}.</b> <span className="text-muted-foreground">{table.caption}</span>
        </figcaption>
        <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <Table className="text-[12px] tabular-nums">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {table.header.map((h, i) => (
                  <TableHead
                    // biome-ignore lint/suspicious/noArrayIndexKey: a table's columns never reorder
                    key={i}
                    className={cn(
                      ALIGN[table.align[i]] ?? "text-left",
                      "h-auto whitespace-normal px-2.5 py-1.5 text-xs leading-snug",
                    )}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, r) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a table's rows never reorder
                <TableRow key={r}>
                  {row.map((cell, i) => (
                    <TableCell
                      // biome-ignore lint/suspicious/noArrayIndexKey: a table's columns never reorder
                      key={i}
                      className={cn(
                        ALIGN[table.align[i]] ?? "text-left",
                        // Words wrap in their column; an id, a number or an interval stays on one line.
                        i > 0 && table.align[i] === "l" ? "whitespace-normal" : "whitespace-nowrap",
                        "px-2.5 py-1.5 align-top",
                      )}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </M>
    );
  return (
    <M as="figure" in="fade" data-exhibit={k} className="my-5 font-sans">
      {/* biome-ignore lint/performance/noImgElement: the figure is an inline PNG the run wrote, nothing to optimise */}
      <img
        src={`data:image/png;base64,${figure?.png}`}
        alt={figure?.caption}
        className="mx-auto block h-auto max-w-full rounded-lg bg-white ring-1 ring-foreground/10"
      />
      <figcaption className="mt-2 text-pretty text-[12.5px] leading-snug">
        <b className="font-semibold">{label}.</b> <span className="text-muted-foreground">{figure?.caption}</span>
      </figcaption>
    </M>
  );
}
