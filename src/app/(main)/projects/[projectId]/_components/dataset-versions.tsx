"use client";

import { useState } from "react";

import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDatasetVersionMutation,
  useInfiniteDatasetVersions,
  useUpdateDatasetMutation,
} from "@/hooks/use-datasets-query";
import { type DatasetItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";

import { CsvFileInput } from "./csv-file-input";
import { DatasetCsvPreview } from "./dataset-csv-preview";
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
  const versions = useInfiniteDatasetVersions(projectId, dataset.id);
  const update = useUpdateDatasetMutation(projectId, dataset.id);
  const upload = useCreateDatasetVersionMutation(projectId, dataset.id);
  const [name, setName] = useState(dataset.name);
  const [description, setDescription] = useState(dataset.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const versionActions = canWrite && (
    <div className="flex flex-wrap items-center gap-2">
      <WorkspaceFormDialog
        title="Edit dataset"
        description="Update the dataset name and description."
        submitLabel="Save dataset"
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
      <WorkspaceFormDialog
        title="Upload new version"
        description="Add a CSV version while preserving previous versions."
        submitLabel="Upload new version"
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
      {!versions.versions.length && versionActions}
      <ListState
        pending={versions.isPending}
        failed={versions.isError}
        empty={!versions.versions.length}
        title="Versions"
        retry={versions.refetch}
      />
      {versions.versions.length > 0 && (
        <DataTable
          toolbar={versionActions}
          rows={versions.versions}
          getRowId={(version) => version.id}
          columns={[
            { id: "Version", label: "Version", hideable: false, cell: (version) => <>v{version.version_number}</> },
            { id: "File", label: "File", cell: (version) => <>{version.original_filename}</> },
            { id: "Rows", label: "Rows", cell: (version) => <>{version.row_count}</> },
            { id: "Columns", label: "Columns", cell: (version) => <>{version.column_names.length}</> },
            {
              id: "Actions",
              label: "Actions",
              align: "right" as const,
              cell: (version) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <DatasetCsvPreview projectId={projectId} datasetId={dataset.id} version={version} />
                  <Button asChild variant="outline" size="sm">
                    <a href={fetchDatasets.getVersionDownloadUrl(projectId, dataset.id, version.id)}>Download CSV</a>
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
      <LoadMore visible={Boolean(versions.hasNextPage)} pending={versions.isFetching} onClick={versions.loadMore} />
    </div>
  );
}
