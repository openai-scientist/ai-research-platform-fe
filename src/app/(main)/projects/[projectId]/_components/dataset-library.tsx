"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import {
  ArrowDown,
  ArrowUp,
  CircleSlash,
  CloudDownload,
  Eye,
  FileSpreadsheet,
  Search,
  SearchX,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import { type DatasetItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";

import { ConnectionLogo } from "./data-connections/connection-display";
import { formatSize, timeAgo } from "./dataset-format";
import { saveProjectFile } from "./project-file-download";

/** The provider's logo for data read from a connection; a sheet icon for an uploaded file. */
function SourceIcon({ dataset }: { dataset: DatasetItem }) {
  const version = dataset.latest_version;
  if (version?.source) {
    return (
      <span title={`Imported from ${version.source.connection_name}`} className="[&_img]:size-5 [&_svg]:size-5">
        <ConnectionLogo kind={version.source.connection_kind} />
      </span>
    );
  }
  const excel = /\.xlsx?$/i.test(version?.original_filename ?? "");
  return (
    <FileSpreadsheet
      aria-label={excel ? "Excel file" : "CSV file"}
      className={cn("size-5", excel ? "text-green-700 dark:text-green-500" : "text-emerald-600 dark:text-emerald-400")}
    />
  );
}

function RowAction({
  label,
  onClick,
  href,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const className = cn("text-muted-foreground", destructive ? "hover:text-destructive" : "hover:text-foreground");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button asChild variant="ghost" size="icon-sm" className={className} aria-label={label}>
            <Link prefetch={false} href={href}>
              {children}
            </Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            className={className}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            {children}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function DatasetLibrary({
  projectId,
  datasets,
  canWrite,
  pending,
  footer,
}: {
  projectId: string;
  datasets: readonly DatasetItem[];
  canWrite: boolean;
  pending: boolean;
  footer?: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState<DatasetItem[] | null>(null);

  const term = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const shown = term
      ? datasets.filter((dataset) => `${dataset.name} ${dataset.description ?? ""}`.toLowerCase().includes(term))
      : [...datasets];
    return shown.sort((a, b) => (newestFirst ? -1 : 1) * a.updated_at.localeCompare(b.updated_at));
  }, [datasets, term, newestFirst]);
  const picked = datasets.filter((dataset) => selected.has(dataset.id));
  const allShownPicked = rows.length > 0 && rows.every((dataset) => selected.has(dataset.id));
  const somePicked = rows.some((dataset) => selected.has(dataset.id));
  const busy = deleting || downloading.size > 0;

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function download(items: DatasetItem[]) {
    const files = items.filter((dataset) => dataset.latest_version);
    setDownloading(new Set(files.map((dataset) => dataset.id)));
    for (const [index, dataset] of files.entries()) {
      const version = dataset.latest_version;
      if (!version) continue;
      try {
        saveProjectFile(await fetchDatasets.downloadVersion(projectId, dataset.id, version.id), `${dataset.name}.csv`);
      } catch (error) {
        toast.error(`Couldn't download ${dataset.name}`, {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
      setDownloading((current) => {
        const next = new Set(current);
        next.delete(dataset.id);
        return next;
      });
      // Browsers drop downloads started back to back.
      if (index < files.length - 1) await pause(400);
    }
  }

  async function remove(items: DatasetItem[]) {
    setDeleting(true);
    let removed = 0;
    for (const dataset of items) {
      try {
        await fetchDatasets.remove(projectId, dataset.id);
        removed += 1;
        toggle(dataset.id, false);
      } catch (error) {
        toast.error(`Couldn't delete ${dataset.name}`, {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    }
    await Promise.all(
      [projectKeys.detail(projectId), projectKeys.lists(), adminKeys.all].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
    setDeleting(false);
    if (removed) toast.success(removed === 1 ? "Dataset deleted." : `${removed} datasets deleted.`);
  }

  const columns = canWrite ? 7 : 6;

  return (
    <section aria-label="Dataset library" className="flex min-w-0 flex-col rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 p-4">
        <InputGroup className="min-w-48 flex-1">
          <InputGroupAddon align="inline-start">
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            placeholder="Search datasets"
            aria-label="Search datasets"
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        <Button variant="outline" disabled={!picked.length || busy} onClick={() => void download(picked)}>
          {downloading.size > 0 ? <Spinner data-icon="inline-start" /> : <CloudDownload data-icon="inline-start" />}
          Download ({picked.length})
        </Button>
        {canWrite && (
          <Button variant="outline" disabled={!picked.length || busy} onClick={() => setConfirm(picked)}>
            {deleting ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
            Delete ({picked.length})
          </Button>
        )}
      </div>
      <Table className="[&_td]:px-4 [&_th]:px-4">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox
                aria-label="Select all datasets"
                disabled={!rows.length || busy}
                checked={allShownPicked || (somePicked && "indeterminate")}
                onCheckedChange={(checked) => {
                  for (const dataset of rows) toggle(dataset.id, checked === true);
                }}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden w-28 md:table-cell">Rows</TableHead>
            <TableHead className="hidden w-28 md:table-cell">Size</TableHead>
            <TableHead className="hidden w-20 sm:table-cell">Version</TableHead>
            <TableHead className="w-36">
              <button
                type="button"
                onClick={() => setNewestFirst((value) => !value)}
                className="-ml-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={
                  newestFirst ? "Updated, newest first. Sort oldest first" : "Updated, oldest first. Sort newest first"
                }
              >
                Updated
                {newestFirst ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
              </button>
            </TableHead>
            <TableHead className={cn("text-right", canWrite ? "w-32" : "w-24")}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending &&
            !datasets.length &&
            [0, 1, 2].map((i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell colSpan={columns}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {!pending && !rows.length && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns} className="py-14">
                <div className="flex flex-col items-center gap-3 text-center text-muted-foreground text-sm">
                  {term ? (
                    <SearchX className="size-8 text-muted-foreground/70" aria-hidden="true" />
                  ) : (
                    <CircleSlash className="size-8 text-muted-foreground/70" aria-hidden="true" />
                  )}
                  {term ? (
                    <>
                      <p>No datasets match “{search.trim()}”.</p>
                      <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    </>
                  ) : (
                    <p className="max-w-sm text-pretty">
                      No datasets yet.
                      {canWrite && " Drop a CSV file above or import one from a data connection to get started."}
                    </p>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
          {rows.map((dataset) => {
            const version = dataset.latest_version;
            const on = selected.has(dataset.id);
            const details = `/projects/${projectId}/datasets/${dataset.id}`;
            return (
              <TableRow key={dataset.id} data-state={on ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${dataset.name}`}
                    checked={on}
                    disabled={busy}
                    onCheckedChange={(checked) => toggle(dataset.id, checked === true)}
                  />
                </TableCell>
                <TableCell className="max-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center">
                      <SourceIcon dataset={dataset} />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <Link
                        prefetch={false}
                        href={details}
                        className="truncate font-medium underline-offset-4 hover:underline"
                        title={dataset.name}
                      >
                        {dataset.name}
                      </Link>
                      {dataset.description?.trim() && (
                        <span className="truncate text-muted-foreground text-xs" title={dataset.description}>
                          {dataset.description}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                  {version ? version.row_count.toLocaleString("en-US") : "—"}
                </TableCell>
                <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                  {version ? formatSize(version.size_bytes) : "—"}
                </TableCell>
                <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                  {version ? `v${version.version_number}` : "—"}
                </TableCell>
                <TableCell
                  className="text-muted-foreground"
                  title={new Date(dataset.updated_at).toLocaleString("en-US")}
                >
                  {timeAgo(dataset.updated_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <RowAction
                      label="Download CSV"
                      disabled={!version || busy}
                      onClick={() => void download([dataset])}
                    >
                      {downloading.has(dataset.id) ? <Spinner /> : <CloudDownload />}
                    </RowAction>
                    <RowAction label="View details and versions" href={details}>
                      <Eye />
                    </RowAction>
                    {canWrite && (
                      <RowAction label="Delete" destructive disabled={busy} onClick={() => setConfirm([dataset])}>
                        <Trash2 />
                      </RowAction>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {footer && <div className="border-t p-4">{footer}</div>}
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm?.length === 1 ? `Delete ${confirm[0].name}?` : `Delete ${confirm?.length ?? 0} datasets?`}
        description={
          confirm && confirm.length > 1
            ? `${confirm.map((dataset) => dataset.name).join(", ")}. Every version and its file will be removed, and this can't be undone. Datasets a research run has used are kept.`
            : "Every version and its file will be removed, and this can't be undone. If a research run has used this dataset, it is kept."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirm) void remove(confirm);
          setConfirm(null);
        }}
      />
    </section>
  );
}
