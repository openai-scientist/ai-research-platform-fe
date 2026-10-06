"use client";

import { useEffect, useId, useMemo } from "react";

import { type InfiniteData, useQueryClient } from "@tanstack/react-query";

import { type InfinitePageResult, toInfinitePage } from "@/lib/api/infinite-pagination";
import { fetchMembers, type InviteCandidate, type InviteCandidateParams } from "@/lib/api/services/fetch-members";

import { useInfinityScroll } from "./use-infinity-scroll";
import { useInviteCandidates } from "./use-invite-candidates";

export function useInfiniteInviteCandidates(projectId: string, q: string, onAccessEnded: () => void) {
  const instance = useId();
  const client = useQueryClient();
  const base = useMemo(() => ["invite-candidates", projectId, instance] as const, [projectId, instance]);
  const key = useMemo(() => [...base, "infinite", { q: q || undefined }, 20], [base, q]);
  const live = useInviteCandidates(projectId, { q: q || undefined, limit: 20, offset: 0 }, onAccessEnded);
  const valid = q.length <= 120;
  const query = useInfinityScroll<InviteCandidate, InviteCandidateParams>({
    queryKey: base,
    filters: { q: q || undefined },
    pageSize: 20,
    fetchPage: (params, signal) => fetchMembers.getInviteCandidates(projectId, params, signal),
    enabled: valid && !live.ended,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const refetch = query.refetch;
  useEffect(() => {
    if (!live.snapshot) return;
    let active = true;
    const snapshot = live.snapshot;
    const update = async () => {
      const previous = client.getQueryData<InfiniteData<InfinitePageResult<InviteCandidate>>>(key);
      await client.cancelQueries({ queryKey: key, exact: true });
      if (!active) return;
      const first = toInfinitePage(snapshot, 0, 20);
      client.setQueryData<InfiniteData<InfinitePageResult<InviteCandidate>>>(key, {
        pages: [first, ...(previous?.pages.slice(1) ?? [])],
        pageParams: previous?.pageParams ?? [0],
      });
      // Offset pages may shift after another PM invites/removes a user. Reload every loaded page after a live update.
      if ((previous?.pages.length ?? 0) > 1) await refetch();
    };
    void update();
    return () => {
      active = false;
    };
  }, [live.snapshot, key, client, refetch]);
  useEffect(
    () => () => {
      client.removeQueries({ queryKey: base });
    },
    [client, base],
  );
  const users = useMemo(() => [...new Map(query.items.map((user) => [user.id, user])).values()], [query.items]);
  return { ...query, users, connected: live.connected, ended: live.ended, refresh: live.refresh };
}
