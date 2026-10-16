import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { type AnalyticsKpiItem, AnalyticsKpiStrip } from "../../dashboard/analytics/_components/analytics-kpi-strip";
import { AnalyticsToolbar } from "../../dashboard/analytics/_components/analytics-toolbar";
import { type RealtimeBreakdownItem, RealtimeVisitors } from "../../dashboard/analytics/_components/realtime-visitors";
import { type AnalyticsTableRow, TopPages } from "../../dashboard/analytics/_components/top-pages";
import { TopTrafficSources, type TrafficSourceTab } from "../../dashboard/analytics/_components/top-traffic-sources";
import { TrafficQuality, type TrafficQualityPoint } from "../../dashboard/analytics/_components/traffic-quality";
import { InlineProgress, SectionCard } from "./admin-primitives";
import { AdminGovernance } from "./governance-page";

const projectKpis: AnalyticsKpiItem[] = [
  { change: "8.2%", direction: "up", from: "87", label: "Active projects", period: "last 4 weeks", value: "94" },
  { change: "12.6%", direction: "up", from: "1,140", label: "Experiment runs", period: "last 4 weeks", value: "1,284" },
  { change: "6.8%", direction: "up", from: "62", label: "Validated findings", period: "last 4 weeks", value: "67" },
  { change: "14.2%", direction: "up", from: "26.8M", label: "Tokens consumed", period: "last 4 weeks", value: "28.4M" },
  {
    change: "9.4%",
    direction: "up",
    from: "$1,142",
    label: "Estimated spend",
    period: "last 4 weeks",
    value: "$1,248",
  },
];

const projectHealthValues = [
  92.1, 93.4, 92.8, 94.1, 93.7, 95.2, 94.8, 95.6, 95.1, 96.2, 95.8, 96.7, 96.1, 97.2, 96.8, 97.5, 97.1, 97.8, 97.4,
  98.1, 97.7, 98.3, 97.9, 98.6, 98.2, 98.8, 98.5, 98.9,
];

const projectHealthData: TrafficQualityPoint[] = projectHealthValues.map((actualQuality, index) => ({
  actualQuality,
  baselineQuality: 95,
  dayIndex: index + 1,
}));

const projectRunData = [
  { minute: 1, visitors: 9 },
  { minute: 2, visitors: 12 },
  { minute: 3, visitors: 10 },
  { minute: 4, visitors: 14 },
  { minute: 5, visitors: 13 },
  { minute: 6, visitors: 17 },
  { minute: 7, visitors: 12 },
  { minute: 8, visitors: 16 },
  { minute: 9, visitors: 15 },
  { minute: 10, visitors: 18 },
  { minute: 11, visitors: 14 },
  { minute: 12, visitors: 19 },
  { minute: 13, visitors: 16 },
  { minute: 14, visitors: 20 },
  { minute: 15, visitors: 17 },
  { minute: 16, visitors: 21 },
  { minute: 17, visitors: 18 },
  { minute: 18, visitors: 22 },
  { minute: 19, visitors: 19 },
  { minute: 20, visitors: 21 },
];

const projectRunBreakdown: RealtimeBreakdownItem[] = [
  { label: "Experiment Runner", markerClassName: "size-2 rounded-full bg-emerald-500", value: 12 },
  { label: "Research Agent", markerClassName: "size-2 rounded-full bg-blue-500", value: 4 },
  { label: "Decision Provider", markerClassName: "size-2 rounded-full bg-violet-500", value: 3 },
  { label: "Dataset Service", markerClassName: "size-2 rounded-full bg-amber-500", value: 3 },
];

const projectWorkloadTabs: TrafficSourceTab[] = [
  {
    data: [
      { label: "73", source: "Clinical Trial Signals", visitors: 73 },
      { label: "46", source: "Protein Folding Study", visitors: 46 },
      { label: "28", source: "Climate Risk Model", visitors: 28 },
      { label: "19", source: "Materials Discovery", visitors: 19 },
    ],
    label: "Runs",
    value: "runs",
  },
  {
    data: [
      { label: "46", source: "Maya Chen", visitors: 46 },
      { label: "73", source: "Ava Patel", visitors: 73 },
      { label: "28", source: "Noah Williams", visitors: 28 },
      { label: "19", source: "Liam Garcia", visitors: 19 },
    ],
    label: "Owners",
    value: "owners",
  },
  {
    data: [
      { label: "94", source: "Active", visitors: 94 },
      { label: "32", source: "Archived", visitors: 32 },
      { label: "4", source: "In review", visitors: 4 },
    ],
    label: "Status",
    value: "status",
  },
];

const adminKpis: AnalyticsKpiItem[] = [
  { change: "8.2%", direction: "up", from: "87", label: "Active Projects", period: "last 4 weeks", value: "94" },
  { change: "12.6%", direction: "up", from: "1,140", label: "Experiment Runs", period: "last 4 weeks", value: "1,284" },
  { change: "1.4%", direction: "up", from: "95.4%", label: "Successful Runs", period: "last 4 weeks", value: "96.8%" },
  { change: "6.1%", direction: "up", from: "26.8M", label: "Token Usage", period: "last 4 weeks", value: "28.4M" },
  { change: "14.3%", direction: "down", from: "36", label: "Review Queue", period: "last 4 weeks", value: "42" },
];

const reliabilityValues = [
  94.2, 95.1, 93.8, 96.4, 95.6, 97.2, 96.8, 97.8, 97.1, 98.2, 97.7, 98.6, 98.1, 98.8, 98.4, 99.1, 98.7, 99.3, 98.9,
  99.4, 99.1, 99.6, 99.2, 99.5, 99.1, 99.7, 99.4, 99.6,
];

const baselineValues = [
  92.5, 92.8, 93, 93.2, 93.5, 93.8, 94, 94.2, 94.6, 94.8, 95, 95.2, 95.5, 95.8, 96, 96.2, 96.5, 96.8, 97, 97.2, 97.5,
  97.8, 98, 98.2, 98.4, 98.6, 98.8, 99,
];

const reliabilityData: TrafficQualityPoint[] = reliabilityValues.map((actualQuality, index) => ({
  actualQuality,
  baselineQuality: baselineValues[index] ?? 0,
  dayIndex: index + 1,
}));

const reliabilityTicks = [4, 11, 18, 25];

const runBreakdown: RealtimeBreakdownItem[] = [
  { label: "Experiment Runner", markerClassName: "size-2 rounded-full bg-emerald-500", value: 12 },
  { label: "Research Agent", markerClassName: "size-2 rounded-full bg-blue-500", value: 4 },
  { label: "Decision Provider", markerClassName: "size-2 rounded-full bg-violet-500", value: 3 },
  { label: "Dataset Service", markerClassName: "size-2 rounded-full bg-amber-500", value: 3 },
];

const experimentRows: AnalyticsTableRow[] = [
  { bounce: "0.8%", path: "EXP-2048 · Evidence benchmark", time: "8m 42s", views: "412" },
  { bounce: "1.2%", path: "EXP-2039 · Retrieval quality", time: "6m 18s", views: "286" },
  { bounce: "0.4%", path: "EXP-2034 · Provider comparison", time: "4m 44s", views: "218" },
  { bounce: "2.1%", path: "EXP-2028 · Dataset validation", time: "5m 06s", views: "196" },
  { bounce: "0.6%", path: "EXP-2021 · Trace replay", time: "3m 18s", views: "172" },
];

const activityTabs: TrafficSourceTab[] = [
  {
    data: [
      { label: "412", source: "Experiment Runner", visitors: 412 },
      { label: "286", source: "Decision Provider", visitors: 286 },
      { label: "218", source: "Research Agent", visitors: 218 },
      { label: "196", source: "Dataset Service", visitors: 196 },
      { label: "172", source: "Trace Collector", visitors: 172 },
    ],
    label: "Services",
    value: "services",
  },
  {
    data: [
      { label: "8.4M", source: "GPT-4.1", visitors: 8400 },
      { label: "6.2M", source: "Claude Sonnet", visitors: 6200 },
      { label: "4.8M", source: "Gemini 2.5", visitors: 4800 },
      { label: "3.1M", source: "o3", visitors: 3100 },
      { label: "2.6M", source: "Local models", visitors: 2600 },
    ],
    label: "Models",
    value: "models",
  },
  {
    data: [
      { label: "286", source: "Evidence benchmark", visitors: 286 },
      { label: "218", source: "Retrieval quality", visitors: 218 },
      { label: "196", source: "Provider comparison", visitors: 196 },
      { label: "172", source: "Trace replay", visitors: 172 },
      { label: "128", source: "Dataset validation", visitors: 128 },
    ],
    label: "Projects",
    value: "projects",
  },
];

const operationsKpis: AnalyticsKpiItem[] = [
  {
    change: "11.5%",
    direction: "up",
    from: "312 req/s",
    label: "Request rate",
    period: "last 24 hours",
    value: "348 req/s",
  },
  { change: "0.3pp", direction: "down", from: "0.9%", label: "Error rate", period: "last 24 hours", value: "1.2%" },
  { change: "6.6%", direction: "down", from: "790ms", label: "P95 latency", period: "last 24 hours", value: "842ms" },
  {
    change: "16.7%",
    direction: "down",
    from: "36 jobs",
    label: "Queue depth",
    period: "last 24 hours",
    value: "42 jobs",
  },
  {
    change: "0.03pp",
    direction: "up",
    from: "99.95%",
    label: "Service uptime",
    period: "last 24 hours",
    value: "99.98%",
  },
];

const operationsReliabilityData: TrafficQualityPoint[] = [
  { actualQuality: 98.7, baselineQuality: 98, dayIndex: 1 },
  { actualQuality: 98.9, baselineQuality: 98, dayIndex: 2 },
  { actualQuality: 98.4, baselineQuality: 98, dayIndex: 3 },
  { actualQuality: 99.1, baselineQuality: 98.1, dayIndex: 4 },
  { actualQuality: 99.4, baselineQuality: 98.1, dayIndex: 5 },
  { actualQuality: 99, baselineQuality: 98.2, dayIndex: 6 },
  { actualQuality: 99.2, baselineQuality: 98.2, dayIndex: 7 },
  { actualQuality: 99.5, baselineQuality: 98.3, dayIndex: 8 },
  { actualQuality: 99.1, baselineQuality: 98.3, dayIndex: 9 },
  { actualQuality: 98.8, baselineQuality: 98.4, dayIndex: 10 },
  { actualQuality: 99.3, baselineQuality: 98.4, dayIndex: 11 },
  { actualQuality: 99.6, baselineQuality: 98.5, dayIndex: 12 },
  { actualQuality: 99.2, baselineQuality: 98.5, dayIndex: 13 },
  { actualQuality: 99.7, baselineQuality: 98.6, dayIndex: 14 },
  { actualQuality: 99.4, baselineQuality: 98.6, dayIndex: 15 },
  { actualQuality: 99.8, baselineQuality: 98.7, dayIndex: 16 },
  { actualQuality: 99.5, baselineQuality: 98.7, dayIndex: 17 },
  { actualQuality: 99.7, baselineQuality: 98.8, dayIndex: 18 },
  { actualQuality: 99.3, baselineQuality: 98.8, dayIndex: 19 },
  { actualQuality: 99.6, baselineQuality: 98.9, dayIndex: 20 },
  { actualQuality: 99.4, baselineQuality: 98.9, dayIndex: 21 },
  { actualQuality: 99.8, baselineQuality: 99, dayIndex: 22 },
  { actualQuality: 99.6, baselineQuality: 99, dayIndex: 23 },
  { actualQuality: 99.7, baselineQuality: 99, dayIndex: 24 },
  { actualQuality: 99.5, baselineQuality: 99.1, dayIndex: 25 },
  { actualQuality: 99.8, baselineQuality: 99.1, dayIndex: 26 },
  { actualQuality: 99.6, baselineQuality: 99.1, dayIndex: 27 },
  { actualQuality: 99.7, baselineQuality: 99.2, dayIndex: 28 },
];

const requestRateData = [
  { minute: 1, visitors: 12 },
  { minute: 2, visitors: 16 },
  { minute: 3, visitors: 14 },
  { minute: 4, visitors: 18 },
  { minute: 5, visitors: 17 },
  { minute: 6, visitors: 20 },
  { minute: 7, visitors: 16 },
  { minute: 8, visitors: 19 },
  { minute: 9, visitors: 18 },
  { minute: 10, visitors: 21 },
  { minute: 11, visitors: 17 },
  { minute: 12, visitors: 20 },
  { minute: 13, visitors: 19 },
  { minute: 14, visitors: 22 },
  { minute: 15, visitors: 18 },
  { minute: 16, visitors: 21 },
  { minute: 17, visitors: 20 },
  { minute: 18, visitors: 22 },
  { minute: 19, visitors: 19 },
  { minute: 20, visitors: 21 },
];

const queueDepthData = [
  { minute: 1, visitors: 8 },
  { minute: 2, visitors: 11 },
  { minute: 3, visitors: 9 },
  { minute: 4, visitors: 14 },
  { minute: 5, visitors: 13 },
  { minute: 6, visitors: 16 },
  { minute: 7, visitors: 12 },
  { minute: 8, visitors: 17 },
  { minute: 9, visitors: 15 },
  { minute: 10, visitors: 19 },
  { minute: 11, visitors: 16 },
  { minute: 12, visitors: 20 },
  { minute: 13, visitors: 18 },
  { minute: 14, visitors: 21 },
  { minute: 15, visitors: 17 },
  { minute: 16, visitors: 19 },
  { minute: 17, visitors: 16 },
  { minute: 18, visitors: 18 },
  { minute: 19, visitors: 15 },
  { minute: 20, visitors: 17 },
];

const requestBreakdown: RealtimeBreakdownItem[] = [
  { label: "API Gateway", markerClassName: "size-2 rounded-full bg-emerald-500", value: 128 },
  { label: "Experiment Runner", markerClassName: "size-2 rounded-full bg-blue-500", value: 96 },
  { label: "Decision Provider", markerClassName: "size-2 rounded-full bg-violet-500", value: 74 },
  { label: "Dataset Service", markerClassName: "size-2 rounded-full bg-amber-500", value: 50 },
];

const queueBreakdown: RealtimeBreakdownItem[] = [
  { label: "Experiment jobs", markerClassName: "size-2 rounded-full bg-amber-500", value: 18 },
  { label: "Decision jobs", markerClassName: "size-2 rounded-full bg-violet-500", value: 12 },
  { label: "Dataset jobs", markerClassName: "size-2 rounded-full bg-blue-500", value: 7 },
  { label: "Report jobs", markerClassName: "size-2 rounded-full bg-emerald-500", value: 5 },
];

const operationsLoadTabs: TrafficSourceTab[] = [
  {
    data: [
      { label: "128", source: "API Gateway", visitors: 128 },
      { label: "96", source: "Experiment Runner", visitors: 96 },
      { label: "74", source: "Decision Provider", visitors: 74 },
      { label: "50", source: "Dataset Service", visitors: 50 },
      { label: "31", source: "Audit Pipeline", visitors: 31 },
    ],
    label: "Services",
    value: "services",
  },
  {
    data: [
      { label: "142", source: "us-east", visitors: 142 },
      { label: "96", source: "asia-southeast", visitors: 96 },
      { label: "78", source: "eu-west", visitors: 78 },
      { label: "32", source: "local runners", visitors: 32 },
    ],
    label: "Regions",
    value: "regions",
  },
  {
    data: [
      { label: "18", source: "Experiment queue", visitors: 18 },
      { label: "12", source: "Decision queue", visitors: 12 },
      { label: "7", source: "Dataset queue", visitors: 7 },
      { label: "5", source: "Report queue", visitors: 5 },
    ],
    label: "Queues",
    value: "queues",
  },
];

const operationalEvents: AnalyticsTableRow[] = [
  { bounce: "Investigating", path: "Queue depth crossed threshold", time: "842ms", views: "WARN" },
  { bounce: "Completed", path: "Decision fallback evaluation completed", time: "216ms", views: "INFO" },
  { bounce: "Completed", path: "Batch of 248 events persisted", time: "88ms", views: "INFO" },
  { bounce: "Completed", path: "GET /v1/projects responded with 200", time: "142ms", views: "INFO" },
  { bounce: "Failed", path: "Tool retry limit reached for EXP-2048", time: "1.2s", views: "ERROR" },
];

function ProjectsDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <AnalyticsKpiStrip items={projectKpis} />

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <TrafficQuality
            actualLabel="Execution health"
            baselineLabel="Project target"
            chartData={projectHealthData}
            description="Successful experiment execution across all research projects over the last 4 weeks."
            title="Project execution health"
            tooltipLabel="Project execution health"
            yDomain={[88, 100]}
          />
        </div>
        <div className="xl:col-span-5">
          <RealtimeVisitors
            breakdown={projectRunBreakdown}
            chartLabel="Runs"
            data={projectRunData}
            liveLabel="Running now"
            title="Live project runs"
            unit="runs now"
            value="18"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <TopTrafficSources tabs={projectWorkloadTabs} title="Project workload" valueLabel="Runs" />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard title="Portfolio health" description="Current lifecycle and resource posture across projects.">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Total projects</p>
                <p className="mt-1 font-heading text-2xl tabular-nums">126</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Active</p>
                <p className="mt-1 font-heading text-2xl tabular-nums">94</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">In review</p>
                <p className="mt-1 font-heading text-2xl tabular-nums">4</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Archived</p>
                <p className="mt-1 font-heading text-2xl tabular-nums">32</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <InlineProgress label="Active project capacity" value={75} />
              <InlineProgress label="Review completion" value={82} />
              <InlineProgress label="Monthly budget used" value={68} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function OperationsDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <AnalyticsKpiStrip items={operationsKpis} />

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <TrafficQuality
            actualLabel="Observed uptime"
            baselineLabel="SLO target"
            chartData={operationsReliabilityData}
            description="Platform availability and service reliability across the last 4 weeks."
            title="Service reliability"
            tooltipLabel="Service reliability"
            yDomain={[96, 100]}
          />
        </div>
        <div className="xl:col-span-5">
          <RealtimeVisitors
            breakdown={requestBreakdown}
            chartLabel="Requests"
            data={requestRateData}
            liveLabel="Live"
            title="Request throughput"
            unit="req/s"
            value="348"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <RealtimeVisitors
            breakdown={queueBreakdown}
            chartLabel="Jobs"
            data={queueDepthData}
            liveLabel="Monitoring"
            title="Queue depth"
            unit="jobs pending"
            value="42"
          />
        </div>
        <div className="xl:col-span-7">
          <TopTrafficSources tabs={operationsLoadTabs} title="Service load" valueLabel="Requests" />
        </div>
      </div>

      <TopPages
        bounceLabel="Status"
        rows={operationalEvents}
        timeLabel="Duration"
        title="Recent operational events"
        viewsLabel="Level"
      />
    </div>
  );
}

export function AdminOverview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">OpenAI Scientist</h1>
        <p className="text-muted-foreground text-sm">
          Monitor projects, experiment runs, providers, and review activity in one view.
        </p>
      </div>

      <Tabs defaultValue="overview" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
          </TabsList>

          <AnalyticsToolbar actionLabel="Admin actions" />
        </div>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <AnalyticsKpiStrip items={adminKpis} />

          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <TrafficQuality
                actualLabel="Successful runs"
                baselineLabel="Reliability target"
                chartData={reliabilityData}
                description="Completed experiment runs against the platform reliability target."
                title="Execution reliability"
                tooltipLabel="Execution reliability"
                xTicks={reliabilityTicks}
                yDomain={[90, 100]}
              />
            </div>
            <div className="xl:col-span-5">
              <RealtimeVisitors
                breakdown={runBreakdown}
                chartLabel="Runs"
                liveLabel="Streaming"
                title="Active experiment runs"
                unit="runs now"
                value="18"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <TopPages
                bounceLabel="Failure"
                rows={experimentRows}
                timeLabel="Duration"
                title="Recent experiment runs"
                viewsLabel="Runs"
              />
            </div>
            <div className="xl:col-span-5 xl:col-start-8">
              <TopTrafficSources tabs={activityTabs} title="Platform activity" valueLabel="Activity" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="mt-0">
          <OperationsDashboard />
        </TabsContent>

        <TabsContent value="projects" className="mt-0">
          <ProjectsDashboard />
        </TabsContent>

        <TabsContent value="governance" className="mt-0">
          <AdminGovernance embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
