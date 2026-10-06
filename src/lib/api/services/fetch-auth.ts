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
export interface VerificationPending {
  email: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
}
export interface VerifyEmailRequest extends LoginRequest {
  code: string;
}
export interface ResetPasswordRequest {
  email: string;
  reset_token: string;
  new_password: string;
}
export interface VerifyResetPasswordRequest {
  email: string;
  code: string;
}
export interface PasswordResetGrant {
  reset_token: string;
  expires_in_seconds: number;
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

async function authenticate(path: string, credentials: LoginRequest | VerifyEmailRequest): Promise<SessionResult> {
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
  register: async (data: RegisterRequest): Promise<VerificationPending> => {
    const response = await apiService.post<ApiResult<VerificationPending>>("/auth/register", data);
    return response.data.data;
  },
  verifyEmail: async (data: VerifyEmailRequest): Promise<SessionResult> => {
    return authenticate("/auth/verify-email", data);
  },
  resendVerification: async (email: string): Promise<VerificationPending> => {
    const response = await apiService.post<ApiResult<VerificationPending>>("/auth/resend-verification", { email });
    return response.data.data;
  },
  forgotPassword: async (email: string): Promise<VerificationPending> => {
    const response = await apiService.post<ApiResult<VerificationPending>>("/auth/forgot-password", { email });
    return response.data.data;
  },
  verifyResetPassword: async (data: VerifyResetPasswordRequest): Promise<PasswordResetGrant> => {
    const response = await apiService.post<ApiResult<PasswordResetGrant>>("/auth/verify-reset-password", data);
    return response.data.data;
  },
  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    await apiService.post<AuthMutationResponse>("/auth/reset-password", data);
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
