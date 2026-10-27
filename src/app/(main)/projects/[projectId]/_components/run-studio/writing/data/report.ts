import { checkRecord, FRAME, type StudyRecord } from "./frame";
import { DROPOUT } from "./records/dropout";

/** [id, label, level, standards, value, status, what it becomes] */
export type ReportField = [string, string, string, string[], string, string, string];
export interface ReportPart {
  p: string;
  n: string;
  fields: ReportField[];
}
export interface TimelineEvent {
  t: string;
  k: string;
  x: string;
  sub: string;
}
export interface ChainLink {
  h: string | null;
  txt: string;
  pri: string | null;
  a: string | null;
  kind: string;
  rows: string | null;
  tr: string | null;
  s: string;
  why?: string;
}

/* ===== S01 · the standard data report: the frame (frame.ts) filled with the dropout record (records/dropout.ts) =====
   Statuses come from the frame's rules, never from the record. */
export { RESULTS_ONLY, STANDARDS } from "./frame";

const fill = (record: StudyRecord): ReportPart[] => {
  const { status } = checkRecord(record);
  return FRAME.map((part) => ({
    p: part.p,
    n: part.n,
    fields: part.fields.map(
      (f): ReportField => [f.id, f.label, f.level, f.std, record.values[f.id] ?? "", status[f.id], f.to],
    ),
  }));
};
const fields = (report: ReportPart[]) =>
  report.flatMap((part) =>
    part.fields.map((f) => ({
      part: part.p,
      id: f[0],
      label: f[1],
      level: f[2],
      std: f[3],
      v: f[4],
      s: f[5],
      to: f[6],
    })),
  );

export const REPORT: ReportPart[] = fill(DROPOUT);
export const REPORT_FIELDS = fields(REPORT);
/** The same record with the plan locked after the first runs (scenario late): the frame's rules mark what changes. */
export const REPORT_LATE_STATUS: Record<string, string> = checkRecord({
  ...DROPOUT,
  profile: { ...DROPOUT.profile, plan: "after" },
}).status;
export const LEVEL_TONE: Record<string, string> = {
  must: "bg-foreground text-background",
  should: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  may: "bg-muted text-muted-foreground",
};
export const levelCount = (lv: string): [number, number, number] => {
  const all = REPORT_FIELDS.filter((f) => f.level === lv);
  return [all.filter((f) => f.s !== "bad").length, all.length, all.filter((f) => f.s === "warn").length];
};

/* r2 · when things happened: the plan must be locked before the first trace */
export const TIMELINE: TimelineEvent[] = [
  { t: "27 Oct 10:50", k: "plan", x: "plan.md locked", sub: "sha b17a…" },
  { t: "27 Oct 10:51", k: "run", x: "First trace", sub: "t01 · LR-E, seed 1" },
  { t: "27 Oct 10:52", k: "run", x: "Last trace", sub: "t20 · GB-ES1U, seed 5" },
  { t: "27 Oct 10:52", k: "ana", x: "Analyses A1–A4", sub: "A4 exploratory in the plan" },
  { t: "27 Oct 10:53", k: "dev", x: "D1 declared", sub: "native categories, not one-hot" },
  { t: "27 Oct 10:54", k: "ana", x: "Rerun as planned · A5", sub: "A5 not in the plan" },
];
/* in scenario U3 the plan was locked after the runs began */
/** What the order of events comes to, written under the timeline once it is read. */
export const TIMELINE_VERDICT = {
  ok: "A1–A3 stay confirmatory. A4 was planned as exploratory; A5 came after the lock, so it stays exploratory.",
  late: "Every analysis is exploratory: no finding may be stated as confirmed.",
};
export const TIMELINE_LATE: TimelineEvent[] = [
  { t: "27 Oct 10:51", k: "run", x: "First trace", sub: "t01 · LR-E, seed 1" },
  { t: "27 Oct 10:52", k: "run", x: "Last trace", sub: "t20 · GB-ES1U, seed 5" },
  { t: "27 Oct 22:40", k: "plan", x: "plan.md locked", sub: "12 h after the first trace" },
  { t: "27 Oct 22:45", k: "dev", x: "D1 declared", sub: "native categories, not one-hot" },
  { t: "27 Oct 22:50", k: "ana", x: "Analyses A1–A5", sub: "A5 not in the plan" },
  { t: "28 Oct 09:00", k: "hand", x: "Hand-off to ASW", sub: "rrp/v2" },
];

/* r3 · each hypothesis to its analysis, its rows and its traces */
export const CHAIN: ChainLink[] = [
  {
    h: "H1",
    txt: "First-semester results raise recall at 20% flagged",
    pri: "primary",
    a: "A1",
    kind: "confirmatory",
    rows: "rows 6–15, 21",
    tr: "t06–t15",
    s: "ok",
  },
  {
    h: "H2",
    txt: "The gain is larger below the median admission grade",
    pri: "primary",
    a: "A2",
    kind: "confirmatory",
    rows: "rows 6–15, 22, 39–40",
    tr: "t06–t15",
    s: "ok",
  },
  {
    h: "H4",
    txt: "Boosting beats logistic regression on enrolment data",
    pri: "primary",
    a: "A3",
    kind: "confirmatory",
    rows: "rows 1–10, 23",
    tr: "t01–t10",
    s: "ok",
  },
  {
    h: "H3",
    txt: "The gain holds from earlier to later cohorts",
    pri: "secondary",
    a: null,
    kind: "deferred",
    rows: null,
    tr: null,
    s: "na",
    why: "Deferred: the data has no entry year, plan §6",
  },
  {
    h: "H5",
    txt: "Equally well calibrated for women and men",
    pri: "secondary",
    a: null,
    kind: "deferred",
    rows: null,
    tr: null,
    s: "na",
    why: "Deferred in the plan, §6",
  },
  {
    h: "H6",
    txt: "Second-semester results add to GB-ES1",
    pri: "secondary",
    a: null,
    kind: "deferred",
    rows: null,
    tr: null,
    s: "na",
    why: "Deferred: after the decision point, E.3",
  },
  {
    h: null,
    txt: "Recall at 20% flagged by course",
    pri: null,
    a: "A4",
    kind: "exploratory",
    rows: "rows 28–38",
    tr: "t11–t15",
    s: "ok",
    why: "Exploratory in the plan, §7",
  },
  {
    h: null,
    txt: "Flagged dropouts with no first-semester evaluation",
    pri: null,
    a: "A5",
    kind: "exploratory",
    rows: "row 27",
    tr: "t11–t15",
    s: "warn",
    why: "Not in the plan: exploratory",
  },
];

/* r4 · the runs against the plan, line by line */
export const PLAN_VS_RUN: [string, string, string, string][] = [
  ["Measure", "recall at 20% flagged", "recall at 20% flagged", "ok"],
  ["Exclusions", "students still enrolled", "794 of 4,424 excluded", "ok"],
  ["Bootstrap", "10,000 resamples", "10,000 resamples", "ok"],
  ["Encoding", "one-hot for every model", "native categories for GB", "dev"],
  ["Tuning", "fixed grid, CV on the training part", "fixed grid, CV on the training part", "ok"],
  ["Seeds", "5", "5", "ok"],
];

/* r5 · what the record lets the paper say, and what it never may */
export const CEILING: { t: string; v: string; why: string; tone: string }[] = [
  {
    t: "Strength of a finding",
    v: "At most “indicate”",
    why: "One institution (C.3). “Show” would need a second.",
    tone: "warn",
  },
  {
    t: "Scope",
    v: "Entrants to one Portuguese polytechnic, 2008/09–2018/19",
    why: "B.5 and J.2. Other institutions are not in the record.",
    tone: "warn",
  },
  { t: "“Significant”", v: "Never", why: "B.9 plans intervals, not a test with a p-value.", tone: "bad" },
  { t: "Causes of dropout", v: "Never", why: "B.6: the claim is predictive only.", tone: "bad" },
  {
    t: "“Early” warning",
    v: "Qualified",
    why: "A5: 22% of flagged dropouts had no first-semester evaluation.",
    tone: "warn",
  },
  { t: "A4 and A5", v: "Exploratory note only", why: "G.2: never a finding.", tone: "warn" },
  { t: "H3, H5, H6", v: "Named as not tested", why: "B.4: secondary and deferred in the plan.", tone: "info" },
  {
    t: "Boosting encoding",
    v: "As run, with the planned check",
    why: "H.1: the declared deviation, D1.",
    tone: "info",
  },
];
