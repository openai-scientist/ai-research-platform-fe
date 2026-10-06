"use client";

import { useRouter } from "next/navigation";

import { authKeys, invitationKeys, notificationKeys, projectKeys } from "@/lib/api/query-keys";
import { fetchInvitations, type InvitationItem, type InvitationListParams } from "@/lib/api/services/fetch-invitations";
import { broadcastAuthChange } from "@/lib/auth/session-events";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { restoreSession, selectAuth } from "@/lib/redux/slices/auth-slice";

import { useApiMutation, useApiQuery } from "./use-api";
import { useInfinityScroll } from "./use-infinity-scroll";

export function useInvitationsQuery(params?: InvitationListParams) {
  const auth = useAppSelector(selectAuth);
  return useApiQuery(invitationKeys.list(params), (signal) => fetchInvitations.getList(params, signal), {
    enabled: auth.initialized && auth.isAuthenticated && !auth.user?.must_change_password,
  });
}
export function useInfiniteInvitations(q = "") {
  const auth = useAppSelector(selectAuth);
  const search = q.trim();
  const valid = search.length <= 120;
  return useInfinityScroll<InvitationItem, InvitationListParams>({
    queryKey: invitationKeys.all,
    filters: search ? { q: search } : undefined,
    fetchPage: (params, signal) => fetchInvitations.getList(params, signal),
    enabled: valid && auth.initialized && auth.isAuthenticated && !auth.user?.must_change_password,
    pageSize: 20,
  });
}
export function useAnswerInvitationMutation() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  return useApiMutation(
    async ({ id, action }: { id: string; action: "accept" | "decline" }) => {
      const response = await fetchInvitations.answer(id, action);
      if (action === "accept") {
        await dispatch(restoreSession());
        broadcastAuthChange("memberships-changed");
        router.refresh();
      }
      return response;
    },
    [invitationKeys.all, projectKeys.all, authKeys.me, notificationKeys.all],
  );
}
