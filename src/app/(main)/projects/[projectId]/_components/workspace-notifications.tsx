"use client";

import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { workspaceKeys } from "@/lib/api/query-keys";
import {
  fetchWorkspaceSettings,
  type NotificationEventKey,
  type NotificationPreferences,
  type NotificationPreferencesPatch,
} from "@/lib/api/services/fetch-workspace-settings";
import { ApiError } from "@/types/api";

import { useUnsavedWarning } from "./settings-panel";
import { WorkspaceSettingsLoading, WorkspaceSettingsReload } from "./workspace-settings-state";

const DESCRIPTIONS: Record<NotificationEventKey, string> = {
  review: "A research run needs a review decision.",
  finished: "A run finishes, fails or stops.",
  comments: "A new discussion starts on a research run.",
  members: "Invitations are answered or project membership changes.",
  budget: "Project spending reaches a warning threshold or its limit.",
  integrations: "A connected chat channel cannot receive updates.",
};

interface ProjectEmailControls {
  canManage: boolean;
  pending: boolean;
  supported: (group: NotificationEventKey) => boolean;
  update: (group: NotificationEventKey, enabled: boolean) => void;
}

export function WorkspaceNotifications({
  projectId,
  userId,
  emailControls,
}: {
  projectId: string;
  userId: string;
  emailControls?: ProjectEmailControls;
}) {
  const client = useQueryClient();
  const key = workspaceKeys.preferences(projectId, userId);
  const query = useApiQuery(key, (signal) => fetchWorkspaceSettings.preferences(projectId, signal));
  const mutation = useApiMutation((body: NotificationPreferencesPatch) =>
    fetchWorkspaceSettings.updatePreferences(projectId, body),
  );
  // Keep the version the edit began with. Background refetches must not overwrite unsaved choices.
  const [edit, setEdit] = useState<{ base: NotificationPreferences; values: NotificationPreferences } | null>(null);
  const [conflict, setConflict] = useState(false);
  const values = edit?.values ?? query.data?.data;
  const base = edit?.base ?? query.data?.data;
  const dirty = Boolean(edit && JSON.stringify(edit.base) !== JSON.stringify(edit.values));
  useUnsavedWarning(dirty);

  function update(change: (current: NotificationPreferences) => NotificationPreferences) {
    const latest = query.data?.data;
    if (!latest) return;
    setEdit((current) => ({ base: current?.base ?? latest, values: change(current?.values ?? latest) }));
  }

  async function save() {
    if (!base || !values || !dirty || mutation.isPending || conflict) return;
    const events: NotificationPreferencesPatch["events"] = {};
    for (const event of values.events) {
      const previous = base.events.find((item) => item.key === event.key);
      const changed: { in_app?: boolean } = {};
      if (previous && event.in_app !== previous.in_app) changed.in_app = event.in_app;
      if (Object.keys(changed).length) events[event.key] = changed;
    }
    const body: NotificationPreferencesPatch = { version: base.version };
    if (Object.keys(events).length) body.events = events;
    if (values.digest.frequency !== base.digest.frequency) body.digest = { frequency: values.digest.frequency };
    if (values.quiet_hours.enabled !== base.quiet_hours.enabled)
      body.quiet_hours = { enabled: values.quiet_hours.enabled };
    try {
      const result = await mutation.mutateAsync(body);
      client.setQueryData(key, result);
      setEdit(null);
      setConflict(false);
      toast.success("Notification preferences saved");
    } catch (error) {
      if (error instanceof ApiError && error.code === "NOTIFICATION_PREFERENCES_VERSION_CONFLICT") {
        setConflict(true);
        void query.refetch();
      }
    }
  }

  if (!values)
    return query.isPending ? (
      <WorkspaceSettingsLoading />
    ) : (
      <WorkspaceSettingsReload pending={query.isFetching} onReload={() => void query.refetch()} />
    );
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-lg">Notifications</h2>
        <p className="max-w-prose text-muted-foreground text-sm">
          Choose your in-app updates. Project email settings apply to all eligible recipients and do not affect chat
          integrations.
        </p>
      </div>
      <form
        id="workspace-notifications"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="flex min-w-0 flex-col gap-6"
      >
        <fieldset disabled={mutation.isPending || conflict} className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Project updates</CardTitle>
              <CardDescription>
                Choose which updates appear in your notification inbox. Invitations and notices about losing project
                access always arrive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="pb-4 text-muted-foreground text-xs">
                {emailControls?.canManage
                  ? "Email settings apply to everyone in this project. Email switches save immediately; your in-app choices are saved separately below."
                  : "Email notifications are set for the whole project by a Project Manager."}
              </p>
              <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] gap-3 border-b pb-3 text-muted-foreground text-xs sm:grid-cols-[minmax(0,1fr)_5rem_5rem]">
                <span>Event</span>
                <span className="text-center">In-app</span>
                <span className="text-center">Email</span>
              </div>
              <div className="divide-y">
                {values.events.map((event) => (
                  <div
                    key={event.key}
                    className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] items-center gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_5rem_5rem]"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="font-medium text-sm">{event.label}</p>
                      <p className="text-muted-foreground text-xs">{DESCRIPTIONS[event.key]}</p>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        aria-label={`${event.label}: in-app${event.supported.in_app ? "" : " (unavailable)"}`}
                        disabled={!event.supported.in_app}
                        checked={event.supported.in_app && event.in_app}
                        onCheckedChange={(checked) =>
                          update((current) => ({
                            ...current,
                            events: current.events.map((item) =>
                              item.key === event.key ? { ...item, in_app: checked } : item,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        aria-label={`${event.label}: project email`}
                        disabled={
                          !emailControls?.canManage || emailControls.pending || !emailControls.supported(event.key)
                        }
                        checked={query.data?.data.events.find((item) => item.key === event.key)?.email ?? event.email}
                        onCheckedChange={(checked) => emailControls?.update(event.key, checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <p className="text-muted-foreground text-xs">
            Email can still arrive when an in-app group is off. Only new events send email; turning a group off cancels
            its pending emails. Invitation emails are unaffected.
          </p>
        </fieldset>
      </form>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <Button
          variant="outline"
          disabled={mutation.isPending || (!dirty && !conflict) || (conflict && query.isFetching)}
          onClick={async () => {
            if (conflict) {
              const latest = await query.refetch();
              if (latest.isError) return;
            }
            setEdit(null);
            setConflict(false);
          }}
        >
          {conflict ? "Load latest preferences" : "Discard"}
        </Button>
        <Button
          type="submit"
          form="workspace-notifications"
          disabled={!dirty || conflict || mutation.isPending || emailControls?.pending}
        >
          {mutation.isPending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
      {query.isError && <WorkspaceSettingsReload pending={query.isFetching} onReload={() => void query.refetch()} />}
    </section>
  );
}
