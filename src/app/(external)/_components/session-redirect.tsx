"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { fetchAuth } from "@/lib/api/services/fetch-auth";
import { CHANGE_PASSWORD_PATH, getRoleHomePath, LOGIN_PATH, SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import { notifyAuthError } from "@/lib/auth/form-errors";
import { broadcastAuthChange } from "@/lib/auth/session-events";
import type { CurrentUser } from "@/lib/auth/types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setSession } from "@/lib/redux/slices/auth-slice";
import { ApiError } from "@/types/api";

export function SessionRedirect({ current }: { current: CurrentUser }) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    async function completeSignIn() {
      // The backend established the cookie session before sending the browser to /.
      queryClient.clear();
      dispatch(setSession(current));
      let target = current.user.must_change_password
        ? CHANGE_PASSWORD_PATH
        : getRoleHomePath(current.user.platform_role);
      try {
        await fetchAuth.csrfToken(controller.signal);
      } catch (error) {
        if (controller.signal.aborted) return;
        notifyAuthError(error);
        if (error instanceof ApiError && SESSION_INVALID_CODES.includes(error.code)) target = LOGIN_PATH;
      }
      if (controller.signal.aborted) return;
      if (target !== LOGIN_PATH) broadcastAuthChange("signed-in");
      router.replace(target);
      router.refresh();
    }

    void completeSignIn();
    return () => controller.abort();
  }, [current, dispatch, queryClient, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4" aria-busy="true">
      <p role="status" className="text-muted-foreground text-sm">
        Signing you in...
      </p>
    </main>
  );
}
