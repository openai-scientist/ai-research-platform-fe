"use client";

import Link from "next/link";

import { cn } from "cn";
import { Ban, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { Readiness } from "./run-readiness";

/** The id the start dialog's "See what's missing" link scrolls to. */
export const READINESS_PANEL_ID = "run-readiness";

/** Brings the panel into view and moves focus to it, for keyboard and screen reader users. */
export function focusReadinessPanel() {
  const panel = document.getElementById(READINESS_PANEL_ID);
  if (!panel) return;
  panel.scrollIntoView({ block: "center", behavior: "smooth" });
  panel.focus({ preventScroll: true });
}

/**
 * What stands between the person and a run, next to the Start button: only the items that need action, one line each.
 * Nothing shows when nothing needs action; "ready" and "coming soon" items are left out.
 */
export function RunReadinessPanel({ readiness, className }: { readiness: Readiness; className?: string }) {
  const rows = readiness.rows.filter((row) => row.status === "blocked" || row.status === "attention");
  if (readiness.checking) {
    return (
      <div
        role="status"
        aria-label="Checking what a run needs"
        className={cn("rounded-xl border bg-card p-3", className)}
      >
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
    );
  }
  if (!rows.length) return null;
  return (
    <section
      id={READINESS_PANEL_ID}
      tabIndex={-1}
      aria-label="Before you run"
      className={cn(
        "min-w-0 rounded-xl border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <h3 className="px-3.5 pt-3 font-semibold text-sm">Before you run</h3>
      <ul aria-live="polite" className="divide-y">
        {rows.map((row) => {
          const Icon = row.status === "blocked" ? Ban : TriangleAlert;
          return (
            <li
              key={row.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 px-3.5 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <Icon
                aria-hidden
                className={cn(
                  "size-4",
                  row.status === "blocked" ? "text-destructive" : "text-amber-600 dark:text-amber-400",
                )}
              />
              <p className="min-w-0 text-sm leading-snug">
                <span className="font-medium">{row.title}</span>
                <Badge
                  variant={row.status === "blocked" ? "destructive" : "outline"}
                  className="mx-1.5 whitespace-nowrap"
                >
                  {row.status === "blocked" ? "Blocked" : "Needs attention"}
                </Badge>
                <span className="text-muted-foreground text-xs">{row.reason}</span>
              </p>
              {row.actions.length > 0 && (
                <div className="col-start-2 flex flex-wrap gap-2 sm:col-start-3">
                  {row.actions.map((action, index) => (
                    <Button
                      key={action.href}
                      asChild
                      size="sm"
                      variant={index === 0 && row.status === "blocked" ? "default" : "outline"}
                      className="whitespace-nowrap"
                    >
                      <Link href={action.href}>{action.label}</Link>
                    </Button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
