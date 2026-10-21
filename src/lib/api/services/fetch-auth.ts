import type { CurrentUser, SessionResult, UserProfile } from "@/lib/auth/types";
import type { ApiResult } from "@/types/api";

import apiService from "../core";

export interface VerificationPending {
  email: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
}
export interface EmailCodeSignIn {
  email: string;
  code: string;
}
export interface SignInLinkInfo {
  email: string;
}

export interface CsrfToken {
  csrf_token: string;
}

export type SessionResponse = ApiResult<SessionResult>;
export type CurrentUserResponse = ApiResult<CurrentUser>;
export type CsrfTokenResponse = ApiResult<CsrfToken>;
export type AuthMutationResponse = ApiResult<null>;

async function authenticate(path: string, body: EmailCodeSignIn | { token: string }): Promise<SessionResult> {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("auth:authenticating"));
  const response = await apiService.post<SessionResponse>(path, body);
  const result = response.data.data;
  apiService.setCsrfToken(result.csrf_token);
  return result;
}
export const fetchAuth = {
  updateProfile: async (data: { display_name: string }): Promise<ApiResult<UserProfile>> => {
    const response = await apiService.patch<ApiResult<UserProfile>>("/auth/me", data);
    return response.data;
  },
  uploadAvatar: async (file: File): Promise<ApiResult<UserProfile>> => {
    const body = new FormData();
    body.append("file", file);
    const response = await apiService.upload<ApiResult<UserProfile>>("/auth/me/avatar", body);
    return response.data;
  },
  removeAvatar: async (): Promise<ApiResult<UserProfile>> => {
    const response = await apiService.delete<ApiResult<UserProfile>>("/auth/me/avatar");
    return response.data;
  },
  startEmailSignIn: async (email: string): Promise<VerificationPending> => {
    const response = await apiService.post<ApiResult<VerificationPending>>("/auth/email/start", { email });
    return response.data.data;
  },
  verifyEmailCode: async (data: EmailCodeSignIn): Promise<SessionResult> => {
    return authenticate("/auth/email/verify", data);
  },
  linkInfo: async (token: string): Promise<SignInLinkInfo> => {
    const response = await apiService.post<ApiResult<SignInLinkInfo>>("/auth/email/link-info", { token });
    return response.data.data;
  },
  verifyLink: async (token: string): Promise<SessionResult> => {
    return authenticate("/auth/email/verify-link", { token });
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
  logout: async (allDevices = false): Promise<void> => {
    await apiService.post<AuthMutationResponse>(allDevices ? "/auth/logout-all" : "/auth/logout");
    apiService.setCsrfToken(null);
  },
};
