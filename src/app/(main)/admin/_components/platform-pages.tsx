import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  type LucideIcon,
  Plus,
  RefreshCw,
  RotateCcw,
  ServerCog,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { type AnalyticsKpiItem, AnalyticsKpiStrip } from "../../dashboard/analytics/_components/analytics-kpi-strip";
import { type RealtimeBreakdownItem, RealtimeVisitors } from "../../dashboard/analytics/_components/realtime-visitors";
import { TopTrafficSources, type TrafficSourceTab } from "../../dashboard/analytics/_components/top-traffic-sources";
import { TrafficQuality, type TrafficQualityPoint } from "../../dashboard/analytics/_components/traffic-quality";
import {
  PerformanceOverview,
  type PerformanceOverviewPoint,
} from "../../dashboard/default/_components/performance-overview";
import { providerModels } from "./admin-data";
import { AdminPageHeader, InlineProgress, SectionCard, StatusBadge } from "./admin-primitives";
import { IntegrationSettings, RunModelsSettings } from "./run-models";

const providers = [
  {
    name: "OpenAI",
    type: "LLM provider",
    model: "GPT-5",
    requests: "18.4K",
    latency: "820ms",
    errorRate: "1.8%",
    status: "Degraded" as const,
  },
  {
    name: "Anthropic",
    type: "LLM provider",
    model: "Claude Sonnet 4",
    requests: "9.7K",
    latency: "690ms",
    errorRate: "0.4%",
    status: "Healthy" as const,
  },
  {
    name: "Local LLM",
    type: "LLM provider",
    model: "Research Llama",
    requests: "2.8K",
    latency: "1.4s",
    errorRate: "2.2%",
    status: "Degraded" as const,
  },
] as const;

const providerKpis: AnalyticsKpiItem[] = [
  { change: "1", direction: "up", from: "2", label: "Healthy providers", period: "current status", value: "2 / 3" },
  { change: "2", direction: "up", from: "4", label: "Active models", period: "available catalog", value: "6" },
  { change: "15.2%", direction: "up", from: "26.8K", label: "Requests today", period: "last 24 hours", value: "30.9K" },
  {
    change: "3.8%",
    direction: "down",
    from: "790ms",
    label: "Average latency",
    period: "last 24 hours",
    value: "820ms",
  },
  { change: "11.4%", direction: "up", from: "61%", label: "Token budget", period: "monthly limit", value: "68%" },
];

const providerReliabilityValues = [
  97.8, 98.1, 97.6, 98.4, 98.2, 98.7, 98.5, 98.9, 98.6, 99.1, 98.8, 99.2, 98.9, 99.3, 99.1, 99.4, 99.2, 99.5, 99.1,
  99.6, 99.3, 99.5, 99.2, 99.7, 99.4, 99.6, 99.5, 99.7,
];

const providerReliabilityData: TrafficQualityPoint[] = providerReliabilityValues.map((actualQuality, index) => ({
  actualQuality,
  baselineQuality: 99,
  dayIndex: index + 1,
}));

const providerRequestData = [
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

const providerBreakdown: RealtimeBreakdownItem[] = [
  { label: "OpenAI", markerClassName: "size-2 rounded-full bg-emerald-500", value: 18400 },
  { label: "Anthropic", markerClassName: "size-2 rounded-full bg-blue-500", value: 9700 },
  { label: "Local LLM", markerClassName: "size-2 rounded-full bg-violet-500", value: 2800 },
  { label: "Fallback", markerClassName: "size-2 rounded-full bg-amber-500", value: 620 },
];

const providerLoadTabs: TrafficSourceTab[] = [
  {
    data: [
      { label: "18.4K", source: "OpenAI", visitors: 18400 },
      { label: "9.7K", source: "Anthropic", visitors: 9700 },
      { label: "2.8K", source: "Local LLM", visitors: 2800 },
      { label: "620", source: "Fallback route", visitors: 620 },
    ],
    label: "Providers",
    value: "providers",
  },
  {
    data: [
      { label: "8.4K", source: "GPT-5", visitors: 8400 },
      { label: "6.2K", source: "Claude Sonnet 4", visitors: 6200 },
      { label: "4.8K", source: "Research Llama", visitors: 4800 },
      { label: "3.1K", source: "GPT-4.1", visitors: 3100 },
    ],
    label: "Models",
    value: "models",
  },
  {
    data: [
      { label: "14.2K", source: "Text generation", visitors: 14200 },
      { label: "8.9K", source: "Structured output", visitors: 8900 },
      { label: "5.6K", source: "Embeddings", visitors: 5600 },
      { label: "2.2K", source: "Tool calling", visitors: 2200 },
    ],
    label: "Capabilities",
    value: "capabilities",
  },
];

export function AdminProviders({ embedded = false }: { readonly embedded?: boolean } = {}) {
  return (
    <div className="flex flex-col gap-6">
      {!embedded && (
        <AdminPageHeader
          eyebrow="AI Platform"
          title="Models & Providers"
          description="Manage external AI services, model defaults, capabilities, limits, and connectivity."
          actions={
            <>
              <Button size="sm" variant="outline">
                <RefreshCw data-icon="inline-start" />
                Test all connections
              </Button>
              <Button size="sm">
                <Plus data-icon="inline-start" />
                Add provider
              </Button>
            </>
          }
        />
      )}

      <div className="flex flex-col gap-4">
        <AnalyticsKpiStrip items={providerKpis} />
        <RunModelsSettings />
        <IntegrationSettings />

        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <TrafficQuality
              actualLabel="Observed availability"
              baselineLabel="Availability target"
              chartData={providerReliabilityData}
              description="Provider availability across the last 4 weeks, including fallback traffic."
              title="Provider reliability"
              tooltipLabel="Provider reliability"
              yDomain={[96, 100]}
            />
          </div>
          <div className="xl:col-span-5">
            <RealtimeVisitors
              breakdown={providerBreakdown}
              chartLabel="Requests"
              data={providerRequestData}
              liveLabel="Receiving traffic"
              title="Provider requests"
              unit="requests / min"
              value="348"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-7">
            <SectionCard
              className="h-full"
              title="Connected providers"
              description="Current availability and runtime performance for configured AI services."
            >
              <div className="-mx-4 -mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Default model</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Avg latency</TableHead>
                      <TableHead>Error rate</TableHead>
                      <TableHead>Last checked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.name}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <ServerCog className="size-4" />
                            </div>
                            <div>
                              <p className="font-medium">{provider.name}</p>
                              <p className="text-muted-foreground text-xs">{provider.type}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{provider.model}</TableCell>
                        <TableCell>{provider.requests}</TableCell>
                        <TableCell>{provider.latency}</TableCell>
                        <TableCell>{provider.errorRate}</TableCell>
                        <TableCell className="text-muted-foreground">2 min ago</TableCell>
                        <TableCell>
                          <StatusBadge status={provider.status} />
                        </TableCell>
                        <TableCell>
                          <Button size="icon-xs" variant="ghost" aria-label={`Configure ${provider.name}`}>
                            <Settings2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          </div>

          <div className="min-w-0 xl:col-span-5">
            <TopTrafficSources tabs={providerLoadTabs} title="Provider load" valueLabel="Requests" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title="Model catalog" description="Available models and the platform capabilities they support.">
            <div className="-mx-4 -mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model ID</TableHead>
                    <TableHead>Capability</TableHead>
                    <TableHead>Context window</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerModels.map((model) => (
                    <TableRow key={model.modelId}>
                      <TableCell className="font-medium">{model.model}</TableCell>
                      <TableCell>{model.provider}</TableCell>
                      <TableCell>
                        <code className="text-muted-foreground text-xs">{model.modelId}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.capability}</Badge>
                      </TableCell>
                      <TableCell>{model.context}</TableCell>
                      <TableCell>{model.usage}</TableCell>
                      <TableCell>
                        <StatusBadge status={model.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

const decisionTypes = [
  {
    description: "Selects the next research direction from candidate hypotheses.",
    escalation: "Researcher review below 0.55",
    name: "Hypothesis Selection",
    outputs: ["SELECT", "REJECT", "ESCALATE_TO_RESEARCHER", "NO_SUITABLE_CANDIDATE"],
    threshold: "0.80 confidence",
  },
  {
    description: "Checks whether validated evidence is sufficient for an official finding.",
    escalation: "Fail closed when evidence conflicts",
    name: "Evidence Sufficiency",
    outputs: [
      "ENOUGH_EVIDENCE",
      "NEED_MORE_EVIDENCE",
      "TRY_ALTERNATIVE_METHOD",
      "REPLICATE",
      "NEED_HUMAN_REVIEW",
      "INCONCLUSIVE",
    ],
    threshold: "0.80 confidence",
  },
] as const;

const decisionProviderKpis: AnalyticsKpiItem[] = [
  {
    change: "8.4%",
    direction: "up",
    from: "3,544",
    label: "Decisions evaluated",
    period: "last 24 hours",
    value: "3,842",
  },
  {
    change: "1.4pp",
    direction: "up",
    from: "95.4%",
    label: "Gate success rate",
    period: "completed within policy",
    value: "96.8%",
  },
  {
    change: "14.3%",
    direction: "down",
    from: "43",
    label: "Human escalations",
    period: "currently pending",
    value: "37",
  },
  {
    change: "0.6pp",
    direction: "down",
    from: "3.4%",
    label: "Fallback rate",
    period: "last 24 hours",
    value: "2.8%",
  },
  {
    change: "1.4pp",
    direction: "up",
    from: "98.6%",
    label: "Audit coverage",
    period: "decision records",
    value: "100%",
  },
];

const decisionOutcomeTrend: PerformanceOverviewPoint[] = [
  { activeAccounts: 420, date: "2026-08-25", newCustomers: 820, returningUsers: 180 },
  { activeAccounts: 380, date: "2026-08-26", newCustomers: 610, returningUsers: 165 },
  { activeAccounts: 430, date: "2026-08-27", newCustomers: 760, returningUsers: 172 },
  { activeAccounts: 390, date: "2026-08-28", newCustomers: 590, returningUsers: 180 },
  { activeAccounts: 450, date: "2026-08-29", newCustomers: 920, returningUsers: 190 },
  { activeAccounts: 410, date: "2026-08-30", newCustomers: 640, returningUsers: 175 },
  { activeAccounts: 520, date: "2026-08-31", newCustomers: 1280, returningUsers: 210 },
  { activeAccounts: 430, date: "2026-09-01", newCustomers: 680, returningUsers: 185 },
  { activeAccounts: 445, date: "2026-09-02", newCustomers: 740, returningUsers: 195 },
  { activeAccounts: 400, date: "2026-09-03", newCustomers: 620, returningUsers: 172 },
  { activeAccounts: 480, date: "2026-09-04", newCustomers: 1030, returningUsers: 210 },
  { activeAccounts: 420, date: "2026-09-05", newCustomers: 700, returningUsers: 180 },
  { activeAccounts: 455, date: "2026-09-06", newCustomers: 890, returningUsers: 190 },
  { activeAccounts: 430, date: "2026-09-07", newCustomers: 740, returningUsers: 178 },
  { activeAccounts: 560, date: "2026-09-08", newCustomers: 1430, returningUsers: 225 },
  { activeAccounts: 460, date: "2026-09-09", newCustomers: 800, returningUsers: 190 },
  { activeAccounts: 440, date: "2026-09-10", newCustomers: 760, returningUsers: 185 },
  { activeAccounts: 420, date: "2026-09-11", newCustomers: 680, returningUsers: 176 },
  { activeAccounts: 500, date: "2026-09-12", newCustomers: 980, returningUsers: 205 },
  { activeAccounts: 435, date: "2026-09-13", newCustomers: 720, returningUsers: 182 },
  { activeAccounts: 540, date: "2026-09-14", newCustomers: 1180, returningUsers: 220 },
  { activeAccounts: 450, date: "2026-09-15", newCustomers: 780, returningUsers: 190 },
  { activeAccounts: 470, date: "2026-09-16", newCustomers: 900, returningUsers: 198 },
  { activeAccounts: 410, date: "2026-09-17", newCustomers: 650, returningUsers: 174 },
  { activeAccounts: 550, date: "2026-09-18", newCustomers: 1330, returningUsers: 215 },
  { activeAccounts: 460, date: "2026-09-19", newCustomers: 840, returningUsers: 188 },
  { activeAccounts: 520, date: "2026-09-20", newCustomers: 1110, returningUsers: 210 },
  { activeAccounts: 445, date: "2026-09-21", newCustomers: 780, returningUsers: 185 },
];

const decisionOutcomeTabs: TrafficSourceTab[] = [
  {
    data: [
      { label: "1.9K", source: "Enough evidence", visitors: 1900 },
      { label: "842", source: "Need more evidence", visitors: 842 },
      { label: "486", source: "Human review", visitors: 486 },
      { label: "568", source: "Inconclusive", visitors: 568 },
    ],
    label: "Outcomes",
    value: "outcomes",
  },
  {
    data: [
      { label: "2.3K", source: "Evidence sufficiency", visitors: 2300 },
      { label: "1.5K", source: "Hypothesis selection", visitors: 1500 },
      { label: "486", source: "Researcher escalation", visitors: 486 },
      { label: "108", source: "Provider fallback", visitors: 108 },
    ],
    label: "Decision types",
    value: "decision-types",
  },
  {
    data: [
      { label: "2.8K", source: "Auto-continue", visitors: 2800 },
      { label: "486", source: "Researcher review", visitors: 486 },
      { label: "410", source: "Scientific refinement", visitors: 410 },
      { label: "138", source: "Fail closed", visitors: 138 },
    ],
    label: "Routing",
    value: "routing",
  },
];

export function AdminDecisionProviders({ embedded = false }: { readonly embedded?: boolean } = {}) {
  return (
    <div className="flex flex-col gap-6">
      {!embedded && (
        <AdminPageHeader
          eyebrow="AI Platform"
          title="Decision Providers"
          description="Configure structured decision providers for hypothesis selection and evidence sufficiency gates."
          actions={
            <Button size="sm" variant="outline">
              <RefreshCw data-icon="inline-start" />
              Test decision flow
            </Button>
          }
        />
      )}

      <AnalyticsKpiStrip items={decisionProviderKpis} />

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <PerformanceOverview
            className="h-full"
            data={decisionOutcomeTrend}
            description="How structured decision outcomes are distributed across the last 4 weeks."
            labels={{
              activeAccounts: "Human review",
              newCustomers: "Policy-compliant",
              returningUsers: "Fallback route",
            }}
            showControls={false}
            title="Decision outcome mix"
          />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            className="h-full"
            title="Gate posture"
            description="Current readiness of the two structured decision gates."
          >
            <div className="grid grid-cols-2 gap-3">
              <QueueMetric label="Healthy gates" value="2 / 2" />
              <QueueMetric label="Policy target" value="95%" />
              <QueueMetric label="Review queue" value="37" />
              <QueueMetric label="Fallback rate" value="2.8%" />
            </div>
            <div className="mt-5 space-y-4">
              <InlineProgress label="Hypothesis selection" value={98} />
              <InlineProgress label="Evidence sufficiency" value={96} />
              <InlineProgress label="Review SLA" value={82} />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <TopTrafficSources tabs={decisionOutcomeTabs} title="Decision outcomes" valueLabel="Decisions" />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            className="h-full"
            title="Human review queue"
            description="Items that need a researcher or reviewer before continuing."
          >
            <div className="grid grid-cols-3 gap-2">
              <QueueMetric label="Pending" value="37" />
              <QueueMetric label="High risk" value="12" />
              <QueueMetric label="SLA at risk" value="4" />
            </div>
            <div className="mt-5 space-y-4">
              <InlineProgress label="Review SLA within target" value={82} />
              <InlineProgress label="Provenance attached" value={96} />
              <InlineProgress label="Audit record complete" value={100} />
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Decision runtime"
        description="Provider routing and guardrails applied to every structured decision request."
      >
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="min-w-0 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ServerCog className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">Provider chain</p>
                  <p className="truncate text-muted-foreground text-xs">Primary with automatic fallback</p>
                </div>
              </div>
              <StatusBadge status="Healthy" />
            </div>

            <div className="mt-4 grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <ProviderRow label="Primary provider" value="TypeSafe / Jev" status="Healthy" />
              <ArrowRight className="mx-auto hidden size-4 text-muted-foreground sm:block" />
              <ProviderRow label="Fallback provider" value="Structured LLM Provider" status="Healthy" />
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <p className="text-muted-foreground text-xs">
                108 decisions used fallback in the last 24 hours. Every switch is retained in the decision audit.
              </p>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Runtime guardrails</p>
                <p className="text-muted-foreground text-xs">Shared request behavior</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <DecisionSetting icon={Clock3} label="Timeout" value="5 seconds" />
              <DecisionSetting icon={RotateCcw} label="Retry limit" value="2 retries" />
            </div>

            <div className="mt-3 rounded-lg border bg-background/60 p-3">
              <p className="font-medium text-xs">Applied to both decision gates</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Confidence thresholds and escalation paths are configured per gate below.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Decision gates"
        description="Each gate has a bounded output, a confidence threshold, and an explicit human escalation path."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {decisionTypes.map((decision) => (
            <div key={decision.name} className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <p className="font-medium">{decision.name}</p>
                </div>
                <StatusBadge status="Healthy" />
              </div>
              <p className="mt-2 text-muted-foreground text-sm">{decision.description}</p>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Confidence threshold</p>
                  <p className="mt-1 font-medium">{decision.threshold}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Escalation path</p>
                  <p className="mt-1 font-medium">{decision.escalation}</p>
                </div>
              </div>
              <div className="mt-4 border-t pt-3">
                <p className="mb-2 text-muted-foreground text-xs">Allowed outputs</p>
                <div className="flex flex-wrap gap-2">
                  {decision.outputs.map((output) => (
                    <Badge key={output} variant="outline" className="font-mono text-[10px]">
                      {output}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function QueueMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="truncate text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-heading text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function ProviderRow({
  label,
  status,
  value,
}: {
  readonly label: string;
  readonly status: "Healthy" | "Info";
  readonly value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 font-medium text-sm">{value}</p>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

function DecisionSetting({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background/60 p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 font-medium text-sm tabular-nums">{value}</p>
      </div>
    </div>
  );
}
