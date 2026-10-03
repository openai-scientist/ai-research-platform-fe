"use client";

import { useQueryClient } from "@tanstack/react-query";

import { authKeys } from "@/lib/api/query-keys";
import {
  type ChangePasswordRequest,
  type CsrfToken,
  fetchAuth,
  type LoginRequest,
  type RegisterRequest,
} from "@/lib/api/services/fetch-auth";
import type { CurrentUser } from "@/lib/auth/types";

import { type ApiQueryOptions, useApiMutation, useApiQuery } from "./use-api";

// API-only hooks. Existing useAuth continues to own Redux, routing and cross-tab synchronization.
export function useCurrentUserQuery(options?: ApiQueryOptions<CurrentUser>) {
  return useApiQuery(authKeys.me, (signal) => fetchAuth.me(signal), { ...options, retry: false });
}
export function useCsrfTokenQuery(options?: ApiQueryOptions<CsrfToken>) {
  return useApiQuery(authKeys.csrf, (signal) => fetchAuth.csrfToken(signal), {
    staleTime: 0,
    ...options,
    retry: false,
  });
}
export function useLoginMutation() {
  const client = useQueryClient();
  return useApiMutation(async (data: LoginRequest) => {
    const result = await fetchAuth.login(data);
    client.clear();
    return result;
  });
}
export function useRegisterMutation() {
  const client = useQueryClient();
  return useApiMutation(async (data: RegisterRequest) => {
    const result = await fetchAuth.register(data);
    client.clear();
    return result;
  });
}
export function useChangePasswordMutation() {
  return useApiMutation((data: ChangePasswordRequest) => fetchAuth.changePassword(data), [authKeys.all]);
}
export function useLogoutMutation() {
  const client = useQueryClient();
  return useApiMutation(async () => {
    await fetchAuth.logout();
    client.clear();
  });
}
export function useLogoutAllMutation() {
  const client = useQueryClient();
  return useApiMutation(async () => {
    await fetchAuth.logout(true);
    client.clear();
  });
}
