import { cn } from "cn";
import { CalendarClock, CircleCheck, ClipboardCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { MetricCard, SectionCard } from "../../admin/_components/admin-primitives";
import { type ReviewPriority, reviewQueue, reviewStats } from "./review-data";

const priorityClassNames: Record<ReviewPriority, string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Low: "bg-muted text-muted-foreground",
};

export function ReviewQueue() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl tracking-tight">Review queue</h1>
        <p className="text-muted-foreground text-sm">Findings from all projects that are waiting for your review.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={ClipboardCheck} label="Pending reviews" value={String(reviewStats.pending)} />
        <MetricCard icon={CalendarClock} label="Due today" value={String(reviewStats.dueToday)} />
        <MetricCard icon={CircleCheck} label="Completed this week" value={String(reviewStats.completedThisWeek)} />
      </div>

      <SectionCard title="Pending findings" description="Sorted by due date." contentClassName="px-0 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Finding</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="pr-4 text-right">Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviewQueue.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-md pl-4">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.id} · {item.submittedAt}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.projectName}</TableCell>
                <TableCell className="text-muted-foreground">{item.submittedBy}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent", priorityClassNames[item.priority])}>
                    {item.priority}
                  </Badge>
                </TableCell>
                <TableCell className="pr-4 text-right tabular-nums">{item.dueIn}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
