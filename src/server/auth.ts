import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, findUserByEmail, type AuthUser } from "@/lib/auth/auth-config";

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const sessionEmail = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!sessionEmail) {
    return null;
  }

  return findUserByEmail(sessionEmail) ?? null;
}
