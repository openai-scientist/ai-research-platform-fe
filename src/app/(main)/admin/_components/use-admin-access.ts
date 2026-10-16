"use client";

import { useSyncExternalStore } from "react";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuth } from "@/lib/redux/slices/auth-slice";
import { PlatformRole } from "@/types/enums";

// Nothing to subscribe to: the value only changes once, at hydration.
const subscribe = () => () => undefined;

export function useAdminAccess() {
  const auth = useAppSelector(selectAuth);
  // The session can be restored before this part of the page hydrates; wait for hydration so the
  // first client render matches the server's (signed out) HTML.
  const hydrated = useSyncExternalStore<boolean>(
    subscribe,
    () => true,
    () => false,
  );
  return {
    enabled:
      hydrated && auth.initialized && auth.isAuthenticated && auth.user?.platform_role === PlatformRole.PlatformAdmin,
    currentUserId: auth.user?.id,
  };
}
