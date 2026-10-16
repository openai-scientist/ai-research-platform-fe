import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_CONFIG } from "@/config/app-config";

/** The top bar pages (projects, review queue) while their content loads; the bar matches `TopBarShell`. */
export function TopBarSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-10 border-b bg-canvas/95 backdrop-blur supports-backdrop-filter:bg-canvas/80">
        <div className="mx-auto flex h-12 w-full max-w-screen-xl items-center justify-between gap-4 px-4 lg:px-6">
          <span className="flex items-center gap-2 font-semibold">
            <BrandMark className="size-5" />
            <span className="truncate">{APP_CONFIG.shortName}</span>
          </span>
          <div aria-hidden="true" className="flex items-center gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-xl flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
