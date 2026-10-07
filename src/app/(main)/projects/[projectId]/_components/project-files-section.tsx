"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { FileText, Grid2X2, List, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInfiniteProjectFiles } from "@/hooks/use-project-files-query";
import type { ProjectFileKind } from "@/lib/api/services/fetch-project-files";
import { ProjectRole, ProjectStatus } from "@/types/enums";

import { ProjectFilesView } from "./project-files-view";
import { UploadProjectFileDialog } from "./upload-project-file-dialog";
import type { WorkspaceProps } from "./workspace-ui";

export function ProjectFilesSection({ project, header }: WorkspaceProps & { header?: ReactNode }) {
  const canWrite =
    project.status !== ProjectStatus.Archived &&
    (project.my_role === ProjectRole.ProjectManager || project.my_role === ProjectRole.Researcher);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState({ q: "", kind: "all" as "all" | ProjectFileKind });
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = search.trim();
    if (q === filters.q) return;
    const timer = window.setTimeout(() => setFilters((current) => ({ ...current, q })), 350);
    return () => window.clearTimeout(timer);
  }, [search, filters.q]);

  const query = useInfiniteProjectFiles(project.id, {
    q: filters.q || undefined,
    kind: filters.kind === "all" ? undefined : filters.kind,
  });
  const files = query.files;
  const total = query.totalItems ?? files.length;
  const filtered = Boolean(filters.q || filters.kind !== "all");
  const { loadMore } = query;
  const canLoadMore = Boolean(query.hasNextPage && !query.isFetching && !query.isError);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !canLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [canLoadMore, loadMore]);

  const clearFilters = () => {
    setSearch("");
    setFilters({ q: "", kind: "all" });
  };

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        {header}
        {canWrite && <UploadProjectFileDialog projectId={project.id} canUpload={canWrite} />}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <InputGroup className="w-full sm:w-72">
              <InputGroupAddon align="inline-start">
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Search documents..."
                aria-label="Search documents by filename"
                maxLength={120}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputGroup>
            <Select
              value={filters.kind}
              onValueChange={(kind) => setFilters((current) => ({ ...current, kind: kind as "all" | ProjectFileKind }))}
            >
              <SelectTrigger aria-label="Filter documents by file type" className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All file types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {(search || filters.kind !== "all") && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
          <ToggleGroup
            className="ml-auto shrink-0"
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={view}
            onValueChange={(value) => {
              if (value === "grid" || value === "list") setView(value);
            }}
            aria-label="Document view"
          >
            <ToggleGroupItem value="grid">
              <Grid2X2 />
              Grid View
            </ToggleGroupItem>
            <ToggleGroupItem value="list">
              <List />
              List View
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {query.isError && files.length === 0 ? (
          <Button
            variant="outline"
            className="self-start"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Reload documents
          </Button>
        ) : query.isSuccess && files.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>{filtered ? "No matching documents" : "No documents yet"}</EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? "Try a different filename or clear the filters."
                  : "Reference documents shared with this project will appear here."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <ProjectFilesView
              projectId={project.id}
              files={files}
              view={view}
              canWrite={canWrite}
              pending={query.isPending}
            />
            <div ref={loadMoreRef} className="h-px w-full" aria-hidden="true" />
            {query.isFetchingNextPage && (
              <div role="status" className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Spinner aria-hidden="true" />
                Loading more documents…
              </div>
            )}
            {query.isError && files.length > 0 && (
              <Button
                variant="outline"
                className="self-center"
                disabled={query.isFetching}
                onClick={() => void (query.isFetchNextPageError ? loadMore() : query.refetch())}
              >
                {query.isFetchNextPageError ? "Retry loading more" : "Reload documents"}
              </Button>
            )}
            {files.length > 0 && (
              <p className="text-center text-muted-foreground text-sm tabular-nums">
                {files.length} of {total} {total === 1 ? "document" : "documents"}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
