"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";

import type { FileManagerFile } from "@/app/(main)/dashboard/file-manager/_components/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUserQuery } from "@/hooks/use-auth-query";
import { useInvitationsQuery } from "@/hooks/use-invitations-query";
import { useInfiniteProjects } from "@/hooks/use-projects-query";
import { invitationKeys } from "@/lib/api/query-keys";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/project-status";
import { getInitials } from "@/lib/utils";

import { CreateProjectDialog } from "./create-project-dialog";
import { ProjectInvitations } from "./project-invitations";
import { ProjectsBrowser, projectActions, projectShowOptions, projectSortOptions } from "./projects-browser";
import { ProjectsSkeleton } from "./projects-skeleton";

function toProjectFile(project: ProjectItem, userId: string | undefined): FileManagerFile {
  return {
    actionLabels: projectActions,
    badgeLabel: PROJECT_STATUS_LABELS[project.status],
    href: "/projects/" + project.id,
    icon: "project",
    id: project.id,
    kind: "document",
    kindLabel: PROJECT_STATUS_LABELS[project.status],
    modifiedAt: new Date(project.updated_at).toLocaleDateString("en-US"),
    name: project.name,
    owner: "Project workspace",
    ownerInitials: getInitials(project.name),
    shared: userId !== undefined && project.owner_user_id !== userId,
    size: PROJECT_STATUS_LABELS[project.status],
    starred: false,
  };
}

export function WorkspaceProjects({
  canCreate,
  initialInvitationsOpen = false,
}: {
  readonly canCreate: boolean;
  readonly initialInvitationsOpen?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [invitationsOpen, setInvitationsOpen] = useState(initialInvitationsOpen);
  const [invitationsBusy, setInvitationsBusy] = useState(false);
  useEffect(() => {
    if (initialInvitationsOpen) setInvitationsOpen(true);
  }, [initialInvitationsOpen]);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [show, setShow] = useState("all");
  const [sort, setSort] = useState("activity");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const user = useCurrentUserQuery();
  const userId = user.data?.user.id;
  const query = useInfiniteProjects(
    {
      include_archived: true,
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(status === "all" ? {} : { status: status as ProjectItem["status"] }),
    },
    { placeholderData: keepPreviousData },
  );
  const filtersActive = debouncedSearch !== "" || status !== "all" || show !== "all";
  // The API lists newest first and has no sort or sharing filter, so those apply to the loaded projects.
  const visible = query.projects
    .filter((project) => show !== "shared" || (userId !== undefined && project.owner_user_id !== userId))
    .sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : Date.parse(b.updated_at) - Date.parse(a.updated_at),
    );
  const invitations = useInvitationsQuery({ limit: 1, offset: 0 });
  const count = invitations.data?.meta.pagination?.total;
  function changeInvitationsOpen(open: boolean) {
    if (!open && invitationsBusy) return;
    setInvitationsOpen(open);
    if (open) void queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    else {
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") === "invitations") {
        url.searchParams.delete("tab");
        router.replace(url.pathname + url.search, { scroll: false });
      }
    }
  }
  return (
    <div className="flex flex-col gap-4">
      {query.isPending ? (
        <ProjectsSkeleton />
      ) : (
        <ProjectsBrowser
          canCreateProject={canCreate}
          onCreateProject={() => setCreateOpen(true)}
          filtersActive={filtersActive}
          projects={visible.map((project) => toProjectFile(project, userId))}
          toolbarControls={{
            search: { value: search, onChange: setSearch },
            show: { value: show, onChange: setShow, options: projectShowOptions },
            type: { value: status, onChange: setStatus },
            sort: { value: sort, onChange: setSort, options: projectSortOptions },
          }}
          secondaryAction={
            <Button
              variant="outline"
              onClick={() => changeInvitationsOpen(true)}
              aria-label={
                count === undefined ? "Open project invitations" : "Open project invitations, " + count + " pending"
              }
            >
              <Mail data-icon="inline-start" />
              Invitations
              <Badge variant="secondary" className="tabular-nums">
                {count ?? (invitations.isPending ? "…" : "—")}
              </Badge>
            </Button>
          }
        />
      )}
      {(query.hasNextPage || query.isError) && (
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void (query.isError && !query.data ? query.refetch() : query.loadMore())}
        >
          {query.isError ? "Retry" : "Load more projects"}
        </Button>
      )}
      {canCreate && <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />}
      <Dialog open={invitationsOpen} onOpenChange={changeInvitationsOpen}>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
          showCloseButton={!invitationsBusy}
          onEscapeKeyDown={(event) => {
            if (invitationsBusy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (invitationsBusy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Project invitations</DialogTitle>
            <DialogDescription>Accept an invitation to join a project, or decline it.</DialogDescription>
          </DialogHeader>
          <ProjectInvitations embedded onBusyChange={setInvitationsBusy} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
