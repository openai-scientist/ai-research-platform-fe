"use client";

import { useState } from "react";

import { Download, History } from "lucide-react";

import { DialogScrollArea } from "@/components/dialog-scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCreateDatasetVersionMutation, useInfiniteDatasetVersions } from "@/hooks/use-datasets-query";
import { type DatasetItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";

import { CsvFileInput } from "./csv-file-input";
import { DatasetConnectionActions, DatasetVersionOrigin } from "./data-connections/dataset-connection-source";
import { DatasetCsvPreview } from "./dataset-csv-preview";
import { DatasetVersionActions } from "./dataset-version-actions";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, LoadMore, perform, validateCsv } from "./workspace-ui";

export function DatasetVersions({
  dataset,
  projectId,
  canWrite,
}: {
  dataset: DatasetItem;
  projectId: string;
  canWrite: boolean;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const versions = useInfiniteDatasetVersions(projectId, dataset.id, { enabled: historyOpen });
  const upload = useCreateDatasetVersionMutation(projectId, dataset.id);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const latest = dataset.latest_version;

  const versionActions = canWrite && (
    <div className="flex flex-wrap items-center gap-2">
      <WorkspaceFormDialog
        title="Upload new version"
        description="Add a CSV version while preserving previous versions."
        submitLabel="Upload new version"
        triggerVariant="default"
        pending={upload.isPending}
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (!validateCsv(file)) return;
          if (await perform(() => upload.mutateAsync(file), "Dataset version uploaded.")) {
            setFile(null);
            setFileKey((key) => key + 1);
            return true;
          }
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="dataset-version-file">New version</FieldLabel>
            <CsvFileInput key={fileKey} id="dataset-version-file" file={file} onChange={setFile} />
            <FieldDescription>CSV, UTF-8, up to 50 MiB. Previous versions are preserved.</FieldDescription>
          </Field>
        </FieldGroup>
      </WorkspaceFormDialog>
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {versionActions}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <DatasetConnectionActions dataset={dataset} projectId={projectId} canWrite={canWrite} />
          {latest && (
            <Button asChild variant="outline">
              <a href={fetchDatasets.getVersionDownloadUrl(projectId, dataset.id, latest.id)}>
                <Download data-icon="inline-start" />
                Download CSV
              </a>
            </Button>
          )}
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="outline" aria-label="Version history" title="Version history">
                    <History data-icon="inline-start" />
                    History
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Version history</TooltipContent>
            </Tooltip>
            <DialogContent className="flex max-h-[85dvh] min-w-0 flex-col gap-4 overflow-hidden sm:max-w-2xl">
              <DialogHeader className="shrink-0 pr-8">
                <DialogTitle>Version history</DialogTitle>
                <DialogDescription className="break-words">{dataset.name}</DialogDescription>
              </DialogHeader>
              <DialogScrollArea contentLabel="Saved dataset versions" className="max-h-[60dvh]">
                <div className="flex min-w-0 flex-col gap-3">
                  <ListState
                    pending={versions.isPending && !versions.versions.length}
                    failed={versions.isError}
                    empty={!versions.isPending && !versions.isError && !versions.versions.length}
                    title="Dataset versions"
                    retry={versions.refetch}
                  />
                  <ul className="flex min-w-0 flex-col gap-3">
                    {versions.versions.map((version) => (
                      <li key={version.id} className="min-w-0">
                        <Card size="sm">
                          <CardHeader className="min-w-0">
                            <CardTitle className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span>v{version.version_number}</span>
                              <span className="min-w-0 break-words">{version.original_filename}</span>
                              {version.id === latest?.id && (
                                <span className="font-normal text-muted-foreground text-xs">Latest</span>
                              )}
                            </CardTitle>
                            <CardDescription className="tabular-nums">
                              {version.row_count.toLocaleString("en-US")} rows · {version.column_names.length} columns
                            </CardDescription>
                            <CardAction>
                              <DatasetVersionActions projectId={projectId} datasetId={dataset.id} version={version} />
                            </CardAction>
                          </CardHeader>
                          <CardContent className="min-w-0">
                            <DatasetVersionOrigin version={version} compact />
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                  <LoadMore
                    visible={Boolean(versions.hasNextPage)}
                    pending={versions.isFetching}
                    onClick={versions.loadMore}
                  />
                </div>
              </DialogScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {latest ? (
        <DatasetCsvPreview key={latest.id} projectId={projectId} datasetId={dataset.id} version={latest} inline />
      ) : (
        <ListState pending={false} failed={false} empty title="Dataset versions" retry={() => undefined} />
      )}
    </div>
  );
}
