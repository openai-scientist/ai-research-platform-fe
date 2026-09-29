import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";

import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type AdminStatus = "Healthy" | "Degraded" | "Unavailable" | "Active" | "Disabled" | "Warning" | "Info";

const statusConfig: Record<AdminStatus, { className: string; icon: LucideIcon }> = {
  Healthy: { className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: CircleCheck },
  Active: { className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: CircleCheck },
  Degraded: { className: "bg-amber-500/10 text-amber-700 dark:text-amber-400", icon: TriangleAlert },
  Warning: { className: "bg-amber-500/10 text-amber-700 dark:text-amber-400", icon: TriangleAlert },
  Unavailable: { className: "bg-destructive/10 text-destructive", icon: CircleX },
  Disabled: { className: "bg-muted text-muted-foreground", icon: CircleX },
  Info: { className: "bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: Info },
};

export function AdminPageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  readonly actions?: React.ReactNode;
  readonly description: string;
  readonly eyebrow?: string;
  readonly title: string;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div className="space-y-1">
        {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">{eyebrow}</p>}
        <h1 className="font-heading text-3xl tracking-tight">{title}</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function MetricCard({
  change,
  detail,
  icon: Icon,
  label,
  trend = "up",
  value,
}: {
  readonly change?: string;
  readonly detail?: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly trend?: "up" | "down" | "neutral";
  readonly value: string;
}) {
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        </div>
        <CardTitle className="mt-2 text-2xl tabular-nums">{value}</CardTitle>
        {(change || detail) && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            {change && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  trend === "down" ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400",
                )}
              >
                <TrendIcon className="size-3" />
                {change}
              </span>
            )}
            {detail && <span>{detail}</span>}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

export function StatusBadge({ status }: { readonly status: AdminStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", config.className)}>
      <Icon />
      {status}
    </Badge>
  );
}

export function SectionCard({
  action,
  children,
  className,
  contentClassName,
  description,
  divided = true,
  title,
}: {
  readonly action?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly description?: string;
  readonly divided?: boolean;
  readonly title: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className={cn(divided && "border-b")}>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("pt-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function InlineProgress({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-medium tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
