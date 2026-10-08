"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import dynamic from "next/dynamic";

import { FileText, Grid2X2, List, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInfiniteProjectFiles } from "@/hooks/use-project-files-query";
import type { ProjectFileItem, ProjectFileKind } from "@/lib/api/services/fetch-project-files";

import { ProjectFilesView } from "./project-files-view";
import { PROJECT_FILE_ACCEPT, useProjectFileUpload } from "./use-project-file-upload";
import type { WorkspaceProps } from "./workspace-ui";

const ProjectFilePreview = dynamic(() => import("./project-file-preview"));

export function ProjectFilesSection({ project, canWrite, header }: WorkspaceProps & { header?: ReactNode }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [previewFile, setPreviewFile] = useState<ProjectFileItem | null>(null);
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [filters, setFilters] = useState({ q: "", kind: "all" as "all" | ProjectFileKind });
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useProjectFileUpload(project.id, canWrite);

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
  const filtered = Boolean(filters.q || filters.kind !== "all");
  const showReload = query.isError && files.length === 0;
  const showEmpty = !showReload && query.isSuccess && files.length === 0;
  const defaultEmptyDescription = canWrite
    ? "Drop files here or use Upload documents to add reference documents."
    : "Reference documents shared with this project will appear here.";
  const emptyDescription = filtered ? "Try a different filename or clear the filters." : defaultEmptyDescription;
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
    <section
      ref={sectionRef}
      tabIndex={-1}
      className="relative flex min-h-96 min-w-0 flex-col gap-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Project documents"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        {header}
        {canWrite && (
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={PROJECT_FILE_ACCEPT}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              disabled={upload.disabled}
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                event.target.value = "";
                void upload.uploadFiles(selected);
              }}
            />
            <Button disabled={upload.disabled} onClick={() => fileInput.current?.click()}>
              <Upload data-icon="inline-start" />
              Upload documents
            </Button>
          </>
        )}
      </div>
      {canWrite && (
        <p className="text-muted-foreground text-xs">
          Drop files anywhere to upload. PDF, CSV or Excel · Up to 50 MiB per file.
        </p>
      )}
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
        {showReload && (
          <Button
            variant="outline"
            className="self-start"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Reload documents
          </Button>
        )}
        {showEmpty && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>{filtered ? "No matching documents" : "No documents yet"}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {!showReload && !showEmpty && (
          <div className="flex min-w-0 flex-col gap-4">
            <ProjectFilesView
              projectId={project.id}
              files={files}
              view={view}
              canWrite={canWrite}
              pending={query.isPending}
              onPreview={(file, trigger) => {
                previewTriggerRef.current = trigger;
                setPreviewFile(file);
              }}
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
          </div>
        )}
      </div>
      {previewFile && (
        <ProjectFilePreview
          key={previewFile.id}
          projectId={project.id}
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          restoreFocus={() => {
            const trigger = previewTriggerRef.current;
            if (trigger?.isConnected) trigger.focus();
            else sectionRef.current?.focus();
          }}
        />
      )}
      {canWrite && upload.isDragging && (
        <Empty className="pointer-events-none absolute inset-0 border-2 border-primary bg-background/95" role="status">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Upload />
            </EmptyMedia>
            <EmptyTitle>Drop files to upload</EmptyTitle>
            <EmptyDescription>PDF, CSV or Excel · Up to 50 MiB per file.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
