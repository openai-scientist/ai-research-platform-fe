"use client";

import { type ReactNode, useState } from "react";

import { useRouter } from "next/navigation";

import { FileText, History, type LucideIcon, Microscope, Workflow } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useManagerAuditQuery } from "@/hooks/use-manager-query";
import {
  useArchiveProjectMutation,
  useCompleteProjectMutation,
  useReopenProjectMutation,
  useRestoreProjectMutation,
  useUpdateProjectMutation,
} from "@/hooks/use-projects-query";
import type { UpdateProjectRequest } from "@/lib/api/services/fetch-project";
import { ProjectStatus } from "@/types/enums";

import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ConfirmAction, ListState, perform, type WorkspaceProps } from "./workspace-ui";

function SettingsCard({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:grid">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-5 shrink-0" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction className="self-end sm:self-start">{action}</CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function SettingsDetailDialog({
  title,
  description,
  triggerLabel,
  children,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="management-surface flex max-h-[calc(100dvh-2rem)] flex-col gap-6 overflow-clip sm:max-w-3xl">
        <DialogHeader className="shrink-0 pr-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-1 pb-3">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function LifecycleOption({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="flex shrink-0 justify-end">{action}</div>
    </div>
  );
}

export function SettingsSection({ project }: WorkspaceProps) {
  const router = useRouter();
  const save = useUpdateProjectMutation(project.id);
  const archive = useArchiveProjectMutation();
  const restore = useRestoreProjectMutation();
  const complete = useCompleteProjectMutation();
  const reopen = useReopenProjectMutation();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [objective, setObjective] = useState(project.objective ?? "");
  const [domain, setDomain] = useState(project.domain ?? "");
  const [tags, setTags] = useState(project.tags.join(", "));
  const [offset, setOffset] = useState(0);
  const audit = useManagerAuditQuery(project.id, { limit: 20, offset });
  const archived = project.status === ProjectStatus.Archived;
  const busy = save.isPending || archive.isPending || restore.isPending || complete.isPending || reopen.isPending;
  const lifecycle = async (action: () => Promise<unknown>, message: string) => {
    if (await perform(action, message)) router.refresh();
  };
  const saveDetails = async (data: UpdateProjectRequest) => {
    const result = await perform(() => save.mutateAsync(data), "Project saved.");
    if (!result) return;
    router.refresh();
    return true;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SettingsCard
        title="Project information"
        description="Manage the project name and description."
        icon={FileText}
        action={
          <WorkspaceFormDialog
            title="Project information"
            triggerLabel="Edit information"
            description="Update the project name and description."
            submitLabel="Save information"
            pending={busy}
            disabled={archived}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!name.trim()) {
                toast.error("Project name is required.");
                return;
              }
              return saveDetails({ name: name.trim(), description });
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="settings-name">Name</FieldLabel>
                <Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-description">Description</FieldLabel>
                <Textarea
                  id="settings-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
            </FieldGroup>
          </WorkspaceFormDialog>
        }
      >
        <p className="break-words font-medium">{project.name}</p>
        <p className="line-clamp-2 break-words text-muted-foreground">
          {project.description ? project.description : "No description added."}
        </p>
        {archived && <p className="text-muted-foreground">Restore the project to edit its information.</p>}
      </SettingsCard>
      <SettingsCard
        title="Research metadata"
        description="Define the objective, domain and tags."
        icon={Microscope}
        action={
          <WorkspaceFormDialog
            title="Research metadata"
            triggerLabel="Edit metadata"
            description="Update the research objective, domain and tags."
            submitLabel="Save metadata"
            pending={busy}
            disabled={archived}
            onSubmit={async (event) => {
              event.preventDefault();
              return saveDetails({
                objective,
                domain,
                tags: [
                  ...new Set(
                    tags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  ),
                ],
              });
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="settings-objective">Objective</FieldLabel>
                <Textarea
                  id="settings-objective"
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-domain">Domain</FieldLabel>
                <Input id="settings-domain" value={domain} onChange={(event) => setDomain(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-tags">Tags (comma separated)</FieldLabel>
                <Input id="settings-tags" value={tags} onChange={(event) => setTags(event.target.value)} />
              </Field>
            </FieldGroup>
          </WorkspaceFormDialog>
        }
      >
        <p className="line-clamp-2 break-words">
          {project.objective ? project.objective : "No research objective added."}
        </p>
        <p className="break-words text-muted-foreground">{project.domain ? project.domain : "No domain selected."}</p>
        <div className="flex flex-wrap gap-2">
          {project.tags.length ? (
            project.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="max-w-full whitespace-normal break-words">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">No tags added.</span>
          )}
        </div>
      </SettingsCard>
      <SettingsCard
        title="Project lifecycle"
        description="Manage completion, archiving and restoration."
        icon={Workflow}
        action={
          <SettingsDetailDialog
            title="Project lifecycle"
            description="Review the current status and choose the next action."
            triggerLabel="Manage lifecycle"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-sm">Current status</span>
              <ManagementStatusBadge status={project.status} />
            </div>
            {archived ? (
              <LifecycleOption
                title="Restore workspace"
                description="Restore access to editing and research workflows."
                action={
                  <Button
                    disabled={busy}
                    onClick={() => void lifecycle(() => restore.mutateAsync(project.id), "Project restored.")}
                  >
                    Restore project
                  </Button>
                }
              />
            ) : (
              <>
                {project.status === ProjectStatus.Completed ? (
                  <LifecycleOption
                    title="Continue research"
                    description="Reopen this completed project for further work."
                    action={
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void lifecycle(() => reopen.mutateAsync(project.id), "Project reopened.")}
                      >
                        Reopen project
                      </Button>
                    }
                  />
                ) : (
                  <LifecycleOption
                    title="Finish research"
                    description="Complete the project after all active runs have finished."
                    action={
                      <ConfirmAction
                        title="Complete project"
                        disabled={busy}
                        description="Mark the project as complete after all active runs have finished."
                        onConfirm={() => lifecycle(() => complete.mutateAsync(project.id), "Project completed.")}
                      />
                    }
                  />
                )}
                <LifecycleOption
                  title="Archive workspace"
                  description="Make the workspace read only. It can be restored later."
                  action={
                    <ConfirmAction
                      title="Archive project"
                      disabled={busy}
                      description="Make this workspace read only. You can restore it later."
                      onConfirm={() => lifecycle(() => archive.mutateAsync(project.id), "Project archived.")}
                    />
                  }
                />
              </>
            )}
          </SettingsDetailDialog>
        }
      >
        <div>
          <ManagementStatusBadge status={project.status} />
        </div>
        <p className="text-muted-foreground">
          {archived
            ? "This workspace is read only. Restore it to resume work."
            : "Open lifecycle details to review the available status changes."}
        </p>
      </SettingsCard>
      <SettingsCard
        title="Activity & audit"
        description="Review the history of changes in this project."
        icon={History}
        action={
          <SettingsDetailDialog
            title="Project audit log"
            description="Browse recorded project changes, from newest to oldest."
            triggerLabel="View audit log"
          >
            <ListState
              pending={audit.isPending}
              failed={audit.isError}
              empty={!audit.data?.data.length}
              title="Audit events"
              retry={audit.refetch}
            />
            {Boolean(audit.data?.data.length) && (
              <DataTable
                rows={audit.data?.data ?? []}
                getRowId={(event) => event.id}
                columns={[
                  {
                    id: "Action",
                    label: "Action",
                    hideable: false,
                    cellClassName: "whitespace-normal capitalize",
                    cell: (event) => <>{event.action.replaceAll("_", " ").replaceAll(".", " · ")}</>,
                  },
                  {
                    id: "Resource",
                    label: "Resource",
                    cellClassName: "whitespace-normal capitalize",
                    cell: (event) => <>{event.resource_type.replaceAll("_", " ")}</>,
                  },
                  {
                    id: "Date",
                    label: "Date",
                    cellClassName: "text-right",
                    cell: (event) => (
                      <>
                        <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString("en-US")}</time>
                      </>
                    ),
                  },
                ]}
              />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                disabled={offset === 0 || audit.isFetching}
                onClick={() => setOffset((value) => Math.max(0, value - 20))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={audit.isFetching || !audit.data || offset + 20 >= (audit.data.meta.pagination?.total ?? 0)}
                onClick={() => setOffset((value) => value + 20)}
              >
                Next
              </Button>
            </div>
          </SettingsDetailDialog>
        }
      >
        <p>Project changes are recorded automatically.</p>
        <p className="text-muted-foreground">View the audit log to inspect actions, resources and timestamps.</p>
      </SettingsCard>
    </div>
  );
}
