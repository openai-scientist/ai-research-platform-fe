"use client";

import { type ReactNode, useState } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMembersQuery } from "@/hooks/use-members-query";
import {
  useArchiveProjectMutation,
  useCompleteProjectMutation,
  useReopenProjectMutation,
  useRestoreProjectMutation,
} from "@/hooks/use-projects-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { PROJECT_ROLE_LABELS } from "@/lib/auth/project-access";
import { ProjectStatus } from "@/types/enums";

import { SettingsGroup, SettingsHeading, SettingsRow } from "./settings-panel";
import { perform } from "./workspace-ui";

const STATUS_NOTES: Partial<Record<ProjectStatus, string>> = {
  [ProjectStatus.Draft]: "No dataset yet.",
  [ProjectStatus.DataReady]: "Data is in place for research.",
  [ProjectStatus.Researching]: "A research run is in progress.",
  [ProjectStatus.NeedsReview]: "Results are waiting for review.",
  [ProjectStatus.Completed]: "Research is finished.",
  [ProjectStatus.Archived]: "Read only until restored.",
};

function useLifecycle(project: ProjectItem) {
  const router = useRouter();
  const archive = useArchiveProjectMutation();
  const restore = useRestoreProjectMutation();
  const complete = useCompleteProjectMutation();
  const reopen = useReopenProjectMutation();
  const busy = archive.isPending || restore.isPending || complete.isPending || reopen.isPending;
  const run = async (action: () => Promise<unknown>, message: string) => {
    if (await perform(action, message)) router.refresh();
  };
  return {
    busy,
    archive: () => run(() => archive.mutateAsync(project.id), "Project archived."),
    restore: () => run(() => restore.mutateAsync(project.id), "Project restored."),
    complete: () => run(() => complete.mutateAsync(project.id), "Project marked as completed."),
    reopen: () => run(() => reopen.mutateAsync(project.id), "Project reopened."),
  };
}

/** The project's status, with the one change a manager makes by hand: completing or reopening it. */
export function StatusRow({ project }: { project: ProjectItem }) {
  const lifecycle = useLifecycle(project);
  const archived = project.status === ProjectStatus.Archived;
  const completed = project.status === ProjectStatus.Completed;

  return (
    <SettingsRow label="Status" hint="Moves forward on its own as data arrives and runs finish.">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:pt-1">
        <div className="flex items-center gap-2.5">
          <ManagementStatusBadge status={project.status} />
          <span className="text-muted-foreground text-sm">{STATUS_NOTES[project.status]}</span>
        </div>
        {!archived &&
          (completed ? (
            <Button variant="outline" size="sm" disabled={lifecycle.busy} onClick={() => void lifecycle.reopen()}>
              Reopen
            </Button>
          ) : (
            <ConfirmDialog
              title="Mark the project as completed?"
              description="Do this once the research is finished. You can reopen the project at any time. Any run in progress has to finish first."
              confirmLabel="Mark as completed"
              onConfirm={() => void lifecycle.complete()}
              trigger={
                <Button variant="outline" size="sm" disabled={lifecycle.busy}>
                  Mark as completed
                </Button>
              }
            />
          ))}
      </div>
    </SettingsRow>
  );
}

function DangerRow({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-pretty text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function TransferOwnership({ project, userId, disabled }: { project: ProjectItem; userId: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const members = useMembersQuery(project.id, { limit: 100, offset: 0, status: "active" }, { enabled: open });
  const candidates = (members.data?.data ?? []).filter((member) => member.user_id !== userId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTo("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>
            The new owner becomes the Project Manager of {project.name}. You stay in the project as a researcher.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="transfer-owner" className="font-medium text-sm">
            New owner
          </label>
          <Select value={to} onValueChange={setTo} disabled={members.isPending}>
            <SelectTrigger id="transfer-owner" className="w-full">
              <SelectValue placeholder={members.isPending ? "Loading members…" : "Choose a member"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {candidates.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <span className="truncate">{member.display_name?.trim() || member.email}</span>
                    <span className="text-muted-foreground">{PROJECT_ROLE_LABELS[member.role]}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {members.isSuccess && !candidates.length && (
            <p className="text-muted-foreground text-xs">
              Only active members can become the owner. Invite someone from Members first.
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!to}
            onClick={() => {
              // TODO(BE): no endpoint to transfer ownership yet.
              toast.error("Transferring ownership isn't available yet.");
            }}
          >
            Transfer ownership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProject({ project, disabled }: { project: ProjectItem; disabled: boolean }) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === project.name;

  return (
    <Dialog onOpenChange={(open) => !open && setTyped("")}>
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={disabled}>
          Delete project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {project.name}?</DialogTitle>
          <DialogDescription>
            Its datasets, documents, connections and research runs are deleted with it, and members lose access. This
            can't be undone.
          </DialogDescription>
        </DialogHeader>
        <form
          id="delete-project"
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!matches) return;
            // TODO(BE): no endpoint to delete a project yet.
            toast.error("Deleting projects isn't available yet.");
          }}
        >
          <label htmlFor="delete-project-name" className="text-sm">
            Type <span className="select-all font-medium">{project.name}</span> to confirm.
          </label>
          <Input
            id="delete-project-name"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="delete-project" variant="destructive" disabled={!matches}>
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Actions that are hard to undo, kept apart and behind a confirmation. */
export function SettingsDangerZone({ project, userId }: { project: ProjectItem; userId: string }) {
  const lifecycle = useLifecycle(project);
  const archived = project.status === ProjectStatus.Archived;
  const owner = project.owner_user_id === userId;

  return (
    <div className="flex flex-col gap-6">
      <SettingsHeading title="Danger zone" />
      <SettingsGroup className="border-red-500/25 dark:border-red-500/20">
        {archived ? (
          <DangerRow
            title="Restore project"
            description="Make the project editable again. Members can upload data and start research runs."
            action={
              <Button disabled={lifecycle.busy} onClick={() => void lifecycle.restore()}>
                Restore project
              </Button>
            }
          />
        ) : (
          <DangerRow
            title="Archive project"
            description="Make the project read only. Members can still open it, and you can restore it at any time."
            action={
              <ConfirmDialog
                title={`Archive ${project.name}?`}
                description="The project becomes read only: no uploads, edits or research runs until it's restored. Nothing is deleted."
                confirmLabel="Archive project"
                onConfirm={() => void lifecycle.archive()}
                trigger={
                  <Button variant="outline" disabled={lifecycle.busy}>
                    Archive
                  </Button>
                }
              />
            }
          />
        )}
        <DangerRow
          title="Transfer ownership"
          description={
            owner
              ? "Make another member the owner and Project Manager of this project."
              : "Only the project's owner can hand it over to someone else."
          }
          action={<TransferOwnership project={project} userId={userId} disabled={!owner || archived} />}
        />
        <DangerRow
          title="Delete project"
          description="Permanently delete the project with its datasets, documents and research runs."
          action={<DeleteProject project={project} disabled={!owner} />}
        />
      </SettingsGroup>
    </div>
  );
}
