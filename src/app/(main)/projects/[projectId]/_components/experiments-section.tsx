"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfiniteDatasets, useInfiniteDatasetVersions } from "@/hooks/use-datasets-query";
import { useInfiniteResearchContextVersions, useResearchContextQuery } from "@/hooks/use-research-context-query";
import { useCreateRunMutation, useInfiniteRuns } from "@/hooks/use-runs-query";
import { fetchResearchContext } from "@/lib/api/services/fetch-research-context";
import { blocksNewRun, isActiveRun, researchRunUrl } from "@/lib/research-workspace";

import { ExperimentTabs } from "./experiment-tabs";
import { ResearchContextSection } from "./research-context-section";
import { RunStudio } from "./run-studio/run-studio";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, LoadMore, perform, type WorkspaceProps } from "./workspace-ui";

// Until the backend streams run events, the runs tab plays a mock run. Set to "api" for the previous table.
const RUN_STREAM_SOURCE = process.env.NEXT_PUBLIC_RUN_STREAM_SOURCE === "api" ? "api" : "mock";

export function ExperimentsSection(props: WorkspaceProps) {
  const { project, canWrite } = props;
  const context = useResearchContextQuery(project.id);
  const contextPending = context.isPending;
  const datasets = useInfiniteDatasets(project.id);
  const runs = useInfiniteRuns(project.id, { refetchInterval: (query) => (query.state.error ? false : 15_000) });
  const contexts = useInfiniteResearchContextVersions(project.id);
  const [contextVersion, setContextVersion] = useState("latest");
  const [starting, setStarting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const create = useCreateRunMutation(project.id);
  const [datasetId, setDatasetId] = useState("");
  const versions = useInfiniteDatasetVersions(project.id, datasetId);
  const [versionId, setVersionId] = useState("");
  const [budget, setBudget] = useState("5.00");
  const [autoReview, setAutoReview] = useState(false);
  const selectedRun = searchParams.get("run");
  const selectRun = (id: string) => router.push(researchRunUrl(project.id, id));
  const activeRun = runs.runs.some((run) => isActiveRun(run.status));
  const startBlocked = blocksNewRun(project.status) || activeRun || !runs.isSuccess;
  useEffect(() => {
    if (selectedRun) {
      const hash = window.location.hash.slice(1);
      const section = ["artifacts", "comments", "frame-review"].includes(hash) ? hash : undefined;
      router.replace(
        `${researchRunUrl(project.id, selectedRun)}${section ? `/${section}` : ""}${section === "frame-review" ? "#frame-review" : ""}`,
      );
    }
  }, [project.id, selectedRun, router]);
  const activeTab = searchParams.get("tab") === "context" ? "context" : "runs";
  useEffect(() => {
    const openContext = () => {
      if (window.location.hash === "#research-context") {
        router.replace(`/projects/${project.id}/experiments?tab=context#research-context`, { scroll: false });
      }
    };
    openContext();
    window.addEventListener("hashchange", openContext);
    return () => window.removeEventListener("hashchange", openContext);
  }, [project.id, router]);
  if (selectedRun) return null;
  const startAction = canWrite && (
    <WorkspaceFormDialog
      title="Start a research run"
      triggerVariant="default"
      description="Select a dataset version and the saved research context for this run."
      openOnHash="start-run"
      submitLabel="Start research run"
      pending={starting || create.isPending}
      disabled={contextPending || startBlocked}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (startBlocked || starting) return;
        if (!context.data?.data) {
          toast.error("Save your research context before starting a run.");
          return;
        }
        if (!versionId || !versions.versions.some((version) => version.id === versionId)) {
          toast.error("Select a dataset version.");
          return;
        }
        if (!/^\d+(\.\d{1,2})?$/.test(budget) || Number(budget) <= 0) {
          toast.error("Run budget must be greater than $0, with at most two decimal places.");
          return;
        }
        setStarting(true);
        try {
          const selectedContext =
            contextVersion === "latest"
              ? (await fetchResearchContext.getLatest(project.id)).data
              : (await fetchResearchContext.getVersion(project.id, Number(contextVersion))).data;
          const selectedDataset = versions.versions.find((version) => version.id === versionId);
          const missing = Object.keys(selectedContext.front_matter?.variables ?? {}).filter(
            (column) => !selectedDataset?.column_names.includes(column),
          );
          if (missing.length) {
            toast.error(`These context variables are not in the selected dataset version: ${missing.join(", ")}.`);
            return;
          }
          const result = await perform(
            () =>
              create.mutateAsync({
                dataset_version_id: versionId,
                research_context_version: selectedContext.version_number,
                budget_usd: budget,
                auto_review: autoReview,
              }),
            "Research run created.",
          );
          if (result) {
            selectRun(result.data.id);
            return true;
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to load the selected context version.");
        } finally {
          setStarting(false);
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="run-dataset">Dataset</FieldLabel>
          <Select
            value={datasetId}
            onValueChange={(id) => {
              setDatasetId(id);
              setVersionId("");
            }}
          >
            <SelectTrigger id="run-dataset">
              <SelectValue placeholder="Choose dataset" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {datasets.datasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>Upload a dataset first if this list is empty.</FieldDescription>
          <LoadMore visible={Boolean(datasets.hasNextPage)} pending={datasets.isFetching} onClick={datasets.loadMore} />
        </Field>
        <Field>
          <FieldLabel htmlFor="run-version">Dataset version</FieldLabel>
          <Select value={versionId} onValueChange={setVersionId} disabled={!datasetId || versions.isPending}>
            <SelectTrigger id="run-version">
              <SelectValue placeholder="Choose version" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {versions.versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    v{version.version_number} · {version.original_filename}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <LoadMore visible={Boolean(versions.hasNextPage)} pending={versions.isFetching} onClick={versions.loadMore} />
        </Field>
        <Field>
          <FieldLabel htmlFor="run-context-version">Research context version</FieldLabel>
          <Select value={contextVersion} onValueChange={setContextVersion}>
            <SelectTrigger id="run-context-version">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="latest">Latest saved version</SelectItem>
                {contexts.versions.map((version) => (
                  <SelectItem key={version.id} value={String(version.version_number)}>
                    Version {version.version_number}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ListState
            pending={contexts.isPending}
            failed={contexts.isError}
            empty={false}
            title="Context versions"
            retry={contexts.refetch}
          />
          <LoadMore visible={Boolean(contexts.hasNextPage)} pending={contexts.isFetching} onClick={contexts.loadMore} />
        </Field>
        <Field>
          <FieldLabel htmlFor="run-budget">Run budget (USD)</FieldLabel>
          <Input
            id="run-budget"
            inputMode="decimal"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
          <FieldDescription>The server applies the current budget limit.</FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Checkbox
            id="auto-review"
            checked={autoReview}
            onCheckedChange={(checked) => setAutoReview(checked === true)}
          />
          <FieldLabel htmlFor="auto-review">Automatically approve frame reviews</FieldLabel>
        </Field>
      </FieldGroup>
    </WorkspaceFormDialog>
  );
  return (
    <ExperimentTabs
      value={activeTab}
      items={[
        { value: "runs", label: "Research runs", href: `/projects/${project.id}/experiments` },
        { value: "context", label: "Research context", href: `/projects/${project.id}/experiments?tab=context` },
      ]}
    >
      {activeTab === "context" ? (
        <ResearchContextSection {...props} embedded />
      ) : RUN_STREAM_SOURCE === "mock" ? (
        <RunStudio projectId={project.id} canWrite={canWrite} />
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          {!runs.runs.length && <div className="flex justify-end">{startAction}</div>}
          {activeRun && (
            <p className="text-muted-foreground text-sm">Finish or abandon the active run before starting another.</p>
          )}
          <ListState
            pending={runs.isPending}
            failed={runs.isError}
            empty={!runs.runs.length}
            title="Runs"
            retry={runs.refetch}
          />
          {runs.runs.length > 0 && (
            <DataTable
              toolbar={<div className="flex justify-end">{startAction}</div>}
              rows={runs.runs}
              getRowId={(run) => run.id}
              columns={[
                {
                  id: "Run",
                  label: "Run",
                  hideable: false,
                  cell: (run) => (
                    <>
                      <Button asChild variant="link" className="px-0">
                        <Link prefetch={false} href={researchRunUrl(project.id, run.id)} title={run.id}>
                          {run.id.slice(0, 8)}
                        </Link>
                      </Button>
                    </>
                  ),
                },
                {
                  id: "Status",
                  label: "Status",
                  cell: (run) => (
                    <>
                      <ManagementStatusBadge status={run.status} />
                    </>
                  ),
                },
                {
                  id: "Dataset version",
                  label: "Dataset version",
                  cell: (run) => <>v{run.dataset_version_number}</>,
                },
                {
                  id: "Cost / budget",
                  label: "Cost / budget",
                  cell: (run) => (
                    <>
                      ${run.cost_usd} / ${run.budget_usd}
                    </>
                  ),
                },
                {
                  id: "Actions",
                  label: "Actions",
                  align: "right" as const,
                  cell: (run) => (
                    <>
                      <Button variant="outline" size="sm" onClick={() => selectRun(run.id)}>
                        Open run
                      </Button>
                    </>
                  ),
                },
              ]}
            />
          )}
          <LoadMore visible={Boolean(runs.hasNextPage)} pending={runs.isFetching} onClick={runs.loadMore} />
        </div>
      )}
    </ExperimentTabs>
  );
}
