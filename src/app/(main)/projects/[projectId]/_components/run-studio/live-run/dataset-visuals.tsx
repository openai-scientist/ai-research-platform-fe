import { cn } from "cn";
import { Check, FileSpreadsheet } from "lucide-react";

import type { DatasetStepKey, DatasetViews } from "@/lib/run-stream/live-views";

import {
  Blank,
  Chip,
  fmt,
  isCurrent,
  itemCursor,
  known,
  Meter,
  nameOf,
  Panel,
  Pending,
  pct,
  type Tone,
  Val,
} from "./live-ui";
import { ReviewThreadView } from "./review-thread";

type View<K extends DatasetStepKey> = DatasetViews[K];
const sourceOf = <T extends { valueSources: Partial<Record<string, "artifact" | "event" | "mixed">> }>(
  step: T,
  key: string,
) => step.valueSources[key];
const hasRows = (n: number) => n > 0;
const STATUS: Record<string, Tone> = {
  ok: "ok",
  pass: "ok",
  limited: "warn",
  warn: "warn",
  fail: "bad",
  unusable: "bad",
};

export function SourcesVisual({ step }: { step: View<"sources"> }) {
  const { sources } = step.content;
  if (!hasRows(sources.length)) {
    const files = step.structure.length ? step.structure.map((item) => item.label) : [null];
    return (
      <div className="grid gap-3">
        {files.map((name, index) => (
          <Panel key={name ?? "file"} cursor={itemCursor(index)} current={isCurrent(step, index)}>
            <div className="flex items-center gap-3">
              <FileSpreadsheet aria-hidden className="size-6 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <b className="block wrap-anywhere font-medium text-sm">{name ?? "Registered file"}</b>
                <Pending>Reading format, columns and rows</Pending>
              </div>
            </div>
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-4 gap-y-2 text-sm">
              {["Licence", "Location", "Origin", "Sheet", "Citation"].map((term) => (
                <div key={term}>
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">{term}</dt>
                  <dd>
                    <Blank />
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      {sources.map((source, index) => (
        <Panel
          key={`${source.filename}:${index}`}
          cursor={itemCursor(index)}
          current={isCurrent(step, index)}
          source={sourceOf(step, "sources")}
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet aria-hidden className="size-6 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <b className="block wrap-anywhere font-medium text-sm">{source.filename ?? "Registered file"}</b>
              <span className="text-muted-foreground text-xs">
                {[
                  source.format,
                  source.encoding,
                  source.columns !== null ? `${source.columns} columns` : null,
                  source.rows !== null ? `${fmt(source.rows)} rows` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            {source.role && <Chip tone="neutral">{source.role}</Chip>}
          </div>
          <dl className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-4 gap-y-2 text-sm">
            {[
              ["Licence", source.license],
              ["Location", source.location],
              ["Origin", source.origin],
              ["Sheet", source.sheet],
              ["Citation", source.citation],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">{term}</dt>
                <dd>
                  <Val value={value} className="wrap-anywhere" />
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      ))}
    </div>
  );
}

export function TableModelVisual({ step }: { step: View<"table_model"> }) {
  const { tables, unit, keys } = step.content;
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Panel title="Tables" source={sourceOf(step, "tables")}>
        {tables.length === 0 ? (
          <div data-cursor={itemCursor(0)} className="grid gap-1 rounded-lg border border-dashed p-2.5 text-sm">
            <b className="font-medium">Table</b>
            <span className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
              <span>
                Rows <Blank />
              </span>
              <span>
                Columns <Blank />
              </span>
            </span>
          </div>
        ) : (
          tables.map((table, index) => (
            <div
              key={`${table.filename}:${index}`}
              data-cursor={itemCursor(index)}
              className="rounded-lg border p-2.5 text-sm"
            >
              <b className="block wrap-anywhere font-medium">{table.filename ?? "Table"}</b>
              <span className="text-muted-foreground text-xs">
                <Val value={fmt(table.rows)} unit="rows" /> · <Val value={fmt(table.columns)} unit="columns" />
              </span>
            </div>
          ))
        )}
      </Panel>
      <div className="grid content-start gap-3">
        <Panel title="Row unit">
          <Val value={unit} />
        </Panel>
        <Panel title="Key columns">
          {keys.length ? (
            <div className="flex flex-wrap gap-1.5">
              {keys.map((key) => (
                <Chip key={key} className="font-mono">
                  {key}
                </Chip>
              ))}
            </div>
          ) : (
            <Pending>{step.progress >= 1 ? "No key column recorded" : "Evaluating"}</Pending>
          )}
        </Panel>
        <p className="text-muted-foreground text-xs">
          Join cardinality and key checks are not published, so none is shown.
        </p>
      </div>
    </div>
  );
}

export function ProfileVisual({ step }: { step: View<"profile_quality"> }) {
  const { columns, cardAggregates, part, rows, reason } = step.content;
  const list = columns.length
    ? columns.map((col) => ({
        name: col.column,
        kind: col.kind ?? col.measure,
        missing: col.missingShare,
        s: col.stats,
        levels: col.levels,
      }))
    : cardAggregates.map((col) => ({ name: col.name, kind: null, missing: null, s: col.summary, levels: col.levels }));
  if (!list.length) {
    const names = known(step, /./).map(nameOf);
    return (
      <Panel title="Columns">
        <div className="overflow-x-auto">
          <div className="grid min-w-[34rem]">
            <div className="grid grid-cols-[9rem_5.5rem_minmax(0,1fr)_minmax(0,1.3fr)] gap-3 px-1 pb-1.5 text-[11px] text-muted-foreground">
              <span>Column</span>
              <span>Type</span>
              <span>Missing</span>
              <span>Distribution</span>
            </div>
            {(names.length ? names : [null]).map((name, index) => (
              <div
                key={name ?? "column"}
                data-cursor={itemCursor(index)}
                className="grid grid-cols-[9rem_5.5rem_minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-3 border-t px-1 py-2 text-[13px]"
              >
                <span className="truncate font-mono text-xs">{name ?? <Blank className="w-20" />}</span>
                <Blank />
                <Meter value={null} />
                <Blank className="w-24" />
              </div>
            ))}
          </div>
        </div>
        {reason && <Pending>{reason}</Pending>}
      </Panel>
    );
  }
  return (
    <Panel
      title="Columns"
      aside={part ? `${part}${rows !== null ? ` · ${fmt(rows)} rows` : ""}` : undefined}
      source={sourceOf(step, columns.length ? "columns" : "cardAggregates")}
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[34rem] gap-0">
          {list.map((col, index) => {
            const total = col.s.valid !== null && col.s.missing !== null ? col.s.valid + col.s.missing : null;
            const missing = col.missing ?? (total ? (col.s.missing ?? 0) / total : null);
            const top = col.levels.filter((level) => level.count !== null).slice(0, 3);
            return (
              <div
                key={col.name}
                data-cursor={itemCursor(index)}
                className={cn(
                  "grid grid-cols-[9rem_5.5rem_minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-3 border-b px-1 py-2 text-[13px] last:border-b-0",
                  isCurrent(step, index) && "bg-sky-500/8",
                )}
              >
                <span className="truncate font-mono text-xs">{col.name}</span>
                <span className="text-muted-foreground text-xs">{col.kind ?? <Pending />}</span>
                <span className="flex items-center gap-2" title="Share of values missing">
                  <Meter value={missing} tone="warn" />
                  <span className="w-12 text-right font-mono text-xs">{pct(missing) ?? "—"}</span>
                </span>
                <span className="truncate text-muted-foreground text-xs">
                  {col.s.mean !== null
                    ? `mean ${fmt(col.s.mean, 2)}${col.s.sd !== null ? ` · sd ${fmt(col.s.sd, 2)}` : ""}${col.s.min !== null && col.s.max !== null ? ` · ${fmt(col.s.min, 2)}–${fmt(col.s.max, 2)}` : ""}`
                    : top.length
                      ? top.map((level) => `${level.label ?? level.value} ${fmt(level.count)}`).join(" · ")
                      : col.s.distinct !== null
                        ? `${fmt(col.s.distinct)} distinct`
                        : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

export function DictionaryVisual({ step }: { step: View<"dictionary"> }) {
  const { columns } = step.content;
  if (!columns.length) {
    const drawn = known(step, /./).map((label) => {
      const [name, type, role] = label.split(" · ");
      return { name, type, role };
    });
    return (
      <Panel title="Dictionary">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-[13px]">
            <thead className="text-[11px] text-muted-foreground">
              <tr>
                {["Column", "Meaning", "Role", "Measure", "Measured"].map((head) => (
                  <th key={head} className="px-1 py-1.5 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(drawn.length ? drawn : [{ name: null, type: null, role: null }]).map((row, index) => (
                <tr key={row.name ?? "column"} data-cursor={itemCursor(index)} className="border-t align-top">
                  <td className="px-1 py-2 font-mono text-xs">{row.name ?? <Blank className="w-20" />}</td>
                  <td className="px-1 py-2">
                    <Blank className="w-40" />
                  </td>
                  <td className="px-1 py-2">{row.role ? <Chip>{row.role}</Chip> : <Blank />}</td>
                  <td className="px-1 py-2">{row.type ?? <Blank />}</td>
                  <td className="px-1 py-2">
                    <Blank />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  }
  return (
    <Panel title="Dictionary" source={sourceOf(step, "columns")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-[13px]">
          <thead className="text-[11px] text-muted-foreground">
            <tr>
              {["Column", "Meaning", "Role", "Measure", "Measured"].map((head) => (
                <th key={head} className="px-1 py-1.5 font-medium">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((col, index) => (
              <tr
                key={col.column}
                data-cursor={itemCursor(index)}
                className={cn("border-t align-top", isCurrent(step, index) && "bg-sky-500/8")}
              >
                <td className="px-1 py-2 font-mono text-xs">{col.column}</td>
                <td className="px-1 py-2">
                  {col.meaning ?? <Pending />}
                  {col.unit && <span className="text-muted-foreground text-xs"> · {col.unit}</span>}
                  {col.sources.meaning && <Origin value={col.sources.meaning} />}
                </td>
                <td className="px-1 py-2">
                  {col.role ? <Chip tone={col.role === "target" ? "ok" : "neutral"}>{col.role}</Chip> : <Pending />}
                </td>
                <td className="px-1 py-2">
                  {col.measure ?? <Pending />}
                  {col.sources.measure && <Origin value={col.sources.measure} />}
                </td>
                <td className="px-1 py-2">{col.timing.tier ?? <Pending />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** Who supplied an attribute: code, the model, the file or the researcher. */
function Origin({ value }: { value: string }) {
  return (
    <span
      title="Who supplied this"
      className="ml-1.5 rounded border px-1 align-middle font-mono text-[10px] text-muted-foreground"
    >
      {value}
    </span>
  );
}

export function CleaningVisual({ step }: { step: View<"cleaning_recipe"> }) {
  const { steps, requirements } = step.content;
  const done = step.progress >= 1;
  return (
    <div className="grid gap-3">
      <Panel title="Cleaning steps" cursor={itemCursor(0)} current={step.cursor === 0} source={sourceOf(step, "steps")}>
        {steps.length ? (
          steps.map((item, index) => (
            <div
              key={`${item.kind}:${item.column}:${index}`}
              className="grid gap-0.5 rounded-lg border border-dashed p-2.5 text-sm"
            >
              <span>
                <b className="font-medium">{item.kind ?? "Step"}</b>{" "}
                {item.column && <span className="font-mono text-xs">{item.column}</span>}
              </span>
              <span className="text-muted-foreground text-xs">
                {item.reason}
                {item.changed !== null && ` · ${fmt(item.changed)} values changed`}
              </span>
            </div>
          ))
        ) : done ? (
          <p className="text-sm">The recipe has no steps: no value needed fixing.</p>
        ) : (
          (step.structure.length ? step.structure.map((item) => item.label) : [null]).map((label) => (
            <div key={label ?? "step"} className="grid gap-0.5 rounded-lg border border-dashed p-2.5 text-sm">
              <span className="font-medium">{label ?? <Pending>Looking for wrong values</Pending>}</span>
              <span className="text-muted-foreground text-xs">
                Values changed <Blank />
              </span>
            </div>
          ))
        )}
      </Panel>
      {requirements.length > 0 && (
        <Panel title="Carried into the analysis plan" source={sourceOf(step, "requirements")}>
          {requirements.map((item) => (
            <p key={`${item.column}:${item.what}`} className="text-sm">
              {item.column && <span className="font-mono text-xs">{item.column} · </span>}
              {item.what}
              {item.reason && <span className="text-muted-foreground text-xs"> — {item.reason}</span>}
            </p>
          ))}
        </Panel>
      )}
    </div>
  );
}

/** What every question map links before it has anything else to show: the roles of the question, not its values. */
const QUESTION_PARTS = ["Exposure", "Outcome", "Adjust for"];

export function QuestionMapVisual({ step }: { step: View<"question_map"> }) {
  const { mapping, chosenQuestion } = step.content;
  return (
    <div className="grid gap-3">
      {chosenQuestion && (
        <Panel title="Question" source={sourceOf(step, "chosenQuestion")}>
          <p className="text-sm">{chosenQuestion}</p>
        </Panel>
      )}
      <Panel title="Question parts → columns" source={sourceOf(step, "mapping")}>
        {mapping.length === 0
          ? (step.structure.length ? step.structure.map((item) => item.label) : QUESTION_PARTS).map((label, index) => (
              <div
                key={label ?? "part"}
                data-cursor={itemCursor(index)}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-lg border border-dashed p-2.5 text-[13px] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5.5rem]"
              >
                <span>{label ?? <Blank className="w-32" />}</span>
                <span className="text-muted-foreground text-xs">
                  column <Blank />
                </span>
                <Blank />
              </div>
            ))
          : mapping.map((row, index) => (
              <div
                key={`${row.label}:${index}`}
                data-cursor={itemCursor(index)}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-lg border p-2.5 text-[13px] sm:grid-cols-[7rem_minmax(0,1.2fr)_5.5rem_minmax(0,1fr)]",
                  isCurrent(step, index) && "border-sky-500/60 bg-sky-500/8",
                )}
              >
                <span className="text-muted-foreground text-xs uppercase tracking-wide">{row.kind ?? row.label}</span>
                <span>{row.label}</span>
                <span className="font-mono text-xs">{row.column ?? <Pending>no column</Pending>}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {row.coverage && <Chip tone={row.coverage === "exact" ? "ok" : "warn"}>{row.coverage}</Chip>}
                  {row.coverageBy && <span className="text-muted-foreground text-xs">by {row.coverageBy}</span>}
                </span>
              </div>
            ))}
      </Panel>
    </div>
  );
}

const PART_NAMES = ["Exploration", "Confirmation", "Reserve"];
const PART_TONE = ["bg-sky-400 dark:bg-sky-500", "bg-blue-700 dark:bg-blue-400", "bg-slate-300 dark:bg-slate-600"];

export function SplitVisual({ step }: { step: View<"split"> }) {
  const { parts, method, unit, total, complete } = step.content;
  const counted = parts.filter((part) => part.count !== null || part.fraction !== null);
  const drawnParts = parts.length ? parts : PART_NAMES.map((name) => ({ name, count: null, fraction: null }));
  const sum = parts.reduce((acc, part) => acc + (part.count ?? 0), 0);
  return (
    <Panel
      title="Row split"
      aside={[method, unit && `by ${unit}`].filter(Boolean).join(" · ")}
      source={sourceOf(step, "parts")}
    >
      <div
        className="flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label="Share of rows in each part"
      >
        {drawnParts.map((part, index) => {
          const weight = part.fraction ?? (sum && part.count !== null ? part.count / sum : 0);
          return <i key={part.name} className={PART_TONE[index]} style={{ flex: weight }} />;
        })}
      </div>
      <dl className="mt-1 flex flex-wrap gap-x-8 gap-y-3">
        {drawnParts.map((part, index) => (
          <div
            key={part.name}
            data-cursor={itemCursor(index)}
            className="grid grid-cols-[0.75rem_auto] items-center gap-x-2"
          >
            <span className={cn("size-2.5 rounded-full", PART_TONE[index])} />
            <dd className="font-semibold text-lg">
              <Val value={fmt(part.count)} />
            </dd>
            <dt className="col-start-2 text-muted-foreground text-xs">
              {part.name}
              {part.fraction !== null && ` · ${pct(part.fraction, 0)}`}
            </dt>
          </div>
        ))}
      </dl>
      {counted.length === 0 && step.progress >= 1 && (
        <p className="text-muted-foreground text-xs">The published report withholds the split counts.</p>
      )}
      {(total !== null || complete !== null) && (
        <p className="text-muted-foreground text-xs">
          {total !== null && `${fmt(total)} rows in the table`}
          {complete !== null && ` · ${fmt(complete)} complete`}
        </p>
      )}
    </Panel>
  );
}

/** The matrix as far as it is known: rule rows and column headers from the structure, every outcome cell empty. */
function ChecksFrame({ step }: { step: View<"data_checks"> }) {
  const headers = step.content.columns.length
    ? step.content.columns
    : [...new Set(known(step, /dictionary|data_card/).map(nameOf))];
  const labels = known(step, /data_checks/);
  const rules = labels.filter((label) => !label.includes(" · ") || labels.some((x) => x.startsWith(`${label} · `)));
  const reads = new Set(labels);
  const rows = rules.length ? rules : [null];
  return (
    <Panel title="Rules × columns">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-[13px]">
          <thead className="text-[11px] text-muted-foreground">
            <tr>
              <th className="px-1 py-1.5 font-medium">Rule</th>
              {headers.map((name) => (
                <th key={name} className="px-1 py-1.5 text-center font-mono font-medium">
                  {name}
                </th>
              ))}
              <th className="px-1 py-1.5 font-medium">Failing rows</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rule, index) => (
              <tr
                key={rule ?? "rule"}
                data-cursor={itemCursor(index)}
                className={cn("border-t", isCurrent(step, index) && "bg-sky-500/8")}
              >
                <td className="px-1 py-2">{rule ?? <Pending>Registered rules</Pending>}</td>
                {headers.map((name) => (
                  <td key={name} className="px-1 py-2 text-center">
                    {rule && reads.has(`${rule} · ${name}`) && (
                      <span className="inline-block size-3 rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                  </td>
                ))}
                <td className="px-1 py-2">
                  <Pending>Evaluating</Pending>
                </td>
              </tr>
            ))}
            {["Question columns covered", "Leakage flags"].map((row, index) => (
              <tr key={row} data-cursor={itemCursor(rows.length + index)} className="border-t bg-muted/30">
                <td className="px-1 py-2 font-medium">{row}</td>
                {headers.map((name) => (
                  <td key={name} className="px-1 py-2" />
                ))}
                <td className="px-1 py-2">
                  <Pending>Evaluating</Pending>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function DataChecksVisual({ step }: { step: View<"data_checks"> }) {
  const { columns, rules, anomalies, coverage, leakage, complete } = step.content;
  if (!rules.length) return <ChecksFrame step={step} />;
  return (
    <div className="grid gap-3">
      <Panel title="Rules × columns" source={sourceOf(step, "rules")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-[13px]">
            <thead className="text-[11px] text-muted-foreground">
              <tr>
                <th className="px-1 py-1.5 font-medium">Rule</th>
                {columns.map((name) => (
                  <th key={name} className="px-1 py-1.5 text-center font-mono font-medium">
                    {name}
                  </th>
                ))}
                <th className="px-1 py-1.5 font-medium">Failing rows</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, index) => (
                <tr
                  key={`${rule.rule}:${rule.columns.join()}:${index}`}
                  data-cursor={itemCursor(index)}
                  className={cn("border-t", isCurrent(step, index) && "bg-sky-500/8")}
                >
                  <td className="px-1 py-2">
                    {rule.rule}
                    {rule.source && <Origin value={rule.source} />}
                  </td>
                  {columns.map((name) => (
                    <td key={name} className="px-1 py-2 text-center">
                      {rule.columns.includes(name) && (
                        <span className="inline-block size-3 rounded-full bg-blue-600 dark:bg-blue-400" />
                      )}
                    </td>
                  ))}
                  <td className="px-1 py-2">
                    <span className="flex items-center gap-2">
                      {rule.failingRows !== null ? (
                        <>
                          <Meter
                            value={
                              rule.rowsChecked ? rule.failingRows / rule.rowsChecked : rule.failingRows > 0 ? 1 : 0
                            }
                            tone={rule.failingRows ? "warn" : "ok"}
                          />
                          <b className="w-12 text-right font-mono text-xs">{fmt(rule.failingRows)}</b>
                        </>
                      ) : (
                        <Pending>{rule.status ?? "Evaluating"}</Pending>
                      )}
                      {rule.status && <Chip tone={STATUS[rule.status] ?? "neutral"}>{rule.status}</Chip>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Question coverage" source={sourceOf(step, "coverage")}>
          {coverage.length ? (
            coverage.map((row, index) => (
              <p key={`${row.label}:${index}`} className="flex flex-wrap items-center gap-2 text-sm">
                <Check aria-hidden className="size-3.5 text-emerald-600" />
                {row.label} <span className="font-mono text-xs">{row.column}</span>
                {row.coverage && <Chip>{row.coverage}</Chip>}
              </p>
            ))
          ) : (
            <Pending />
          )}
          {complete !== null && <p className="text-muted-foreground text-xs">{fmt(complete)} complete cases</p>}
        </Panel>
        <Panel title="Leakage" source={sourceOf(step, "leakage")}>
          {leakage.length ? (
            leakage.map((row, index) => (
              <p key={`${row.columns.join()}:${index}`} className="text-sm">
                <span className="font-mono text-xs">{row.columns.join(", ")}</span> · {row.flag ?? "no flag"}
              </p>
            ))
          ) : (
            <Pending>{step.progress >= 1 ? "No leakage check recorded" : "Evaluating"}</Pending>
          )}
        </Panel>
      </div>
      {anomalies.length > 0 && (
        <Panel title="Anomalies" source={sourceOf(step, "anomalies")}>
          {anomalies.map((item, index) => (
            <p key={`${item.text}:${index}`} className="text-sm">
              {item.severity && (
                <Chip tone="warn" className="mr-2">
                  {item.severity}
                </Chip>
              )}
              {item.text ?? item.explanation}
            </p>
          ))}
        </Panel>
      )}
    </div>
  );
}

/** The seven PairFitness axes: always listed as structure, filled from the published pair. */
const AXES = ["Timing", "Measurement", "Sample strength", "Missing", "Positivity", "Cluster", "Generalisation"];
const RUNGS = ["descriptive", "association", "causal"];

export function FitnessVisual({ step }: { step: View<"fitness"> }) {
  const { pairs, verdict, reasons, acceptedBy } = step.content;
  const pair = pairs.at(0);
  const ceiling = pair?.claimCeiling?.toLowerCase();
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Panel
        title={pair ? `Pair · ${pair.exposure} → ${pair.outcome}` : "Pair"}
        cursor={itemCursor(0)}
        source={sourceOf(step, "pairs")}
      >
        {AXES.map((name, index) => {
          const axis =
            pair?.axes.find(
              (item) => item.name?.toLowerCase().replace("sample strength", "sample strength") === name.toLowerCase(),
            ) ?? pair?.axes[index];
          return (
            <div
              key={name}
              className="grid grid-cols-[8.5rem_5.5rem_minmax(0,1fr)] items-center gap-2 border-t pt-2 text-[13px] first:border-t-0 first:pt-0 max-sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <span>{name}</span>
              <span>
                {axis?.status ? <Chip tone={STATUS[axis.status] ?? "neutral"}>{axis.status}</Chip> : <Pending />}
              </span>
              <span className="text-muted-foreground text-xs max-sm:col-span-2">{axis?.reason}</span>
            </div>
          );
        })}
      </Panel>
      <div className="grid content-start gap-3">
        <Panel title="Strongest claim the data can carry">
          <div className="flex gap-1">
            {RUNGS.map((rung) => (
              <span
                key={rung}
                className={cn(
                  "flex-1 rounded-lg px-1 py-2 text-center font-medium text-xs",
                  ceiling === rung ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {rung}
              </span>
            ))}
          </div>
          {!ceiling && <Pending>The ceiling is set after the axes</Pending>}
        </Panel>
        <Panel title="Verdict" source={sourceOf(step, "verdict")}>
          {verdict ? (
            <Chip tone={STATUS[verdict] ?? "warn"} className="h-6 w-fit px-2.5 text-[13px]">
              {verdict}
            </Chip>
          ) : (
            <Pending />
          )}
          {reasons.map((reason) => (
            <p key={reason} className="text-muted-foreground text-xs">
              {reason}
            </p>
          ))}
          {acceptedBy && <p className="text-muted-foreground text-xs">Accepted by {acceptedBy}</p>}
        </Panel>
      </div>
    </div>
  );
}

export function DisclosureVisual({ step }: { step: View<"disclosure"> }) {
  const { header, variables, split, access, decisions, caveats, gaps, sensitive } = step.content;
  const unfilled = !header.title && variables.length === 0;
  return (
    <div className="grid gap-3">
      <Panel
        title={header.title ?? "Data card"}
        cursor={itemCursor(0)}
        current={step.cursor === 0}
        source={sourceOf(step, "header")}
      >
        {header.description && <p className="text-sm">{header.description}</p>}
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-4 gap-y-2 text-sm">
          {[
            ["Unit of observation", header.unit],
            [
              "Rows × columns",
              header.rows !== null && header.columns !== null ? `${fmt(header.rows)} × ${fmt(header.columns)}` : null,
            ],
            ["Smallest cell shown", fmt(header.minCell)],
            ["Source file", header.source.filename],
            ["Disclosure", header.disclosure],
          ].map(([term, value]) => (
            <div key={term}>
              <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">{term}</dt>
              <dd>
                <Val value={value} />
              </dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel
        title={`Variables${variables.length ? ` · ${variables.length}` : ""}`}
        source={sourceOf(step, "variables")}
      >
        {variables.length === 0 ? (
          <div className="grid gap-1.5">
            {(known(step, /./).length ? known(step, /./) : [null]).map((label, index) => (
              <div
                key={label ?? "variable"}
                data-cursor={itemCursor(index + 1)}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_5rem] items-center gap-3 rounded-lg border border-dashed px-2.5 py-2 text-[13px]"
              >
                <span className="truncate font-mono text-xs">{label ? nameOf(label) : <Blank className="w-20" />}</span>
                <Blank className="w-32" />
                <Blank />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="text-[11px] text-muted-foreground">
                <tr>
                  {["Name", "Label", "Measure", "Role", "Flags"].map((head) => (
                    <th key={head} className="px-1 py-1.5 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variables.map((variable, index) => (
                  <tr
                    key={`${variable.name}:${index}`}
                    data-cursor={itemCursor(index + 1)}
                    className="border-t align-top"
                  >
                    <td className="px-1 py-2 font-mono text-xs">{variable.name}</td>
                    <td className="px-1 py-2">
                      {variable.label ?? <Pending />}
                      {variable.sources.label && <Origin value={variable.sources.label} />}
                    </td>
                    <td className="px-1 py-2">
                      {variable.measure ?? <Pending />}
                      {variable.sources.measure && <Origin value={variable.sources.measure} />}
                    </td>
                    <td className="px-1 py-2">
                      {variable.role && (
                        <Chip tone={variable.role === "target" ? "ok" : "neutral"}>{variable.role}</Chip>
                      )}
                    </td>
                    <td className="px-1 py-2">
                      <span className="flex flex-wrap gap-1">
                        {variable.flags.map((flag) => (
                          <Chip key={flag} tone="warn">
                            {flag}
                          </Chip>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Split" source={sourceOf(step, "split")}>
          <p className="text-sm">
            {split.parts.map((part) => (
              <span key={part.name} className="mr-4 whitespace-nowrap">
                {part.name}{" "}
                <b className="font-medium">
                  <Val value={fmt(part.count)} />
                </b>
              </span>
            ))}
          </p>
        </Panel>
        <Panel title="Who saw which rows" source={sourceOf(step, "access")}>
          {access.length ? (
            access.map((row, index) => (
              <p key={`${row.actor}:${index}`} className="text-sm">
                <Origin value={row.actor ?? "—"} /> {row.what}{" "}
                <span className="text-muted-foreground text-xs">· rows: {row.rows}</span>
              </p>
            ))
          ) : (
            <Pending />
          )}
        </Panel>
        <Panel title="Decisions asked" source={sourceOf(step, "decisions")}>
          {decisions.length ? (
            decisions.map((row, index) => (
              <p key={`${row.question}:${index}`} className="text-sm">
                {row.question}{" "}
                <span className="text-muted-foreground text-xs">
                  → {row.label ?? row.note}
                  {row.by && ` · ${row.by}`}
                </span>
              </p>
            ))
          ) : (
            <Pending>{step.progress >= 1 ? "No decision recorded" : "Evaluating"}</Pending>
          )}
        </Panel>
        <Panel title="Limits" source={sourceOf(step, "caveats")}>
          {[...caveats.map((text) => ["Caveat", text]), ...gaps.map((text) => ["Gap", text])].map(([kind, text]) => (
            <p key={text} className="text-sm">
              <b className="font-medium">{kind}</b> · {text}
            </p>
          ))}
          {sensitive.map((row) => (
            <p key={row.column} className="text-sm">
              <b className="font-medium">Sensitive</b> · <span className="font-mono text-xs">{row.column}</span>{" "}
              {row.kind}
            </p>
          ))}
          {caveats.length + gaps.length + sensitive.length === 0 && (
            <Pending>{unfilled || step.progress < 1 ? "Evaluating" : "No limits recorded"}</Pending>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function DatasetReviewVisual({ step }: { step: View<"review"> }) {
  return <ReviewThreadView step={step} responder="steward" />;
}
