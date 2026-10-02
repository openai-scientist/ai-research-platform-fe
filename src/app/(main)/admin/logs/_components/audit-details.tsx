"use client";

import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AuditItem } from "@/lib/api/types";

import { formatTimestamp } from "../../_components/admin-api-utils";
import { auditSummary, auditTitle, auditTransition, readableValue } from "./audit-presentation";

export function AuditDetails({
  item,
  actor,
  subject,
  actorEmail,
  subjectEmail,
  project,
}: {
  item: AuditItem;
  actor: string;
  subject: string;
  actorEmail?: string;
  subjectEmail?: string;
  project?: string;
}) {
  const change = auditTransition(item);
  const fields = [
    ["Timestamp (as recorded)", item.created_at],
    ["Action code", item.action],
    ["Actor ID", item.actor_user_id ?? "System"],
    ["Resource type", item.resource_type],
    ["Resource ID", item.resource_id],
    ["Project ID", item.project_id ?? "Not associated with a project"],
    ["Request ID", item.request_id ?? "Not recorded"],
    ["Event ID", item.id],
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          aria-label={`View details: ${auditTitle(item)} at ${formatTimestamp(item.created_at)}`}
        >
          Details <ChevronRight data-icon="inline-end" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{auditTitle(item)}</DialogTitle>
          <DialogDescription>{auditSummary(item, actor, subject)}</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <dt className="text-muted-foreground text-xs">Performed by</dt>
            <dd className="break-words font-medium text-sm">{actor}</dd>
            {actorEmail && <dd className="break-words text-muted-foreground text-xs">{actorEmail}</dd>}
          </div>
          <div className="min-w-0 space-y-1">
            <dt className="text-muted-foreground text-xs">
              Affected {readableValue(item.resource_type).toLowerCase()}
            </dt>
            <dd className="break-words font-medium text-sm">{subject}</dd>
            {subjectEmail && <dd className="break-words text-muted-foreground text-xs">{subjectEmail}</dd>}
          </div>
          <div className="min-w-0 space-y-1 sm:col-span-2">
            <dt className="text-muted-foreground text-xs">When (local time)</dt>
            <dd className="text-sm">{formatTimestamp(item.created_at)}</dd>
          </div>
          {project && (
            <div className="min-w-0 space-y-1 sm:col-span-2">
              <dt className="text-muted-foreground text-xs">Project</dt>
              <dd className="break-words text-sm">{project}</dd>
            </div>
          )}
        </dl>
        {change && (
          <section className="space-y-3">
            <h3 className="font-medium text-sm">What changed</h3>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-muted-foreground text-xs">Before</p>
                <Badge variant="outline">{readableValue(change.before)}</Badge>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-label="changed to" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-muted-foreground text-xs">After</p>
                <Badge variant="secondary">{readableValue(change.after)}</Badge>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {change.label} changed from {readableValue(change.before)} to {readableValue(change.after)}.
            </p>
          </section>
        )}
        <Collapsible className="border-t pt-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="group w-full justify-between">
              Technical details <ChevronDown className="group-data-[state=open]:rotate-180" data-icon="inline-end" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            <p className="text-muted-foreground text-xs">
              Reference IDs for support. Names above reflect the current directory.
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {fields.map(([label, value]) => (
                <div key={label} className="min-w-0 space-y-1">
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="break-words font-mono text-xs [overflow-wrap:anywhere]">{value}</dd>
                </div>
              ))}
            </dl>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(item.details, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </DialogContent>
    </Dialog>
  );
}
