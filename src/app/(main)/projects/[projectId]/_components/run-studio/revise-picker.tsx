"use client";

import { useState } from "react";

import { cn } from "cn";
import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FindingSeverity, Gate, OwnFinding, ReviewFinding } from "@/lib/run-stream/contract";

import { CitedText } from "./cite";
import { bySeverity, FINDING_CATEGORIES, FINDING_SEVERITY, FINDING_TARGETS, findingTarget } from "./scenes/findings";

const SEVERITIES: FindingSeverity[] = ["blocking", "major", "minor"];
const label = (category: string) => category[0].toUpperCase() + category.slice(1).replaceAll("_", " ");
const WHOLE = "whole";

/** Writes one finding of your own on a hypothesis: where, how serious, what kind, what is wrong, how to fix it. */
function OwnFindingForm({
  hypothesis,
  onAdd,
  onCancel,
}: {
  hypothesis: string;
  onAdd(finding: OwnFinding): void;
  onCancel(): void;
}) {
  const [field, setField] = useState(WHOLE);
  const [severity, setSeverity] = useState<FindingSeverity>("major");
  const [kind, setKind] = useState<ReviewFinding["kind"]>("fix");
  const [category, setCategory] = useState<string>("other");
  const [issue, setIssue] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const add = () => {
    if (!issue.trim()) {
      toast.error("Say what is wrong before adding the finding.");
      return;
    }
    onAdd({
      hypothesis,
      field: field === WHOLE ? "" : field,
      severity,
      kind,
      category,
      issue: issue.trim(),
      ...(suggestion.trim() ? { suggestion: suggestion.trim() } : {}),
    });
  };
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mt-1 flex flex-col gap-3 rounded-lg bg-muted/50 p-3 ring-1 ring-foreground/10">
        <div className="grid gap-3 sm:grid-cols-2">
          <span className="flex flex-col gap-1.5">
            <span className="font-medium text-[11px] text-muted-foreground">Where</span>
            <Select value={field} onValueChange={setField}>
              <SelectTrigger size="sm" className="w-full bg-background" aria-label={`Part of ${hypothesis}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINDING_TARGETS.map((t) => (
                  <SelectItem key={t.key || WHOLE} value={t.key || WHOLE}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="font-medium text-[11px] text-muted-foreground">Category</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger size="sm" className="w-full bg-background" aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINDING_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {label(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="font-medium text-[11px] text-muted-foreground">How serious</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={severity}
              onValueChange={(v) => v && setSeverity(v as FindingSeverity)}
              aria-label="How serious"
              className="w-full bg-background"
            >
              {SEVERITIES.map((s) => (
                <ToggleGroupItem key={s} value={s} className="flex-1 gap-1.5">
                  <span className={cn("size-1.5 rounded-full", FINDING_SEVERITY[s].dot)} />
                  {FINDING_SEVERITY[s].label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="font-medium text-[11px] text-muted-foreground">What it needs</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={kind}
              onValueChange={(v) => v && setKind(v as ReviewFinding["kind"])}
              aria-label="What it needs"
              className="w-full bg-background"
            >
              <ToggleGroupItem value="fix" className="flex-1">
                A fix
              </ToggleGroupItem>
              <ToggleGroupItem value="needs_evidence" className="flex-1">
                A source
              </ToggleGroupItem>
            </ToggleGroup>
          </span>
        </div>
        <Textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder={`What is wrong with ${hypothesis}?`}
          aria-label={`What is wrong with ${hypothesis}`}
          rows={3}
          className="min-h-18 bg-background text-sm"
          autoFocus
        />
        <Input
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="Suggested fix (optional)"
          aria-label="Suggested fix"
          className="h-8 bg-background text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={add}>
            Add finding
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function SeverityLine({
  severity,
  field,
  category,
  yours,
}: {
  severity: FindingSeverity;
  field: string;
  category: string;
  yours?: boolean;
}) {
  const tone = FINDING_SEVERITY[severity] ?? FINDING_SEVERITY.minor;
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      <b className={cn("font-semibold", tone.text)}>{tone.label}</b>
      <span>·</span>
      <span className="text-foreground/80">{field || "Whole hypothesis"}</span>
      {category !== "other" && (
        <>
          <span>·</span>
          <span>{category.replaceAll("_", " ")}</span>
        </>
      )}
      {yours && (
        <span className="ml-0.5 rounded bg-foreground px-1 py-px font-semibold text-[10px] text-background">You</span>
      )}
    </span>
  );
}

/**
 * Sending hypotheses back: per hypothesis, the reviewer's findings to fix (the blocking and major ones start picked)
 * and findings of your own.
 */
export function RevisePicker({
  review,
  picked,
  onPick,
  own,
  onOwn,
}: {
  review: NonNullable<Gate["review"]>;
  picked: string[];
  onPick(ids: string[]): void;
  own: OwnFinding[];
  onOwn(findings: OwnFinding[]): void;
}) {
  const [writing, setWriting] = useState<string | null>(null);
  const all = review.findings.map((f) => f.finding_id);
  const serious = review.findings.filter((f) => f.severity !== "minor").map((f) => f.finding_id);
  const count = picked.length + own.length;
  const presets = [
    { label: "Blocking & major", ids: serious },
    { label: "All", ids: all },
    { label: "None", ids: [] as string[] },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-medium text-sm">What to send back</span>
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-[11px] text-muted-foreground tabular-nums">
          {count} {count === 1 ? "item" : "items"}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Pick</span>
          {presets.map((p) => (
            <Button
              key={p.label}
              variant="ghost"
              size="xs"
              onClick={() => onPick(p.ids)}
              className={cn(
                p.ids.length === picked.length &&
                  p.ids.every((id) => picked.includes(id)) &&
                  "bg-muted text-foreground",
              )}
            >
              {p.label}
            </Button>
          ))}
        </span>
      </div>
      {review.hypotheses.map((h) => {
        const findings = review.findings.filter((f) => findingTarget(f.locator).id === h.id).sort(bySeverity);
        const mine = own.filter((f) => f.hypothesis === h.id);
        const taken = findings.filter((f) => picked.includes(f.finding_id)).length + mine.length;
        return (
          <section key={h.id} className="flex flex-col gap-0.5 rounded-xl border bg-card px-3 pt-2.5 pb-2">
            <header className="flex min-w-0 items-center gap-2 pb-1.5">
              <span className="inline-flex h-5 shrink-0 items-center rounded-md bg-primary px-1.5 font-mono font-semibold text-[11px] text-primary-foreground">
                {h.id}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground text-sm">{h.label}</span>
              <span
                className={cn(
                  "shrink-0 text-[11px] tabular-nums",
                  taken ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {taken ? `${taken} to send` : "nothing to send"}
              </span>
            </header>
            {findings.map((f) => (
              <label
                key={f.finding_id}
                htmlFor={`send-${f.finding_id}`}
                className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/60"
              >
                <Checkbox
                  id={`send-${f.finding_id}`}
                  checked={picked.includes(f.finding_id)}
                  onCheckedChange={() =>
                    onPick(
                      picked.includes(f.finding_id)
                        ? picked.filter((x) => x !== f.finding_id)
                        : [...picked, f.finding_id],
                    )
                  }
                  className="mt-0.5"
                />
                <span className="flex min-w-0 flex-col gap-0.5 text-xs">
                  <SeverityLine severity={f.severity} field={findingTarget(f.locator).field} category={f.category} />
                  <span className="line-clamp-2 leading-snug">
                    <CitedText text={f.issue} />
                  </span>
                </span>
              </label>
            ))}
            <AnimatePresence initial={false}>
              {mine.map((f) => (
                <motion.div
                  key={`${f.hypothesis}-${f.issue}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-x-2.5 rounded-lg bg-muted/40 px-1.5 py-1.5"
                >
                  <span className="mt-1 size-4 rounded-[4px] bg-primary" aria-hidden />
                  <span className="flex min-w-0 flex-col gap-0.5 text-xs">
                    <SeverityLine
                      severity={f.severity}
                      field={FINDING_TARGETS.find((t) => t.key === f.field)?.label ?? ""}
                      category={f.category}
                      yours
                    />
                    <span className="leading-snug">{f.issue}</span>
                    {f.suggestion && <span className="text-muted-foreground leading-snug">→ {f.suggestion}</span>}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove this finding"
                    onClick={() => onOwn(own.filter((x) => x !== f))}
                  >
                    <X />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {writing === h.id && (
                <OwnFindingForm
                  key="form"
                  hypothesis={h.id}
                  onAdd={(finding) => {
                    onOwn([...own, finding]);
                    setWriting(null);
                  }}
                  onCancel={() => setWriting(null)}
                />
              )}
            </AnimatePresence>
            {writing !== h.id && (
              <Button
                variant="ghost"
                size="xs"
                className="mt-0.5 w-fit text-muted-foreground"
                onClick={() => setWriting(h.id)}
              >
                <Plus />
                Add your own finding
              </Button>
            )}
          </section>
        );
      })}
    </div>
  );
}
