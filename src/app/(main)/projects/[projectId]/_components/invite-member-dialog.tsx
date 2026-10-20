"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfiniteInviteCandidates } from "@/hooks/use-infinite-invite-candidates";
import { useAddMemberMutation } from "@/hooks/use-members-query";
import { useProjectAccess } from "@/hooks/use-project-access";
import type { InviteCandidate } from "@/lib/api/services/fetch-members";
import type { ProjectAccessContext } from "@/lib/api/services/fetch-project-access";
import { PROJECT_ROLE_LABELS } from "@/lib/auth/project-access";
import { ApiError } from "@/types/api";
import type { ProjectRole } from "@/types/enums";

import { InviteCandidatePicker } from "./invite-candidate-picker";

/** Pick a person and a role on one screen, then send. */
export function InviteMemberDialog({
  projectId,
  defaults,
  onClose,
}: {
  projectId: string;
  defaults: NonNullable<ProjectAccessContext["invitation"]>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<InviteCandidate | null>(null);
  const [role, setRole] = useState<ProjectRole>(defaults.default_role as ProjectRole);
  const access = useProjectAccess(projectId);
  const allowed = defaults.allowed_roles.includes(role);
  const invite = useAddMemberMutation(projectId);
  const ended = useCallback(() => {
    onClose();
    void access.refetch();
    router.refresh();
  }, [onClose, router, access.refetch]);
  const candidates = useInfiniteInviteCandidates(projectId, q, ended);
  const valid = q.length <= 120;
  const changing = search.trim() !== q;
  useEffect(() => {
    if (search.trim() === q) return;
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setQ(next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, q]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !allowed || invite.isPending || candidates.ended) return;
    try {
      const response = await invite.mutateAsync({ email: selected.email, role });
      toast.success(`Invited as ${PROJECT_ROLE_LABELS[role]}`, { description: selected.email });
      if (response.data.invite_email_sent === false)
        toast.info(
          "The invitation was created, but its email was not sent. The user can respond in Projects → Invitations.",
        );
      onClose();
    } catch (error) {
      if (
        error instanceof ApiError &&
        ["INVITE_NOT_ALLOWED", "ROLE_REQUIRED", "PROJECT_ARCHIVED", "NOT_FOUND"].includes(error.code)
      )
        ended();
      else {
        void access.refetch();
        setSelected(null);
        candidates.refresh();
      }
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !invite.isPending) onClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        showCloseButton={!invite.isPending}
        onEscapeKeyDown={(event) => {
          if (invite.isPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (invite.isPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>They get an email and a notification, and join once they accept.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={invite.isPending}>
          <InviteCandidatePicker
            search={search}
            onSearchChange={setSearch}
            users={valid ? candidates.users : []}
            loading={changing || (valid && candidates.isPending)}
            loadingMore={candidates.isFetchingNextPage}
            hasMore={Boolean(candidates.hasNextPage)}
            failed={candidates.isError && !candidates.data}
            nextPageFailed={candidates.isFetchNextPageError}
            disabled={changing || !valid || candidates.ended || invite.isPending}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            loadMore={candidates.loadMore}
            retry={candidates.refetch}
          />
          <Field>
            <FieldLabel>Role</FieldLabel>
            <Select
              value={role}
              onValueChange={(value) => {
                const next = defaults.allowed_roles.find((item) => item === value);
                if (next) setRole(next);
              }}
              disabled={invite.isPending}
            >
              <SelectTrigger className="w-full" aria-label="Role for the new member">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {defaults.allowed_roles.map((item) => (
                    <SelectItem key={item} value={item}>
                      {PROJECT_ROLE_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>Choose the role they will have when they join.</FieldDescription>
          </Field>
          <p className="text-muted-foreground text-xs">
            {defaults.allowed_domains.length > 0 && `Allowed domains: ${defaults.allowed_domains.join(", ")}. `}
            Invitations sent now expire in {defaults.effective_ttl_hours} hours, up to the platform maximum.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={invite.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!selected || !allowed || invite.isPending || candidates.ended}>
              {invite.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
