import type { ApiResponse } from "@/types/api";

import apiService from "../core";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export const fetchProject = {
  getList: async (params?: { search?: string; page?: number; limit?: number }) =>
    (await apiService.get<ApiResponse<Project[]>>("api/v1/projects", params)).data,

  getById: async (id: string) => (await apiService.get<ApiResponse<Project>>(`api/v1/projects/${id}`)).data,

  create: async (data: Partial<Project>) => (await apiService.post<ApiResponse<Project>>("api/v1/projects", data)).data,

  update: async (id: string, data: Partial<Project>) =>
    (await apiService.put<ApiResponse<Project>>(`api/v1/projects/${id}`, data)).data,

  delete: async (id: string) => (await apiService.delete<ApiResponse<void>>(`api/v1/projects/${id}`)).data,
};
