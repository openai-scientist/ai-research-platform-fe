"use client";

import { authKeys } from "@/lib/api/query-keys";
import { fetchAuth } from "@/lib/api/services/fetch-auth";
import type { CurrentUser } from "@/lib/auth/types";

import { type ApiQueryOptions, useApiQuery } from "./use-api";

// Read-only query. useAuth owns auth mutations, Redux, routing and cross-tab synchronization.
export function useCurrentUserQuery(options?: ApiQueryOptions<CurrentUser>) {
  return useApiQuery(authKeys.me, (signal) => fetchAuth.me(signal), { ...options, retry: false });
}
