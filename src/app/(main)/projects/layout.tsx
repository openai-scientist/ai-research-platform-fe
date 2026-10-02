import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { canAccessProjects, getRoleHomePath } from "@/lib/auth/auth-config";
import { getAuthenticatedUser } from "@/server/auth";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (!canAccessProjects(user.role)) {
    redirect(getRoleHomePath(user.role));
  }

  return children;
}
