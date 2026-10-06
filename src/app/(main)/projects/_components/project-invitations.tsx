"use client";

import { type UIEvent, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { ArrowRight, FolderCheck, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAnswerInvitationMutation, useInfiniteInvitations } from "@/hooks/use-invitations-query";
import type { InvitationItem } from "@/lib/api/services/fetch-invitations";
import { ApiError } from "@/types/api";

import { ProjectInvitationCard } from "./project-invitation-card";

export function ProjectInvitations({
  embedded = false,
  onBusyChange,
}: {
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [accepted, setAccepted] = useState<{ id: string; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousQuery = useRef<string | undefined>(undefined);
  const query = useInfiniteInvitations(q);
  const answer = useAnswerInvitationMutation();
  const validSearch = q.length <= 120;
  const changing = search.trim() !== q;
  const rows = useMemo(() => [...new Map(query.items.map((item) => [item.id, item])).values()], [query.items]);
  useEffect(() => {
    onBusyChange?.(answer.isPending);
  }, [answer.isPending, onBusyChange]);
  useEffect(() => {
    if (search.trim() === q) return;
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setQ(next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, q]);
  useEffect(() => {
    if (previousQuery.current === q) return;
    previousQuery.current = q;
    const viewport = scrollRef.current?.querySelector("[data-slot=scroll-area-viewport]");
    if (viewport) viewport.scrollTop = 0;
  }, [q]);
  async function respond(invitation: InvitationItem, action: "accept" | "decline") {
    if (answer.isPending || changing || !validSearch) return;
    try {
      const result = await answer.mutateAsync({ id: invitation.id, action });
      toast.success(result.message);
      if (action === "accept") setAccepted({ id: result.data.project_id, name: result.data.project_name });
    } catch (error) {
      if (error instanceof ApiError && ["NOT_FOUND", "INVITE_EXPIRED", "PROJECT_ARCHIVED"].includes(error.code))
        void query.refetch();
    }
  }
  function scroll(event: UIEvent<HTMLDivElement>) {
    const viewport = event.target;
    if (!(viewport instanceof HTMLElement) || viewport.dataset.slot !== "scroll-area-viewport") return;
    if (
      validSearch &&
      !changing &&
      query.hasNextPage &&
      !query.isFetchNextPageError &&
      !answer.isPending &&
      viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 80
    )
      void query.loadMore();
  }
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!embedded && (
        <div>
          <h2 className="font-medium text-lg">Project invitations</h2>
          <p className="text-muted-foreground text-sm">
            Accept an invitation to access a project with the assigned role.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-0 flex-1">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            maxLength={120}
            disabled={answer.isPending}
            placeholder="Search by project or inviter"
            aria-label="Search invitations by project or inviter"
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        <Button
          variant="outline"
          disabled={changing || !validSearch || query.isFetching || answer.isPending}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
      </div>
      {accepted && (
        <Card size="sm" role="status">
          <CardHeader>
            <CardTitle className="flex min-w-0 items-center gap-2">
              <FolderCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="wrap-anywhere">{accepted.name}</span>
            </CardTitle>
            <CardDescription>Invitation accepted. You're ready to collaborate.</CardDescription>
            <CardAction className="col-start-1 row-span-1 row-start-3 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:self-center sm:justify-self-end">
              <Button asChild size="sm">
                <Link href={"/projects/" + encodeURIComponent(accepted.id)}>
                  Open project
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      )}
      {changing || (validSearch && query.isPending) ? (
        <Skeleton className="h-40 w-full" aria-label="Loading project invitations" />
      ) : !validSearch ? null : query.isError && !query.data ? (
        <Button variant="outline" className="self-start" onClick={() => void query.refetch()}>
          Reload invitations
        </Button>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{q ? "No matching invitations" : "No pending invitations"}</EmptyTitle>
            <EmptyDescription>
              {q ? "Try another project or inviter name." : "Invitations from a project manager will appear here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ScrollArea
          ref={scrollRef}
          className="max-h-[60dvh] [&_[data-slot=scroll-area-viewport]]:max-h-[60dvh]"
          onScrollCapture={scroll}
        >
          <ul className="flex flex-col gap-3 py-1 pr-3 pl-1" aria-label="Project invitations">
            {rows.map((invitation) => (
              <li key={invitation.id}>
                <ProjectInvitationCard
                  invitation={invitation}
                  disabled={answer.isPending || changing}
                  action={
                    answer.isPending && answer.variables?.id === invitation.id ? answer.variables.action : undefined
                  }
                  onAnswer={(item, action) => void respond(item, action)}
                />
              </li>
            ))}
          </ul>
          {query.isFetchingNextPage && (
            <div className="flex justify-center py-3" role="status" aria-label="Loading more invitations">
              <Spinner />
            </div>
          )}
          {query.hasNextPage && !query.isFetchingNextPage && (
            <Button
              type="button"
              variant={query.isFetchNextPageError ? "outline" : "ghost"}
              className="my-2 w-full"
              disabled={query.isFetching || answer.isPending}
              onClick={() => void query.loadMore()}
            >
              {query.isFetchNextPageError ? "Retry loading more invitations" : "Load more invitations"}
            </Button>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
