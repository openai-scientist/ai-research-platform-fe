import type { CurrentUser, SessionResult } from "@/lib/auth/types";
import type { ApiResult } from "@/types/api";

import apiService from "../core";

export interface LoginRequest {
  email: string;
  password: string;
}
export interface RegisterRequest extends LoginRequest {
  display_name?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface CsrfToken {
  csrf_token: string;
}

export type SessionResponse = ApiResult<SessionResult>;
export type CurrentUserResponse = ApiResult<CurrentUser>;
export type CsrfTokenResponse = ApiResult<CsrfToken>;
export type AuthMutationResponse = ApiResult<null>;

async function authenticate(path: string, credentials: RegisterRequest): Promise<SessionResult> {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("auth:authenticating"));
  const response = await apiService.post<SessionResponse>(path, credentials);
  const result = response.data.data;
  apiService.setCsrfToken(result.csrf_token);
  return result;
}
export const fetchAuth = {
  login: async (data: LoginRequest): Promise<SessionResult> => {
    return authenticate("/auth/login", data);
  },
  register: async (data: RegisterRequest): Promise<SessionResult> => {
    return authenticate("/auth/register", data);
  },
  me: async (signal?: AbortSignal): Promise<CurrentUser> => {
    const response = await apiService.get<CurrentUserResponse>("/auth/me", undefined, { signal });
    return response.data.data;
  },
  csrfToken: async (signal?: AbortSignal): Promise<CsrfToken> => {
    const response = await apiService.get<CsrfTokenResponse>("/auth/csrf-token", undefined, { signal });
    const result = response.data.data;
    apiService.setCsrfToken(result.csrf_token);
    return result;
  },
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiService.post<AuthMutationResponse>("/auth/change-password", data);
  },
  logout: async (allDevices = false): Promise<void> => {
    await apiService.post<AuthMutationResponse>(allDevices ? "/auth/logout-all" : "/auth/logout");
    apiService.setCsrfToken(null);
  },
};
