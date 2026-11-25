"use client";

import { useEffect, useRef } from "react";

import Link from "next/link";

import { cn } from "cn";

import type { SettingsTab } from "./platform-settings-model";
import { TAB_TITLES } from "./settings-panes";

export const TAB_GROUPS: { label: string; tabs: SettingsTab[] }[] = [
  { label: "Limits", tabs: ["runs"] },
  { label: "Access", tabs: ["access"] },
  { label: "Operations", tabs: ["retention", "oversight"] },
];
export const TABS = TAB_GROUPS.flatMap((group) => group.tabs);

function TabLink({ id, active, changed }: { id: SettingsTab; active: boolean; changed: boolean }) {
  return (
    <Link
      href={`?tab=${id}`}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      {TAB_TITLES[id]}
      {changed && (
        <>
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
          <span className="sr-only">Unsaved changes</span>
        </>
      )}
    </Link>
  );
}

/** The settings tabs: grouped links on large screens, one scrolling row of links on phones, as in a project. */
export function SettingsNav({ tab, changed }: { tab: SettingsTab; changed: Set<SettingsTab> }) {
  const row = useRef<HTMLUListElement>(null);
  // Keep the open tab in view in the phone's scrolling row.
  useEffect(() => {
    const list = row.current;
    const link = list?.querySelector<HTMLElement>(`a[href="?tab=${tab}"]`);
    if (list && link && list.scrollWidth > list.clientWidth) {
      list.scrollTo({
        left: link.offsetLeft - 16,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    }
  }, [tab]);

  return (
    <nav aria-label="Platform settings" className="min-w-0">
      <ul ref={row} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
        {TABS.map((id) => (
          <li key={id}>
            <TabLink id={id} active={tab === id} changed={changed.has(id)} />
          </li>
        ))}
      </ul>
      <div className="sticky top-[calc(var(--dashboard-header-height)+1.5rem)] hidden flex-col gap-5 lg:flex">
        {TAB_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-2.5 pb-1 font-semibold text-foreground text-xs uppercase tracking-wide">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {group.tabs.map((id) => (
                <li key={id}>
                  <TabLink id={id} active={tab === id} changed={changed.has(id)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
