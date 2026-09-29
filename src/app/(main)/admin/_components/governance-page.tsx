import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { AnalyticsKpiStrip, type AnalyticsKpiItem } from "../../dashboard/analytics/_components/analytics-kpi-strip";
import { TopTrafficSources, type TrafficSourceTab } from "../../dashboard/analytics/_components/top-traffic-sources";
import { TrafficQuality, type TrafficQualityPoint } from "../../dashboard/analytics/_components/traffic-quality";
import { AdminPageHeader, InlineProgress, SectionCard, StatusBadge } from "./admin-primitives";

const governanceKpis: AnalyticsKpiItem[] = [
  {
    change: "8.4%",
    direction: "up",
    from: "3,544",
    label: "Decisions evaluated",
    period: "last 24 hours",
    value: "3,842",
  },
  {
    change: "2.1pp",
    direction: "up",
    from: "84.3%",
    label: "Evidence gate pass rate",
    period: "last 24 hours",
    value: "86.4%",
  },
  {
    change: "100%",
    direction: "up",
    from: "98.6%",
    label: "Audit coverage",
    period: "decision records",
    value: "100%",
  },
  {
    change: "14.3%",
    direction: "down",
    from: "43",
    label: "Human review queue",
    period: "currently pending",
    value: "37",
  },
  { change: "3.2%", direction: "down", from: "22", label: "Decision overrides", period: "last 24 hours", value: "19" },
];

const governanceQualityValues = [
  91.2, 91.8, 92.4, 91.9, 93.1, 93.5, 92.8, 94.2, 93.7, 94.6, 94.1, 95.2, 94.8, 95.6, 95.1, 96.2, 95.7, 96.4, 95.9,
  96.7, 96.1, 96.9, 96.5, 97.1, 96.8, 97.3, 97, 97.4,
];

const governanceQualityData: TrafficQualityPoint[] = governanceQualityValues.map((actualQuality, index) => ({
  actualQuality,
  baselineQuality: 95,
  dayIndex: index + 1,
}));

const governanceOutcomeTabs: TrafficSourceTab[] = [
  {
    data: [
      { label: "1.9K", source: "Enough evidence", visitors: 1946 },
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
      { label: "1.5K", source: "Hypothesis selection", visitors: 1542 },
      { label: "486", source: "Researcher escalation", visitors: 486 },
      { label: "108", source: "Provider fallback", visitors: 108 },
    ],
    label: "Decision types",
    value: "types",
  },
  {
    data: [
      { label: "2.8K", source: "Auto-continue", visitors: 2808 },
      { label: "486", source: "Researcher review", visitors: 486 },
      { label: "410", source: "Scientific refinement", visitors: 410 },
      { label: "138", source: "Fail closed", visitors: 138 },
    ],
    label: "Routing",
    value: "routing",
  },
];

const governanceEvents = [
  { bounce: "Recorded", path: "Evidence sufficiency decision archived", time: "2 min ago", views: "DECISION" },
  { bounce: "Review", path: "Low-confidence decision routed to researcher", time: "8 min ago", views: "ESCALATION" },
  { bounce: "Recorded", path: "Decision provider configuration version saved", time: "21 min ago", views: "CONFIG" },
  { bounce: "Override", path: "Human override attached to DEC-4A91C", time: "34 min ago", views: "OVERRIDE" },
  { bounce: "Recorded", path: "Research State provenance snapshot created", time: "49 min ago", views: "PROVENANCE" },
];

const decisionGates = [
  {
    name: "Hypothesis selection",
    outputs: ["SELECT", "REJECT", "ESCALATE_TO_RESEARCHER"],
    provider: "TypeSafe / Jev",
    route: "Researcher review below 0.55",
    threshold: "0.80 confidence",
  },
  {
    name: "Evidence sufficiency",
    outputs: ["ENOUGH_EVIDENCE", "NEED_MORE_EVIDENCE", "NEED_HUMAN_REVIEW"],
    provider: "TypeSafe / Jev",
    route: "Fail closed on conflict",
    threshold: "0.80 confidence",
  },
] as const;

export function AdminGovernance({ embedded = false }: { readonly embedded?: boolean } = {}) {
  return (
    <div className="flex flex-col gap-6">
      {!embedded && (
        <AdminPageHeader
          eyebrow="Governance"
          title="Decision governance"
          description="Review structured decisions, human escalations, provenance, and audit coverage across research workflows."
          actions={
            <Button size="sm" variant="outline">
              <RefreshCw data-icon="inline-start" />
              Refresh governance
            </Button>
          }
        />
      )}

      <div className="flex flex-col gap-4">
        <AnalyticsKpiStrip items={governanceKpis} />

        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <TrafficQuality
              actualLabel="Observed quality"
              baselineLabel="Governance target"
              chartData={governanceQualityData}
              description="Decision-gate quality against the governance baseline over the last 4 weeks."
              title="Decision gate quality"
              tooltipLabel="Decision gate quality"
              yDomain={[88, 100]}
            />
          </div>
          <div className="xl:col-span-5">
            <TopTrafficSources tabs={governanceOutcomeTabs} title="Decision routing" valueLabel="Decisions" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard
            title="Recent governance activity"
            description="Decision records, overrides, and provenance changes across the platform."
          >
            <div className="divide-y">
              {governanceEvents.map((event) => (
                <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0" key={event.path}>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{event.path}</p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {event.views} · {event.time}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {event.bounce}
                  </Badge>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Decision gates"
            description="Active providers and escalation rules for bounded decisions."
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {decisionGates.map((gate) => (
                <div className="rounded-lg border p-3" key={gate.name}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-sm">{gate.name}</p>
                    <StatusBadge status="Healthy" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Provider</p>
                      <p className="mt-1 font-medium">{gate.provider}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Threshold</p>
                      <p className="mt-1 font-medium">{gate.threshold}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Escalation</p>
                      <p className="mt-1 font-medium">{gate.route}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {gate.outputs.map((output) => (
                      <Badge key={output} variant="outline" className="font-mono text-[10px]">
                        {output}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Governance controls" description="Coverage and review safeguards for research decisions.">
          <div className="grid gap-5 md:grid-cols-3">
            <InlineProgress label="Audit trail completeness" value={100} />
            <InlineProgress label="Provenance linked to findings" value={96} />
            <InlineProgress label="Review SLA within target" value={82} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
