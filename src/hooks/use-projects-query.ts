"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchProject, type Project } from "@/lib/api/services/fetch-project";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params?: { search?: string; page?: number; limit?: number }) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export function useProjectsQuery(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => fetchProject.getList(params),
  });
}

export function useProjectDetailQuery(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProject.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) => fetchProject.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Tạo dự án thành công!");
    },
    onError: () => {
      toast.error("Không thể tạo dự án. Vui lòng thử lại!");
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchProject.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Xóa dự án thành công!");
    },
    onError: () => {
      toast.error("Không thể xóa dự án.");
    },
  });
}
