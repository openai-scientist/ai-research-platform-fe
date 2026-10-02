"use client";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { loginAsync, logoutAsync, selectAuth, selectUser, setupAutoRefresh } from "@/lib/redux/slices/auth-slice";
import { ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_RESEARCHER, ROLE_REVIEWER, ROLE_SYSTEM_ADMIN } from "@/lib/types/roles";

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);

  const roles = user?.role ?? [];
  const isAdmin = roles.includes(ROLE_ADMIN) || roles.includes(ROLE_SYSTEM_ADMIN);
  const isProjectManager = roles.includes(ROLE_PROJECT_MANAGER);
  const isResearcher = roles.includes(ROLE_RESEARCHER);
  const isReviewer = roles.includes(ROLE_REVIEWER);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const result = await dispatch(loginAsync(credentials)).unwrap();

      if (result.token) setupAutoRefresh(result.token, dispatch);

      toast.success("Đăng nhập thành công");

      if (roles.includes(ROLE_ADMIN) || roles.includes(ROLE_SYSTEM_ADMIN)) {
        router.push("/admin");
      } else if (roles.includes(ROLE_REVIEWER)) {
        router.push("/reviews");
      } else {
        router.push("/projects");
      }

      return result;
    } catch (error: unknown) {
      const message = typeof error === "string" ? error : "Đăng nhập thất bại";
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      toast.success("Đăng xuất thành công");
      router.push("/auth/v1/login");
    } catch {
      toast.error("Có lỗi xảy ra khi đăng xuất");
    }
  };

  return {
    ...auth,
    user,
    isAdmin,
    isProjectManager,
    isResearcher,
    isReviewer,
    login,
    logout,
  };
}
