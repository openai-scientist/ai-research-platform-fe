"use client";

import { cn } from "cn";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInfiniteDatasetVersions } from "@/hooks/use-datasets-query";
import { type DatasetItem, type DatasetVersionItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";

import { CONNECTION_PROVIDERS } from "./data-connections/connection-display";
import { formatSize, timeAgo } from "./dataset-format";
import { LoadMore } from "./workspace-ui";

/** What changed from the version before: rows gained or lost, columns added or dropped. */
function changes(version: DatasetVersionItem, previous?: DatasetVersionItem) {
  if (!previous) return [];
  const out: { text: string; tone: "up" | "down" }[] = [];
  const rows = version.row_count - previous.row_count;
  if (rows)
    out.push({
      text: `${rows > 0 ? "+" : "−"}${Math.abs(rows).toLocaleString("en-US")} rows`,
      tone: rows > 0 ? "up" : "down",
    });
  const before = new Set(previous.column_names);
  const after = new Set(version.column_names);
  for (const name of version.column_names) if (!before.has(name)) out.push({ text: `+ ${name}`, tone: "up" });
  for (const name of previous.column_names) if (!after.has(name)) out.push({ text: `− ${name}`, tone: "down" });
  return out;
}

function source(version: DatasetVersionItem) {
  const origin = version.source_type === "connection" ? version.source : null;
  return origin
    ? `Read from ${origin.connection_name} (${CONNECTION_PROVIDERS[origin.connection_kind].label})`
    : `Uploaded ${version.original_filename}`;
}

/** Every saved version, newest first. Picking one shows it in the page's preview. */
export function DatasetHistory({
  dataset,
  projectId,
  open,
  onOpenChange,
  viewingId,
  onView,
}: {
  dataset: DatasetItem;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewingId: string | undefined;
  onView: (version: DatasetVersionItem) => void;
}) {
  const query = useInfiniteDatasetVersions(projectId, dataset.id, { enabled: open });
  const versions = query.versions;
  const latestId = dataset.latest_version?.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>
            {dataset.latest_version
              ? `${dataset.latest_version.version_number} ${dataset.latest_version.version_number === 1 ? "version" : "versions"} of ${dataset.name}. Older versions are kept, so past research runs stay traceable.`
              : dataset.name}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {query.isPending && (
            <div className="flex flex-col gap-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
          {query.isError && (
            <Button variant="outline" className="m-2" onClick={() => void query.refetch()}>
              Reload versions
            </Button>
          )}
          <ol className="flex flex-col">
            {versions.map((version, index) => {
              const viewing = version.id === viewingId;
              const latest = version.id === latestId;
              const delta = changes(version, versions[index + 1]);
              const last = index === versions.length - 1;
              return (
                <li key={version.id} className="relative">
                  {/* The timeline rail joins each version to the one before it. */}
                  {!last && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-7 bottom-0 left-[1.4rem] z-[1] w-px bg-border"
                    />
                  )}
                  <div
                    className={cn(
                      "group relative flex gap-3 rounded-lg px-3 py-3 transition-colors",
                      viewing ? "bg-muted" : "hover:bg-muted/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onView(version)}
                      aria-current={viewing ? "true" : undefined}
                      aria-label={`Show version ${version.version_number} in the preview`}
                      className="absolute inset-0 cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-popover",
                        latest ? "bg-foreground" : "bg-muted-foreground/40",
                        viewing && "ring-muted",
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium font-mono text-sm">v{version.version_number}</span>
                        {latest && <span className="text-muted-foreground text-xs">Latest</span>}
                        {viewing && !latest && <span className="text-muted-foreground text-xs">In preview</span>}
                        <time
                          dateTime={version.created_at}
                          title={new Date(version.created_at).toLocaleString("en-US")}
                          className="ml-auto shrink-0 text-muted-foreground text-xs"
                        >
                          {timeAgo(version.created_at)}
                        </time>
                      </div>
                      <p className="truncate text-muted-foreground text-xs" title={source(version)}>
                        {source(version)}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {version.row_count.toLocaleString("en-US")} rows · {version.column_names.length} columns ·{" "}
                        {formatSize(version.size_bytes)}
                      </p>
                      {delta.length > 0 && (
                        <ul className="mt-0.5 flex flex-wrap gap-1" aria-label="Changes from the version before">
                          {delta.map((item) => (
                            <li
                              key={item.text}
                              className={cn(
                                "rounded px-1.5 py-px font-mono text-[11px]",
                                item.tone === "up"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                              )}
                            >
                              {item.text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          className="relative z-10 shrink-0 self-start text-muted-foreground hover:text-foreground"
                        >
                          <a
                            href={fetchDatasets.getVersionDownloadUrl(projectId, dataset.id, version.id)}
                            aria-label={`Download version ${version.version_number}`}
                          >
                            <Download />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download CSV</TooltipContent>
                    </Tooltip>
                  </div>
                </li>
              );
            })}
          </ol>
          <LoadMore visible={Boolean(query.hasNextPage)} pending={query.isFetching} onClick={query.loadMore} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
