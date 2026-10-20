"use client";

import { type ReactNode, useState } from "react";

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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectStatus } from "@/types/enums";

import { SettingsGroup, SettingsHeading, SettingsRow } from "./settings-panel";
import { useSettingsPreview } from "./settings-preview";

export function usePreviewLifecycle() {
  const preview = useSettingsPreview();
  const changeStatus = (status: ProjectStatus, action: string) => {
    preview.updateProject({ status });
    preview.record(`${action} the project in the preview.`);
    toast.success("Project status updated in this preview.");
  };
  return {
    archive: () => {
      preview.drafts.set("lifecycle", { status: preview.project.status });
      changeStatus(ProjectStatus.Archived, "archived");
    },
    restore: () => {
      const status = preview.drafts.get("lifecycle")?.status as ProjectStatus | undefined;
      changeStatus(status ?? ProjectStatus.Draft, "restored");
    },
    complete: () => changeStatus(ProjectStatus.Completed, "completed"),
    reopen: () => changeStatus(ProjectStatus.DataReady, "reopened"),
  };
}

export function PreviewStatusRow() {
  const { project } = useSettingsPreview();
  const lifecycle = usePreviewLifecycle();
  const completed = project.status === ProjectStatus.Completed;
  return (
    <SettingsRow label="Status" hint="Status changes apply to this preview only.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ManagementStatusBadge status={project.status} />
        {project.status !== ProjectStatus.Archived && (
          <ConfirmDialog
            title={completed ? "Reopen this project?" : "Mark this project as completed?"}
            description="Preview the status change without updating the actual project."
            confirmLabel={completed ? "Reopen" : "Mark as completed"}
            onConfirm={completed ? lifecycle.reopen : lifecycle.complete}
            trigger={
              <Button type="button" variant="outline" size="sm">
                {completed ? "Reopen" : "Mark as completed"}
              </Button>
            }
          />
        )}
      </div>
    </SettingsRow>
  );
}

const MEMBERS = [
  { id: "amelia", name: "Amelia Chen", role: "Researcher" },
  { id: "noah", name: "Noah Williams", role: "Reviewer" },
];

function TransferOwnership({ disabled }: { disabled: boolean }) {
  const preview = useSettingsPreview();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setMemberId("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>
            Choose a sample member to preview the handover. Actual ownership stays unchanged.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="preview-owner">New owner</FieldLabel>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger id="preview-owner" className="w-full">
                <SelectValue placeholder="Choose a member" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {MEMBERS.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} · {member.role}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!memberId}
            onClick={() => {
              const member = MEMBERS.find((item) => item.id === memberId);
              if (!member) return;
              preview.record(`previewed transferring ownership to ${member.name}.`);
              toast.success(`Ownership transfer to ${member.name} previewed.`);
              setOpen(false);
            }}
          >
            Preview transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProject() {
  const preview = useSettingsPreview();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const matches = name.trim() === preview.project.name;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setName("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Delete project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="wrap-anywhere">Delete {preview.project.name}?</DialogTitle>
          <DialogDescription>
            This previews the confirmation flow. No project, dataset or research run will be deleted.
          </DialogDescription>
        </DialogHeader>
        <form
          id="preview-delete-project"
          onSubmit={(event) => {
            event.preventDefault();
            if (!matches) return;
            preview.record("previewed the project deletion confirmation.");
            toast.info("Deletion preview complete. No data was deleted.");
            setOpen(false);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="preview-delete-name" className="wrap-anywhere">
                Type {preview.project.name} to confirm
              </FieldLabel>
              <Input
                id="preview-delete-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="preview-delete-project" variant="destructive" disabled={!matches}>
            Preview deletion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DangerRow({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="font-medium text-sm">{label}</h3>
        <p className="max-w-prose text-muted-foreground text-xs leading-relaxed">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsPreviewDangerZone() {
  const { project } = useSettingsPreview();
  const lifecycle = usePreviewLifecycle();
  const archived = project.status === ProjectStatus.Archived;
  return (
    <div className="flex flex-col gap-6">
      <SettingsHeading title="Danger zone" />
      <SettingsGroup title="Project lifecycle">
        <DangerRow
          label={archived ? "Restore project" : "Archive project"}
          hint="Archiving makes this preview read only. Restore it at any time."
        >
          {archived ? (
            <Button variant="outline" onClick={lifecycle.restore}>
              Restore project
            </Button>
          ) : (
            <ConfirmDialog
              title={`Archive ${project.name}?`}
              description="The settings preview becomes read only until you restore it. The actual project stays unchanged."
              confirmLabel="Archive project"
              destructive
              onConfirm={lifecycle.archive}
              trigger={<Button variant="destructive">Archive</Button>}
            />
          )}
        </DangerRow>
        <DangerRow
          label="Transfer ownership"
          hint="Hand the project over to another member. Sample members are used for this preview."
        >
          <TransferOwnership disabled={archived} />
        </DangerRow>
        <DangerRow
          label="Delete project"
          hint="Preview the confirmation required to permanently delete a project and its research data."
        >
          <DeleteProject />
        </DangerRow>
      </SettingsGroup>
    </div>
  );
}
