"use client";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { adminKeys, authKeys, notificationKeys, projectKeys } from "@/lib/api/query-keys";
import { fetchAdmin } from "@/lib/api/services/fetch-admin";
import { fetchAuth } from "@/lib/api/services/fetch-auth";
import { broadcastAuthChange } from "@/lib/auth/session-events";
import type { CurrentUser, UserProfile } from "@/lib/auth/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUser, updateUserProfile } from "@/lib/redux/slices/auth-slice";
import type { ApiResult } from "@/types/api";

import { useApiMutation } from "./use-api";

export function useProfileMutations(adminUserId?: string) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);
  const queryClient = useQueryClient();
  const router = useRouter();
  const complete = async (response: ApiResult<UserProfile>) => {
    if (response.data.id === currentUser?.id) {
      dispatch(updateUserProfile(response.data));
      queryClient.setQueryData<CurrentUser>(authKeys.me, (current) =>
        current ? { ...current, user: response.data } : undefined,
      );
      broadcastAuthChange("profile-changed");
      router.refresh();
    }
    return response;
  };
  const invalidate = [authKeys.me, adminKeys.all, projectKeys.all, notificationKeys.all];
  const update = useApiMutation(
    async (display_name: string) =>
      complete(
        adminUserId
          ? await fetchAdmin.updateUserProfile(adminUserId, { display_name })
          : await fetchAuth.updateProfile({ display_name }),
      ),
    invalidate,
  );
  const upload = useApiMutation(
    async (file: File) =>
      complete(adminUserId ? await fetchAdmin.uploadUserAvatar(adminUserId, file) : await fetchAuth.uploadAvatar(file)),
    invalidate,
  );
  const remove = useApiMutation(
    async () => complete(adminUserId ? await fetchAdmin.removeUserAvatar(adminUserId) : await fetchAuth.removeAvatar()),
    invalidate,
  );
  return { update, upload, remove, busy: update.isPending || upload.isPending || remove.isPending };
}
