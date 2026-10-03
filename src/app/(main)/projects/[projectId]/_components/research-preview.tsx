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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { RUN_PHASES, type RunPhase } from "./project-dashboard-data";
import { type ProjectPreview, useProjectPreview } from "./use-project-preview";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ActionRow, perform, type WorkspaceProps } from "./workspace-ui";

function HypothesisEditor({ initial, onSave }: { initial: string; onSave: (statement: string) => void }) {
  const [statement, setStatement] = useState(initial);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!statement.trim()) {
          toast.error("A hypothesis statement is required.");
          return;
        }
        onSave(statement.trim());
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="sample-hypothesis">Active hypothesis</FieldLabel>
          <Textarea id="sample-hypothesis" value={statement} onChange={(event) => setStatement(event.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit">Save hypothesis</Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function ResearchPreviewPanel({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const query = useProjectPreview(projectId);
  const preview = query.data;
  const update = (change: (current: ProjectPreview) => ProjectPreview) =>
    void perform(() => query.update.mutateAsync(change));
  if (!preview) return null;
  return (
    <Tabs defaultValue="hypothesis">
      <TabsList>
        <TabsTrigger value="hypothesis">Hypothesis</TabsTrigger>
        <TabsTrigger value="warnings">Warnings</TabsTrigger>
        <TabsTrigger value="report">Report</TabsTrigger>
      </TabsList>
      <TabsContent value="hypothesis" className="flex flex-col gap-4">
        {canEdit ? (
          <HypothesisEditor
            key={preview.activeHypothesis.statement}
            initial={preview.activeHypothesis.statement}
            onSave={(statement) =>
              update((current) => ({ ...current, activeHypothesis: { ...current.activeHypothesis, statement } }))
            }
          />
        ) : (
          <p>{preview.activeHypothesis.statement}</p>
        )}
        <FieldGroup>
          <Field>
            <FieldLabel>Hypothesis status</FieldLabel>
            <Select
              value={preview.activeHypothesis.status}
              disabled={!canEdit}
              onValueChange={(status) =>
                update((current) => ({
                  ...current,
                  activeHypothesis: {
                    ...current.activeHypothesis,
                    status: status as ProjectPreview["activeHypothesis"]["status"],
                  },
                }))
              }
            >
              <SelectTrigger aria-label="Hypothesis status">
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
          </Field>
          <Field>
            <FieldLabel>Research phase</FieldLabel>
            <Select
              value={preview.runPhase}
              disabled={!canEdit}
              onValueChange={(phase) => update((current) => ({ ...current, runPhase: phase as RunPhase }))}
            >
              <SelectTrigger aria-label="Research phase">
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
          </Field>
        </FieldGroup>
      </TabsContent>
      <TabsContent value="warnings" className="flex flex-col gap-4">
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
      </TabsContent>
      <TabsContent value="report" className="flex flex-col gap-4">
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
      </TabsContent>
    </Tabs>
  );
}

export function ResearchPreviewDialog({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Research details</Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
        onInteractOutside={(event) => {
          if (canEdit) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Sample research details</DialogTitle>
          <DialogDescription>
            Hypothesis, warnings and report use sample data. Changes last until this page is reloaded.
          </DialogDescription>
        </DialogHeader>
        <ResearchPreviewPanel projectId={projectId} canEdit={canEdit} />
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
