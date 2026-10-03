"use client";

import type { ReactNode } from "react";

import { Inbox } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { ProjectRole } from "@/types/enums";

export interface WorkspaceProps {
  project: ProjectItem;
  canWrite: boolean;
  canManage: boolean;
  userId: string;
}

// Shared hooks own API error toasts; event handlers must also consume rejected promises.
export async function perform<T>(action: () => Promise<T>, success?: string): Promise<T | undefined> {
  try {
    const result = await action();
    if (success) toast.success(success);
    return result;
  } catch {
    return undefined;
  }
}

const emptyDescriptions: Record<string, string> = {
  Runs: "Save a research question and upload a dataset, then start your first run.",
  Datasets: "Upload a CSV dataset to prepare your research.",
  Comments: "Add a comment to start the discussion.",
};

export function ListState({
  pending,
  failed,
  empty,
  title,
  retry,
}: {
  pending: boolean;
  failed: boolean;
  empty: boolean;
  title: string;
  retry: () => unknown;
}) {
  if (pending) return <Skeleton className="h-32 w-full" aria-label={`Loading ${title.toLowerCase()}`} />;
  if (failed)
    return (
      <Button variant="outline" onClick={() => void retry()}>
        Reload {title.toLowerCase()}
      </Button>
    );
  if (!empty) return null;
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>No {title.toLowerCase()} yet</EmptyTitle>
        <EmptyDescription>{emptyDescriptions[title] ?? "Records will appear here when available."}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function LoadMore({
  visible,
  pending,
  onClick,
}: {
  visible: boolean;
  pending: boolean;
  onClick: () => unknown;
}) {
  return visible ? (
    <Button variant="outline" disabled={pending} onClick={() => void onClick()}>
      Load more
    </Button>
  ) : null;
}

export function ConfirmAction({
  title,
  description,
  disabled,
  onConfirm,
}: {
  title: string;
  description: string;
  disabled?: boolean;
  onConfirm: () => unknown;
}) {
  return (
    <ConfirmDialog
      title={`${title}?`}
      description={description}
      onConfirm={() => void onConfirm()}
      trigger={
        <Button variant="outline" disabled={disabled}>
          {title}
        </Button>
      }
    />
  );
}

export function RoleSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: ProjectRole;
  onChange: (role: ProjectRole) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(role) => onChange(role as ProjectRole)} disabled={disabled}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={ProjectRole.ProjectManager}>Project Manager</SelectItem>
          <SelectItem value={ProjectRole.Researcher}>Researcher</SelectItem>
          <SelectItem value={ProjectRole.Reviewer}>Reviewer</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function ActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function validateCsv(file: File | null): file is File {
  if (!file) {
    toast.error("Choose a CSV file.");
    return false;
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    toast.error("Only CSV files are supported.");
    return false;
  }
  if (file.size > 50 * 1024 * 1024) {
    toast.error("The file must be no larger than 50 MiB.");
    return false;
  }
  return true;
}
