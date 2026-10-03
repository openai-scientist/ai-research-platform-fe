"use client";

import { useState } from "react";

import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDatasetMutation,
  useCreateDatasetVersionMutation,
  useInfiniteDatasets,
  useInfiniteDatasetVersions,
  useUpdateDatasetMutation,
} from "@/hooks/use-datasets-query";
import { type DatasetItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";

import { CsvFileInput } from "./csv-file-input";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, LoadMore, perform, validateCsv, type WorkspaceProps } from "./workspace-ui";

function DatasetDetails({
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
    <>
      <DialogHeader className="shrink-0 pr-10">
        <DialogTitle className="break-words">{dataset.name}</DialogTitle>
        <DialogDescription>Dataset details and version history.</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-1">
        <p className="whitespace-pre-wrap break-words text-muted-foreground text-sm">
          {dataset.description?.trim() ? dataset.description : "No description."}
        </p>
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
            rows={versions.versions ?? []}
            getRowId={(version) => version.id}
            columns={[
              { id: "Version", label: "Version", hideable: false, cell: (version) => <>v{version.version_number}</> },
              { id: "File", label: "File", cell: (version) => <>{version.original_filename}</> },
              { id: "Rows", label: "Rows", cell: (version) => <>{version.row_count}</> },
              { id: "Columns", label: "Columns", cell: (version) => <>{version.column_names.length}</> },
              {
                id: "Download",
                label: "Download",
                align: "right" as const,
                cell: (version) => (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <a href={fetchDatasets.getVersionDownloadUrl(projectId, dataset.id, version.id)}>Download CSV</a>
                    </Button>
                  </>
                ),
              },
            ]}
          />
        )}
        <LoadMore visible={Boolean(versions.hasNextPage)} pending={versions.isFetching} onClick={versions.loadMore} />
      </div>
    </>
  );
}

function DatasetDetailsDialog({
  dataset,
  projectId,
  canWrite,
}: {
  dataset: DatasetItem;
  projectId: string;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Details & versions
        </Button>
      </DialogTrigger>
      <DialogContent className="management-surface flex max-h-[80dvh] flex-col gap-6 overflow-clip sm:max-w-3xl">
        {open && <DatasetDetails dataset={dataset} projectId={projectId} canWrite={canWrite} />}
      </DialogContent>
    </Dialog>
  );
}

export function DatasetsSection({ project, canWrite }: WorkspaceProps) {
  const query = useInfiniteDatasets(project.id);
  const upload = useCreateDatasetMutation(project.id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const uploadAction = canWrite && (
    <WorkspaceFormDialog
      title="Upload dataset"
      triggerVariant="default"
      description="Add a CSV dataset to this workspace."
      submitLabel="Upload dataset"
      pending={upload.isPending}
      openOnHash="upload-dataset"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim()) {
          toast.error("Dataset name is required.");
          return;
        }
        if (!validateCsv(file)) return;
        const result = await perform(
          () => upload.mutateAsync({ name: name.trim(), description, file }),
          "Dataset uploaded.",
        );
        if (result) {
          setName("");
          setDescription("");
          setFile(null);
          setFileKey((key) => key + 1);
          return true;
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="dataset-name">Dataset name</FieldLabel>
          <Input
            id="dataset-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Folding assays"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dataset-description">Description</FieldLabel>
          <Textarea
            id="dataset-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dataset-file">CSV file</FieldLabel>
          <CsvFileInput key={fileKey} id="dataset-file" file={file} onChange={setFile} />
          <FieldDescription>UTF-8 CSV with a header and at least one data row. Maximum 50 MiB.</FieldDescription>
        </Field>
      </FieldGroup>
    </WorkspaceFormDialog>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!query.datasets.length && <div className="flex justify-end">{uploadAction}</div>}
      <ListState
        pending={query.isPending}
        failed={query.isError}
        empty={!query.datasets.length}
        title="Datasets"
        retry={query.refetch}
      />
      {query.datasets.length > 0 && (
        <DataTable
          toolbar={<div className="flex justify-end">{uploadAction}</div>}
          rows={query.datasets ?? []}
          getRowId={(dataset) => dataset.id}
          columns={[
            { id: "Name", label: "Name", hideable: false, cell: (dataset) => <>{dataset.name}</> },
            {
              id: "Version",
              label: "Version",
              cell: (dataset) => <>{dataset.latest_version?.version_number ?? "—"}</>,
            },
            { id: "Rows", label: "Rows", cell: (dataset) => <>{dataset.latest_version?.row_count ?? "—"}</> },
            {
              id: "Actions",
              label: "Actions",
              align: "right" as const,
              cell: (dataset) => (
                <div className="flex justify-end">
                  <DatasetDetailsDialog dataset={dataset} projectId={project.id} canWrite={canWrite} />
                </div>
              ),
            },
          ]}
        />
      )}
      <LoadMore visible={Boolean(query.hasNextPage)} pending={query.isFetching} onClick={query.loadMore} />
    </div>
  );
}
