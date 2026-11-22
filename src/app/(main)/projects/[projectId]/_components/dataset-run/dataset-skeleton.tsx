import type { ReactNode } from "react";

import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";

import styles from "./dataset-skeleton.module.css";

export function DatasetSkeleton({ className, scan = true }: { className?: string; scan?: boolean }) {
  return (
    <Skeleton
      aria-hidden="true"
      className={cn("relative animate-none overflow-hidden bg-muted-foreground/15", scan && styles.scan, className)}
    />
  );
}

/** Keeps the space for a result stable while the placeholder clears. */
export function DatasetReveal({ children, delay }: { children: ReactNode; delay?: number }) {
  if (delay === undefined) return children;
  const timing = { animationDelay: `${delay}ms` };
  return (
    <div className="relative min-w-0">
      <div className={styles.reveal} style={timing}>
        {children}
      </div>
      <div
        className={cn("pointer-events-none absolute inset-0 flex origin-left items-center", styles.clear)}
        style={timing}
      >
        <DatasetSkeleton className="h-3 w-32 max-w-full" />
      </div>
    </div>
  );
}
