"use client";

import { useState } from "react";

import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { RUN_PHASES, type RunPhase } from "./project-dashboard-data";
import { type ProjectPreview, useProjectPreview } from "./use-project-preview";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ActionRow, perform, type WorkspaceProps } from "./workspace-ui";

type HypothesisDraft = { statement: string; status: ProjectPreview["activeHypothesis"]["status"]; phase: RunPhase };

function HypothesisEditor({
  initial,
  pending,
  onSave,
  onClose,
}: {
  initial: HypothesisDraft;
  pending: boolean;
  onSave: (draft: HypothesisDraft) => Promise<boolean>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const dirty =
    draft.statement !== initial.statement || draft.status !== initial.status || draft.phase !== initial.phase;
  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending || !dirty) return;
        if (!draft.statement.trim()) {
          toast.error("A hypothesis statement is required.");
          return;
        }
        if (await onSave({ ...draft, statement: draft.statement.trim() })) onClose();
      }}
    >
      <div className="min-h-0 overflow-y-auto p-1">
        <fieldset disabled={pending} className="min-w-0">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sample-hypothesis">Hypothesis</FieldLabel>
              <Textarea
                id="sample-hypothesis"
                className="min-h-28"
                rows={4}
                value={draft.statement}
                onChange={(event) => setDraft({ ...draft, statement: event.target.value })}
              />
              <FieldDescription>The claim this research is testing.</FieldDescription>
            </Field>
            <FieldGroup className="grid items-start gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="sample-hypothesis-status">Hypothesis status</FieldLabel>
                <Select
                  value={draft.status}
                  onValueChange={(status) => setDraft({ ...draft, status: status as HypothesisDraft["status"] })}
                >
                  <SelectTrigger id="sample-hypothesis-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {["Proposed", "Unverified", "Supported", "Rejected", "Inconclusive"].map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>What the evidence currently says about this claim.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="sample-research-phase">Research phase</FieldLabel>
                <Select value={draft.phase} onValueChange={(phase) => setDraft({ ...draft, phase: phase as RunPhase })}>
                  <SelectTrigger id="sample-research-phase" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {RUN_PHASES.map((phase) => (
                        <SelectItem key={phase} value={phase}>
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>The current stage of the research process.</FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </fieldset>
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !dirty} aria-busy={pending}>
          {pending && <Spinner data-icon="inline-start" />}Save changes
        </Button>
      </div>
    </form>
  );
}

function ResearchPreviewPanel({
  query,
  canEdit,
  onClose,
}: {
  query: ReturnType<typeof useProjectPreview>;
  canEdit: boolean;
  onClose: () => void;
}) {
  const preview = query.data;
  const update = (change: (current: ProjectPreview) => ProjectPreview) =>
    void perform(() => query.update.mutateAsync(change));
  if (!preview) return null;
  return (
    <Tabs defaultValue="hypothesis" className="min-h-0 gap-5">
      <TabsList className="w-full shrink-0">
        <TabsTrigger value="hypothesis">Hypothesis</TabsTrigger>
        <TabsTrigger value="warnings">Warnings</TabsTrigger>
        <TabsTrigger value="report">Report</TabsTrigger>
      </TabsList>
      <TabsContent value="hypothesis" forceMount className="flex min-h-0 flex-col data-[state=inactive]:hidden">
        {canEdit ? (
          <HypothesisEditor
            initial={{
              statement: preview.activeHypothesis.statement,
              status: preview.activeHypothesis.status,
              phase: preview.runPhase,
            }}
            pending={query.update.isPending}
            onClose={onClose}
            onSave={async (draft) =>
              Boolean(
                await perform(() =>
                  query.update.mutateAsync((current) => ({
                    ...current,
                    activeHypothesis: { ...current.activeHypothesis, statement: draft.statement, status: draft.status },
                    runPhase: draft.phase,
                  })),
                ),
              )
            }
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div className="min-h-0 overflow-y-auto p-1">
              <p className="whitespace-pre-wrap break-words leading-relaxed">{preview.activeHypothesis.statement}</p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="mb-2 text-muted-foreground text-sm">Hypothesis status</dt>
                  <dd>
                    <Badge variant="secondary">{preview.activeHypothesis.status}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="mb-2 text-muted-foreground text-sm">Research phase</dt>
                  <dd>
                    <Badge variant="secondary">{preview.runPhase}</Badge>
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex shrink-0 justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
      <TabsContent value="warnings" className="flex min-h-0 flex-col gap-5">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-1">
          {!preview.warnings.length && <p className="text-muted-foreground text-sm">No unresolved sample warnings.</p>}
          {preview.warnings.map((warning) => (
            <div key={`${warning.source}:${warning.title}`} className="flex flex-col gap-2 border-b pb-3">
              <ActionRow>
                <Badge variant="secondary">{warning.severity}</Badge>
                <p className="text-sm">{warning.title}</p>
              </ActionRow>
              <p className="text-muted-foreground text-sm">
                {warning.source} · {warning.detail}
              </p>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-end"
                  disabled={query.update.isPending}
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      warnings: current.warnings.filter(
                        (item) => item.source !== warning.source || item.title !== warning.title,
                      ),
                    }))
                  }
                >
                  Resolve warning
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="flex shrink-0 justify-end">
          <Button type="button" variant="secondary" disabled={query.update.isPending} onClick={onClose}>
            Close
          </Button>
        </div>
      </TabsContent>
      <TabsContent value="report" className="flex min-h-0 flex-col gap-5">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-1">
          <p className="text-sm">
            {preview.report.sectionsDone}/{preview.report.sectionsTotal} sections complete
          </p>
          <Badge variant="secondary">{preview.report.status}</Badge>
          {canEdit && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                disabled={query.update.isPending || preview.report.sectionsDone >= preview.report.sectionsTotal}
                onClick={() =>
                  update((current) => ({
                    ...current,
                    report: {
                      ...current.report,
                      sectionsDone: Math.min(current.report.sectionsTotal, current.report.sectionsDone + 1),
                      status: "Drafting",
                      detail: "Sample report in progress",
                    },
                  }))
                }
              >
                Complete next section
              </Button>
              <Button
                disabled={query.update.isPending || preview.report.sectionsDone !== preview.report.sectionsTotal}
                onClick={() =>
                  update((current) => ({
                    ...current,
                    report: { ...current.report, status: "Published", detail: "Sample research report published" },
                  }))
                }
              >
                Publish report
              </Button>
            </div>
          )}
        </div>
        <div className="flex shrink-0 justify-end">
          <Button type="button" variant="secondary" disabled={query.update.isPending} onClick={onClose}>
            Close
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function ResearchPreviewDialog({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const query = useProjectPreview(projectId);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!query.update.isPending) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Research details</Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-hidden sm:max-w-2xl"
        showCloseButton={!query.update.isPending}
        onEscapeKeyDown={(event) => {
          if (query.update.isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (canEdit) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Research details</DialogTitle>
            <Badge variant="secondary">Sample data</Badge>
          </div>
          <DialogDescription>Changes are temporary and reset when you reload the page.</DialogDescription>
        </DialogHeader>
        {open && <ResearchPreviewPanel query={query} canEdit={canEdit} onClose={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

export function FindingsSection({ project, canWrite }: WorkspaceProps) {
  const query = useProjectPreview(project.id);
  const [statement, setStatement] = useState("");
  const [outcome, setOutcome] = useState("Finding — supported");
  return (
    <DataTable
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" title="Sample data. Changes reset on page reload.">
            Sample data
          </Badge>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ResearchPreviewDialog projectId={project.id} canEdit={canWrite} />
            {canWrite && (
              <WorkspaceFormDialog
                title="Add finding"
                triggerVariant="default"
                description="Create a sample research finding. Changes reset on page reload."
                submitLabel="Add finding"
                pending={query.update.isPending}
                noValidate
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!statement.trim()) {
                    toast.error("A finding statement is required.");
                    return;
                  }
                  const result = await perform(() =>
                    query.update.mutateAsync((current) => ({
                      ...current,
                      outcomes: {
                        ...current.outcomes,
                        finding: current.outcomes.finding + (outcome === "Finding — supported" ? 1 : 0),
                        negative: current.outcomes.negative + (outcome === "Negative result" ? 1 : 0),
                        inconclusive: current.outcomes.inconclusive + (outcome === "Inconclusive" ? 1 : 0),
                      },
                      recentFindings: [
                        {
                          id: `FND-${crypto.randomUUID().slice(0, 8)}`,
                          statement: statement.trim(),
                          outcome,
                          status: "Needs Review",
                          claimLevel: "Sample finding",
                          updatedAt: "Just now",
                        },
                        ...current.recentFindings,
                      ],
                    })),
                  );
                  if (result) {
                    setStatement("");
                    return true;
                  }
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="finding-statement">Finding statement</FieldLabel>
                    <Textarea
                      id="finding-statement"
                      value={statement}
                      onChange={(event) => setStatement(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Outcome</FieldLabel>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger aria-label="Finding outcome">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {["Finding — supported", "Negative result", "Inconclusive"].map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </WorkspaceFormDialog>
            )}
          </div>
        </div>
      }
      rows={query.data?.recentFindings ?? []}
      getRowId={(finding) => finding.id}
      columns={[
        {
          id: "Finding",
          label: "Finding",
          hideable: false,
          cellClassName: "max-w-lg whitespace-normal",
          cell: (finding) => <>{finding.statement}</>,
        },
        { id: "Outcome", label: "Outcome", cell: (finding) => <>{finding.outcome}</> },
        {
          id: "Status",
          label: "Status",
          cell: (finding) => (
            <>
              <ManagementStatusBadge status={finding.status} />
            </>
          ),
        },
        ...(canWrite
          ? [
              {
                id: "Review",
                label: "Review",
                align: "right" as const,
                cell: (finding: ProjectPreview["recentFindings"][number]) => (
                  <>
                    <div className="flex justify-end gap-2">
                      {["Validated", "Rejected"].map((status) => (
                        <Button
                          key={status}
                          variant="outline"
                          size="sm"
                          disabled={query.update.isPending || finding.status === status}
                          onClick={() =>
                            void perform(() =>
                              query.update.mutateAsync((current) => ({
                                ...current,
                                recentFindings: current.recentFindings.map((item) =>
                                  item.id === finding.id ? { ...item, status } : item,
                                ),
                              })),
                            )
                          }
                        >
                          {status === "Validated" ? "Validate" : "Reject"}
                        </Button>
                      ))}
                    </div>
                  </>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
