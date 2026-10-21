"use client";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type EmailCodeSignIn, fetchAuth } from "@/lib/api/services/fetch-auth";
import { ONBOARDING_PATH, SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import { broadcastAuthChange } from "@/lib/auth/session-events";
import type { SessionResult } from "@/lib/auth/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { restoreSession, selectAuth, setSession } from "@/lib/redux/slices/auth-slice";
import { ApiError } from "@/types/api";
import { PlatformRole, ProjectRole } from "@/types/enums";

export function destination(result: Pick<SessionResult, "user">) {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!result.user.onboarded) {
    return next ? `${ONBOARDING_PATH}?${new URLSearchParams({ next })}` : ONBOARDING_PATH;
  }
  const fallback = result.user.platform_role === PlatformRole.PlatformAdmin ? "/admin" : "/projects";
  if (!next?.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  const target = new URL(next, window.location.origin);
  if (target.origin !== window.location.origin) return fallback;
  const paths =
    result.user.platform_role === PlatformRole.PlatformAdmin
      ? ["/admin", "/projects", "/dashboard", "/reviews"]
      : ["/projects", "/dashboard", "/reviews"];
  return paths.some((path) => target.pathname === path || target.pathname.startsWith(`${path}/`))
    ? `${target.pathname}${target.search}${target.hash}`
    : fallback;
}

export function useAuth(projectId?: string) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const auth = useAppSelector(selectAuth);
  const projectRole: ProjectRole | undefined = auth.memberships.find((item) => item.project_id === projectId)?.role;
  const isAdmin = auth.user?.platform_role === PlatformRole.PlatformAdmin;

  const completeLogin = async (result: SessionResult) => {
    queryClient.clear();
    dispatch(setSession({ user: result.user, session: result.session, memberships: [] }));
    broadcastAuthChange("signed-in");
    // Login/verification already established a valid session. A temporary /me failure must not undo it.
    const action = await dispatch(restoreSession());
    router.replace(destination(restoreSession.fulfilled.match(action) ? action.payload : result));
    router.refresh();
    return result;
  };
  const signInWithCode = async (data: EmailCodeSignIn) => completeLogin(await fetchAuth.verifyEmailCode(data));
  const signInWithLink = async (token: string) => completeLogin(await fetchAuth.verifyLink(token));
  const completeOnboarding = async (displayName: string) => {
    const result = await fetchAuth.updateProfile({ display_name: displayName });
    const action = await dispatch(restoreSession());
    broadcastAuthChange("profile-changed");
    // The name is saved; a temporary /me failure must not keep the user on this step.
    router.replace(destination(restoreSession.fulfilled.match(action) ? action.payload : { user: result.data }));
    router.refresh();
  };
  const logout = async (allDevices = false) => {
    try {
      await fetchAuth.logout(allDevices);
    } catch (error) {
      if (!(error instanceof ApiError) || !SESSION_INVALID_CODES.includes(error.code)) throw error;
    }
    // The auth provider owns cancellation, session cleanup, cross-tab sync and the single login navigation.
    window.dispatchEvent(new Event("auth:expired"));
    toast.success(allDevices ? "Signed out of all devices." : "Signed out successfully.");
  };
  return {
    ...auth,
    isAdmin,
    projectRole,
    isProjectManager: projectRole === ProjectRole.ProjectManager,
    isResearcher: projectRole === ProjectRole.Researcher,
    isReviewer: projectRole === ProjectRole.Reviewer,
    startEmailSignIn: fetchAuth.startEmailSignIn,
    signInWithCode,
    signInWithLink,
    completeOnboarding,
    logout,
  };
}
