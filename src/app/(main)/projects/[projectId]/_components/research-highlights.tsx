import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "cn";
import { ArrowRight, ChevronRight, CircleAlert, Info, OctagonAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { SectionCard } from "../../../admin/_components/admin-primitives";
import type { ProjectDashboard, WarningSeverity } from "./project-dashboard-data";

const MAX_ITEMS = 3;

const stateClassNames: Record<string, string> = {
  Completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Validated: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Running: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Validating: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "Needs Review": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Failed: "bg-destructive/10 text-destructive",
  Rejected: "bg-destructive/10 text-destructive",
};

const severityOrder: WarningSeverity[] = ["Blocking", "Warning", "Info"];

const severityStyles: Record<WarningSeverity, { className: string; icon: typeof Info }> = {
  Blocking: { className: "bg-destructive/10 text-destructive", icon: OctagonAlert },
  Warning: { className: "bg-amber-500/10 text-amber-700 dark:text-amber-400", icon: CircleAlert },
  Info: { className: "bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: Info },
};

function StateBadge({ label }: { readonly label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 border-transparent bg-muted text-muted-foreground", stateClassNames[label])}
    >
      {label}
    </Badge>
  );
}

function ViewAllLink({ href }: { readonly href: string }) {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link prefetch={false} href={href}>
        View all
        <ArrowRight data-icon="inline-end" />
      </Link>
    </Button>
  );
}

function HighlightRow({
  badge,
  meta,
  title,
}: {
  readonly badge: ReactNode;
  readonly meta: string;
  readonly title: string;
}) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm" title={title}>
          {title}
        </p>
        <p className="text-muted-foreground text-xs">{meta}</p>
      </div>
      {badge}
    </li>
  );
}

export function RecentExperimentsCard({
  baseUrl,
  experiments,
}: {
  readonly baseUrl: string;
  readonly experiments: ProjectDashboard["recentExperiments"];
}) {
  return (
    <SectionCard title="Recent experiments" action={<ViewAllLink href={`${baseUrl}/experiments`} />} className="h-full">
      {experiments.length === 0 && <p className="text-muted-foreground text-sm">No runs yet.</p>}
      <ul className="divide-y">
        {experiments.slice(0, MAX_ITEMS).map((experiment) => (
          <HighlightRow
            key={experiment.id}
            title={experiment.title}
            meta={`${experiment.id} · ${experiment.updatedAt}`}
            badge={<StateBadge label={experiment.state} />}
          />
        ))}
      </ul>
    </SectionCard>
  );
}

export function RecentFindingsCard({
  baseUrl,
  findings,
  live,
}: {
  readonly baseUrl: string;
  readonly findings: ProjectDashboard["recentFindings"];
  readonly live?: boolean;
}) {
  return (
    <SectionCard title="Recent findings" action={<ViewAllLink href={`${baseUrl}/findings`} />} className="h-full">
      {live && <p className="text-muted-foreground text-sm">Finding details are not available yet.</p>}
      <ul className="divide-y">
        {findings.slice(0, MAX_ITEMS).map((finding) => (
          <HighlightRow
            key={finding.id}
            title={finding.statement}
            meta={`${finding.id} · ${finding.updatedAt}`}
            badge={<StateBadge label={finding.status} />}
          />
        ))}
      </ul>
    </SectionCard>
  );
}

export function WarningsCard({
  baseUrl,
  warnings,
  live,
}: {
  readonly baseUrl: string;
  readonly warnings: ProjectDashboard["warnings"];
  readonly live?: boolean;
}) {
  const sortedWarnings = [...warnings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  return (
    <SectionCard
      title="Warnings"
      description={live ? undefined : `${warnings.length} unresolved`}
      className="h-full"
      contentClassName="flex flex-1 flex-col"
    >
      {sortedWarnings.length === 0 ? (
        <p className="m-auto text-muted-foreground text-sm">
          {live ? "Warning details are not available yet." : "No unresolved warnings."}
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col gap-1">
          {sortedWarnings.map((warning) => {
            const { className, icon: Icon } = severityStyles[warning.severity];

            return (
              <li key={warning.title}>
                <Link
                  prefetch={false}
                  href={`${baseUrl}/${warning.section}`}
                  className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", className)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-sm">
                      <span className="sr-only">{warning.severity}: </span>
                      {warning.title}
                    </span>
                    <span className="block truncate text-muted-foreground text-xs">
                      {warning.source} · {warning.detail}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
