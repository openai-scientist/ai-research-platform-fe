"use client";
"use no memo";

/* ===== A term of the trade with its definition on hover, so a newcomer reads the screens without a glossary page ===== */

import type { ReactNode } from "react";

import { cn } from "cn";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { GLOSSARY } from "./copy";

/**
 * `children` (or the term itself) underlined with a dotted line; hovering or focusing it shows the definition of `t`
 * from the glossary. A term the glossary does not hold renders as plain text.
 */
export function Term({ t, children, className }: { t: string; children?: ReactNode; className?: string }) {
  const key = t.toLowerCase();
  const def = GLOSSARY[key];
  const label = children ?? t;
  if (!def) return <>{label}</>;
  return (
    <HoverCard openDelay={150} closeDelay={60}>
      <HoverCardTrigger asChild>
        <span
          // biome-ignore lint/a11y/noNoninteractiveTabindex: the definition opens on keyboard focus too
          tabIndex={0}
          className={cn(
            "cursor-help underline decoration-foreground/30 decoration-dotted underline-offset-[3px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            className,
          )}
        >
          {label}
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-72 p-3 text-xs leading-relaxed">
        <b className="mb-0.5 block font-semibold text-[13px] capitalize">{t}</b>
        <span className="text-muted-foreground">{def}</span>
      </HoverCardContent>
    </HoverCard>
  );
}
