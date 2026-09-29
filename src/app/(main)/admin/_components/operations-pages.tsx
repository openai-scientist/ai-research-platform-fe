import { Activity, AlertTriangle, CheckCircle2, Clock3, Gauge, RefreshCw, Server, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { AnalyticsKpiStrip, type AnalyticsKpiItem } from "../../dashboard/analytics/_components/analytics-kpi-strip";
import { AnalyticsToolbar } from "../../dashboard/analytics/_components/analytics-toolbar";
import { RealtimeVisitors, type RealtimeBreakdownItem } from "../../dashboard/analytics/_components/realtime-visitors";
import { TopTrafficSources, type TrafficSourceTab } from "../../dashboard/analytics/_components/top-traffic-sources";
import {
  PerformanceOverview,
  type PerformanceOverviewPoint,
} from "../../dashboard/default/_components/performance-overview";
import { logs, systemServices } from "./admin-data";
import { AdminPageHeader, InlineProgress, MetricCard, SectionCard, StatusBadge } from "./admin-primitives";

const usageKpis: AnalyticsKpiItem[] = [
  { change: "14.2%", direction: "up", from: "24.8M", label: "Tokens consumed", period: "this month", value: "28.4M" },
  { change: "9.7%", direction: "up", from: "$1,137", label: "Estimated cost", period: "this month", value: "$1,248" },
  { change: "8.4%", direction: "up", from: "29.3K", label: "AI requests", period: "this month", value: "31.8K" },
  {
    change: "6.1%",
    direction: "down",
    from: "$0.043",
    label: "Cost per request",
    period: "this month",
    value: "$0.039",
  },
  {
    change: "43%",
    direction: "down",
    from: "50M",
    label: "Budget remaining",
    period: "monthly token cap",
    value: "21.6M",
  },
];

const usageTrendData: PerformanceOverviewPoint[] = [
  { activeAccounts: 0, date: "2026-09-08", newCustomers: 42_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-09", newCustomers: 58_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-10", newCustomers: 51_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-11", newCustomers: 76_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-12", newCustomers: 63_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-13", newCustomers: 48_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-14", newCustomers: 57_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-15", newCustomers: 48_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-16", newCustomers: 62_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-17", newCustomers: 55_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-18", newCustomers: 84_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-19", newCustomers: 74_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-20", newCustomers: 92_000, returningUsers: 0 },
  { activeAccounts: 0, date: "2026-09-21", newCustomers: 68_000, returningUsers: 0 },
];

const systemTrendData: PerformanceOverviewPoint[] = [
  { activeAccounts: 33, date: "2026-09-08", newCustomers: 34, returningUsers: 1 },
  { activeAccounts: 37, date: "2026-09-09", newCustomers: 39, returningUsers: 1 },
  { activeAccounts: 35, date: "2026-09-10", newCustomers: 36, returningUsers: 2 },
  { activeAccounts: 40, date: "2026-09-11", newCustomers: 42, returningUsers: 1 },
  { activeAccounts: 37, date: "2026-09-12", newCustomers: 38, returningUsers: 2 },
  { activeAccounts: 40, date: "2026-09-13", newCustomers: 41, returningUsers: 1 },
  { activeAccounts: 44, date: "2026-09-14", newCustomers: 45, returningUsers: 2 },
  { activeAccounts: 42, date: "2026-09-15", newCustomers: 43, returningUsers: 1 },
  { activeAccounts: 47, date: "2026-09-16", newCustomers: 48, returningUsers: 2 },
  { activeAccounts: 45, date: "2026-09-17", newCustomers: 46, returningUsers: 1 },
  { activeAccounts: 50, date: "2026-09-18", newCustomers: 52, returningUsers: 2 },
  { activeAccounts: 47, date: "2026-09-19", newCustomers: 49, returningUsers: 1 },
  { activeAccounts: 54, date: "2026-09-20", newCustomers: 56, returningUsers: 2 },
  { activeAccounts: 49, date: "2026-09-21", newCustomers: 51, returningUsers: 1 },
];

const runtimeBreakdown: RealtimeBreakdownItem[] = [
  { label: "API Gateway", markerClassName: "bg-emerald-500", value: 14 },
  { label: "Experiment Runner", markerClassName: "bg-sky-500", value: 10 },
  { label: "Decision Provider", markerClassName: "bg-violet-500", value: 8 },
  { label: "Worker queue", markerClassName: "bg-amber-500", value: 6 },
];

const systemIncidents = [
  {
    detail: "OpenAI · p95 reached 2.4s",
    level: "Warning" as const,
    time: "42 min ago",
    title: "Provider latency above target",
  },
  {
    detail: "3 fallback decisions in the last hour",
    level: "Info" as const,
    time: "1 hr ago",
    title: "Decision provider fallback triggered",
  },
  {
    detail: "Worker pool recovered automatically",
    level: "Healthy" as const,
    time: "3 hr ago",
    title: "Queue backlog cleared",
  },
] as const;

const usageBreakdownTabs: TrafficSourceTab[] = [
  {
    data: [
      { label: "12.8M", source: "Clinical Trial Signals", visitors: 12_800 },
      { label: "8.4M", source: "Protein Folding Study", visitors: 8400 },
      { label: "5.9M", source: "Climate Risk Model", visitors: 5900 },
      { label: "2.1M", source: "Materials Discovery", visitors: 2100 },
    ],
    label: "Projects",
    value: "projects",
  },
  {
    data: [
      { label: "18.4K", source: "OpenAI", visitors: 18_400 },
      { label: "9.7K", source: "Anthropic", visitors: 9700 },
      { label: "2.8K", source: "Local LLM", visitors: 2800 },
      { label: "620", source: "Fallback route", visitors: 620 },
    ],
    label: "Providers",
    value: "providers",
  },
  {
    data: [
      { label: "12.8M", source: "GPT-5", visitors: 12_800 },
      { label: "6.2M", source: "Claude Sonnet 4", visitors: 6200 },
      { label: "1.9M", source: "Research Llama", visitors: 1900 },
      { label: "1.4M", source: "GPT-4.1", visitors: 1400 },
    ],
    label: "Models",
    value: "models",
  },
];

const usageLedger = [
  ["Clinical Trial Signals", "Project", "12.8K", "8.2M", "4.6M", "12.8M", "$612.40", "49%"],
  ["Protein Folding Study", "Project", "8.4K", "5.2M", "3.2M", "8.4M", "$392.10", "31%"],
  ["Climate Risk Model", "Project", "5.9K", "3.7M", "2.2M", "5.9M", "$274.60", "21%"],
  ["Materials Discovery", "Project", "2.1K", "1.3M", "800K", "2.1M", "$94.80", "8%"],
] as const;

export function AdminUsage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Operations"
        title="Usage & Cost"
        description="Understand consumption, cost drivers, and budget health across the research platform."
        actions={<AnalyticsToolbar actionLabel="Usage actions" />}
      />

      <AnalyticsKpiStrip items={usageKpis} />

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <PerformanceOverview
            className="h-full"
            data={usageTrendData}
            title="Token consumption"
            description="Daily token volume across experiments, agents, and decision gates."
            headerBadge="28.4M / 50M tokens"
            labels={{ newCustomers: "Tokens" }}
            showControls={false}
            singleSeries
            summaryItems={[
              { detail: "tokens / day", label: "Daily average", value: "67.6K" },
              { detail: "09/20", label: "Peak day", value: "92K" },
              { detail: "82% of cap", label: "Projected month", value: "41.2M" },
            ]}
          />
        </div>

        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            className="h-full"
            contentClassName="flex flex-1 flex-col pt-0"
            divided={false}
            title="Budget health"
            description="Track current consumption against monthly safeguards."
            action={<StatusBadge status="Healthy" />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <UsageStat label="Current spend" value="$1,248" detail="of $1,850 monthly cap" />
              <UsageStat label="Month-end forecast" value="$1,382" detail="projected spend" />
              <UsageStat label="Remaining budget" value="$602" detail="available until reset" />
            </div>

            <div className="mt-4 space-y-4">
              <InlineProgress label="Tokens consumed" value={57} />
              <InlineProgress label="Projected token cap" value={82} />
              <InlineProgress label="Cost budget consumed" value={68} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-2.5 text-sm">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Next budget reset</p>
                <p className="mt-1 font-medium">01 Oct 2026</p>
              </div>
              <p className="shrink-0 text-muted-foreground text-xs">9 days remaining</p>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="font-medium text-xs">One project needs attention</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Clinical Trial Signals is at 82% of its monthly budget. Review before the next experiment batch.
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-4 border-t pt-4 text-xs">
              <span className="text-muted-foreground">Budget scope</span>
              <span className="truncate font-medium">All research workspaces</span>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <TopTrafficSources tabs={usageBreakdownTabs} title="Usage allocation" valueLabel="Tokens / requests" />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            className="h-full"
            title="Spend drivers"
            description="Which platform activities are shaping the current bill."
          >
            <div className="space-y-4">
              <InlineProgress label="Deep reasoning" value={46} />
              <InlineProgress label="Scientific refinement" value={28} />
              <InlineProgress label="Hypothesis generation" value={17} />
              <InlineProgress label="Tool calls and retries" value={9} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <UsageStat label="Projected spend" value="$1,382" detail="this month" />
              <UsageStat label="Remaining cap" value="$602" detail="monthly limit" />
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Usage ledger"
        description="A single auditable view of requests, token volume, cost, and share by research workspace."
        action={<Badge variant="outline">4 tracked projects</Badge>}
      >
        <div className="-mx-4 -mt-4 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Input tokens</TableHead>
                <TableHead>Output tokens</TableHead>
                <TableHead>Total tokens</TableHead>
                <TableHead>Estimated cost</TableHead>
                <TableHead>Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageLedger.map(([scope, type, requests, input, output, total, cost, share]) => (
                <TableRow key={scope}>
                  <TableCell className="font-medium">{scope}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{type}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{requests}</TableCell>
                  <TableCell className="tabular-nums">{input}</TableCell>
                  <TableCell className="tabular-nums">{output}</TableCell>
                  <TableCell className="font-medium tabular-nums">{total}</TableCell>
                  <TableCell className="font-medium tabular-nums">{cost}</TableCell>
                  <TableCell className="tabular-nums">{share}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

function UsageStat({
  detail,
  label,
  value,
}: {
  readonly detail: string;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 p-3">
      <p className="truncate text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-heading text-xl tabular-nums">{value}</p>
      <p className="mt-1 truncate text-muted-foreground text-xs">{detail}</p>
    </div>
  );
}

export function AdminSystem() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Operations"
        title="System Health"
        description="Monitor infrastructure, runtime performance, sandbox capacity, and provider availability."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">Updated 30s ago</span>
            <Button size="sm" variant="outline">
              <RefreshCw data-icon="inline-start" />
              Refresh status
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="API latency"
          value="142ms"
          change="-8.4%"
          detail="p95 · last hour"
          icon={Gauge}
          trend="down"
        />
        <MetricCard label="Service uptime" value="99.93%" change="+0.04pp" detail="last 30 days" icon={CheckCircle2} />
        <MetricCard label="Request rate" value="38.4 req/s" change="+12.1%" detail="last 15 minutes" icon={Activity} />
        <MetricCard label="Active agent runs" value="18" change="+3" detail="currently running" icon={Zap} />
        <MetricCard label="Queued jobs" value="12" change="-4" detail="vs last hour" icon={Clock3} trend="down" />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <PerformanceOverview
            className="h-full"
            data={systemTrendData}
            description="Requests, successful completions, and retry traffic over the last 14 days."
            headerBadge="Live · 30s"
            labels={{
              activeAccounts: "Successful requests",
              newCustomers: "Total requests",
              returningUsers: "Retries & fallback",
            }}
            showControls={false}
            title="Request throughput"
          />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <RealtimeVisitors
            breakdown={runtimeBreakdown}
            chartLabel="Requests"
            liveLabel="Receiving traffic"
            title="Live request rate"
            unit="req/s"
            value="38.4"
          />
        </div>
      </div>

      <SectionCard
        title="Service health"
        description="Current health across infrastructure and runtime components."
        action={<Badge variant="outline">6 healthy · 1 degraded</Badge>}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {systemServices.map((service) => (
            <div key={service.name} className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Server className="size-4" />
                </div>
                <StatusBadge status={service.status} />
              </div>
              <p className="mt-4 font-medium text-sm">{service.name}</p>
              <p className="mt-1 font-heading text-2xl tabular-nums">{service.metric}</p>
              <p className="mt-1 text-muted-foreground text-xs">{service.detail}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <SectionCard
            className="h-full"
            title="Runtime capacity"
            description="Execution pressure across sandbox and worker resources."
            action={<StatusBadge status="Healthy" />}
          >
            <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
              <div className="space-y-5">
                <InlineProgress label="CPU usage" value={44} />
                <InlineProgress label="Memory usage" value={58} />
                <InlineProgress label="Queued executions" value={22} />
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4">
                <MiniHealth label="Active sandboxes" value="3" />
                <MiniHealth label="Average execution" value="4m 12s" />
                <MiniHealth label="Failed executions" value="7" />
                <MiniHealth label="Timeout count" value="3" />
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            className="h-full"
            title="Recent incidents"
            description="Events that affected reliability or execution."
          >
            <div className="space-y-3">
              {systemIncidents.map((incident) => (
                <div key={incident.title} className="flex items-start gap-3 rounded-lg border p-3">
                  <StatusBadge status={incident.level} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{incident.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {incident.detail} · {incident.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function MiniHealth({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

const levelClass: Record<string, string> = {
  INFO: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  WARNING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ERROR: "border-destructive/30 bg-destructive/10 text-destructive",
  CRITICAL: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function AdminLogs() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Operations"
        title="Logs & Monitoring"
        description="Trace system activity, agent execution, experiments, decisions, and security events."
        actions={
          <>
            <Button size="sm" variant="outline">
              <RefreshCw data-icon="inline-start" />
              Live refresh
            </Button>
            <Button size="sm">Export logs</Button>
          </>
        }
      />

      <Tabs defaultValue="system" className="gap-5">
        <TabsList
          variant="line"
          className="w-full justify-start gap-2 overflow-x-auto border-b ps-0 *:data-[slot=tabs-trigger]:flex-none"
        >
          <TabsTrigger value="system">System Logs</TabsTrigger>
          <TabsTrigger value="agent">Agent Logs</TabsTrigger>
          <TabsTrigger value="experiment">Experiment Logs</TabsTrigger>
          <TabsTrigger value="decision">Decision Logs</TabsTrigger>
          <TabsTrigger value="security">Security Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              Date: Last 24 hours
            </Button>
            <Button size="sm" variant="outline">
              Level: All
            </Button>
            <Button size="sm" variant="outline">
              Component: All
            </Button>
            <Button size="sm" variant="outline">
              Status: All
            </Button>
          </div>
          <SectionCard
            title="System activity"
            description="Structured logs from platform services and runtime components."
          >
            <div className="-mx-4 -mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={`${log.timestamp}-${log.event}`}>
                      <TableCell className="font-mono text-muted-foreground text-xs">{log.timestamp}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={levelClass[log.level]}>
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>{log.project}</TableCell>
                      <TableCell>{log.component}</TableCell>
                      <TableCell className="max-w-64 truncate">{log.event}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "Failed" ? "destructive" : "outline"}>{log.status}</Badge>
                      </TableCell>
                      <TableCell>{log.duration}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="agent">
          <LogDetail
            title="Agent logs"
            description="Agent stage, model, provider, tool calls, retries, latency, and cost will appear here."
          />
        </TabsContent>
        <TabsContent value="experiment">
          <LogDetail
            title="Experiment logs"
            description="Monitor queued, running, validating, completed, failed, and cancelled experiments."
          />
        </TabsContent>
        <TabsContent value="decision">
          <LogDetail
            title="Decision logs"
            description="Review provider, research state version, confidence, reason codes, and fallback usage."
          />
        </TabsContent>
        <TabsContent value="security">
          <LogDetail
            title="Security logs"
            description="Audit authentication, role changes, sensitive configuration, and access events."
          />
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Logs today" value="18,492" change="+8.2%" detail="vs yesterday" icon={Activity} />
        <MetricCard
          label="Error rate"
          value="0.42%"
          change="-0.18%"
          detail="last 24 hours"
          icon={AlertTriangle}
          trend="down"
        />
        <MetricCard
          label="Critical events"
          value="3"
          change="-40.0%"
          detail="last 24 hours"
          icon={CheckCircle2}
          trend="down"
        />
      </div>
    </div>
  );
}

function LogDetail({ description, title }: { readonly description: string; readonly title: string }) {
  return (
    <SectionCard title={title} description={description}>
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        Select a time range and filters to inspect {title.toLowerCase()}.
      </div>
    </SectionCard>
  );
}
