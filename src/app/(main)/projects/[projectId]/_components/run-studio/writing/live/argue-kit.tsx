"use client";
"use no memo";

/* ===== What the two Argue screens share: the card, the section header, the avatars of the debate ===== */

import type { ReactNode } from "react";

import { AGENTS } from "../data/meta";
import { cn, Icon } from "../lib";

/** A card of the screen: neutral surface, a thin ring; its header carries the padding of its own row. */
export const CARD = "min-w-0 overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10";

/** A section's header: its icon and title, one plain line on what it is for, and its counts on the right. */
export function SectionHead({
  icon,
  title,
  purpose,
  aside,
  className,
  big,
}: {
  icon: string;
  title: ReactNode;
  purpose?: ReactNode;
  aside?: ReactNode;
  className?: string;
  /** A card's title rather than a section's: 15 px. */
  big?: boolean;
}) {
  return (
    <header className={cn("flex flex-wrap items-start gap-x-2.5 gap-y-2 border-b px-4 py-3", className)}>
      <Icon n={icon} className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground", big && "mt-[3px]")} />
      <div className="min-w-0 flex-1 basis-48">
        <h3 className={cn("font-semibold leading-5", big ? "text-[15px] leading-[22px]" : "text-sm")}>{title}</h3>
        {purpose && <p className="text-pretty text-muted-foreground text-xs leading-snug">{purpose}</p>}
      </div>
      {aside != null && (
        <div className="ml-auto flex shrink-0 items-center gap-2 text-muted-foreground text-xs tabular-nums">
          {aside}
        </div>
      )}
    </header>
  );
}

/* ---------- who speaks in the debate: one avatar style, coloured by role ---------- */
/** The researcher's seat: in a guided run, you may raise objections of your own, argued like a critic's. */
export const YOU = "you";
/** The role group of a speaker: the Proponent, the four critics, the Judge, the record (code), or you. */
export const ROLE_OF: Record<string, "proponent" | "critic" | "judge" | "record" | "researcher"> = {
  aa: "proponent",
  qm: "critic",
  qs: "critic",
  qx: "critic",
  qo: "critic",
  jd: "judge",
  code: "record",
  [YOU]: "researcher",
};
export const ROLE_TEXT: Record<string, string> = {
  proponent: "text-blue-700 dark:text-blue-300",
  critic: "text-orange-700 dark:text-orange-300",
  judge: "text-stone-700 dark:text-stone-300",
  record: "text-muted-foreground",
  researcher: "text-foreground",
};
export const roleText = (a: string) => ROLE_TEXT[ROLE_OF[a] ?? "record"];
/** A speaker's name: the agent's, or "You". */
export const seatName = (a: string) => (a === YOU ? "You" : (AGENTS[a]?.name ?? a));
/** A speaker's avatar: the same neutral disc for everyone, the initials in the colour of the role; yours is ringed. */
export function RoleAvatar({
  a,
  size = "md",
  className,
}: {
  a: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const you = a === YOU;
  return (
    <span
      title={seatName(a)}
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-full font-semibold ring-inset",
        you ? "bg-background ring-[1.5px] ring-foreground/60" : "bg-muted ring-1 ring-foreground/10",
        roleText(a),
        size === "sm" && (you ? "size-5 text-[7.5px]" : "size-5 text-[9px]"),
        size === "md" && (you ? "size-7 text-[9.5px]" : "size-7 text-[10.5px]"),
        size === "lg" && "size-9 text-xs",
        className,
      )}
    >
      {you ? "You" : (AGENTS[a]?.initials ?? "?")}
    </span>
  );
}
