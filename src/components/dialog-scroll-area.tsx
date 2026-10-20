"use client";

import type { ComponentProps } from "react";

import { cn } from "cn";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type DialogScrollAreaProps = ComponentProps<typeof ScrollArea> & {
  contentClassName?: string;
  contentLabel?: string;
  horizontal?: boolean;
};

export function DialogScrollArea({
  children,
  className,
  contentClassName,
  contentLabel,
  horizontal = false,
  ...props
}: DialogScrollAreaProps) {
  return (
    <ScrollArea
      {...props}
      className={cn(
        "grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden",
        "[&>[data-orientation=vertical]]:w-1.5 [&>[data-slot=scroll-area-viewport]]:min-h-0",
        "[&>[data-slot=scroll-area-viewport]>div]:block! [&>[data-slot=scroll-area-viewport]]:overscroll-contain",
        horizontal && "[&_[data-slot=table-container]]:overflow-visible",
        className,
      )}
    >
      <section
        aria-label={contentLabel}
        tabIndex={contentLabel ? 0 : undefined}
        className={cn(
          "min-w-0 p-1 pr-3 pb-3",
          contentLabel && "outline-none focus-visible:ring-2 focus-visible:ring-ring",
          contentClassName,
        )}
      >
        {children}
      </section>
      {horizontal && <ScrollBar orientation="horizontal" />}
    </ScrollArea>
  );
}
