"use client";

import type { ReactNode } from "react";

import { cn } from "cn";
import { FileText } from "lucide-react";
import { motion } from "motion/react";

import type { Figure, PaperBlock, PaperPiece } from "@/lib/run-stream/contract";
import type { WriteContent } from "@/lib/run-stream/run-state";
import { signed } from "@/lib/run-stream/selectors";

import { FigureCard } from "./figures";
import { Caret, VerdictBadge } from "./run-bits";

const serif = "font-(family-name:--font-lora)";

interface PageProps {
  paper: WriteContent;
  figures: Figure[];
  runLabel: string;
  /** Show the cursor at the end of the block being written. */
  writingBlockId?: string | null;
  className?: string;
}

function sourceLabel(source: string) {
  if (source.startsWith("result:")) return `results.json → ${source.slice(7)}`;
  return source.replace(":", " · ");
}

function NumberChip({
  value,
  source,
  checked,
  typeset,
}: {
  value: string;
  source: string;
  checked: boolean;
  typeset: boolean;
}) {
  return (
    <motion.span
      data-num
      data-src={source}
      title={`From ${sourceLabel(source)}`}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 22, delay: 0.55 }}
      className={cn(
        "inline-block cursor-help whitespace-nowrap font-mono text-[0.82em] transition-colors duration-500",
        typeset
          ? "border-emerald-600/60 border-b px-px"
          : cn("rounded px-1", checked ? "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200" : "bg-muted"),
      )}
    >
      {value}
    </motion.span>
  );
}

function Piece({ piece, paper, checked }: { piece: PaperPiece; paper: WriteContent; checked: boolean }): ReactNode {
  switch (piece.kind) {
    case "text":
      return piece.text;
    case "number":
      return <NumberChip value={piece.value} source={piece.source} checked={checked} typeset={paper.typeset} />;
    case "cite":
      return (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-block align-[0.12em] font-sans text-[0.78em] text-cyan-700 dark:text-cyan-300"
        >
          [{piece.refs.join(", ")}]
        </motion.span>
      );
    case "figure_ref":
      return (
        <span className="font-sans font-semibold text-[0.88em] text-blue-700 dark:text-blue-300">
          Fig. {piece.figure}
        </span>
      );
    case "typed_number": {
      const fixed = paper.fixedNumbers[piece.span_id];
      if (fixed) return <NumberChip value={fixed.value} source={fixed.source} checked typeset={paper.typeset} />;
      const blocked = paper.blocked?.spanId === piece.span_id;
      return (
        <motion.span
          data-span={piece.span_id}
          data-cursor={`span:${piece.span_id}`}
          animate={blocked ? { x: [0, -3, 3, -3, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className={cn(
            "inline-block border-b-2",
            blocked
              ? "border-rose-500 bg-rose-500/12 text-rose-700 dark:text-rose-300"
              : "border-muted-foreground/60 border-dotted",
          )}
        >
          {piece.text}
        </motion.span>
      );
    }
    case "span": {
      const revision = paper.comments.find((c) => c.revision?.spanId === piece.span_id)?.revision;
      const comment = paper.comments.find((c) => c.spanId === piece.span_id);
      const index = comment ? paper.comments.indexOf(comment) + 1 : 0;
      const open = comment && !comment.revision;
      let body: ReactNode = piece.text;
      if (revision && paper.accepted) body = revision.to;
      else if (revision)
        body = (
          <>
            {revision.from && (
              <del className="bg-rose-500/12 text-rose-700 decoration-rose-500 dark:text-rose-300">{revision.from}</del>
            )}
            <motion.ins
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-emerald-500/12 text-emerald-800 no-underline shadow-[inset_0_-1.5px_0] shadow-emerald-600 dark:text-emerald-200"
            >
              {revision.to}
            </motion.ins>
          </>
        );
      return (
        <span
          data-span={piece.span_id}
          data-cursor={`span:${piece.span_id}`}
          className={cn(
            "rounded-sm transition-colors duration-500",
            open && "bg-orange-500/15 shadow-[inset_0_-2px_0] shadow-orange-500",
          )}
        >
          {body}
          {open && (
            <motion.sup
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-0.5 rounded-full bg-orange-600 px-1.5 font-bold font-sans text-[9.5px] text-white"
            >
              {index}
            </motion.sup>
          )}
        </span>
      );
    }
  }
}

function Block({
  block,
  paper,
  figures,
  checked,
  caret,
}: {
  block: PaperBlock;
  paper: WriteContent;
  figures: Figure[];
  checked: boolean;
  caret: boolean;
}) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="mb-3">
          {(paper.pieces[block.id] ?? []).map((piece, i) => (
            // Pieces only ever append, so the index is a stable key.
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only list
            <Piece key={i} piece={piece} paper={paper} checked={checked} />
          ))}
          {caret && <Caret className="text-amber-600" />}
        </p>
      );
    case "figure": {
      const figure = figures.find((f) => f.id === block.figure);
      return figure ? <FigureCard figure={figure} plain checked={checked} className="my-5" /> : null;
    }
    case "table":
      return (
        <motion.figure
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          data-figure="table"
          className="relative my-4 font-sans"
        >
          <figcaption className="mb-1.5 text-muted-foreground text-xs">
            <b className="text-foreground">{block.title}.</b> {block.caption}
          </figcaption>
          <table className="w-full border-foreground border-y-[1.5px] text-sm">
            <thead>
              <tr className="border-foreground border-b">
                {block.header.map((h) => (
                  <th key={h} className="px-2 py-1.5 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={`${row[0]}-${i}`} className={cn("px-2 py-1", i > 0 && "font-mono")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.figure>
      );
    case "references":
      return (
        <ol className="flex flex-col gap-1.5 text-[13.5px] leading-snug">
          {block.items.map((ref, i) => (
            <motion.li
              key={ref.doi}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              className="grid grid-cols-[30px_1fr]"
            >
              <span className="pt-0.5 font-mono text-muted-foreground text-xs">[{i + 1}]</span>
              <span>
                {ref.citation}{" "}
                <a
                  href={`https://doi.org/${ref.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-mono text-cyan-700 text-xs hover:underline dark:text-cyan-300"
                >
                  doi:{ref.doi}
                </a>
              </span>
            </motion.li>
          ))}
        </ol>
      );
    case "appendix":
      return (
        <div className="overflow-x-auto font-sans">
          <table className="w-full text-[12.5px]">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                {["ID", "Hypothesis", "Result", "Verdict", "In the main text?"].map((h) => (
                  <th key={h} className="whitespace-nowrap py-1.5 pr-2.5 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => {
                const main = row.status === "result" && ["H1", "H2", "H3", "H5"].includes(row.hypothesis_id);
                let why = "Yes";
                if (!main)
                  why =
                    row.status === "dropped"
                      ? "No · dropped by you before testing"
                      : row.status === "crashed"
                        ? "No · the test crashed"
                        : "No · weak reason or too few students";
                return (
                  <tr key={row.hypothesis_id} className="border-b align-top">
                    <td className="py-2 pr-2.5">
                      <span className="rounded-md bg-primary px-1.5 py-0.5 font-mono font-semibold text-primary-foreground text-xs">
                        {row.hypothesis_id}
                      </span>
                    </td>
                    <td className="py-2 pr-2.5">{row.statement}</td>
                    <td className="whitespace-nowrap py-2 pr-2.5 font-mono">
                      {row.estimate !== undefined ? signed(row.estimate) : row.status === "dropped" ? "—" : "never ran"}
                    </td>
                    <td className="py-2 pr-2.5">{row.verdict ? <VerdictBadge verdict={row.verdict} /> : "—"}</td>
                    <td className={cn("py-2", !main && "text-muted-foreground")}>{why}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
  }
}

export function PaperPage({ paper, figures, runLabel, writingBlockId, className }: PageProps) {
  const checked = Boolean(paper.checked);
  let number = 0;
  return (
    <article
      data-paper
      className={cn(
        "relative mx-auto min-h-[560px] w-full max-w-[780px] rounded-sm bg-card px-6 pt-10 pb-14 text-[15.5px] text-card-foreground leading-[1.7] shadow-md ring-1 ring-foreground/10 sm:px-14",
        serif,
        className,
      )}
    >
      <div
        className={cn(
          "flex justify-between gap-3 overflow-hidden border-b font-medium font-sans text-[10.5px] text-muted-foreground uppercase tracking-[0.08em] transition-all duration-700",
          paper.typeset ? "mb-7 max-h-10 pb-2 opacity-100" : "max-h-0 border-transparent opacity-0",
        )}
      >
        <span>Popper · {runLabel}</span>
        <span>Exploratory study · October 2026</span>
      </div>
      <h1
        className={cn(
          "min-h-[1.25em] font-semibold text-[25px] leading-tight tracking-tight transition-all duration-700",
          paper.typeset && "text-balance text-center text-[27px]",
        )}
      >
        {paper.title}
      </h1>
      {paper.authors && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "mt-2 font-sans text-muted-foreground text-xs transition-all duration-700",
            paper.typeset && "text-center",
          )}
        >
          {paper.authors}
        </motion.p>
      )}
      {paper.sections.map((section, i) => {
        const status = paper.sectionStatus[section.id];
        const blocks = paper.blocks[section.id] ?? [];
        if (section.numbered) number += 1;
        const abstract = section.id === "abstract";
        const lastBlock = blocks[blocks.length - 1];
        return (
          <motion.section
            key={section.id}
            id={`paper-${section.id}`}
            data-section={section.id}
            data-cursor={`section:${section.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: status === "planned" ? i * 0.08 : 0 }}
            className={cn(
              "mt-6 border-transparent border-l-[3px] transition-all duration-700",
              abstract && paper.typeset && "border-foreground bg-muted/60 px-5 pt-4 pb-1.5 text-[14.5px]",
            )}
          >
            <h2
              className={cn(
                "mb-2 font-sans font-semibold text-xs uppercase tracking-[0.07em] transition-colors duration-500",
                paper.typeset ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {paper.typeset && section.numbered && <span>{number}.&nbsp;&nbsp;</span>}
              {section.title}
            </h2>
            {status === "planned" && (
              <div className="flex flex-col gap-2 py-1">
                {[94, 81, 63].map((w) => (
                  <span key={w} className="h-2.5 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
                ))}
                {section.uses && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    <FileText className="size-3" />
                    uses {section.uses}
                  </span>
                )}
              </div>
            )}
            {blocks.map((block) => (
              <Block
                key={block.id}
                block={block}
                paper={paper}
                figures={figures}
                checked={checked}
                caret={block.id === writingBlockId && block.id === lastBlock?.id}
              />
            ))}
          </motion.section>
        );
      })}
    </article>
  );
}
