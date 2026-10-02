"use client";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import apiService from "@/lib/api/core";
import { fetchAuth, type LoginRequest, type RegisterRequest } from "@/lib/api/services/fetch-auth";
import { LOGIN_PATH, SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import { broadcastAuthChange } from "@/lib/auth/session-events";
import type { ProjectRole, SessionResult } from "@/lib/auth/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { logout as clearSession, restoreSession, selectAuth, setSession } from "@/lib/redux/slices/auth-slice";
import { ApiError } from "@/types/api";

function destination(result: SessionResult) {
  const fallback = result.user.platform_role === "platform_admin" ? "/admin" : "/projects";
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  const target = new URL(next, window.location.origin);
  if (target.origin !== window.location.origin) return fallback;
  const paths =
    result.user.platform_role === "platform_admin"
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
  const isAdmin = auth.user?.platform_role === "platform_admin";

  const completeLogin = async (result: SessionResult) => {
    queryClient.clear();
    dispatch(setSession({ user: result.user, session: result.session, memberships: [] }));
    broadcastAuthChange("signed-in");
    // Login/register already established a valid session. A temporary /me failure must not undo it.
    await dispatch(restoreSession());
    router.replace(destination(result));
    router.refresh();
    return result;
  };
  const login = async (credentials: LoginRequest) => completeLogin(await fetchAuth.login(credentials));
  const register = async (credentials: RegisterRequest) => completeLogin(await fetchAuth.register(credentials));
  const logout = async (allDevices = false) => {
    try {
      await fetchAuth.logout(allDevices);
    } catch (error) {
      if (!(error instanceof ApiError) || !SESSION_INVALID_CODES.includes(error.code)) throw error;
    }
    apiService.setCsrfToken(null);
    dispatch(clearSession());
    queryClient.clear();
    broadcastAuthChange("signed-out");
    router.replace(LOGIN_PATH);
    router.refresh();
    toast.success(allDevices ? "Signed out of all devices." : "Signed out successfully.");
  };
  const changePassword = async (data: { current_password: string; new_password: string }) => {
    await fetchAuth.changePassword(data);
    broadcastAuthChange("password-changed");
    toast.success("Password changed. Other devices have been signed out.");
  };
  return {
    ...auth,
    isAdmin,
    projectRole,
    isProjectManager: isAdmin || projectRole === "project_manager",
    isResearcher: projectRole === "researcher",
    isReviewer: projectRole === "reviewer",
    login,
    register,
    logout,
    changePassword,
  };
}
