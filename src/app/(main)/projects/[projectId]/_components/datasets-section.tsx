"use client";

import { useState } from "react";

import Link from "next/link";

import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDatasetMutation, useInfiniteDatasets } from "@/hooks/use-datasets-query";

import { CsvFileInput } from "./csv-file-input";
import { DatasetTable } from "./dataset-table";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { LoadMore, perform, validateCsv, type WorkspaceProps } from "./workspace-ui";

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
      <DatasetTable
        title="Dataset library"
        description="Manage the datasets and versions used by this project's research."
        pending={query.isPending}
        failed={query.isError}
        onRetry={query.refetch}
        hasMore={Boolean(query.hasNextPage)}
        searchText={(dataset) => `${dataset.name} ${dataset.description ?? ""}`}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {canWrite && (
              <Button asChild variant="outline">
                <Link href={`/projects/${project.id}/connections`}>Import from database</Link>
              </Button>
            )}
            {uploadAction}
          </div>
        }
        rows={query.datasets}
        getRowId={(dataset) => dataset.id}
        columns={[
          {
            id: "Name",
            label: "Name",
            hideable: false,
            cell: (dataset) => (
              <div className="flex flex-col gap-1">
                <Link
                  prefetch={false}
                  href={`/projects/${project.id}/datasets/${dataset.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {dataset.name}
                </Link>
                {dataset.description?.trim() && (
                  <span className="max-w-80 truncate text-muted-foreground text-xs" title={dataset.description}>
                    {dataset.description}
                  </span>
                )}
              </div>
            ),
          },
          {
            id: "Version",
            label: "Version",
            cell: (dataset) => (
              <span className="font-medium">
                {dataset.latest_version ? `v${dataset.latest_version.version_number}` : "—"}
              </span>
            ),
          },
          {
            id: "Rows",
            label: "Rows",
            cell: (dataset) => (
              <span className="tabular-nums">{dataset.latest_version?.row_count.toLocaleString("en-US") ?? "—"}</span>
            ),
          },
          {
            id: "Actions",
            label: "Actions",
            align: "right" as const,
            cell: (dataset) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${dataset.name}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link prefetch={false} href={`/projects/${project.id}/datasets/${dataset.id}`}>
                          Details & versions
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]}
        footer={<LoadMore visible={Boolean(query.hasNextPage)} pending={query.isFetching} onClick={query.loadMore} />}
      />
    </div>
  );
}
