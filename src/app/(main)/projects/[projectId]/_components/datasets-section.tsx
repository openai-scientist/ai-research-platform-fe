"use client";

import { useState } from "react";

import Link from "next/link";

import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDatasetMutation, useInfiniteDatasets } from "@/hooks/use-datasets-query";

import { CsvFileInput } from "./csv-file-input";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, LoadMore, perform, validateCsv, type WorkspaceProps } from "./workspace-ui";

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
          rows={query.datasets}
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
                  <Button asChild variant="outline" size="sm">
                    <Link prefetch={false} href={`/projects/${project.id}/datasets/${dataset.id}`}>
                      Details & versions
                    </Link>
                  </Button>
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
