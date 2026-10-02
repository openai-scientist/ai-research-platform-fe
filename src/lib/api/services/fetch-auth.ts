import type { CurrentUser, SessionResult } from "@/lib/auth/types";
import { ApiError, type ApiResponse } from "@/types/api";

import apiService from "../core";

export interface LoginRequest {
  email: string;
  password: string;
}
export interface RegisterRequest extends LoginRequest {
  display_name?: string;
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(0, response.error.code, response.message, response.error.details, response.meta.request_id);
  }
  return response.data;
}
async function authenticate(path: string, credentials: RegisterRequest): Promise<SessionResult> {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("auth:authenticating"));
  const result = unwrap((await apiService.post<ApiResponse<SessionResult>>(path, credentials)).data);
  apiService.setCsrfToken(result.csrf_token);
  return result;
}
export const fetchAuth = {
  login: (data: LoginRequest) => authenticate("/auth/login", data),
  register: ({ email, password, display_name }: RegisterRequest) =>
    authenticate("/auth/register", {
      email,
      password,
      ...(display_name !== undefined ? { display_name } : {}),
    }),
  me: async (signal?: AbortSignal): Promise<CurrentUser> =>
    unwrap((await apiService.request<ApiResponse<CurrentUser>>({ url: "/auth/me", signal })).data),
  csrfToken: async (signal?: AbortSignal): Promise<{ csrf_token: string }> => {
    const result = unwrap(
      (await apiService.request<ApiResponse<{ csrf_token: string }>>({ url: "/auth/csrf-token", signal })).data,
    );
    apiService.setCsrfToken(result.csrf_token);
    return result;
  },
  changePassword: async (data: { current_password: string; new_password: string }): Promise<void> => {
    await apiService.post<ApiResponse<null>>("/auth/change-password", data);
  },
  logout: async (allDevices = false): Promise<void> => {
    await apiService.post<ApiResponse<null>>(allDevices ? "/auth/logout-all" : "/auth/logout");
    apiService.setCsrfToken(null);
  },
};
