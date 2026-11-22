"use client";
"use no memo";

/* ===== The stops of a guided run: a review of each group of stages, your own objections, and the warrants no source
   states =====
   A review says what the stages just did, what to look at, and what it becomes in the paper: every line read from the
   stages' files by code. In the debate you may add the objections you expect a reviewer to raise, each on one claim and
   one of its critical questions. A warrant no source states is the authors' to hold: endorse it, reword it, or keep it
   marked as reconstructed. */

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { cn, Icon } from "../lib";
import { LIVE } from "./run";

/** The model stages a review's note is handed to, in the words of their screens. */
const READER: Record<string, string> = {
  data_report: "Describe the study",
  axis: "Sort the statements",
  debate: "Test each claim",
  toulmin: "Claim anatomy",
  outline: "Outline",
};

function Block({ title, tone, children }: { title: string; tone?: "look"; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "flex flex-col gap-2 rounded-xl px-3.5 py-3",
        tone === "look" ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted/60",
      )}
    >
      <h4
        className={cn(
          "font-semibold text-xs uppercase tracking-wide",
          tone === "look" ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground",
        )}
      >
        {title}
      </h4>
      {children}
    </section>
  );
}

/** A guided run's review of a group of stages, as the stop's body. */
export function StageReviewCard({ stepKey }: { stepKey: string }) {
  const r = LIVE.reviews[stepKey];
  if (!r) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <Block title="What these stages did">
        <ul className="flex flex-col gap-1.5">
          {r.did.map((line) => (
            <li key={line} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2 text-[13.5px] leading-snug">
              <Icon n="check" className="mt-0.5 size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-pretty">{line}</span>
            </li>
          ))}
        </ul>
      </Block>
      {r.check.length > 0 && (
        <Block title="Look at" tone="look">
          <ul className="flex flex-col gap-1.5">
            {r.check.map((c) => (
              <li
                key={`${c.artifact}:${c.id}:${c.what}`}
                className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2 text-[13.5px] text-amber-950 leading-snug dark:text-amber-100"
              >
                <Icon n="flag" className="mt-0.5 size-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-pretty">{c.what}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
      {r.becomes.length > 0 && (
        <Block title="What it becomes in the paper">
          <dl className="grid grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13.5px]">
            {r.becomes.map((b) => (
              <div key={`${b.item}:${b.effect}`} className="contents">
                <dt className="font-medium font-mono text-xs leading-5">{b.item}</dt>
                <dd className="text-pretty leading-snug">{b.effect}</dd>
              </div>
            ))}
          </dl>
        </Block>
      )}
      {r.handed_to && r.handed_to.length > 0 && (
        <p className="text-muted-foreground text-xs">
          A note you write here goes to: {r.handed_to.map((k) => READER[k] ?? k).join(", ")}. It may say what to look at
          or how to word a point; it never adds a fact the record lacks.
        </p>
      )}
    </div>
  );
}

export interface Objection {
  claim_id: string;
  cq_id: string;
  text: string;
}
const EMPTY: Objection = { claim_id: "", cq_id: "", text: "" };
const MAX = 5;

/** Your own objections, one claim and one of its critical questions each, sent with "Add my objections". */
export function ObjectionsForm({ value, onChange }: { value: Objection[]; onChange(next: Objection[]): void }) {
  const claims = LIVE.objectable;
  const rows = value.length ? value : [EMPTY];
  const set = (i: number, patch: Partial<Objection>) =>
    onChange(rows.map((o, j) => (j === i ? { ...o, ...patch, ...(patch.claim_id ? { cq_id: "" } : {}) } : o)));
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-1 text-muted-foreground text-xs">
        Pick a claim, the question a reviewer would ask of it, then say the objection in a sentence or two. The
        Proponent answers it and the Judge rules, as for the critics.
      </legend>
      {rows.map((o, i) => {
        const claim = claims.find((c) => c.claim_id === o.claim_id);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: an objection keeps its row while you edit it
          <div key={i} className="flex flex-col gap-2 rounded-xl border px-3.5 py-3">
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">Objection {i + 1}</span>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  aria-label={`Remove objection ${i + 1}`}
                >
                  <Icon n="x" />
                </Button>
              )}
            </span>
            <Select value={o.claim_id} onValueChange={(v) => set(i, { claim_id: v })}>
              <SelectTrigger className="w-full" aria-label="Claim">
                <SelectValue placeholder="The claim you object to" />
              </SelectTrigger>
              <SelectContent>
                {claims.map((c) => (
                  <SelectItem key={c.claim_id} value={c.claim_id}>
                    <span className="truncate">
                      <b className="font-mono font-medium">{c.claim_id}</b> · {c.text}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={o.cq_id} onValueChange={(v) => set(i, { cq_id: v })} disabled={!claim}>
              <SelectTrigger className="w-full" aria-label="Critical question">
                <SelectValue placeholder="The question a reviewer would ask" />
              </SelectTrigger>
              <SelectContent>
                {(claim?.questions ?? []).map((q) => (
                  <SelectItem key={q.cq_id} value={q.cq_id}>
                    <span className="truncate">{q.text}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={o.text}
              onChange={(e) => set(i, { text: e.target.value })}
              maxLength={500}
              rows={2}
              placeholder="The objection, as a reviewer would write it"
              aria-label={`Objection ${i + 1}`}
            />
          </div>
        );
      })}
      {rows.length < MAX && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...rows, EMPTY])}
        >
          <Plus />
          Add another
        </Button>
      )}
    </fieldset>
  );
}
/** The objections ready to send: each with a claim, a question and 10 to 500 characters. */
export const readyObjections = (rows: Objection[]) =>
  rows.filter((o) => o.claim_id && o.cq_id && o.text.trim().length >= 10).map((o) => ({ ...o, text: o.text.trim() }));

/** The warrants no source states: shown at their stop, and reworded when you choose to. */
export function WarrantsForm({
  reword,
  value,
  onChange,
}: {
  reword: boolean;
  value: Record<string, string>;
  onChange(next: Record<string, string>): void;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {LIVE.openWarrants.map((w) => (
        <li key={w.claim_id} className="flex flex-col gap-1.5 rounded-xl border px-3.5 py-3">
          <span className="text-muted-foreground text-xs">
            <b className="font-medium font-mono text-foreground">{w.claim_id}</b> · {w.claim}
          </span>
          {reword ? (
            <Textarea
              value={value[w.claim_id] ?? w.warrant}
              onChange={(e) => onChange({ ...value, [w.claim_id]: e.target.value })}
              rows={3}
              aria-label={`Warrant of ${w.claim_id}`}
            />
          ) : (
            <p className="text-pretty text-[13.5px] leading-snug">
              <span className="font-medium text-violet-700 dark:text-violet-300">Warrant: </span>
              {w.warrant}
            </p>
          )}
        </li>
      ))}
      {reword && (
        <p className="text-muted-foreground text-xs">
          Say it as a general principle: “When &lt;a general circumstance&gt;, &lt;a general consequence&gt;”. Never
          this study's own results or numbers; a wording that breaks this is refused and the warrant stays as it was.
        </p>
      )}
    </ul>
  );
}
