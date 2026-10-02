"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuth } from "@/lib/redux/slices/auth-slice";

export function useAdminAccess() {
  const auth = useAppSelector(selectAuth);
  return {
    enabled: auth.initialized && auth.isAuthenticated && auth.user?.platform_role === "platform_admin",
    currentUserId: auth.user?.id,
  };
}
