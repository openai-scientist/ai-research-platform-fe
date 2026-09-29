"use server";

import { cookies } from "next/headers";

import {
  AUTH_COOKIE_NAME,
  canAccessProjects,
  findUserByCredentials,
  getRoleHomePath,
  type UserRole,
} from "@/lib/auth/auth-config";
import { findProjectForUser, LAST_PROJECT_COOKIE_NAME } from "@/lib/projects/project-data";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type LoginResult =
  | {
      success: true;
      role: UserRole;
      redirectTo: string;
    }
  | {
      success: false;
      error: string;
    };

export async function loginWithCredentials(email: string, password: string, remember: boolean): Promise<LoginResult> {
  const user = findUserByCredentials(email, password);

  if (!user) {
    return {
      success: false,
      error: "Email hoặc mật khẩu không đúng.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, user.email, {
    httpOnly: true,
    maxAge: remember ? SESSION_MAX_AGE : undefined,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  let redirectTo = getRoleHomePath(user.role);

  if (canAccessProjects(user.role)) {
    const lastProjectId = cookieStore.get(LAST_PROJECT_COOKIE_NAME)?.value;
    const lastProject = lastProjectId ? findProjectForUser(lastProjectId, user.email) : undefined;

    if (lastProject) {
      redirectTo = `/projects/${lastProject.id}`;
    }
  }

  return {
    success: true,
    role: user.role,
    redirectTo,
  };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
