"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import apiService from "@/lib/api/core";
import { CHANGE_PASSWORD_PATH, LOGIN_PATH, SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import { AUTH_CHANNEL, broadcastAuthChange } from "@/lib/auth/session-events";
import { useAppDispatch } from "@/lib/redux/hooks";
import { logout, restoreSession } from "@/lib/redux/slices/auth-slice";

export function useAuthSyncAcrossTabs() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const shouldRestoreSession = ["/admin", "/projects", "/reviews", "/dashboard", CHANGE_PASSWORD_PATH].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    const restore = () => {
      const pending = dispatch(restoreSession());
      void pending.then((action) => {
        if (
          restoreSession.fulfilled.match(action) &&
          action.payload.user.must_change_password &&
          window.location.pathname !== CHANGE_PASSWORD_PATH
        ) {
          const next = `${window.location.pathname}${window.location.search}`;
          router.replace(`${CHANGE_PASSWORD_PATH}?${new URLSearchParams({ next })}`);
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
      if (!shouldRestoreSession) return;
      request?.abort();
      request = restore();
    };
    const clearSession = () => {
      request?.abort();
      apiService.setCsrfToken(null);
      dispatch(logout());
      queryClient.clear();
      if (!window.location.pathname.startsWith("/auth/")) {
        router.replace(LOGIN_PATH);
        router.refresh();
      }
    };
    const expire = () => {
      clearSession();
      broadcastAuthChange("signed-out");
    };
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(AUTH_CHANNEL);
    if (channel) {
      channel.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (data === "signed-out") clearSession();
        if (data === "signed-in" || data === "password-changed") {
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
