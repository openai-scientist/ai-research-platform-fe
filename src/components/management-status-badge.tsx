import { cn } from "cn";
import { CircleCheck, CircleDashed, CircleX, Clock3, LoaderCircle, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const tones = {
  success: { icon: CircleCheck, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  attention: { icon: Clock3, className: "bg-amber-500/10 text-amber-800 dark:text-amber-300" },
  active: { icon: LoaderCircle, className: "bg-primary/10 text-primary" },
  error: { icon: CircleX, className: "bg-destructive/10 text-destructive" },
  warning: { icon: TriangleAlert, className: "bg-amber-500/10 text-amber-800 dark:text-amber-300" },
  neutral: { icon: CircleDashed, className: "bg-muted text-muted-foreground" },
};

const statusTones: Record<string, keyof typeof tones> = {
  active: "success",
  healthy: "success",
  completed: "success",
  validated: "success",
  supported: "success",
  running: "active",
  researching: "active",
  data_ready: "active",
  awaiting_review: "attention",
  needs_review: "attention",
  pending: "attention",
  invited: "attention",
  expired: "error",
  failed: "error",
  suspended: "error",
  unavailable: "error",
  budget_exceeded: "warning",
  inconclusive: "warning",
  degraded: "warning",
  warning: "warning",
};

export function ManagementStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll(" ", "_");
  const { icon: Icon, className } = tones[statusTones[normalized] ?? "neutral"];
  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent capitalize", className)}>
      <Icon />
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
