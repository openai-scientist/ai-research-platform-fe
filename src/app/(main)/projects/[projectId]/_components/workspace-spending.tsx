"use client";

import { useState } from "react";

import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiQuery } from "@/hooks/use-api";
import { workspaceKeys } from "@/lib/api/query-keys";
import { fetchWorkspaceSettings } from "@/lib/api/services/fetch-workspace-settings";

import { SettingsSpending } from "./settings-system";
import { WorkspaceMonthPicker } from "./workspace-month-picker";
import { formatWorkspaceMoney as money, workspaceMonth } from "./workspace-settings-format";
import { WorkspaceSettingsLoading, WorkspaceSettingsReload } from "./workspace-settings-state";

const BUDGET_LABELS = {
  within_budget: "Within budget",
  warning: "Near limit",
  exceeded: "Limit reached",
  uncapped: "No monthly limit",
  unknown: "Budget usage incomplete",
};
const tokens = (value: number | null) => (value === null ? "—" : value.toLocaleString("en-US"));

export function WorkspaceSpending({
  projectId,
  timezone,
  readOnly,
}: {
  projectId: string;
  timezone: string;
  readOnly: boolean;
}) {
  const [month, setMonth] = useState<string>();
  const query = useApiQuery(
    workspaceKeys.usage(projectId, month),
    (signal) => fetchWorkspaceSettings.usage(projectId, month, signal),
    { refetchInterval: 60_000 },
  );
  const usage = query.data?.data;
  const currentMonth = workspaceMonth(timezone);
  const budget = usage?.budget;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section aria-label="Spending overview" className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-lg">Usage overview</h2>
            <p className="text-muted-foreground text-sm">Model costs in USD · {usage?.timezone ?? timezone}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <WorkspaceMonthPicker
              value={month ?? usage?.month ?? currentMonth}
              max={currentMonth}
              onChange={setMonth}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Refresh usage"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RefreshCw />
            </Button>
          </div>
        </div>
        {query.isPending ? (
          <WorkspaceSettingsLoading />
        ) : !usage ? (
          <WorkspaceSettingsReload pending={query.isFetching} onReload={() => void query.refetch()} />
        ) : (
          <>
            {usage.coverage.status !== "complete" && (
              <div className="flex flex-col items-start gap-2">
                <Badge variant="outline">
                  {usage.coverage.status === "partial" ? "Incomplete usage" : "Usage unavailable"}
                </Badge>
                <p className="max-w-prose text-muted-foreground text-sm">
                  {usage.coverage.status === "partial"
                    ? "Some costs are not recorded or priced yet. Reported spending is a minimum, and remaining budget cannot be determined."
                    : "No usage records are available for this month. Costs before the ledger was enabled are not reconstructed."}
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: usage.coverage.status === "partial" ? "Recorded spending (minimum)" : "Spent this month",
                  value: money(usage.totals.spent),
                  hint:
                    usage.totals.run_count === null
                      ? "Run count unavailable"
                      : `Across ${usage.totals.run_count} research runs`,
                },
                {
                  label: "Budget remaining",
                  value: money(budget?.remaining ?? null),
                  hint: !budget
                    ? "No historical budget snapshot"
                    : !budget.capped
                      ? "No monthly limit set"
                      : `Limit: ${money(budget.limit)}`,
                },
                {
                  label: "Average per run",
                  value: money(usage.totals.average_cost_per_run),
                  hint:
                    usage.coverage.status === "partial"
                      ? "Based on recorded costs only"
                      : "Runs with recorded model usage",
                },
              ].map((metric) => (
                <Card key={metric.label}>
                  <CardHeader>
                    <CardDescription>{metric.label}</CardDescription>
                    <CardTitle>
                      <span className="break-words text-2xl tabular-nums">{metric.value}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-xs">{metric.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {budget && (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Monthly budget</CardTitle>
                    <Badge variant={budget.status === "exceeded" ? "destructive" : "secondary"}>
                      {BUDGET_LABELS[budget.status]}
                    </Badge>
                  </div>
                  <CardDescription>
                    {budget.capped
                      ? `${money(usage.totals.spent)} recorded · ${money(budget.limit)} limit`
                      : "Research runs have no project monthly spending limit."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {budget.used_percent !== null && (
                    <>
                      <Progress
                        value={Math.min(100, Math.max(0, budget.used_percent))}
                        aria-label="Monthly budget used"
                      />
                      <p className="text-muted-foreground text-xs">
                        {budget.used_percent.toFixed(1)}% used · Warning at {budget.warning_percent}%
                      </p>
                    </>
                  )}
                  {budget.capped && (
                    <p className="text-muted-foreground text-sm">
                      {budget.reason_code === "PAUSE_TREATED_AS_STOP"
                        ? "The saved pause policy is treated as stop. Choose a supported policy below."
                        : budget.at_limit === "notify"
                          ? "Notify only: reaching the limit does not stop research runs."
                          : budget.enforced
                            ? "Soft cap: new runs and supported continuation actions are blocked at the limit. Work already sent to the engine may still incur costs."
                            : "This budget policy is not currently enforced."}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Usage by model</CardTitle>
                <CardDescription>
                  Costs recorded for {usage.month}. Missing token counts or prices are shown as unavailable.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usage.by_model.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>
                        {usage.coverage.status === "unavailable" ? "Usage unavailable" : "No model usage recorded"}
                      </EmptyTitle>
                      <EmptyDescription>
                        Model usage appears after costs are reported by a research run.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Runs</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Input tokens</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Output tokens</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usage.by_model.map((model) => (
                        <TableRow key={`${model.provider}:${model.model_id}`}>
                          <TableCell className="whitespace-normal break-words">
                            <p className="font-medium">{model.display_name}</p>
                            {model.provider && <p className="text-muted-foreground text-xs">{model.provider}</p>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{model.run_count}</TableCell>
                          <TableCell className="hidden text-right tabular-nums md:table-cell">
                            {tokens(model.input_tokens)}
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums md:table-cell">
                            {tokens(model.output_tokens)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {model.cost === null ? "Unpriced" : money(model.cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <p className="text-muted-foreground text-xs">
              Updated{" "}
              {new Intl.DateTimeFormat("en-US", {
                timeZone: usage.timezone,
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(usage.as_of))}
              . Model totals may include the same run under multiple models.
            </p>
            {query.isError && (
              <WorkspaceSettingsReload pending={query.isFetching} onReload={() => void query.refetch()} />
            )}
          </>
        )}
      </section>
      <SettingsSpending readOnly={readOnly} />
    </div>
  );
}
