"use client";

import { useState } from "react";

import { cn } from "cn";
import { ArrowRight, Check, CircleCheck, FileText, Flag, Info, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GateKind, ReviewMode } from "@/lib/run-stream/contract";
import { DATASET, QUESTION } from "@/lib/run-stream/mock/scenario";

import { MODES, PIPELINE, STAGE_SHORT, STOP_INFO } from "./run-meta";

const VARIABLES: [string, string][] = [
  ["exam_score", "outcome"],
  ["sleep_hours", "exposure"],
  ["stress_level", "covariate"],
  ["study_hours", "covariate"],
  ["screen_time", "covariate"],
];
const STEPS = ["Question", "Data", "Your involvement"];
const ORDER: GateKind[] = ["framing", "hypotheses", "decision", "report", "publish"];

export function StopsPreview({ mode }: { mode: ReviewMode }) {
  const stops = [...MODES[mode].stops].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const perRound = stops.filter((k) => k === "hypotheses" || k === "decision").length;
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b className="font-semibold text-sm">Where this run stops for you</b>
        <span className="text-muted-foreground text-xs">
          {stops.length
            ? `${stops.length} stop${stops.length > 1 ? "s" : ""}${perRound ? `, plus ${perRound} more per extra round` : ""}`
            : "No stops"}
        </span>
      </div>
      <ol className="flex gap-1 pt-4">
        {PIPELINE.map((p) => {
          const on = stops.some((k) => STOP_INFO[k].stage === p.stage);
          return (
            <li key={p.stage} className="relative flex min-w-0 flex-1 flex-col gap-1.5">
              <motion.span
                className="absolute -top-4 -right-2 text-amber-500"
                initial={false}
                animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
              >
                <Flag className="size-3.5 fill-amber-500/25" />
              </motion.span>
              <i className="h-1 rounded-full bg-muted" />
              <span className="truncate text-[11px] text-muted-foreground">{STAGE_SHORT[p.stage]}</span>
            </li>
          );
        })}
      </ol>
      {stops.length ? (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {stops.map((k, i) => (
              <motion.li
                key={k}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-[20px_1fr] gap-2.5 text-sm"
              >
                <span className="grid size-5 place-items-center rounded-full bg-amber-500/15 font-mono font-semibold text-[11px] text-amber-800 dark:text-amber-300">
                  {i + 1}
                </span>
                <span>
                  <b className="font-medium">{STOP_INFO[k].title}</b>
                  <span className="block text-muted-foreground text-xs">
                    {STOP_INFO[k].where}. {STOP_INFO[k].what}
                  </span>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          The PI makes every call. You can still pause, watch, or read every decision in the activity log.
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Between stops the agents keep working. You can pause, watch, or leave; the run keeps going, and the sidebar
        shows when it needs you.
      </p>
    </div>
  );
}

export function StartRunDialog({
  open,
  onOpenChange,
  defaultMode,
  onStart,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  defaultMode: ReviewMode;
  onStart(mode: ReviewMode): void;
}) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [mode, setMode] = useState<ReviewMode>(defaultMode);
  const move = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setStep(0);
          setMode(defaultMode);
        }
      }}
    >
      <DialogContent className="flex max-h-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="gap-1 px-5.5 pt-5">
          <DialogTitle className="text-base">Start a research run</DialogTitle>
          <DialogDescription>
            Three choices. After that the agents work on their own and only stop where you tell them to.
          </DialogDescription>
          <ol className="mt-4 flex border-b">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={cn(
                  "relative flex flex-1 items-center gap-2 pb-3 text-[13px]",
                  i === step ? "font-medium text-foreground" : "text-muted-foreground",
                  i > step && "max-sm:[&>span:last-child]:hidden",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full border font-mono font-semibold text-[11px] transition-colors",
                    i < step && "border-foreground bg-foreground text-background",
                    i === step && "border-foreground",
                  )}
                >
                  {i < step ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span>{label}</span>
                <motion.span
                  className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-foreground"
                  initial={false}
                  animate={{ scaleX: i <= step ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </li>
            ))}
          </ol>
        </DialogHeader>
        <div className="min-h-[340px] overflow-y-auto overflow-x-hidden px-5.5 py-5">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -18 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4.5"
            >
              {step === 0 && (
                <>
                  <Field>
                    <FieldLabel>Research context</FieldLabel>
                    <div className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
                      <FileText className="size-4 text-muted-foreground" />
                      Version 3 · latest
                      <span className="ml-auto text-muted-foreground text-xs">saved Oct 2</span>
                    </div>
                    <FieldDescription>
                      A run always uses one saved version, so its results point back to the exact question.
                    </FieldDescription>
                  </Field>
                  <blockquote className="rounded-r-lg border-foreground border-l-[3px] bg-muted/60 px-4 py-3.5">
                    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Question</span>
                    <p className="font-(family-name:--font-lora) mt-1 text-[17px] leading-snug">{QUESTION}</p>
                  </blockquote>
                  <Field>
                    <FieldLabel>Variables in this context</FieldLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {VARIABLES.map(([name, role]) => (
                        <span
                          key={name}
                          className="inline-flex h-6.5 items-center gap-1.5 rounded-md border px-2 text-xs"
                        >
                          <code className="font-medium font-mono">{name}</code>
                          <span className="text-muted-foreground">{role}</span>
                        </span>
                      ))}
                    </div>
                  </Field>
                </>
              )}
              {step === 1 && (
                <>
                  <Field>
                    <FieldLabel htmlFor="mock-dataset">Dataset</FieldLabel>
                    <Select value="dataset" disabled>
                      <SelectTrigger id="mock-dataset" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="dataset">{DATASET.name} · 8 columns</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="mock-version">Dataset version</FieldLabel>
                    <Select value="v1" disabled>
                      <SelectTrigger id="mock-version" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="v1">v1 · as uploaded · 1,240 rows</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <p className="flex items-center gap-2 text-emerald-700 text-sm dark:text-emerald-300">
                    <CircleCheck className="size-4" />
                    All 5 context variables are columns in v1.
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border px-3.5 py-3 text-sm">
                    <Info className="mt-0.5 size-4 text-muted-foreground" />
                    <p>
                      <b className="font-semibold">The Steward checks the data first.</b> It fixes problems in a copy
                      and saves that as v2. v1 stays exactly as uploaded, so you can always compare.
                    </p>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <Field>
                    <FieldLabel>How often should Popper stop and ask you?</FieldLabel>
                    <RadioGroup
                      value={mode}
                      onValueChange={(v) => setMode(v as ReviewMode)}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {(Object.keys(MODES) as ReviewMode[]).map((key) => (
                        <label
                          key={key}
                          htmlFor={`mode-${key}`}
                          className={cn(
                            "grid cursor-pointer grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 rounded-xl border px-3.5 py-3 transition-[background-color,box-shadow,border-color] hover:bg-muted/60",
                            mode === key && "border-foreground ring-1 ring-foreground",
                          )}
                        >
                          <RadioGroupItem id={`mode-${key}`} value={key} className="row-span-2 mt-0.5" />
                          <span className="flex items-center gap-2 font-semibold text-sm">
                            {MODES[key].label}
                            {key === "copilot" && (
                              <span className="rounded-full bg-muted px-1.5 py-px font-medium text-[11px] text-muted-foreground">
                                Recommended
                              </span>
                            )}
                            <span className="ml-auto font-mono font-normal text-[11px] text-muted-foreground">
                              {MODES[key].stops.length
                                ? `${MODES[key].stops.length} stop${MODES[key].stops.length > 1 ? "s" : ""}+`
                                : "0 stops"}
                            </span>
                          </span>
                          <span className="text-muted-foreground text-xs leading-snug">{MODES[key].line}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </Field>
                  <StopsPreview mode={mode} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <DialogFooter className="m-0 flex-row items-center gap-2.5 border-t bg-muted/40 px-5.5 py-3.5 sm:justify-between">
          <Button variant="outline" onClick={() => (step === 0 ? onOpenChange(false) : move(step - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          <span className="ml-auto text-muted-foreground text-xs max-sm:hidden">Step {step + 1} of 3</span>
          {step < 2 ? (
            <Button onClick={() => move(step + 1)}>
              Next: {STEPS[step + 1]}
              <ArrowRight />
            </Button>
          ) : (
            <Button onClick={() => onStart(mode)}>
              <Play />
              Start research run
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
