import { cn } from "cn";
import { CircleCheck, CircleDashed, CircleX, type LucideIcon, Star, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Expectation } from "@/lib/api/services/fetch-writing-bank";

import { EXPECTATION_LABELS, humanize, KIND_LABELS } from "./writing-bank-format";

/** One colour meaning across the Writing Bank: green ok, amber look, red blocked, grey off. */
export type Tone = "ok" | "look" | "blocked" | "off";

const TONES: Record<Tone, { className: string; icon: LucideIcon }> = {
  ok: { className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: CircleCheck },
  look: { className: "bg-amber-500/10 text-amber-800 dark:text-amber-300", icon: TriangleAlert },
  blocked: { className: "bg-destructive/10 text-destructive", icon: CircleX },
  off: { className: "bg-muted text-muted-foreground", icon: CircleDashed },
};

export function ToneBadge({
  tone,
  children,
  className,
}: {
  readonly tone: Tone;
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  const { className: toneClass, icon: Icon } = TONES[tone];
  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", toneClass, className)}>
      <Icon />
      {children}
    </Badge>
  );
}

const ENTRY_TONES: Record<string, Tone> = { approved: "ok", draft: "look", deprecated: "off", retired: "off" };

/** The bank's review status of a journal or a research context. */
export function EntryStatusBadge({ status }: { readonly status: string }) {
  return <ToneBadge tone={ENTRY_TONES[status] ?? "look"}>{humanize(status)}</ToneBadge>;
}

/**
 * How firmly the bank expects a move or a step, and how firmly a venue asks for something, in the theme's own
 * colours: a must is filled, the usual is grey, a choice is outlined, a field-dependent one is dashed. Green, amber
 * and red stay for status.
 */
const STRENGTH_CLASSES = {
  strong: "border-transparent bg-primary font-medium text-primary-foreground",
  medium: "border-border bg-muted text-foreground",
  muted: "border-border bg-background text-muted-foreground",
  dashed: "border-dashed border-muted-foreground/60 text-muted-foreground",
} as const;

/** What kind of venue a journal is, the same colour on every screen. */
const KIND_CLASSES: Record<string, string> = {
  journal: "border-transparent bg-sky-500/10 text-sky-800 dark:text-sky-300",
  conference: "border-border bg-background text-foreground",
  generic_profile: "border-transparent bg-muted text-muted-foreground",
};

export function KindBadge({ kind }: { readonly kind: string }) {
  return (
    <Badge variant="outline" className={KIND_CLASSES[kind] ?? KIND_CLASSES.generic_profile}>
      {KIND_LABELS[kind as keyof typeof KIND_LABELS] ?? humanize(kind)}
    </Badge>
  );
}

/** Whether a research context was written for this journal or is a general one that fits it. */
export function ScopeBadge({ scope }: { readonly scope: string }) {
  return scope === "journal" ? (
    <Badge variant="outline" className={KIND_CLASSES.journal}>
      For this journal
    </Badge>
  ) : (
    <Badge variant="outline" className={KIND_CLASSES.generic_profile}>
      General
    </Badge>
  );
}

/** Whether users can pick something: green when they can, grey when they cannot. */
export function OfferedBadge({ offered }: { readonly offered: boolean }) {
  return <ToneBadge tone={offered ? "ok" : "off"}>{offered ? "Offered" : "Not offered"}</ToneBadge>;
}

const EXPECTATION_STRENGTH: Record<Expectation, keyof typeof STRENGTH_CLASSES> = {
  obligatory: "strong",
  conventional: "medium",
  optional: "muted",
  field_dependent: "dashed",
};

export function ExpectationBadge({ expectation }: { readonly expectation: Expectation }) {
  return (
    <Badge variant="outline" className={STRENGTH_CLASSES[EXPECTATION_STRENGTH[expectation] ?? "muted"]}>
      {EXPECTATION_LABELS[expectation] ?? humanize(expectation)}
    </Badge>
  );
}

const FORCE_STRENGTH: Record<string, keyof typeof STRENGTH_CLASSES> = {
  required: "strong",
  recommended: "medium",
  preferred: "medium",
  optional: "muted",
};

/** A venue requirement's or style's force. `excluded` rules a style out, so it reads as blocked. */
export function ForceBadge({ force }: { readonly force: string }) {
  if (force === "excluded") return <ToneBadge tone="blocked">Excluded</ToneBadge>;
  return (
    <Badge variant="outline" className={STRENGTH_CLASSES[FORCE_STRENGTH[force] ?? "muted"]}>
      {humanize(force)}
    </Badge>
  );
}

export function DefaultBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-transparent bg-primary/10 text-foreground dark:bg-primary/20">
      <Star className="fill-current" />
      Default
    </Badge>
  );
}
