"use client";

import { useState } from "react";

import { FlaskConical, MessageCircleQuestionMark } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useInfiniteDatasets, useInfiniteDatasetVersions } from "@/hooks/use-datasets-query";
import { useResearchContextQuery, useSaveResearchContextMutation } from "@/hooks/use-research-context-query";
import { useCreateRunMutation, useInfiniteRuns } from "@/hooks/use-runs-query";
import type { ResearchContextItem } from "@/lib/api/services/fetch-research-context";
import { ApiError } from "@/types/api";

import { RunDetails } from "./run-details";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, LoadMore, perform, type WorkspaceProps } from "./workspace-ui";

function ContextEditor({
  projectId,
  context,
  canWrite,
  reload,
}: {
  projectId: string;
  context: ResearchContextItem | null;
  canWrite: boolean;
  reload: () => Promise<ResearchContextItem | null | undefined>;
}) {
  const [draft, setDraft] = useState(context?.body ?? "");
  const [base, setBase] = useState(context);
  const save = useSaveResearchContextMutation(projectId);
  const reloadLatest = async () => {
    const latest = await reload();
    if (latest !== undefined) {
      setBase(latest);
      setDraft(latest?.body ?? "");
    }
  };

  return (
    <Card id="research-context">
      <CardHeader className="flex flex-col gap-3 sm:grid">
        <CardTitle className="flex items-center gap-2">
          <MessageCircleQuestionMark className="size-5 text-primary" />
          Research question & context
        </CardTitle>
        <CardDescription>
          Describe the question, variables and assumptions. Each save creates a new version.
        </CardDescription>
        <CardAction>
          {" "}
          <WorkspaceFormDialog
            title="Edit research context"
            triggerVariant="default"
            triggerLabel={base ? "Edit research context" : "New research question"}
            description="Describe your question, variables and assumptions. Each save creates a new version."
            submitLabel="Save research context"
            pending={save.isPending}
            disabled={!canWrite}
            openOnHash="research-context"
            noValidate
            onSubmit={async (event) => {
              event.preventDefault();
              if (!draft.trim() || draft.length > 50000) {
                toast.error("Research context must contain 1–50,000 characters.");
                return;
              }
              const result = await perform(
                () =>
                  save.mutateAsync({
                    body: draft,
                    front_matter: base?.front_matter,
                    base_version: base?.version_number ?? 0,
                  }),
                "Research context saved.",
              );
              if (result) {
                setBase(result.data);
                return true;
              }
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="research-body">Research context</FieldLabel>
                <Textarea
                  id="research-body"
                  rows={7}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="What question are you researching? Describe your data and the expected relationship."
                  disabled={!canWrite}
                />
                <FieldDescription>
                  {base ? `Editing version ${base.version_number}.` : "No context saved yet."}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </WorkspaceFormDialog>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap break-words text-sm">{base?.body || "No research context yet."}</p>

        {!canWrite && (
          <Button variant="outline" className="self-end" onClick={() => void reloadLatest()}>
            Reload latest context
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ExperimentsSection(props: WorkspaceProps) {
  const { project, canWrite } = props;
  const context = useResearchContextQuery(project.id);
  const datasets = useInfiniteDatasets(project.id);
  const runs = useInfiniteRuns(project.id);
  const create = useCreateRunMutation(project.id);
  const [datasetId, setDatasetId] = useState("");
  const versions = useInfiniteDatasetVersions(project.id, datasetId);
  const [versionId, setVersionId] = useState("");
  const [budget, setBudget] = useState("5.00");
  const [autoReview, setAutoReview] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const missingContext = context.error instanceof ApiError && context.error.code === "RESEARCH_CONTEXT_NOT_FOUND";
  return (
    <div className="flex flex-col gap-6">
      {!context.isPending && (
        <ContextEditor
          key={project.id}
          projectId={project.id}
          context={context.data?.data ?? null}
          canWrite={canWrite && (!context.isError || missingContext)}
          reload={async () => {
            const result = await context.refetch();
            if (result.error instanceof ApiError && result.error.code === "RESEARCH_CONTEXT_NOT_FOUND") return null;
            return result.isError ? undefined : (result.data?.data ?? null);
          }}
        />
      )}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:grid">
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-5 text-primary" />
            Research runs
          </CardTitle>
          <CardDescription>Track progress, review results and manage your research runs.</CardDescription>
          <CardAction>
            {" "}
            {canWrite && (
              <WorkspaceFormDialog
                title="Start a research run"
                triggerVariant="default"
                description="Select a dataset version and use the latest saved research context."
                submitLabel="Start research run"
                pending={create.isPending}
                disabled={context.isPending}
                noValidate
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!context.data?.data) {
                    toast.error("Save your research context before starting a run.");
                    return;
                  }
                  if (!versionId || !versions.versions.some((version) => version.id === versionId)) {
                    toast.error("Select a dataset version.");
                    return;
                  }
                  if (!/^\d+(\.\d{1,2})?$/.test(budget) || Number(budget) <= 0 || Number(budget) > 20) {
                    toast.error(
                      "Run budget must be greater than $0 and no more than $20, with at most two decimal places.",
                    );
                    return;
                  }
                  const result = await perform(
                    () =>
                      create.mutateAsync({
                        dataset_version_id: versionId,
                        research_context_version: context.data.data.version_number,
                        budget_usd: budget,
                        auto_review: autoReview,
                      }),
                    "Research run created.",
                  );
                  if (result) {
                    setSelectedRun(result.data.id);
                    return true;
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
                    <LoadMore
                      visible={Boolean(datasets.hasNextPage)}
                      pending={datasets.isFetching}
                      onClick={datasets.loadMore}
                    />
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
                    <LoadMore
                      visible={Boolean(versions.hasNextPage)}
                      pending={versions.isFetching}
                      onClick={versions.loadMore}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="run-budget">Run budget (USD)</FieldLabel>
                    <Input
                      id="run-budget"
                      inputMode="decimal"
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                    />
                    <FieldDescription>Maximum $20 per run.</FieldDescription>
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
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {" "}
          <ListState
            pending={runs.isPending}
            failed={runs.isError}
            empty={!runs.runs.length}
            title="Runs"
            retry={runs.refetch}
          />
          {runs.runs.length > 0 && (
            <DataTable
              rows={runs.runs ?? []}
              getRowId={(run) => run.id}
              columns={[
                {
                  id: "Run",
                  label: "Run",
                  hideable: false,
                  cell: (run) => (
                    <>
                      <span title={run.id}>{run.id.slice(0, 8)}</span>
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
                { id: "Dataset version", label: "Dataset version", cell: (run) => <>v{run.dataset_version_number}</> },
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
                      <Button variant="outline" size="sm" onClick={() => setSelectedRun(run.id)}>
                        Open run
                      </Button>
                    </>
                  ),
                },
              ]}
            />
          )}
          <LoadMore visible={Boolean(runs.hasNextPage)} pending={runs.isFetching} onClick={runs.loadMore} />
        </CardContent>
      </Card>
      {selectedRun && <RunDetails key={selectedRun} {...props} runId={selectedRun} />}
    </div>
  );
}
