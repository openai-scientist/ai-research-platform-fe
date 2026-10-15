"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { Download, History, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDatasetDetailQuery, useUpdateDatasetMutation } from "@/hooks/use-datasets-query";
import { adminKeys, projectKeys } from "@/lib/api/query-keys";
import { type DatasetItem, type DatasetVersionItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";

import { DatasetConnectionActions, DatasetConnectionSource } from "./data-connections/dataset-connection-source";
import { timeAgo } from "./dataset-format";
import { DatasetHistory } from "./dataset-history";
import { DatasetPreview, UploadVersionButton } from "./dataset-versions";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, perform, type WorkspaceProps } from "./workspace-ui";

function DatasetEditDialog({
  dataset,
  projectId,
  open,
  onOpenChange,
}: {
  dataset: DatasetItem;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateDatasetMutation(projectId, dataset.id);
  const [name, setName] = useState(dataset.name);
  const [description, setDescription] = useState(dataset.description ?? "");

  return (
    <WorkspaceFormDialog
      title="Edit dataset"
      description="Update the dataset name and description."
      submitLabel="Save dataset"
      open={open}
      onOpenChange={onOpenChange}
      showTrigger={false}
      pending={update.isPending}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim()) {
          toast.error("Dataset name is required.");
          return;
        }
        return Boolean(
          await perform(
            () => update.mutateAsync({ name: name.trim(), description: description.trim() }),
            "Dataset saved.",
          ),
        );
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="dataset-edit-name">Name</FieldLabel>
          <Input id="dataset-edit-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="dataset-edit-description">Description</FieldLabel>
          <Textarea
            id="dataset-edit-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </FieldGroup>
    </WorkspaceFormDialog>
  );
}

function HeaderIcon({
  label,
  destructive,
  onClick,
  children,
}: {
  label: string;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          className={cn("text-muted-foreground", destructive ? "hover:text-destructive" : "hover:text-foreground")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function DatasetDetails({ project, canWrite, datasetId }: WorkspaceProps & { datasetId: string }) {
  const query = useDatasetDetailQuery(project.id, datasetId);
  const dataset = query.data?.data;
  const latest = dataset?.latest_version;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<DatasetVersionItem | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  // An older version picked in the history, or else the latest.
  const shown = viewing ?? latest ?? null;

  async function remove(item: DatasetItem) {
    try {
      await fetchDatasets.remove(project.id, item.id);
    } catch (error) {
      toast.error(`Couldn't delete ${item.name}`, {
        description: error instanceof Error ? error.message : "Please try again.",
      });
      return;
    }
    toast.success("Dataset deleted.");
    router.push(`/projects/${project.id}/datasets`);
    await Promise.all(
      [projectKeys.detail(project.id), projectKeys.lists(), adminKeys.all].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbLink asChild>
              <Link
                prefetch={false}
                href={`/projects/${project.id}`}
                className="max-w-48 truncate"
                title={project.name}
              >
                {project.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link prefetch={false} href={`/projects/${project.id}/datasets`}>
                Datasets
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="max-w-48 truncate" title={dataset?.name}>
              {dataset?.name ?? "Dataset"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <ListState
        pending={query.isPending}
        failed={query.isError}
        empty={false}
        title="Dataset details"
        retry={query.refetch}
      />
      {dataset && (
        <>
          <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h1 className="min-w-0 break-words font-heading font-semibold text-xl">{dataset.name}</h1>
              <p className="text-muted-foreground text-sm tabular-nums">
                {latest ? (
                  <>
                    v{latest.version_number} · {latest.row_count.toLocaleString("en-US")} rows ·{" "}
                    {latest.column_names.length} columns
                    {latest.source_type === "upload" && " · CSV upload"} · updated{" "}
                    <time dateTime={dataset.updated_at} title={new Date(dataset.updated_at).toLocaleString("en-US")}>
                      {timeAgo(dataset.updated_at)}
                    </time>
                  </>
                ) : (
                  "No versions yet"
                )}
              </p>
              {dataset.description?.trim() && (
                <p className="mt-1 max-w-prose whitespace-pre-wrap break-words text-sm">{dataset.description.trim()}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canWrite && (
                <>
                  <HeaderIcon label="Edit name and description" onClick={() => setEditing(true)}>
                    <Pencil />
                  </HeaderIcon>
                  <HeaderIcon label="Delete dataset" destructive onClick={() => setRemoving(true)}>
                    <Trash2 />
                  </HeaderIcon>
                </>
              )}
              <Button variant="outline" onClick={() => setHistoryOpen(true)}>
                <History data-icon="inline-start" />
                History
              </Button>
              {shown && (
                <Button asChild variant="outline">
                  <a href={fetchDatasets.getVersionDownloadUrl(project.id, dataset.id, shown.id)}>
                    <Download data-icon="inline-start" />
                    {shown.id === latest?.id ? "Download CSV" : `Download v${shown.version_number}`}
                  </a>
                </Button>
              )}
              <DatasetConnectionActions dataset={dataset} projectId={project.id} canWrite={canWrite} />
              {canWrite && <UploadVersionButton dataset={dataset} projectId={project.id} />}
            </div>
          </header>
          {latest?.source_type === "connection" && <DatasetConnectionSource dataset={dataset} />}
          <DatasetPreview
            dataset={dataset}
            projectId={project.id}
            version={shown}
            onShowLatest={() => setViewing(null)}
          />
          <DatasetHistory
            dataset={dataset}
            projectId={project.id}
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            viewingId={shown?.id}
            onView={(version) => {
              setViewing(version.id === latest?.id ? null : version);
              setHistoryOpen(false);
            }}
          />
          {canWrite && (
            <DatasetEditDialog
              key={dataset.id}
              dataset={dataset}
              projectId={project.id}
              open={editing}
              onOpenChange={setEditing}
            />
          )}
          <ConfirmDialog
            open={removing}
            onOpenChange={setRemoving}
            title={`Delete ${dataset.name}?`}
            description="Every version and its file will be removed, and this can't be undone. If a research run has used this dataset, it is kept."
            confirmLabel="Delete"
            destructive
            onConfirm={() => void remove(dataset)}
          />
        </>
      )}
    </div>
  );
}
