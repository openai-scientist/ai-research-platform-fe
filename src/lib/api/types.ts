import type { RequestParams } from "@/types/api";

export type { PlatformRole, ProjectRole } from "@/lib/auth/types";
export type { Pagination } from "@/types/api";

export interface ListParams extends RequestParams {
  limit?: number;
  offset?: number;
}

export interface TimeRangeParams extends ListParams {
  from?: string;
  to?: string;
}

export interface FileDownload {
  blob: Blob;
  filename: string | null;
  contentType: string;
}
