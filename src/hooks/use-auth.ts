"use client";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import apiService from "@/lib/api/core";
import {
  type ChangePasswordRequest,
  fetchAuth,
  type LoginRequest,
  type RegisterRequest,
  type ResetPasswordRequest,
  type VerifyEmailRequest,
} from "@/lib/api/services/fetch-auth";
import { CHANGE_PASSWORD_PATH, LOGIN_PATH, SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import { broadcastAuthChange } from "@/lib/auth/session-events";
import type { SessionResult } from "@/lib/auth/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { logout as clearSession, restoreSession, selectAuth, setSession } from "@/lib/redux/slices/auth-slice";
import { ApiError } from "@/types/api";
import { PlatformRole, ProjectRole } from "@/types/enums";

function destination(result: Pick<SessionResult, "user">) {
  const next = new URLSearchParams(window.location.search).get("next");
  if (result.user.must_change_password) {
    return next ? `${CHANGE_PASSWORD_PATH}?${new URLSearchParams({ next })}` : CHANGE_PASSWORD_PATH;
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
  const login = async (credentials: LoginRequest) => completeLogin(await fetchAuth.login(credentials));
  const register = (credentials: RegisterRequest) => fetchAuth.register(credentials);
  const verifyEmail = async (credentials: VerifyEmailRequest) =>
    completeLogin(await fetchAuth.verifyEmail(credentials));
  const resetPassword = async (data: ResetPasswordRequest) => {
    await fetchAuth.resetPassword(data);
    apiService.setCsrfToken(null);
    dispatch(clearSession());
    queryClient.clear();
    broadcastAuthChange("signed-out");
    router.replace(LOGIN_PATH);
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
  const changePassword = async (data: ChangePasswordRequest) => {
    await fetchAuth.changePassword(data);
    const action = await dispatch(restoreSession());
    broadcastAuthChange("password-changed");
    toast.success("Password changed. Other devices have been signed out.");
    if (window.location.pathname === CHANGE_PASSWORD_PATH) {
      if (restoreSession.fulfilled.match(action) && !action.payload.user.must_change_password) {
        router.replace(destination(action.payload));
      } else if (
        restoreSession.rejected.match(action) &&
        auth.user &&
        auth.session &&
        !SESSION_INVALID_CODES.includes(action.payload?.code ?? "")
      ) {
        // A successful password change clears this backend flag, even if /me is temporarily unavailable.
        const current = { user: { ...auth.user, must_change_password: false }, session: auth.session, memberships: [] };
        dispatch(setSession(current));
        router.replace(destination(current));
      } else {
        router.replace(LOGIN_PATH);
      }
      router.refresh();
    }
  };
  return {
    ...auth,
    isAdmin,
    projectRole,
    isProjectManager: projectRole === ProjectRole.ProjectManager,
    isResearcher: projectRole === ProjectRole.Researcher,
    isReviewer: projectRole === ProjectRole.Reviewer,
    login,
    register,
    verifyEmail,
    resendVerification: fetchAuth.resendVerification,
    forgotPassword: fetchAuth.forgotPassword,
    verifyResetPassword: fetchAuth.verifyResetPassword,
    resetPassword,
    logout,
    changePassword,
  };
}
