import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { deleteCookie, getCookie, setCookie } from "cookies-next";

import type { ApiError, RequestParams } from "@/types/api";
import { getAuthCookieConfig } from "@/utils/cookie-config";

class ApiService {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private refreshTokenVal: string | null = null;
  private isRefreshing: boolean;
  private onUnauthorizedCallback: (() => void) | null = null;
  // Queue: lưu các request 401 để retry sau khi refresh token thành công
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor(baseURL: string, timeout = 60000) {
    this.isRefreshing = false;
    this.client = axios.create({
      baseURL,
      timeout,
      headers: { "Content-Type": "application/json" },
    });
    this.setupInterceptors();
  }

  private processQueue(error: unknown, token: string | null = null) {
    for (const prom of this.failedQueue) {
      if (error) prom.reject(error);
      else prom.resolve(token as string);
    }
    this.failedQueue = [];
  }

  private setupInterceptors() {
    // Request Interceptor: tự động đính Bearer token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.authToken ?? (getCookie("authToken") as string | undefined);
        if (token) config.headers.Authorization = `Bearer ${token}`;
        // FormData: bỏ Content-Type để browser tự set boundary
        if (config.data instanceof FormData) delete config.headers["Content-Type"];
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response Interceptor: xử lý 401 — refresh token rồi retry
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = this.refreshTokenVal ?? (getCookie("refreshToken") as string | undefined);
            if (!refreshToken) throw new Error("No refresh token");

            const response = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6789/"}api/v1/auth/refresh-token`,
              { refreshToken },
              { headers: { "Content-Type": "application/json" } },
            );

            if (response.data?.data?.accessToken) {
              const { accessToken, refreshToken: newRefreshToken } = response.data.data;

              void setCookie("authToken", accessToken, getAuthCookieConfig());
              if (newRefreshToken) {
                void setCookie("refreshToken", newRefreshToken, getAuthCookieConfig());
                this.refreshTokenVal = newRefreshToken;
              }
              this.setAuthToken(accessToken);

              this.processQueue(null, accessToken);
              this.isRefreshing = false;

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }

            throw new Error("Invalid refresh response");
          } catch (refreshError) {
            this.isRefreshing = false;
            this.processQueue(refreshError, null);

            void deleteCookie("authToken", { path: "/" });
            void deleteCookie("refreshToken", { path: "/" });
            this.setAuthToken(null);
            this.refreshTokenVal = null;

            this.onUnauthorizedCallback?.();

            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("logout"));
            }

            return Promise.reject({
              code: 401,
              message: "Session expired. Please login again.",
              status: false,
            } as ApiError);
          }
        }

        const apiError: ApiError = {
          code: error.response?.status,
          message: error.response?.data?.message ?? error.message ?? "Có lỗi xảy ra",
          status: false,
          data: error.response?.data,
        };

        return Promise.reject(apiError);
      },
    );
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  setRefreshToken(token: string | null) {
    this.refreshTokenVal = token;
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  getAuthToken(): string | null {
    return this.authToken ?? (getCookie("authToken") as string | null);
  }

  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.request<T>(config);
  }

  async get<T>(url: string, params?: RequestParams): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "GET", url, params });
  }

  async post<T, D = unknown>(url: string, data?: D): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "POST", url, data });
  }

  async put<T, D = unknown>(url: string, data?: D): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "PUT", url, data });
  }

  async patch<T, D = unknown>(url: string, data?: D): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "PATCH", url, data });
  }

  async delete<T>(url: string): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "DELETE", url });
  }

  async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<AxiosResponse<T>> {
    return this.request<T>({
      method: "POST",
      url,
      data: formData,
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  }
}

const apiService = new ApiService(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6789/");

export default apiService;
