"use client";

import { useState } from "react";

import Link from "next/link";

import { toast } from "sonner";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDatasetDetailQuery, useUpdateDatasetMutation } from "@/hooks/use-datasets-query";
import type { DatasetItem } from "@/lib/api/services/fetch-datasets";

import { DatasetConnectionSource } from "./data-connections/dataset-connection-source";
import { DatasetVersions } from "./dataset-versions";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, perform, type WorkspaceProps } from "./workspace-ui";

function DatasetEditDialog({ dataset, projectId }: { dataset: DatasetItem; projectId: string }) {
  const update = useUpdateDatasetMutation(projectId, dataset.id);
  const [name, setName] = useState(dataset.name);
  const [description, setDescription] = useState(dataset.description ?? "");

  return (
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
  );
}

export function DatasetDetails({ project, canWrite, datasetId }: WorkspaceProps & { datasetId: string }) {
  const query = useDatasetDetailQuery(project.id, datasetId);
  const dataset = query.data?.data;
  const latest = dataset?.latest_version;

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
          <header className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h1 className="min-w-0 break-words font-heading font-semibold text-xl">{dataset.name}</h1>
                  {latest && (
                    <p className="text-muted-foreground text-sm">
                      <span className="sr-only">Latest dataset version: </span>v{latest.version_number} ·{" "}
                      {latest.row_count.toLocaleString()} rows · {latest.column_names.length} columns
                    </p>
                  )}
                </div>
                {dataset.description?.trim() && (
                  <p className="max-w-prose whitespace-pre-wrap break-words text-muted-foreground text-sm">
                    {dataset.description.trim()}
                  </p>
                )}
              </div>
              {canWrite && <DatasetEditDialog key={dataset.id} dataset={dataset} projectId={project.id} />}
            </div>
            <DatasetConnectionSource dataset={dataset} />
          </header>
          <section aria-label="Latest dataset version" className="min-w-0">
            <DatasetVersions key={dataset.id} dataset={dataset} projectId={project.id} canWrite={canWrite} />
          </section>
        </>
      )}
    </div>
  );
}
