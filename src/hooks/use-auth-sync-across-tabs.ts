"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import apiService from "@/lib/api/core";
import { LOGIN_PATH, ONBOARDING_PATH, SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import { AUTH_CHANNEL, broadcastAuthChange } from "@/lib/auth/session-events";
import { useAppDispatch } from "@/lib/redux/hooks";
import { logout, restoreSession } from "@/lib/redux/slices/auth-slice";

export function useAuthSyncAcrossTabs() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const shouldRestoreSession = ["/admin", "/projects", "/reviews", "/dashboard", ONBOARDING_PATH].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    let endingSession = false;
    const restore = () => {
      const pending = dispatch(restoreSession());
      void pending.then((action) => {
        if (endingSession) return;
        if (
          restoreSession.fulfilled.match(action) &&
          !action.payload.user.onboarded &&
          window.location.pathname !== ONBOARDING_PATH
        ) {
          const next = `${window.location.pathname}${window.location.search}`;
          router.replace(`${ONBOARDING_PATH}?${new URLSearchParams({ next })}`);
        }
        if (
          restoreSession.rejected.match(action) &&
          !action.meta.aborted &&
          action.payload &&
          !SESSION_INVALID_CODES.includes(action.payload.code)
        ) {
          toast.error(action.payload.message);
        }
      });
      return pending;
    };
    let request = shouldRestoreSession ? restore() : null;
    const stopRestoring = () => request?.abort();
    const refresh = () => {
      if (!shouldRestoreSession || endingSession) return;
      request?.abort();
      request = restore();
    };
    const clearSession = () => {
      if (endingSession) return false;
      endingSession = true;
      request?.abort();
      apiService.setCsrfToken(null);
      dispatch(logout());
      // Clearing the cache while protected observers are mounted recreates their queries and another 401.
      // Cancel requests and let the document navigation discard the old cache and Router state together.
      void queryClient.cancelQueries();
      if (window.location.pathname.startsWith("/auth/")) {
        queryClient.clear();
      } else {
        window.location.replace(LOGIN_PATH);
      }
      return true;
    };
    const expire = () => {
      // Several requests can fail together. Announce the transition once; receiving tabs must not echo it.
      if (clearSession()) broadcastAuthChange("signed-out");
    };
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(AUTH_CHANNEL);
    if (channel) {
      channel.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (data === "signed-out") clearSession();
        if (data === "signed-in" || data === "profile-changed" || data === "memberships-changed") {
          if (endingSession && !window.location.pathname.startsWith("/auth/")) return;
          endingSession = false;
          apiService.setCsrfToken(null);
          queryClient.clear();
          refresh();
          router.refresh();
        }
      };
    }
    window.addEventListener("auth:expired", expire);
    window.addEventListener("auth:authenticating", stopRestoring);
    window.addEventListener("focus", refresh);
    return () => {
      request?.abort();
      channel?.close();
      window.removeEventListener("auth:expired", expire);
      window.removeEventListener("auth:authenticating", stopRestoring);
      window.removeEventListener("focus", refresh);
    };
  }, [dispatch, queryClient, router, shouldRestoreSession]);
}
