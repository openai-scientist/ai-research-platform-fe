import { useState } from "react";

import { cn } from "cn";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConnectionKind } from "@/lib/api/services/fetch-data-connections";

import { CONNECTION_PROVIDERS, ConnectionLogo } from "./connection-display";

const groups: { id: string; label: string; kinds: ConnectionKind[] }[] = [
  { id: "databases", label: "Databases", kinds: ["postgres", "mysql", "bigquery"] },
  { id: "google", label: "Google", kinds: ["google_sheets", "google_drive"] },
  { id: "time-series", label: "Time series", kinds: ["prometheus", "influxdb"] },
];

function matches(kind: ConnectionKind, term: string) {
  const provider = CONNECTION_PROVIDERS[kind];
  return [provider.label, provider.description, provider.category].join(" ").toLowerCase().includes(term);
}

export type ProviderCounts = Partial<Record<ConnectionKind, { total: number; failing: number }>>;

function statusLabel({ total, failing }: { total: number; failing: number }) {
  if (!failing) return `${total} connected`;
  if (total === 1) return "Needs attention";
  return `${failing} of ${total} ${failing === 1 ? "needs" : "need"} attention`;
}

/** Every provider stays in view: pick one to connect it, or jump to the connections it already has. */
export function ConnectionProviderPicker({
  counts,
  googleAvailable,
  disabled,
  onAdd,
  onShow,
}: {
  counts: ProviderCounts;
  googleAvailable: boolean;
  disabled: boolean;
  onAdd: (kind: ConnectionKind) => void;
  onShow: (kind: ConnectionKind) => void;
}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const shownGroups = groups.filter((group) => group.id !== "google" || googleAvailable);
  const all = shownGroups.flatMap((group) => group.kinds);
  const inTab = tab === "all" ? all : (shownGroups.find((group) => group.id === tab)?.kinds ?? all);
  const term = search.trim().toLowerCase();
  const kinds = inTab.filter((kind) => !term || matches(kind, term));
  // A search that misses in this tab may still match elsewhere.
  const elsewhere = term && !kinds.length ? all.filter((kind) => matches(kind, term)).length : 0;
  const tabs = [
    { id: "all", label: "All", count: all.length },
    ...shownGroups.map((group) => ({ id: group.id, label: group.label, count: group.kinds.length })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0 max-w-full overflow-x-auto overflow-y-hidden">
          <TabsList aria-label="Provider type">
            {tabs.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="px-2.5">
                {item.label}
                <span className="text-muted-foreground text-xs tabular-nums">{item.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="w-full sm:max-w-64">
          <InputGroupInput
            value={search}
            placeholder="Search providers"
            aria-label="Search providers"
            onChange={(event) => setSearch(event.target.value)}
          />
          <InputGroupAddon align="inline-start">
            <Search aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </div>
      {!kinds.length && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-muted-foreground text-sm">
          <span>
            No providers match “{search.trim()}”{elsewhere ? ` in ${tabs.find((item) => item.id === tab)?.label}` : ""}.
          </span>
          {elsewhere ? (
            <Button variant="outline" size="sm" onClick={() => setTab("all")}>
              Show {elsewhere} {elsewhere === 1 ? "match" : "matches"} in All
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              Clear search
            </Button>
          )}
        </div>
      )}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kinds.map((kind) => {
          const provider = CONNECTION_PROVIDERS[kind];
          const count = counts[kind];
          return (
            <li
              key={kind}
              className={cn(
                "group relative flex min-w-0 items-start gap-3.5 rounded-xl border bg-card p-4 transition-colors",
                disabled ? "opacity-60" : "hover:border-foreground/25 hover:bg-muted/40",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAdd(kind)}
                aria-label={count ? `Add another ${provider.label} connection` : `Connect ${provider.label}`}
                className="absolute inset-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="grid size-11 shrink-0 place-items-center [&_img]:size-11 [&_svg]:size-11">
                <ConnectionLogo kind={kind} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h4 className="font-medium text-sm">{provider.label}</h4>
                <p className="text-pretty text-muted-foreground text-xs leading-relaxed">{provider.description}</p>
                <div className="mt-2.5 flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  {count ? (
                    <button
                      type="button"
                      onClick={() => onShow(kind)}
                      title={`Show ${provider.label} connections`}
                      className={cn(
                        "relative z-10 inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full px-2 font-medium text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                        count.failing
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                          : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400",
                      )}
                    >
                      <span
                        className={cn("size-1.5 rounded-full", count.failing ? "bg-destructive" : "bg-emerald-500")}
                      />
                      {statusLabel(count)}
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-xs">Not connected</span>
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex items-center gap-1 font-medium text-xs transition-colors",
                      disabled ? "text-muted-foreground" : "text-foreground/70 group-hover:text-foreground",
                    )}
                  >
                    <Plus className="size-3.5" />
                    {count ? "Add another" : "Connect"}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
