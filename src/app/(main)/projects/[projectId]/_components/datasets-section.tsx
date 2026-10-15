"use client";

import { Button } from "@/components/ui/button";
import { useInfiniteDatasets } from "@/hooks/use-datasets-query";

import { DatasetLibrary } from "./dataset-library";
import { DatasetUpload } from "./dataset-upload";
import { LoadMore, type WorkspaceProps } from "./workspace-ui";

export function DatasetsSection({ project, canWrite }: WorkspaceProps) {
  const query = useInfiniteDatasets(project.id);
  const hasDatasets = query.datasets.length > 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {canWrite && <DatasetUpload projectId={project.id} compact={hasDatasets || query.isPending} />}
      {query.isError && !hasDatasets ? (
        <Button variant="outline" className="self-start" onClick={() => void query.refetch()}>
          Reload datasets
        </Button>
      ) : (
        <DatasetLibrary
          projectId={project.id}
          datasets={query.datasets}
          canWrite={canWrite}
          pending={query.isPending}
          footer={
            query.hasNextPage ? <LoadMore visible pending={query.isFetching} onClick={query.loadMore} /> : undefined
          }
        />
      )}
    </div>
  );
}
