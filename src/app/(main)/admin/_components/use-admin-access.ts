"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuth } from "@/lib/redux/slices/auth-slice";
import { PlatformRole } from "@/types/enums";

export function useAdminAccess() {
  const auth = useAppSelector(selectAuth);
  return {
    enabled: auth.initialized && auth.isAuthenticated && auth.user?.platform_role === PlatformRole.PlatformAdmin,
    currentUserId: auth.user?.id,
  };
}
