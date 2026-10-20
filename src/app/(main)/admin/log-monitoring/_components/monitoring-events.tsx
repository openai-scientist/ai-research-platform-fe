"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonitoringEvent } from "@/hooks/use-admin-monitoring-query";

import { formatTimestamp } from "../../_components/admin-api-utils";
import { readableKey } from "../../_components/telemetry-ui";

export function MonitoringEventDialog({ id, enabled, onClose }: { id: string; enabled: boolean; onClose: () => void }) {
  const query = useMonitoringEvent(id, enabled);
  const event = enabled && !query.isError ? query.data?.data : undefined;
  return (
    <Dialog
      open={Boolean(id) && enabled}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Event details</DialogTitle>
          <DialogDescription>Sanitized technical event and correlation identifiers.</DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          event && (
            <div className="flex min-w-0 flex-col gap-4">
              <p className="whitespace-pre-wrap break-words">{event.message}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries(event)
                  .filter(([key]) => key !== "payload" && key !== "message")
                  .map(([key, value]) => (
                    <div key={key} className="min-w-0">
                      <dt className="text-muted-foreground text-xs">{readableKey(key)}</dt>
                      <dd className="mt-1 break-all text-sm">
                        {value === null ? "—" : key === "created_at" ? formatTimestamp(String(value)) : String(value)}
                      </dd>
                    </div>
                  ))}
              </dl>
              <div>
                <h3 className="mb-2 font-medium">Payload</h3>
                {Object.keys(event.payload).length ? (
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-sm">No additional payload is available.</p>
                )}
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
