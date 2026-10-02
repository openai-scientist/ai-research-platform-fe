import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";

import { SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import { ApiError, type ApiResponse, type RequestParams } from "@/types/api";

import { getApiBaseUrl } from "./config";

class ApiService {
  private readonly client: AxiosInstance;
  private csrfToken: string | null = null;
  private csrfRequest: Promise<string> | null = null;
  private authRetryAt = 0;
  private authRateLimit: ApiError | null = null;

  constructor() {
    this.client = axios.create({ baseURL: getApiBaseUrl(), timeout: 30000, withCredentials: true });
    this.client.interceptors.request.use(async (config) => {
      const path = (config.url ?? "").replace(/^\/?api\/v1\//, "/");
      config.url = path;
      const method = (config.method ?? "get").toUpperCase();
      if ((path === "/auth/login" || path === "/auth/register") && Date.now() < this.authRetryAt) {
        throw new ApiError(
          429,
          "RATE_LIMITED",
          this.authRateLimit?.message ?? "Please wait before trying again.",
          this.authRateLimit?.details,
          this.authRateLimit?.requestId,
          Math.ceil((this.authRetryAt - Date.now()) / 1000),
        );
      }
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && path !== "/auth/login" && path !== "/auth/register") {
        config.headers.set("X-CSRF-Token", await this.getCsrfToken());
      }
      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        config.headers.delete("Content-Type");
      }
      return config;
    });
    this.client.interceptors.response.use(
      (response) => {
        if (response.data?.success === false) throw this.responseError(response);
        return response;
      },
      async (error: unknown) => {
        if (error instanceof ApiError) return Promise.reject(error);
        if (axios.isCancel(error)) return Promise.reject(error);
        if (!axios.isAxiosError(error)) return Promise.reject(error);
        if (error.response && typeof Blob !== "undefined" && error.response.data instanceof Blob) {
          try {
            error.response.data = JSON.parse(await error.response.data.text());
          } catch {
            error.response.data = null;
          }
        }
        const apiError = error.response
          ? this.responseError(error.response)
          : new ApiError(0, "NETWORK_ERROR", "Unable to connect to the server. Please try again.");
        if (apiError.code === "RATE_LIMITED" && apiError.retryAfter !== null) {
          const path = error.config?.url;
          if (path === "/auth/login" || path === "/auth/register") {
            this.authRetryAt = Date.now() + apiError.retryAfter * 1000;
            this.authRateLimit = apiError;
          }
        }
        if (apiError.code === "CSRF_INVALID") this.setCsrfToken(null);
        if (apiError.status === 401 && SESSION_INVALID_CODES.includes(apiError.code)) {
          this.setCsrfToken(null);
          if (typeof window !== "undefined") window.dispatchEvent(new Event("auth:expired"));
        }
        return Promise.reject(apiError);
      },
    );
  }

  private responseError(response: AxiosResponse<unknown>): ApiError {
    const body = response.data as Partial<Extract<ApiResponse<never>, { success: false }>> | undefined;
    const retryHeader = response.headers["retry-after"];
    const retrySeconds = retryHeader == null ? NaN : Number(retryHeader);
    const retryDate = retryHeader == null ? NaN : Date.parse(String(retryHeader));
    let retryAfter: number | null = null;
    if (Number.isFinite(retrySeconds)) {
      retryAfter = Math.max(0, Math.ceil(retrySeconds));
    } else if (Number.isFinite(retryDate)) {
      retryAfter = Math.max(0, Math.ceil((retryDate - Date.now()) / 1000));
    }
    return new ApiError(
      response.status,
      body?.error?.code ?? "HTTP_ERROR",
      body?.message ?? "The server encountered an error. Please try again.",
      body?.error?.details ?? [],
      body?.meta?.request_id ?? response.headers["x-request-id"] ?? null,
      retryAfter,
    );
  }

  setCsrfToken(token: string | null) {
    this.csrfToken = token;
  }

  private async getCsrfToken(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    this.csrfRequest ??= this.get<ApiResponse<{ csrf_token: string }>>("/auth/csrf-token")
      .then(({ data }) => {
        if (!data.success) throw new Error("Unable to obtain CSRF token");
        this.csrfToken = data.data.csrf_token;
        return this.csrfToken;
      })
      .finally(() => {
        this.csrfRequest = null;
      });
    return this.csrfRequest;
  }

  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.client.request<T>(config);
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "CSRF_INVALID" || config.signal?.aborted) throw error;
      // Only retry an explicitly rejected CSRF request, once. Never replay other mutations.
      this.setCsrfToken(null);
      return this.client.request<T>(config);
    }
  }
  get<T>(url: string, params?: RequestParams): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "GET", url, params });
  }
  post<T, D = unknown>(url: string, data?: D): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "POST", url, data });
  }
  put<T, D = unknown>(url: string, data?: D): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "PUT", url, data });
  }
  patch<T, D = unknown>(url: string, data?: D): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "PATCH", url, data });
  }
  delete<T>(url: string): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "DELETE", url });
  }
  upload<T>(url: string, data: FormData, onProgress?: (progress: number) => void): Promise<AxiosResponse<T>> {
    return this.request<T>({
      method: "POST",
      url,
      data,
      onUploadProgress: ({ loaded, total }) => {
        if (total) onProgress?.(Math.round((loaded * 100) / total));
      },
    });
  }
}
const apiService = new ApiService();
export default apiService;
