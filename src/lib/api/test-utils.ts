import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

import type { ApiFailure, ApiResult } from "@/types/api";

export function success<T>(data: T): ApiResult<T> {
  return { success: true, message: "OK", data, meta: { request_id: "test-request", pagination: null } };
}

export function failure(code: string, message = "Backend error"): ApiFailure {
  return { success: false, message, error: { code, details: [] }, meta: { request_id: "test-request" } };
}

// Replace only the transport. Real Axios request/response interceptors still execute.
export function respond(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): AxiosResponse<unknown> {
  const response = { config, data, status, statusText: String(status), headers: new AxiosHeaders(headers) };
  if (status >= 400) throw new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined, response);
  return response;
}
