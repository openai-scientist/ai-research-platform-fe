"use client";

import { useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useProjectAccess } from "@/hooks/use-project-access";
import { workspaceKeys } from "@/lib/api/query-keys";
import type { NotificationEventKey } from "@/lib/api/services/fetch-workspace-settings";

import { useProjectSettings } from "./settings-api";
import { WorkspaceNotifications } from "./workspace-notifications";

/** Manager email controls use the project settings version, independently of personal preferences. */
export function ProjectEmailSettings({ readOnly, userId }: { readOnly: boolean; userId: string }) {
  const settings = useProjectSettings();
  const access = useProjectAccess(settings.project.id);
  const client = useQueryClient();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const canManage = !readOnly && Boolean(access.context?.permissions.can_manage_settings);

  async function update(group: NotificationEventKey, enabled: boolean) {
    if (
      lock.current ||
      settings.pending ||
      !canManage ||
      !settings.snapshot.capabilities[`notifications.${group}`]?.supported
    )
      return;
    lock.current = true;
    setPending(true);
    try {
      const result = await settings.save("notifications", { [group]: enabled }, settings.snapshot.version);
      if (!result) return;
      if ("conflictVersion" in result) {
        // The settings provider already shows the conflict error and refreshes its snapshot.
        await client.invalidateQueries({ queryKey: workspaceKeys.preferenceLists(settings.project.id) });
        return;
      }
      toast.success("Project email settings saved");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <WorkspaceNotifications
      projectId={settings.project.id}
      userId={userId}
      emailControls={{
        canManage,
        pending: pending || settings.pending,
        supported: (group) => Boolean(settings.snapshot.capabilities[`notifications.${group}`]?.supported),
        update: (group, enabled) => {
          void update(group, enabled);
        },
      }}
    />
  );
}
