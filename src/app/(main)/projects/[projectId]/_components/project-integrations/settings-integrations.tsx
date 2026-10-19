"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api";
import { useProjectAccess } from "@/hooks/use-project-access";
import { integrationKeys } from "@/lib/api/query-keys";
import { fetchProjectIntegrations, type ProjectIntegration } from "@/lib/api/services/fetch-project-integrations";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuth } from "@/lib/redux/slices/auth-slice";
import { PlatformRole } from "@/types/enums";

import { SettingsGroup, SettingsHeading } from "../settings-panel";
import { IntegrationForm } from "./integration-form";
import { IntegrationHistory } from "./integration-history";
import { IntegrationRow } from "./integration-row";
import { ProviderMark } from "./provider-mark";
import { useIntegrationActions } from "./use-integration-actions";

export function SettingsIntegrations({
  projectId,
  readOnly,
  canManage,
}: {
  projectId: string;
  readOnly: boolean;
  canManage: boolean;
}) {
  const access = useProjectAccess(projectId);
  const catalog = useApiQuery(integrationKeys.catalog, (signal) => fetchProjectIntegrations.catalog(signal), {
    staleTime: 5 * 60_000,
  });
  const list = useApiQuery(
    integrationKeys.project(projectId),
    (signal) => fetchProjectIntegrations.list(projectId, signal),
    {
      refetchInterval: (state) => (state.state.error ? false : 15_000),
    },
  );
  const actions = useIntegrationActions(projectId);
  const [form, setForm] = useState<{ provider: string; integration?: ProjectIntegration; repair?: boolean } | null>(
    null,
  );
  const [history, setHistory] = useState<ProjectIntegration | null>(null);
  const [removing, setRemoving] = useState<ProjectIntegration | null>(null);
  const isAdmin = useAppSelector(selectAuth).user?.platform_role === PlatformRole.PlatformAdmin;
  const canViewHistory = canManage || isAdmin;
  const canWrite = !readOnly && access.context?.permissions.can_manage_settings === true;
  const items = list.data?.data;
  const config = catalog.data?.data;
  const failed = list.isError || catalog.isError;
  const loading = list.isPending || catalog.isPending;
  const limitReached = Boolean(items && config && items.length >= config.limits.max_per_project);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <SettingsHeading title="Integrations" />
      <p className="max-w-prose text-muted-foreground text-sm">
        Keep your team updated in the apps they already use. Connect a channel to receive project notifications.
      </p>
      {loading && (
        <div role="status" aria-label="Loading integrations" className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}
      {failed && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => {
            void list.refetch();
            void catalog.refetch();
          }}
        >
          Reload integrations
        </Button>
      )}
      {!loading && !failed && config && items && (
        <div className="flex flex-col gap-6">
          {items.length > 0 && (
            <SettingsGroup title={`Connected channels · ${items.length} / ${config.limits.max_per_project}`}>
              <ul className="divide-y">
                {items.map((integration) => (
                  <IntegrationRow
                    key={integration.id}
                    integration={integration}
                    catalog={config}
                    canWrite={canWrite}
                    canManage={canViewHistory}
                    actions={actions}
                    onEdit={(repair) => setForm({ provider: integration.provider, integration, repair })}
                    onHistory={() => setHistory(integration)}
                    onRemove={() => setRemoving(integration)}
                  />
                ))}
              </ul>
            </SettingsGroup>
          )}
          <SettingsGroup title="Available integrations">
            <ul className="divide-y">
              {config.providers.map((provider) => {
                const count = items.filter((item) => item.provider === provider.key).length;
                return (
                  <li key={provider.key} className="flex min-w-0 items-center gap-4 p-4 sm:p-5">
                    <ProviderMark provider={provider.key} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <h3 className="font-medium text-sm">{provider.label}</h3>
                      <p className="text-muted-foreground text-sm">
                        Send project updates to a {provider.label} channel.
                      </p>
                      {count > 0 && (
                        <p className="text-muted-foreground text-xs">
                          {count} {count === 1 ? "channel connected" : "channels connected"}
                        </p>
                      )}
                    </div>
                    {canWrite && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={limitReached || actions.pending || actions.testing}
                        aria-label={`Connect ${provider.label}`}
                        onClick={() => setForm({ provider: provider.key })}
                      >
                        Connect
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </SettingsGroup>
        </div>
      )}
      {!canViewHistory && (
        <p className="text-muted-foreground text-sm">Only project managers can change integrations.</p>
      )}
      {canViewHistory && access.isError && (
        <Button variant="outline" className="self-start" onClick={() => void access.refetch()}>
          Reload access
        </Button>
      )}
      {limitReached && canWrite && (
        <p className="text-muted-foreground text-sm">
          The project has reached its integration limit. Remove a channel before adding another.
        </p>
      )}
      {form && canWrite && config && (
        <IntegrationForm
          catalog={config}
          providerKey={form.provider}
          integration={form.integration}
          repair={form.repair}
          actions={actions}
          onClose={() => setForm(null)}
        />
      )}
      {history && canViewHistory && config && (
        <IntegrationHistory
          projectId={projectId}
          integration={history}
          catalog={config}
          onClose={() => setHistory(null)}
        />
      )}
      {removing && canWrite && (
        <ConfirmDialog
          open
          title={`Remove "${removing.name}"?`}
          description="Messages to this channel will stop. You can add a new integration later."
          confirmLabel="Remove"
          destructive
          disabled={actions.pending}
          onOpenChange={(open) => {
            if (!open && !actions.pending) setRemoving(null);
          }}
          onConfirm={() => {
            void actions.remove(removing.id, removing.name).then((result) => {
              if (result) setRemoving(null);
            });
          }}
        />
      )}
    </div>
  );
}
