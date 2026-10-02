import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getRoleHomePath } from "@/lib/auth/auth-config";
import { getAuthenticatedUser } from "@/server/auth";

import AuthShell from "./_components/auth-shell";

export default async function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getAuthenticatedUser();
  if (user) redirect(getRoleHomePath(user.role));
  return <AuthShell>{children}</AuthShell>;
}
