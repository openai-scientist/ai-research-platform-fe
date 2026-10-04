"use client";

import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useDatasetDetailQuery } from "@/hooks/use-datasets-query";

import { DatasetVersions } from "./dataset-versions";
import { ListState, type WorkspaceProps } from "./workspace-ui";

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
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="break-words font-heading text-3xl tracking-tight">{dataset.name}</h1>
            <p className="max-w-3xl whitespace-pre-wrap break-words text-muted-foreground text-sm">
              {dataset.description?.trim() || "No description provided."}
            </p>
            {latest && (
              <p className="text-muted-foreground text-sm">
                Latest version: v{latest.version_number} · {latest.row_count.toLocaleString()} rows ·{" "}
                {latest.column_names.length} columns
              </p>
            )}
          </div>
          <section aria-labelledby="dataset-versions" className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="dataset-versions" className="font-medium">
                Version history
              </h2>
              <p className="text-muted-foreground text-sm">Preview or download any saved CSV version.</p>
            </div>
            <DatasetVersions key={dataset.id} dataset={dataset} projectId={project.id} canWrite={canWrite} />
          </section>
        </>
      )}
    </div>
  );
}
