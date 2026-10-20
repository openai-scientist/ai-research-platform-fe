export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}
export interface ValidationDetail {
  field: string;
  message: string;
}
export interface ApiResult<T> {
  success: true;
  message: string;
  data: T;
  meta: { request_id: string; pagination: Pagination | null };
}

export interface ApiFailure {
  success: false;
  message: string;
  error: { code: string; details: ValidationDetail[]; reason?: string };
  meta: { request_id: string };
}

export type ApiResponse<T> = ApiResult<T> | ApiFailure;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ValidationDetail[] = [],
    public readonly requestId: string | null = null,
    public readonly retryAfter: number | null = null,
    public readonly reason: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export interface RequestParams {
  [key: string]: string | number | boolean | undefined | null | string[];
}
