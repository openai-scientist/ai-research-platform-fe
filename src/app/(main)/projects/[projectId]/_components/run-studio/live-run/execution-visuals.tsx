import { cn } from "cn";
import { Check, FileText, Lock, LockOpen, X } from "lucide-react";

import type { ExecutionViews } from "@/lib/run-stream/live-views";

import { Blank, Chip, fmt, isCurrent, itemCursor, known, Meter, Panel, Pending, type Tone, Val } from "./live-ui";

const CHECK_TONE: Record<string, Tone> = { passed: "ok", flagged: "bad", "not applicable": "neutral" };
const SLOT_TONE: Record<string, Tone> = {
  planned: "neutral",
  started: "live",
  posted: "ok",
  completed: "ok",
  failed: "bad",
  skipped: "warn",
};

/** The lock compared with what is on the Local Node now, part by part, in words. */
export function VerifyVisual({ step, live = true }: { step: ExecutionViews["execution_verify"]; live?: boolean }) {
  const { reason } = step.content;
  const parts = step.content.parts.length
    ? step.content.parts
    : step.structure.map((item) => ({ name: item.label, state: null, text: null }));
  const changed = parts.filter((part) => part.state === "changed");
  const clean = parts.length > 0 && parts.every((part) => part.state === "unchanged");
  return (
    <div className="grid gap-2.5">
      <div className="grid gap-1.5">
        {parts.map((part, index) => (
          <div
            key={part.name}
            data-cursor={itemCursor(index)}
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl border p-3 text-sm sm:grid-cols-[12rem_minmax(0,1fr)_6.5rem]",
              part.state === null && "opacity-70",
              part.state === "changed" && "border-red-500/50",
            )}
          >
            <b className="font-medium">{part.name}</b>
            <span className="text-muted-foreground max-sm:col-span-2 max-sm:row-start-2">
              {part.text ?? <Pending>{live ? "Checking against what you locked" : "Not checked"}</Pending>}
            </span>
            <span className="justify-self-end">
              {part.state === "unchanged" && <Chip tone="ok">unchanged</Chip>}
              {part.state === "changed" && <Chip tone="bad">changed</Chip>}
              {part.state === null && <Chip>{live ? "checking" : "not checked"}</Chip>}
            </span>
          </div>
        ))}
      </div>
      {reason && <p className="text-muted-foreground text-xs">{reason}</p>}
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-dashed p-3 text-sm",
          clean && "border-solid bg-emerald-500/8",
          changed.length > 0 && "border-red-500/50 border-solid bg-red-500/8",
        )}
      >
        {clean ? <Check aria-hidden className="size-4 text-emerald-600" /> : <Lock aria-hidden className="size-4" />}
        <span>
          <b className="block font-medium">
            {clean
              ? "Nothing changed since you locked the plan"
              : changed.length
                ? `${changed.map((part) => part.name).join(", ")} changed since the lock`
                : live
                  ? "Checking the lock"
                  : "The lock was not checked"}
          </b>
          <small className="text-muted-foreground text-xs">
            {changed.length
              ? "The run ends before the unseal and the stage goes back to the design."
              : live
                ? "Any change ends the run before the unseal."
                : "The stage stopped before this step finished."}
          </small>
        </span>
      </div>
    </div>
  );
}

export function PrepareVisual({ step }: { step: ExecutionViews["execution_prepare"] }) {
  const { rehearsal, dryRun } = step.content;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel
        title="Rehearsal · the design's question asked again"
        cursor={itemCursor(0)}
        current={step.cursor === 0}
        source={step.valueSources.rehearsal}
      >
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">Design asked</dt>
            <dd>{rehearsal.design}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">Answer now</dt>
            <dd>{rehearsal.now ? <Chip tone={CHECK_TONE[rehearsal.now]}>{rehearsal.now}</Chip> : <Pending />}</dd>
          </div>
        </dl>
        {rehearsal.reason && <p className="text-muted-foreground text-xs">{rehearsal.reason}</p>}
        <p className="text-muted-foreground text-xs">The values compared stay on the Local Node.</p>
      </Panel>
      <Panel
        title="Dry runs · no estimate is shown"
        aside={dryRun.state ?? undefined}
        cursor={itemCursor(1)}
        current={step.cursor === 1}
        source={step.valueSources.dryRun}
      >
        {dryRun.programs.length === 0 ? (
          step.structure.length && !dryRun.state ? (
            step.structure.map((item, index) => (
              <div key={item.label} data-cursor={itemCursor(index + 2)} className="grid gap-1 rounded-lg border p-2.5">
                <small className="text-muted-foreground text-xs">Program {index + 1}</small>
                <span className="text-xs">{item.label}</span>
                <span className="flex items-center gap-2">
                  <Meter value={null} />
                  <Blank className="w-10" />
                </span>
              </div>
            ))
          ) : (
            <Pending>{dryRun.state ? "No program flow was published" : "Waiting for the first dry run"}</Pending>
          )
        ) : (
          dryRun.programs.map((program, index) => {
            const top = program.steps.find((item) => item.rows !== null)?.rows ?? null;
            return (
              <div key={program.programIndex ?? index} className="grid gap-1 rounded-lg border p-2.5">
                <small className="text-muted-foreground text-xs">
                  Program {program.programIndex !== null ? program.programIndex + 1 : index + 1}
                </small>
                {program.steps.map((item) => (
                  <div
                    key={item.text}
                    className="grid grid-cols-[minmax(0,1fr)_5rem_3.5rem] items-center gap-2 text-xs"
                  >
                    <span className="truncate">{item.text}</span>
                    <Meter value={item.rows !== null && top ? item.rows / top : null} />
                    <span className="text-right font-mono">{fmt(item.rows) ?? "—"}</span>
                  </div>
                ))}
              </div>
            );
          })
        )}
        {dryRun.reason && <p className="text-muted-foreground text-xs">{dryRun.reason}</p>}
      </Panel>
    </div>
  );
}

function Gauge({ branch }: { branch: ExecutionViews["execution_run"]["content"]["branches"][number] }) {
  // A threshold between 0 and 1 is a share; any other scale is not known here, so only its number is given.
  const share = branch.threshold !== null && branch.threshold >= 0 && branch.threshold <= 1 ? branch.threshold : null;
  return (
    <div className="grid gap-1.5 rounded-xl border p-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_12rem] sm:items-center sm:gap-4">
      <span className="font-medium">{branch.signal ?? "Signal"}</span>
      <div>
        <div
          className="relative h-2 rounded-full bg-muted"
          role="img"
          aria-label={branch.threshold === null ? "Threshold not published yet" : `Threshold ${branch.threshold}`}
        >
          {share !== null && (
            <span className="absolute -top-1 h-4 w-0.5 bg-amber-500" style={{ left: `${share * 100}%` }} />
          )}
        </div>
        <small className="mt-1 block text-muted-foreground text-xs">
          Threshold <Val value={fmt(branch.threshold, 3)} />
          {branch.powerFloor !== null && ` · power floor ${fmt(branch.powerFloor, 2)}`} · observed value is not
          published
        </small>
      </div>
      <span>
        {branch.branch && <Chip tone="neutral">→ {branch.branch}</Chip>}
        {branch.status && <small className="mt-1 block text-muted-foreground text-xs">{branch.status}</small>}
      </span>
    </div>
  );
}

export function RunVisual({ step }: { step: ExecutionViews["execution_run"] }) {
  const { slots, branches, branchDeviations, observedBranches, confirmatory, robustness } = step.content;
  const sealed = slots.filter((slot) => slot.state === "posted" || slot.state === "completed").length;
  const envelope = (kind: "confirmatory" | "robustness", state: string | null) => (
    <Panel
      title={`${kind === "confirmatory" ? "Confirmatory" : "Robustness"} envelope`}
      aside={state ?? undefined}
      source={step.valueSources.slots}
    >
      {slots.every((slot) => slot.envelope !== kind) ? (
        slots.length === 0 && known(step, /program slots/).length ? (
          known(step, /program slots/).map((label, index) => (
            <div
              key={label}
              data-cursor={itemCursor(index)}
              className="flex items-center justify-between gap-2 rounded-lg border border-dashed p-2.5 text-sm"
            >
              <span>{label}</span>
              <Chip>planned</Chip>
            </div>
          ))
        ) : (
          <Pending>None registered</Pending>
        )
      ) : (
        slots.map((slot, index) =>
          slot.envelope === kind ? (
            <div
              key={`${slot.program}:${index}`}
              data-cursor={itemCursor(index)}
              className={cn(
                "grid gap-1 rounded-lg border p-2.5 text-sm",
                isCurrent(step, index) && "border-sky-500 bg-sky-500/8",
              )}
            >
              <span className="flex flex-wrap items-center gap-2">
                <b className="font-medium">{slot.program}</b>
                {slot.hypothesis !== null && (
                  <small className="text-muted-foreground text-xs">Hypothesis {slot.hypothesis}</small>
                )}
                <Chip tone={SLOT_TONE[slot.state]} className="ml-auto">
                  {slot.state}
                </Chip>
              </span>
              {(slot.method || slot.detail) && (
                <span className="text-muted-foreground text-xs">
                  {[slot.method, slot.detail].filter(Boolean).join(" · ")}
                </span>
              )}
              {(slot.state === "posted" || slot.state === "completed") && (
                <span className="inline-flex items-center gap-1 font-mono text-muted-foreground text-xs">
                  <Lock aria-hidden className="size-3" /> estimate sealed
                </span>
              )}
              {slot.reason && <span className="text-muted-foreground text-xs">{slot.reason}</span>}
            </div>
          ) : null,
        )
      )}
    </Panel>
  );
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 rounded-xl border p-3 text-sm">
        <span className="grid size-8 place-items-center rounded-lg bg-muted">
          <Lock aria-hidden className="size-4" />
        </span>
        <span>
          <b className="block font-medium">
            {slots.length ? `${sealed} of ${slots.length} programs sealed` : "Programs not listed yet"}
          </b>
          <small className="text-muted-foreground text-xs">
            Nobody, agents included, can read a sealed estimate before the unseal.
          </small>
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {envelope("confirmatory", confirmatory)}
        {envelope("robustness", robustness)}
      </div>
      <Panel title="If-then branches" source={step.valueSources.branches}>
        {branches.length
          ? branches.map((branch, index) => <Gauge key={`${branch.signal}:${index}`} branch={branch} />)
          : (known(step, /branch rules/).length ? known(step, /branch rules/) : [null]).map((signal) => (
              <div
                key={signal ?? "branch"}
                className="grid gap-1.5 rounded-xl border border-dashed p-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4"
              >
                <span className="font-medium">{signal ?? <Blank className="w-24" />}</span>
                <span className="block h-2 rounded-full bg-muted" />
              </div>
            ))}
        {branches.length > 0 && step.source === "preview" && (
          <p className="text-muted-foreground text-xs">Thresholds appear once the run has started.</p>
        )}
        {observedBranches.map((text) => (
          <p key={text} className="text-sm">
            {text}
          </p>
        ))}
        {branchDeviations.map((row) => (
          <p key={row.text} className="text-amber-800 text-xs dark:text-amber-300">
            Deviation · {row.text}
            {row.reason && ` — ${row.reason}`}
          </p>
        ))}
      </Panel>
    </div>
  );
}

export function UnsealVisual({ step }: { step: ExecutionViews["execution_unseal"] }) {
  const { opened, openedAt, approvedBy, resultCount, prerequisites } = step.content;
  const Icon = opened ? LockOpen : Lock;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Before the seals open" cursor={itemCursor(0)} source={step.valueSources.prerequisites}>
        {prerequisites.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
            <span>{item.name}</span>
            {item.status ? (
              <Chip tone={CHECK_TONE[item.status]}>
                {item.status === "passed" ? (
                  <Check aria-hidden className="size-3" />
                ) : item.status === "flagged" ? (
                  <X aria-hidden className="size-3" />
                ) : null}
                {item.status}
              </Chip>
            ) : (
              <Chip>waiting</Chip>
            )}
          </div>
        ))}
      </Panel>
      <Panel
        title="Sealed results"
        cursor={itemCursor(1)}
        current={step.cursor === 1}
        source={step.valueSources.opened}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-9 place-items-center rounded-xl bg-muted",
              opened && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
            )}
          >
            <Icon aria-hidden className="size-4" />
          </span>
          <b className="text-sm font-medium">
            {opened === true ? "Opened" : opened === false ? "Ended without opening" : "Sealed"}
          </b>
        </div>
        <dl className="grid gap-1 text-sm">
          {resultCount !== null && (
            <div>
              Results opened: <b className="font-medium">{fmt(resultCount)}</b>
            </div>
          )}
          {openedAt && <div>Opened at {openedAt}</div>}
          {approvedBy && <div>Approved by {approvedBy}</div>}
        </dl>
        {opened === null && <Pending>Waiting for the prerequisites</Pending>}
      </Panel>
    </div>
  );
}

type Verdict = ExecutionViews["execution_check"]["content"]["verdicts"][number];

const ROW = 38;

/** Estimates with their intervals on one axis, the smallest effect of interest on each row and Holm's adjusted p. */
function Forest({ verdicts }: { verdicts: Verdict[] }) {
  const W = 560;
  const left = 150;
  const right = W - 16;
  const drawn = verdicts.filter((row) => row.estimate !== null && row.low !== null && row.high !== null);
  const values = [0, ...drawn.flatMap((row) => [row.low ?? 0, row.high ?? 0, row.sesoi ?? 0])];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || 1) * 0.08;
  const x = (value: number) => left + ((value - (min - pad)) / (max - min + 2 * pad)) * (right - left);
  const H = verdicts.length * ROW + 36;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      style={{ maxWidth: W }}
      className="h-auto w-full"
      role="img"
      aria-label="Estimates with intervals"
    >
      <line x1={x(0)} x2={x(0)} y1={6} y2={H - 28} className="stroke-border" />
      {verdicts.map((row, index) => {
        const cy = 22 + index * ROW;
        const has = row.estimate !== null && row.low !== null && row.high !== null;
        return (
          <g key={`${row.hypothesis}:${index}`} data-cursor={itemCursor(index)}>
            <text x={4} y={cy + 4} className="fill-foreground text-[11px]">
              {row.hypothesis !== null ? `Hypothesis ${row.hypothesis}` : "Analysis"}
              {row.programIndex !== null ? ` · program ${row.programIndex + 1}` : ""}
            </text>
            {row.sesoi !== null && has && (
              <line
                x1={x(row.sesoi)}
                x2={x(row.sesoi)}
                y1={cy - 12}
                y2={cy + 12}
                className="stroke-amber-500"
                strokeDasharray="3 3"
              />
            )}
            {has && row.low !== null && row.high !== null && row.estimate !== null ? (
              <>
                <line x1={x(row.low)} x2={x(row.high)} y1={cy} y2={cy} className="stroke-foreground" strokeWidth={2} />
                <rect x={x(row.estimate) - 4.5} y={cy - 4.5} width={9} height={9} className="fill-foreground" />
                <title>{`${fmt(row.estimate, 3)} [${fmt(row.low, 3)}, ${fmt(row.high, 3)}]`}</title>
              </>
            ) : (
              <text x={left} y={cy + 4} className="fill-muted-foreground text-[11px] italic">
                Evaluating
              </text>
            )}
          </g>
        );
      })}
      {[...new Set([min, 0, max])].map((tick) => (
        <text key={tick} x={x(tick)} y={H - 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {fmt(tick, 1)}
        </text>
      ))}
    </svg>
  );
}

/** The forest plot's axis and one row per hypothesis, drawn from the plan's rules before any estimate exists. */
function ForestFrame({ step }: { step: ExecutionViews["execution_check"] }) {
  const labels = known(step, /decision rules/);
  const rows = labels.filter((label) => /^Hypothesis \d+$/.test(label));
  const rules = labels.filter((label) => !/^Hypothesis \d+$/.test(label));
  const names = rows.length ? rows : ["Hypothesis"];
  const W = 560;
  const left = 150;
  const H = names.length * ROW + 36;
  return (
    <div className="grid gap-3">
      <Panel title="Estimates and intervals">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          style={{ maxWidth: W }}
          className="h-auto w-full"
          role="img"
          aria-label="Forest plot axes. Estimates appear when the results are opened."
        >
          <line x1={(left + W - 16) / 2} x2={(left + W - 16) / 2} y1={6} y2={H - 28} className="stroke-border" />
          <line x1={left} x2={W - 16} y1={H - 28} y2={H - 28} className="stroke-border" />
          {names.map((name, index) => {
            const cy = 22 + index * ROW;
            return (
              <g key={name} data-cursor={itemCursor(index)}>
                <text x={4} y={cy + 4} className="fill-foreground text-[11px]">
                  {name}
                </text>
                <line
                  x1={(left + W - 16) / 2 + 60}
                  x2={(left + W - 16) / 2 + 60}
                  y1={cy - 12}
                  y2={cy + 12}
                  className="stroke-amber-500"
                  strokeDasharray="3 3"
                />
                <text x={left} y={cy + 4} className="fill-muted-foreground text-[11px] italic">
                  Evaluating
                </text>
              </g>
            );
          })}
          <text x={W - 16} y={H - 10} textAnchor="end" className="fill-muted-foreground text-[10px]">
            effect size
          </text>
        </svg>
        <p className="text-muted-foreground text-xs">
          Dashed line on a row: its smallest effect of interest. The interval is drawn when the results open.
        </p>
      </Panel>
      {rules.length > 0 && (
        <Panel title="Locked decision rules">
          {rules.map((rule, index) => (
            <p key={rule} data-cursor={itemCursor(names.length + index)} className="flex items-center gap-2 text-sm">
              <Lock aria-hidden className="size-3 shrink-0 text-muted-foreground" />
              {rule}
            </p>
          ))}
        </Panel>
      )}
    </div>
  );
}

const VERDICT_TONE: Record<string, Tone> = { supported: "ok", refuted: "bad", inconclusive: "warn" };

export function CheckVisual({ step }: { step: ExecutionViews["execution_check"] }) {
  const { verdicts, multiplicity } = step.content;
  if (!verdicts.length) return <ForestFrame step={step} />;
  return (
    <div className="grid gap-3">
      <Panel
        title="Estimates and intervals"
        aside={multiplicity ? `${multiplicity} across the family` : undefined}
        source={step.valueSources.verdicts}
      >
        <Forest verdicts={verdicts} />
        <p className="text-muted-foreground text-xs">
          Dashed line on a row: its smallest effect of interest. Line: interval.
        </p>
      </Panel>
      <div className="grid gap-2">
        {verdicts.map((row, index) => (
          <div
            key={`${row.hypothesis}:${index}`}
            className="grid gap-1 rounded-xl border p-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
          >
            <b className="font-medium">{row.hypothesis !== null ? `Hypothesis ${row.hypothesis}` : "Analysis"}</b>
            <span className="text-muted-foreground text-xs">
              {row.reason}
              {row.adjustedP !== null &&
                ` Adjusted p ${fmt(row.adjustedP, 3)}${row.alpha !== null ? ` against α ${fmt(row.alpha, 3)}` : ""}.`}
              {row.assessment && ` Claim: ${row.assessment}.`}
            </span>
            {row.verdict ? <Chip tone={VERDICT_TONE[row.verdict] ?? "neutral"}>{row.verdict}</Chip> : <Pending />}
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, Tone> = { complete: "ok", partial: "warn", blocked: "bad" };

export function DeliverVisual({ step }: { step: ExecutionViews["execution_deliver"] }) {
  const { status, version, reason, parts, missing } = step.content;
  const ready = parts.filter((part) => part.count !== null);
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title="Parts of the package" cursor={itemCursor(0)} source={step.valueSources.parts}>
        <ul className="grid gap-1.5">
          {parts.map((part) => (
            <li
              key={part.section}
              data-fly={part.count !== null ? `pk-${part.section}` : undefined}
              data-label={part.section}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm",
                part.count === null && "border-dashed text-muted-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <FileText aria-hidden className="size-3.5" />
                {part.section}
              </span>
              {part.count !== null ? (
                <b className="font-mono font-medium text-xs">{fmt(part.count)}</b>
              ) : (
                <Pending>not in the package</Pending>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={`Result package${version !== null ? ` v${version}` : ""}`} current={step.cursor !== null}>
        <ul className="grid gap-1.5">
          {ready.map((part) => (
            <li
              key={part.section}
              data-land={`pk-${part.section}`}
              className="rounded-md border bg-card px-2 py-1.5 text-xs"
            >
              {part.section}
            </li>
          ))}
          {ready.length === 0 && <li className="h-8 rounded-md border border-dashed" />}
        </ul>
        <div className="flex items-center gap-2 text-sm">
          <small className="text-muted-foreground text-xs">status</small>
          {status ? (
            <Chip tone={STATUS_TONE[status]} className="h-6 px-2.5 text-[13px]">
              {status}
            </Chip>
          ) : (
            <Pending>Reading the verdicts</Pending>
          )}
        </div>
        {reason && <p className="text-muted-foreground text-xs">{reason}</p>}
        {missing.map((item) => (
          <p key={item.item} className="text-amber-800 text-xs dark:text-amber-300">
            Missing · {item.item}
            {item.action && ` — ${item.action}`}
          </p>
        ))}
      </Panel>
    </div>
  );
}
