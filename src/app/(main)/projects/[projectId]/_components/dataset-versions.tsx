"use client";

import { useState } from "react";

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useCreateDatasetVersionMutation, useInfiniteDatasetVersions } from "@/hooks/use-datasets-query";
import type { DatasetItem } from "@/lib/api/services/fetch-datasets";

import { CsvFileInput } from "./csv-file-input";
import { DatasetVersionOrigin } from "./data-connections/dataset-connection-source";
import { DatasetTable } from "./dataset-table";
import { DatasetVersionActions } from "./dataset-version-actions";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { LoadMore, perform, validateCsv } from "./workspace-ui";

export function DatasetVersions({
  dataset,
  projectId,
  canWrite,
}: {
  dataset: DatasetItem;
  projectId: string;
  canWrite: boolean;
}) {
  const versions = useInfiniteDatasetVersions(projectId, dataset.id);
  const upload = useCreateDatasetVersionMutation(projectId, dataset.id);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

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
      <DatasetTable
        title="Version history"
        description="Preview or download any saved CSV version."
        actions={versionActions}
        pending={versions.isPending}
        failed={versions.isError}
        onRetry={versions.refetch}
        hasMore={Boolean(versions.hasNextPage)}
        searchText={(version) => {
          const source = version.source?.source;
          const sourceLabel =
            source?.type === "table" ? `${source.schema}.${source.name}` : source ? "SELECT query" : "CSV upload";
          return `v${version.version_number} ${version.original_filename} ${version.source?.connection_name ?? ""} ${sourceLabel}`;
        }}
        rows={versions.versions}
        getRowId={(version) => version.id}
        columns={[
          {
            id: "Version",
            label: "Version",
            hideable: false,
            cell: (version) => <span className="font-medium">v{version.version_number}</span>,
          },
          {
            id: "File",
            label: "File",
            cell: (version) => <span className="font-medium">{version.original_filename}</span>,
          },
          { id: "Source", label: "Source", cell: (version) => <DatasetVersionOrigin version={version} /> },
          {
            id: "Rows",
            label: "Rows",
            cell: (version) => <span className="tabular-nums">{version.row_count.toLocaleString("en-US")}</span>,
          },
          {
            id: "Columns",
            label: "Columns",
            cell: (version) => <span className="tabular-nums">{version.column_names.length}</span>,
          },
          {
            id: "Actions",
            label: "Actions",
            align: "right" as const,
            cell: (version) => (
              <div className="flex flex-wrap justify-end gap-2">
                <DatasetVersionActions projectId={projectId} datasetId={dataset.id} version={version} />
              </div>
            ),
          },
        ]}
        footer={
          <LoadMore visible={Boolean(versions.hasNextPage)} pending={versions.isFetching} onClick={versions.loadMore} />
        }
      />
    </div>
  );
}
