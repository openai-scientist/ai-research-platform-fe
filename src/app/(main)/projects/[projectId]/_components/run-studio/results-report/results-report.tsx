"use client";

import { useMemo, useState } from "react";

import { cn } from "cn";
import { ChevronRight, Download, ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api";
import { projectKeys } from "@/lib/api/query-keys";
import {
  describePackage,
  fetchResearchPackage,
  type PackageHypothesis,
  type PackageOutcome,
  type ResearchPackage,
} from "@/lib/api/services/fetch-research-package";
import {
  type FigureSlot,
  figureSlots,
  layersOf,
  nextStepWords,
  type ParsedReport,
  pageWithPolicy,
  parseReport,
  type ReportSection,
  readable,
  svgRatio,
  type Tone,
} from "@/lib/run-stream/research-report";

import { saveProjectFile } from "../../project-file-download";
import { type FrameTheme, ReportFrame, ThemeProbe, useFrameTheme } from "./report-frame";

export const packageKey = (projectId: string, runId: string) =>
  [...projectKeys.run(projectId, runId), "research-package"] as const;

const TONE: Record<Tone, string> = {
  ok: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  wait: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  bad: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
};
const STATE_TONE: Record<PackageOutcome["state"], Tone> = { partial: "wait", blocked: "bad" };

const Pill = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => (
  <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 font-medium text-xs", TONE[tone])}>
    {children}
  </span>
);

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** What the package is, in Logos's word, with the reason each missing estimate has. */
function statusWords(outcome: PackageOutcome) {
  const reasons = outcome.withoutEstimate.map((row) => `${row.label}: ${row.reason}`).join("; ");
  return {
    big: outcome.headline,
    why: `${outcome.explain}${reasons ? ` ${capital(reasons)}.` : ""}`,
  };
}

function HypothesisCard({ row }: { row: PackageHypothesis }) {
  const layers = layersOf(row);
  const has = typeof row.estimate === "number";
  const next = nextStepWords(row.next_step);
  const unit = row.outcome.join(", ");
  return (
    <article className="grid min-w-0 content-start gap-2.5 rounded-xl border p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="font-mono text-muted-foreground text-xs">{row.hypothesis_id ?? "Hypothesis"}</span>
        <Pill tone={layers.claim[1]}>{layers.claim[0]}</Pill>
      </header>
      {row.statement && <p className="font-medium text-sm leading-relaxed">{row.statement}</p>}
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-muted-foreground text-xs">
        {has ? (
          <>
            <span>
              <b className="font-semibold text-foreground text-lg tabular-nums">{readable(row.estimate as number)}</b>
              {unit ? ` ${unit}` : ""}
            </span>
            {typeof row.ci_low === "number" && typeof row.ci_high === "number" && (
              <span className="tabular-nums">
                95% interval {readable(row.ci_low)} to {readable(row.ci_high)}
              </span>
            )}
            {typeof row.rows_used === "number" && row.rows_used > 0 && (
              <span className="tabular-nums">{row.rows_used.toLocaleString("en-US")} rows</span>
            )}
          </>
        ) : (
          <span className="text-sm">No estimate</span>
        )}
      </p>
      <dl className="grid grid-cols-3 overflow-hidden rounded-lg border">
        {(
          [
            ["Run", layers.run],
            ["Test", layers.test],
            ["Claim", layers.claim],
          ] as const
        ).map(([name, [word, tone]]) => (
          <div key={name} className="grid min-w-0 gap-0.5 border-l px-2.5 py-1.5 first:border-l-0">
            <dt className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{name}</dt>
            <dd
              className={cn(
                "font-semibold text-[12.5px]",
                tone === "ok" && "text-emerald-700 dark:text-emerald-300",
                tone === "wait" && "text-amber-800 dark:text-amber-300",
                tone === "bad" && "text-rose-700 dark:text-rose-300",
              )}
            >
              {word}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {next ? `Next step: ${next}. ` : ""}
        {row.margin !== null && (
          <>
            Locked rule: the effect on {unit || "the outcome"} must be {row.direction ?? "beyond"} by more than{" "}
            {readable(row.margin)}.
          </>
        )}
      </p>
    </article>
  );
}

/** Sections 1 to 4 are the answer; the long record behind it (data, who decided, appendix) opens on demand. */
const startsOpen = (section: ReportSection) => Number(section.number) >= 1 && Number(section.number) <= 4;

function Contents({
  report,
  slots,
  go,
}: {
  report: ParsedReport | null;
  slots: FigureSlot[];
  /** Scrolls to an element, opening the section that holds it first. */
  go(id: string, sectionId?: string): void;
}) {
  const link =
    "flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left text-muted-foreground text-[12.5px] hover:bg-accent hover:text-foreground";
  return (
    <details open className="group min-w-0 md:sticky md:top-2 md:self-start [&:not([open])_nav]:hidden">
      <summary className="cursor-pointer list-none px-2 pb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wider md:cursor-default md:pointer-events-none">
        Contents
      </summary>
      <nav className="grid gap-4" aria-label="Report contents">
        <div className="grid gap-px">
          {report?.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={link}
              onClick={() => go(`report-${section.id}`, section.id)}
            >
              <span className="min-w-4 font-mono text-[11px]">{section.number || "·"}</span>
              {section.title.replace(/:.*$/, "")}
            </button>
          ))}
        </div>
        <div className="grid gap-px">
          <span className="px-2 pb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
            Figures
          </span>
          {slots.map((slot) => (
            <button
              key={slot.key}
              type="button"
              className={link}
              onClick={() =>
                go(
                  `report-${slot.key}`,
                  report?.sections.find((section) =>
                    section.pieces.some((piece) => piece.kind === "figure" && piece.figure.id === slot.figure?.id),
                  )?.id,
                )
              }
            >
              <span className="min-w-4 font-mono text-[11px]">{slot.figure ? slot.figure.n : "–"}</span>
              <span className="min-w-0">
                {slot.label}
                {slot.hypothesis ? ` · ${slot.hypothesis}` : ""}
              </span>
              {!slot.figure && (
                <span className="ml-auto shrink-0 text-[10.5px] text-amber-800 dark:text-amber-300">no data</span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </details>
  );
}

function FigureCard({ slot, theme }: { slot: FigureSlot; theme: FrameTheme }) {
  const { figure } = slot;
  if (!figure) {
    return (
      <div
        id={`report-${slot.key}`}
        className="grid scroll-mt-2 gap-0.5 rounded-xl border border-dashed p-3.5 text-muted-foreground text-sm"
      >
        <b className="font-semibold text-foreground">
          {slot.label}
          {slot.hypothesis ? ` · ${slot.hypothesis}` : ""}
        </b>
        <span>{slot.missing}</span>
      </div>
    );
  }
  return (
    <figure id={`report-${slot.key}`} className="m-0 grid min-w-0 scroll-mt-2 gap-2 rounded-xl border bg-card p-3.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-mono text-[11px] text-muted-foreground">Figure {figure.n}</span>
        <b className="font-semibold text-sm">{figure.title}</b>
        {figure.hypothesis && (
          <span className="ml-auto rounded-full border px-2 py-px text-[11px] text-muted-foreground">
            {figure.hypothesis}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <ReportFrame
          markup={figure.svg}
          label={figure.title}
          ratio={svgRatio(figure.svg)}
          theme={theme}
          className="min-w-[26rem]"
        />
      </div>
      {figure.caption && (
        <figcaption className="max-w-prose text-muted-foreground text-[12.5px]">{figure.caption}</figcaption>
      )}
    </figure>
  );
}

function Document({
  report,
  slots,
  theme,
  isOpen,
  onToggle,
}: {
  report: ParsedReport;
  slots: FigureSlot[];
  theme: FrameTheme;
  isOpen(section: ReportSection): boolean;
  onToggle(section: ReportSection): void;
}) {
  const used = new Set(report.figures.map((f) => f.id));
  const placed = new Set<string>();
  return (
    <div className="grid min-w-0 gap-7">
      {report.sections.map((section) => (
        <section key={section.id} id={`report-${section.id}`} className="grid min-w-0 scroll-mt-2 gap-3">
          <h3 className="border-b font-semibold text-[15px]">
            <button
              type="button"
              aria-expanded={isOpen(section)}
              onClick={() => onToggle(section)}
              className="flex w-full items-center gap-2 pb-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen(section) && "rotate-90",
                )}
              />
              <span className="min-w-0">
                {section.number ? `${section.number}. ` : ""}
                {section.title}
              </span>
              {!isOpen(section) && (
                <span className="ml-auto shrink-0 font-normal text-muted-foreground text-xs">Show</span>
              )}
            </button>
          </h3>
          {isOpen(section) &&
            section.pieces.map((piece, index) => {
              if (piece.kind === "html") {
                return (
                  <ReportFrame
                    // biome-ignore lint/suspicious/noArrayIndexKey: pieces are fixed for one report
                    key={index}
                    markup={piece.html}
                    label={section.title}
                    theme={theme}
                  />
                );
              }
              const slot = slots.find((s) => s.figure?.id === piece.figure.id);
              if (!slot || !used.has(piece.figure.id)) return null;
              placed.add(slot.key);
              return <FigureCard key={slot.key} slot={slot} theme={theme} />;
            })}
        </section>
      ))}
      {slots.some((slot) => !slot.figure) && (
        <section className="grid min-w-0 gap-3">
          <h3 className="border-b pb-2 font-semibold text-[15px]">Figures not drawn</h3>
          {slots
            .filter((slot) => !slot.figure)
            .map((slot) => (
              <FigureCard key={slot.key} slot={slot} theme={theme} />
            ))}
        </section>
      )}
    </div>
  );
}

export function ResultsReport({
  projectId,
  runId,
  title,
  onBack,
}: {
  projectId: string;
  runId: string;
  title?: string | null;
  onBack(): void;
}) {
  const manifest = useApiQuery(packageKey(projectId, runId), async (signal) => {
    return (await fetchResearchPackage.getManifest(projectId, runId, signal)).data;
  });
  const pack: ResearchPackage | undefined = manifest.data;
  const page = useApiQuery(
    [...packageKey(projectId, runId), "report", pack?.package_hash],
    (signal) => fetchResearchPackage.getReport(projectId, runId, "html", signal),
    { enabled: Boolean(pack) },
  );
  const report = useMemo(() => (page.data ? parseReport(page.data) : null), [page.data]);
  const summary = pack?.summary ?? [];
  const outcome = useMemo(() => describePackage(summary), [summary]);
  const slots = useMemo(() => figureSlots(report, summary), [report, summary]);
  const { probe, theme } = useFrameTheme();
  const [busy, setBusy] = useState<"page" | "zip" | null>(null);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (section: ReportSection) => toggled[section.id] ?? startsOpen(section);
  const go = (id: string, sectionId?: string) => {
    if (sectionId) setToggled((was) => ({ ...was, [sectionId]: true }));
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const words = statusWords(outcome);

  const openPage = () => {
    if (!page.data) return;
    const url = URL.createObjectURL(new Blob([pageWithPolicy(page.data)], { type: "text/html" }));
    // A link opened by a click, not window.open: browsers and the Orca tab let a real link through.
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const download = async () => {
    setBusy("zip");
    try {
      saveProjectFile(await fetchResearchPackage.exportZip(projectId, runId), "research-package.zip");
    } catch {
      // The request layer already told the person; the button simply becomes usable again.
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid min-w-0 gap-5">
      <ThemeProbe probe={probe} />
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-4 py-2 text-sm">
        <FileText aria-hidden className="size-4 text-muted-foreground" />
        <span>Results report · read from the result package</span>
        <Button variant="outline" size="xs" className="ml-auto" onClick={onBack}>
          Back to live
        </Button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="grid min-w-0 flex-[1_1_22rem] gap-1">
          <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
            Execution · Results report
          </span>
          <h2 className="wrap-anywhere font-semibold text-lg tracking-tight">{title ?? "Results report"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!page.data} onClick={openPage}>
            <ExternalLink data-icon="inline-start" /> Open as page
          </Button>
          <Button size="sm" disabled={!pack || busy === "zip"} onClick={download}>
            <Download data-icon="inline-start" /> {busy === "zip" ? "Preparing…" : "Download package"}
          </Button>
        </div>
      </div>

      {manifest.isPending ? (
        <div className="grid gap-3" role="status" aria-label="Loading the results report">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : manifest.isError || !pack ? (
        <p className="rounded-xl border border-dashed p-4 text-muted-foreground text-sm">
          The results report could not be read. Go back to the live view and try again in a moment.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-xl border p-3.5">
            <span className="row-span-2">
              <Pill tone={STATE_TONE[outcome.state]}>{outcome.label}</Pill>
            </span>
            <span className="font-semibold text-sm">{words.big}</span>
            <span className="text-muted-foreground text-[13px]">{words.why}</span>
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17.5rem),1fr))]">
            {summary.map((row, index) => (
              <HypothesisCard key={row.hypothesis_id ?? index} row={row} />
            ))}
          </div>

          <div className="grid min-w-0 items-start gap-6 md:grid-cols-[11.5rem_minmax(0,1fr)]">
            <Contents report={report} slots={slots} go={go} />
            {page.isPending || !theme ? (
              <div className="grid gap-3" role="status" aria-label="Loading the report">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : page.isError || !report || report.sections.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-muted-foreground text-sm">
                The report text could not be read. The package can still be downloaded.
              </p>
            ) : (
              <Document
                report={report}
                slots={slots}
                theme={theme}
                isOpen={isOpen}
                onToggle={(section) => setToggled((was) => ({ ...was, [section.id]: !isOpen(section) }))}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
