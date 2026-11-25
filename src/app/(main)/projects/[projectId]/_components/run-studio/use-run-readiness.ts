"use client";

import { useEffect, useMemo } from "react";

import { toast } from "sonner";

import { useApiQuery } from "@/hooks/use-api";
import { useAllDataConnections, useConnectionAccess } from "@/hooks/use-data-connections";
import { useDatasetsQuery } from "@/hooks/use-datasets-query";
import { projectKeys, useProjectDetailQuery } from "@/hooks/use-projects-query";
import { useRunsQuery } from "@/hooks/use-runs-query";
import { workspaceKeys } from "@/lib/api/query-keys";
import { connectionOrigin } from "@/lib/api/services/fetch-datasets";
import { fetchProjectSettings } from "@/lib/api/services/fetch-project-settings";
import { fetchWorkspaceSettings } from "@/lib/api/services/fetch-workspace-settings";
import { isActiveRun } from "@/lib/research-workspace";
import { ProjectRole } from "@/types/enums";

import { DATASET_REQUIRED, evaluateReadiness, type Fact, type Readiness, type ReadinessFacts } from "./run-readiness";

function fact<T, R>(query: { isError: boolean; data: T | undefined }, pick: (data: T) => R): Fact<R> {
  if (query.data !== undefined) return { state: "ready", value: pick(query.data) };
  return query.isError ? { state: "error" } : { state: "loading" };
}

/**
 * The facts behind the "Before you run" checklist, read from the queries the Datasets, Connections, Settings and
 * Spending screens already use, so the answer matches those screens. A failed query shows its API message as a toast.
 */
export function useRunReadiness(projectId: string, enabled = true): Readiness {
  const project = useProjectDetailQuery(projectId, { enabled });
  const datasets = useDatasetsQuery(
    projectId,
    { limit: 100 },
    { enabled, silentErrorCodes: ["DATASET_ACCESS_DENIED"] },
  );
  const access = useConnectionAccess(projectId);
  const connections = useAllDataConnections(projectId);
  // Project settings are a manager's page: a member neither needs them here nor may read them.
  const manager = project.data?.data.my_role === ProjectRole.ProjectManager;
  const settings = useApiQuery(
    [...projectKeys.detail(projectId), "settings"],
    (signal) => fetchProjectSettings.get(projectId, signal),
    { enabled: enabled && manager },
  );
  const spending = useApiQuery(
    workspaceKeys.usage(projectId),
    (signal) => fetchWorkspaceSettings.usage(projectId, undefined, signal),
    { enabled },
  );
  const limited = settings.data?.data.capabilities["runs.concurrent"]?.supported === true;
  const runs = useRunsQuery(projectId, { limit: 50 }, { enabled: enabled && limited });

  const connectionError = connections.error;
  useEffect(() => {
    if (connectionError) toast.error(connectionError.message, { id: `readiness-connections:${projectId}` });
  }, [connectionError, projectId]);

  const facts = useMemo<ReadinessFacts>(
    () => ({
      projectId,
      datasetRequired: DATASET_REQUIRED,
      project: fact(project, ({ data }) => ({ status: data.status, role: data.my_role })),
      datasets: fact(datasets, ({ data }) =>
        data.map((dataset) => ({
          name: dataset.name,
          ready: dataset.latest_version !== null,
          connectionId: connectionOrigin(dataset.latest_version)?.connection_id ?? null,
        })),
      ),
      unhealthyConnectionIds: access.rateLimited
        ? { state: "error" }
        : fact(connections, (items) =>
            items
              .filter((item) => item.last_error_code !== null || access.revokedConnectionIds.has(item.id))
              .map((item) => item.id),
          ),
      settings: fact(settings, ({ data }) => {
        const limit = Number(data.sections.runs?.concurrent);
        return {
          model: String(data.sections.models?.stage ?? "default"),
          concurrentLimit: limited && Number.isInteger(limit) && limit > 0 ? limit : null,
        };
      }),
      spending: fact(spending, ({ data }) => {
        const budget = data.budget;
        return {
          capped: Boolean(budget?.capped),
          remaining: budget?.remaining != null ? Number(budget.remaining) : null,
          unit: "tokens",
          enforced: Boolean(budget?.enforced),
          exceeded: budget?.status === "exceeded",
        };
      }),
      activeRuns: fact(runs, ({ data }) => data.filter((run) => isActiveRun(run.status)).length),
    }),
    [projectId, project, datasets, connections, access, settings, spending, runs, limited],
  );
  return useMemo(() => evaluateReadiness(facts), [facts]);
}
