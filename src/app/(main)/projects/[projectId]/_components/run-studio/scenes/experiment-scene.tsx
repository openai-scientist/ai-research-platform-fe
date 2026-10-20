"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { AlertTriangle, Info, Lock, Star, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { Hypothesis, TestDesign } from "@/lib/run-stream/contract";
import type { ExperimentContent, NodeState } from "@/lib/run-stream/run-state";

import { AgentCursor, launchFlight } from "../run-bits";
import { useReveal } from "../workspace-context";
import { Pane, Placeholder } from "./scene-ui";

const W = 180;
const H = 66;
const GX = 48;
const GY = 12;
const KIND = { draft: "Draft", debug: "Fix", improve: "Improve" } as const;

interface Placed {
  node: NodeState;
  x: number;
  y: number;
}

/** Lays a search tree out left to right: a first child shares its parent's row, later children open new rows. */
function layout(nodes: NodeState[]) {
  const pos = new Map<string, { depth: number; row: number }>();
  const kids = new Map<string, number>();
  let maxRow = -1;
  const placed: Placed[] = [];
  for (const node of nodes) {
    const parent = node.parent_id ? pos.get(node.parent_id) : undefined;
    let depth = 0;
    let row: number;
    if (!parent || !node.parent_id) row = ++maxRow;
    else {
      const k = kids.get(node.parent_id) ?? 0;
      depth = parent.depth + 1;
      row = k === 0 ? parent.row : ++maxRow;
      kids.set(node.parent_id, k + 1);
    }
    pos.set(node.id, { depth, row });
    placed.push({ node, x: depth * (W + GX), y: row * (H + GY) });
  }
  const width = Math.max(W, ...placed.map((p) => p.x + W));
  const height = Math.max(H, (maxRow + 1) * (H + GY) - GY);
  return { placed, width, height, pos };
}

function nodeFooter(node: NodeState) {
  if (node.score !== undefined)
    return (
      <span className="flex flex-1 items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
        <i className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.b
            className="block h-full origin-left rounded-full bg-orange-500"
            style={{ width: `${node.score * 100}%` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </i>
        {node.score.toFixed(2)}
      </span>
    );
  switch (node.status) {
    case "writing":
      return <span>writing code</span>;
    case "ready":
      return <span>queued</span>;
    case "running":
      return (
        <span className="flex flex-1 items-center gap-1.5 text-blue-700 dark:text-blue-300">
          running
          <i className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-muted">
            <motion.b
              className="absolute inset-y-0 w-2/5 rounded-full bg-blue-600"
              animate={{ x: ["-100%", "250%"] }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
          </i>
        </span>
      );
    case "works":
      return <span className="text-emerald-700 dark:text-emerald-300">works</span>;
    case "discarded":
      return <span className="text-amber-800 dark:text-amber-300">thrown out · rule 2</span>;
    default:
      return (
        <span className="truncate text-rose-700 dark:text-rose-300">{node.error?.split(":")[0] ?? "crashed"}</span>
      );
  }
}

function Tree({
  hypothesis,
  nodes,
  onPick,
  selected,
}: {
  hypothesis: Hypothesis;
  nodes: NodeState[];
  onPick(id: string): void;
  selected: string | null;
}) {
  const { placed, width, height, pos } = layout(nodes);
  const best = nodes.find((n) => n.best);
  const failed = !best && nodes.some((n) => n.status === "out_of_attempts");
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ left: width, behavior: "smooth" });
  }, [width]);
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <header className="flex flex-wrap items-center gap-2.5 border-b px-3.5 py-2.5 text-sm">
        <span
          data-tag={hypothesis.id}
          className="rounded-md bg-primary px-1.5 py-0.5 font-mono font-semibold text-primary-foreground text-xs"
        >
          {hypothesis.id}
        </span>
        <b className="font-semibold">{hypothesis.short}</b>
        <span className="text-muted-foreground text-xs">
          {hypothesis.method} · reports <code className="font-mono">{hypothesis.report_key}</code>
        </span>
        <AnimatePresence>
          {best?.score !== undefined && (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="ml-auto inline-flex items-center gap-1 font-mono font-semibold text-xs"
            >
              <Star className="size-3 fill-current" />
              best v{best.version} · {best.score.toFixed(2)}
            </motion.span>
          )}
          {failed && (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="ml-auto inline-flex h-5 items-center gap-1 rounded-full bg-rose-500/12 px-2 font-medium text-rose-700 text-xs dark:text-rose-300"
            >
              <X className="size-3" />
              No working version
            </motion.span>
          )}
        </AnimatePresence>
      </header>
      <div ref={scroller} className="overflow-x-auto p-3.5">
        <motion.div
          className="relative"
          animate={{ height }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ width }}
        >
          <svg
            className="pointer-events-none absolute top-0 left-0 overflow-visible"
            width={width}
            height={height}
            aria-hidden
          >
            {placed.map(({ node, x, y }) => {
              const parent = node.parent_id ? pos.get(node.parent_id) : undefined;
              if (!parent) return null;
              const x1 = parent.depth * (W + GX) + W;
              const y1 = parent.row * (H + GY) + H / 2;
              const y2 = y + H / 2;
              return (
                <g key={`e-${node.id}`}>
                  <motion.path
                    d={`M${x1} ${y1} C ${x1 + 26} ${y1}, ${x - 26} ${y2}, ${x} ${y2}`}
                    className={cn("fill-none", node.kind === "debug" ? "stroke-rose-400/70" : "stroke-foreground/25")}
                    strokeWidth={1.5}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                  <motion.text
                    x={(x1 + x) / 2}
                    y={(y1 + y2) / 2 - 5}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {node.kind === "debug" ? "fix" : "improve"}
                  </motion.text>
                </g>
              );
            })}
          </svg>
          {placed.map(({ node, x, y }) => (
            <motion.button
              key={node.id}
              type="button"
              data-cursor={`node:${node.id}`}
              data-node={node.id}
              onClick={() => onPick(node.id)}
              initial={{ opacity: 0, x: x - 10, scale: 0.96 }}
              animate={{
                opacity: node.status === "discarded" ? 0.55 : 1,
                x: node.status === "crashed" || node.status === "out_of_attempts" ? [x - 3, x + 3, x - 3, x] : x,
                scale: 1,
              }}
              transition={{ duration: 0.4 }}
              style={{ top: y, width: W, height: H }}
              className={cn(
                "absolute left-0 flex flex-col gap-px rounded-lg border bg-card px-2.5 py-1.5 text-left text-xs outline-none transition-[border-color,box-shadow,background-color] hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
                node.status === "running" && "border-blue-600",
                (node.status === "crashed" || node.status === "out_of_attempts") && "border-rose-500/50 bg-rose-500/8",
                node.status === "discarded" && "border-dashed",
                node.best && "border-foreground ring-1 ring-foreground",
                selected === node.id && "ring-2 ring-blue-600",
              )}
            >
              <span className="flex justify-between font-medium text-[10.5px] text-muted-foreground">
                <span>{KIND[node.kind]}</span>
                <span className="font-mono">v{node.version}</span>
              </span>
              <span
                className={cn("truncate leading-tight", node.status === "discarded" && "line-through")}
                title={node.title}
              >
                {node.title}
              </span>
              <span className="mt-auto flex min-h-3.5 items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
                {nodeFooter(node)}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}

function Inspector({
  node,
  hypothesis,
  pinned,
  onFollow,
}: {
  node: NodeState | null;
  hypothesis?: Hypothesis;
  pinned: boolean;
  onFollow(): void;
}) {
  const logs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logs.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  if (!node || !hypothesis)
    return (
      <div className="grid grid-cols-[auto_1fr] gap-2 rounded-xl bg-card p-4 text-muted-foreground text-xs ring-1 ring-foreground/10">
        <Info className="mt-px size-3.5" />
        The code and sandbox log of the version being worked on show here. Click any version in a tree to inspect it.
      </div>
    );
  const statusText: Record<NodeState["status"], string> = {
    writing: "writing code",
    ready: "ready to run",
    running: "running in sandbox",
    works: "works",
    crashed: "crashed",
    out_of_attempts: "out of attempts",
    discarded: "discarded",
  };
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <motion.header
        key={node.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-sm"
      >
        <span className="rounded-md bg-primary px-1.5 py-0.5 font-mono font-semibold text-primary-foreground text-xs">
          {hypothesis.id}
        </span>
        <b className="font-semibold">
          v{node.version} · {KIND[node.kind]}
        </b>
        <span className="ml-auto font-mono text-muted-foreground text-xs">{statusText[node.status]}</span>
        {pinned && (
          <Button variant="ghost" size="xs" onClick={onFollow}>
            Follow live
          </Button>
        )}
      </motion.header>
      <p className="px-3 pt-2 text-muted-foreground text-xs">{node.title}</p>
      <pre className="mt-2 min-h-24 overflow-x-auto border-y bg-muted/50 py-2 font-mono text-[11.5px] leading-[1.7]">
        {node.code.map((line, i) => (
          <motion.div
            key={`${node.id}-${i}`}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: pinned ? 0 : i * 0.07 }}
            className={cn("grid grid-cols-[40px_auto] whitespace-pre pr-3", line.added && "bg-emerald-500/12")}
          >
            <span
              className={cn(
                "select-none pr-2.5 text-right text-muted-foreground/80",
                line.added && "text-emerald-700 dark:text-emerald-300",
              )}
            >
              {line.added ? "+ " : ""}
              {i + 1}
            </span>
            <span>{line.text}</span>
          </motion.div>
        ))}
        {node.status === "writing" && <span className="pl-10 text-muted-foreground">…</span>}
      </pre>
      <div ref={logs} className="max-h-48 min-h-24 overflow-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed">
        {node.logs.length === 0 && <span className="text-muted-foreground">Not run yet.</span>}
        {node.logs.map((line, i) => (
          <motion.div
            key={`${node.id}-log-${i}`}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "whitespace-pre-wrap",
              line.level === "command" && "text-muted-foreground",
              line.level === "error" && "text-rose-700 dark:text-rose-300",
              line.level === "success" && "text-emerald-700 dark:text-emerald-300",
            )}
          >
            {line.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const fmt = (v: number | null) => (v === null ? "null" : v.toFixed(1));

function PlanPane({
  planId,
  plan,
  design,
  live,
}: {
  planId: string;
  plan: Hypothesis[];
  design?: TestDesign;
  live: boolean;
}) {
  const groups = design
    ? ([
        ["What changes", design.independent, "bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300"],
        [
          "What is measured",
          design.dependent,
          "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
        ],
        ["Held equal", design.controls, "bg-muted text-muted-foreground ring-foreground/10"],
      ] as const)
    : [];
  return (
    <Pane
      title={`Test plan ${planId}`}
      aside="exp_plan.yaml · Stage 09"
      action={
        <motion.span
          data-cursor="plan"
          initial={live ? { scale: 1.6, rotate: -6, opacity: 0 } : false}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.35 + plan.length * 0.12, type: "spring", stiffness: 300, damping: 16 }}
          className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary px-2.5 font-semibold text-primary-foreground text-xs"
        >
          <Lock className="size-3" />
          Locked before any code runs
        </motion.span>
      }
    >
      {design && (
        <div className="mb-3 grid gap-3 border-b pb-3 sm:grid-cols-3">
          {groups.map(([label, items, tone], gi) => (
            <div key={label} className="flex min-w-0 flex-col gap-1.5">
              <span className="text-muted-foreground text-xs">{label}</span>
              <span className="flex flex-wrap gap-1">
                {items.map((item, i) => (
                  <motion.code
                    key={item}
                    initial={live ? { opacity: 0, y: 4 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.2 + i * 0.06 }}
                    className={cn("rounded-md px-1.5 py-0.5 font-mono text-[11.5px] ring-1", tone)}
                  >
                    {item}
                  </motion.code>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-xs">
            <tr className="border-b">
              {["ID", "How it's tested", "Compares", "Must report", "Wrong if"].map((h) => (
                <th key={h} className="whitespace-nowrap pr-3 pb-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.map((h, i) => (
              <motion.tr
                key={h.id}
                initial={live ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                className="border-b last:border-0"
              >
                <td className="py-2 pr-3 align-top">
                  <span className="rounded-md bg-primary px-1.5 py-0.5 font-mono font-semibold text-primary-foreground text-xs">
                    {h.id}
                  </span>
                </td>
                <td className="py-2 pr-3 align-top">
                  {h.method}
                  <span className="block text-muted-foreground text-xs">
                    {h.outcome} · {h.exposure}
                  </span>
                </td>
                <td className="py-2 pr-3 align-top">{h.estimand}</td>
                <td className="py-2 pr-3 align-top font-mono text-xs">{h.report_key}</td>
                <td className="min-w-48 py-2 align-top text-muted-foreground text-xs">{h.falsify.text}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Pane>
  );
}

export function ExperimentScene({ data, live }: { data: ExperimentContent; live: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  const json = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const shownId = pinned ?? data.activeNodeId;
  const shown = shownId ? data.nodes[shownId] : null;
  const hypothesis = data.hypotheses.find((h) => h.id === shown?.hypothesis_id);
  const results = Object.values(data.results);
  const discarded = Object.values(data.nodes).filter((n) => n.status === "discarded");

  // The kept version's number flies into results.json.
  const seen = useRef(results.length);
  useEffect(() => {
    if (results.length <= seen.current) {
      seen.current = results.length;
      return;
    }
    seen.current = results.length;
    if (!live) return;
    const latest = results[results.length - 1];
    if (!latest.node_id) return;
    launchFlight(
      scene.current?.querySelector(`[data-node="${latest.node_id}"]`),
      json.current?.querySelector("[data-json-end]"),
      latest.key,
      "bg-blue-600 text-white",
    );
  }, [results, live]);

  const active = data.activeNodeId ? data.nodes[data.activeNodeId] : null;
  const activeRef = useRef<HTMLElement | null>(null);
  activeRef.current = active ? (scene.current?.querySelector<HTMLElement>(`[data-node="${active.id}"]`) ?? null) : null;
  useReveal(activeRef, data.activeNodeId, live);
  const scoring = Object.values(data.nodes).some((n) => n.score !== undefined);

  return (
    <div ref={scene} className="relative flex flex-col gap-4">
      {data.planId ? (
        <PlanPane planId={data.planId} plan={data.plan} design={data.design} live={live} />
      ) : (
        <Placeholder icon={<Lock className="size-3.5" />}>
          The test plan is locked before any code is written
        </Placeholder>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div className="flex min-w-0 flex-col gap-3">
          {data.hypotheses.map((h) => (
            <Tree
              key={h.id}
              hypothesis={h}
              nodes={(data.nodeOrder[h.id] ?? []).map((id) => data.nodes[id])}
              selected={shownId}
              onPick={(id) => setPinned(id)}
            />
          ))}
          <AnimatePresence>
            {discarded.map((node) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 text-amber-700 dark:text-amber-300" />
                <span>
                  <b className="block font-semibold">Rule 2 stepped in</b>
                  {node.hypothesis_id} v{node.version}, “{node.title}”: {node.error} It was thrown out automatically.
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-3">
          <Inspector node={shown} hypothesis={hypothesis} pinned={Boolean(pinned)} onFollow={() => setPinned(null)} />
          <div ref={json} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <header className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2 font-mono font-semibold text-xs">
              <Lock className="size-3 text-muted-foreground" />
              results.json
              <span className="ml-auto font-medium font-sans text-[11px] text-muted-foreground">
                agents can only add
              </span>
            </header>
            <div className="overflow-x-auto px-3 py-2.5 font-mono text-[11.5px] leading-[1.7]">
              <div>{"{"}</div>
              {results.map((r, i) => (
                <motion.div
                  key={r.key}
                  data-json={r.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative whitespace-pre"
                >
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 -mx-1 rounded-sm bg-amber-300/40"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 1.2 }}
                  />
                  {"  "}
                  <span className="text-blue-700 dark:text-blue-300">"{r.key}"</span>:{" "}
                  {r.estimate === null ? (
                    <>
                      <b>null</b> <i className="text-muted-foreground">{"// never ran"}</i>
                    </>
                  ) : (
                    <>
                      {"{ "}
                      <span className="text-muted-foreground">"est"</span>: <b>{fmt(r.estimate)}</b>,{" "}
                      <span className="text-muted-foreground">"ci"</span>: [<b>{fmt(r.ci_low)}</b>,{" "}
                      <b>{fmt(r.ci_high)}</b>
                      {"] }"}
                    </>
                  )}
                  {i < results.length - 1 ? "," : ""}
                </motion.div>
              ))}
              <div data-json-end>{"}"}</div>
            </div>
            <p className="px-3 pb-2.5 text-muted-foreground text-xs">
              The report and paper may only quote numbers from this file.
            </p>
          </div>
        </aside>
      </div>
      <AgentCursor
        agent={live ? (scoring ? "skeptic" : "methodologist") : null}
        container={scene}
        target={data.activeNodeId ? `node:${data.activeNodeId}` : data.planId ? "plan" : null}
        version={`${Object.keys(data.nodes).length}-${shown?.status}`}
      />
    </div>
  );
}
