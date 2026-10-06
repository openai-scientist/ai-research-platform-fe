"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInfiniteInviteCandidates } from "@/hooks/use-infinite-invite-candidates";
import { useAddMemberMutation } from "@/hooks/use-members-query";
import type { InviteCandidate } from "@/lib/api/services/fetch-members";
import { ApiError } from "@/types/api";
import { ProjectRole } from "@/types/enums";

import { InviteCandidatePicker } from "./invite-candidate-picker";
import { InviteMemberRole } from "./invite-member-role";

export function InviteMemberDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<InviteCandidate | null>(null);
  const [role, setRole] = useState(ProjectRole.Researcher);
  const invite = useAddMemberMutation(projectId);
  const ended = useCallback(() => {
    onClose();
    router.refresh();
  }, [onClose, router]);
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
    if (!selected || invite.isPending || candidates.ended) return;
    try {
      const response = await invite.mutateAsync({ email: selected.email, role });
      toast.success(response.message);
      if (response.data.invite_email_sent === false)
        toast.info(
          "The invitation was created, but its email was not sent. The user can respond in Projects → Invitations.",
        );
      onClose();
    } catch (error) {
      if (error instanceof ApiError && ["ROLE_REQUIRED", "PROJECT_ARCHIVED", "NOT_FOUND"].includes(error.code)) ended();
      else {
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
          <DialogTitle>{selected ? "Choose a project role" : "Invite member"}</DialogTitle>
          <DialogDescription>
            {selected
              ? "Review access before sending the invitation."
              : "Find a person and add them to your invitation."}
          </DialogDescription>
        </DialogHeader>
        {selected ? (
          <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={invite.isPending}>
            <InviteMemberRole user={selected} role={role} onRoleChange={setRole} pending={invite.isPending} />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={invite.isPending} onClick={() => setSelected(null)}>
                Back
              </Button>
              <Button type="submit" disabled={invite.isPending || candidates.ended}>
                {invite.isPending ? "Inviting..." : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <InviteCandidatePicker
            search={search}
            onSearchChange={setSearch}
            users={valid ? candidates.users : []}
            loading={changing || (valid && candidates.isPending)}
            loadingMore={candidates.isFetchingNextPage}
            hasMore={Boolean(candidates.hasNextPage)}
            failed={candidates.isError && !candidates.data}
            nextPageFailed={candidates.isFetchNextPageError}
            disabled={changing || !valid || candidates.ended}
            onAdd={(user) => {
              setSelected(user);
              setRole(ProjectRole.Researcher);
            }}
            loadMore={candidates.loadMore}
            retry={candidates.refetch}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
