// API Response - shape của response từ backend
export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
  metadata?: unknown;
}

export interface ApiError {
  code?: number;
  message: string;
  status: boolean;
  data?: unknown;
}

// Request params chung
export interface RequestParams {
  [key: string]: string | number | boolean | undefined | null | string[];
}
