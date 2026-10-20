"use server";

import { revalidatePath } from "next/cache";

import { canCreateProject } from "@/lib/auth/auth-config";
import { addProject } from "@/lib/projects/project-data";
import { getAuthenticatedUser } from "@/server/auth";

export type CreateProjectResult =
  | {
      success: true;
      projectId: string;
    }
  | {
      success: false;
      error: string;
    };

export async function createProject(input: { name: string; description: string }): Promise<CreateProjectResult> {
  const user = await getAuthenticatedUser();

  if (!user || !canCreateProject(user.platform_role)) {
    return { success: false, error: "Bạn không có quyền tạo project." };
  }

  const name = input.name.trim();

  if (name.length < 3) {
    return { success: false, error: "Tên project phải có ít nhất 3 ký tự." };
  }

  const project = addProject({
    name,
    description: input.description.trim(),
    ownerEmail: user.email,
    ownerName: user.name,
  });

  revalidatePath("/projects", "layout");

  return { success: true, projectId: project.id };
}
