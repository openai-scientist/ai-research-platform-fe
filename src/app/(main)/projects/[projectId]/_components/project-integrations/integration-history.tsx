"use client";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api";
import { integrationKeys } from "@/lib/api/query-keys";
import {
  fetchProjectIntegrations,
  type IntegrationCatalog,
  type IntegrationDelivery,
  type ProjectIntegration,
} from "@/lib/api/services/fetch-project-integrations";

function deliveryStatus(delivery: IntegrationDelivery) {
  if (delivery.status === "pending") return delivery.attempts > 0 ? "Retrying" : "Queued";
  return { sending: "Sending", sent: "Sent", failed: "Failed" }[delivery.status];
}

export function IntegrationHistory({
  projectId,
  integration,
  catalog,
  onClose,
}: {
  projectId: string;
  integration: ProjectIntegration;
  catalog: IntegrationCatalog;
  onClose: () => void;
}) {
  const query = useApiQuery(
    integrationKeys.deliveries(projectId, integration.id),
    (signal) => fetchProjectIntegrations.deliveries(projectId, integration.id, signal),
    {
      refetchInterval: (state) =>
        state.state.data?.data.some((item) => ["pending", "sending"].includes(item.status)) ? 5000 : false,
    },
  );
  const deliveries = query.data?.data;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Message history</DialogTitle>
          <DialogDescription className="break-words">
            {integration.name} · Up to 20 recent messages from the last 30 days.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto">
          {query.isPending && (
            <div role="status" aria-label="Loading message history" className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {!query.isError && deliveries?.length === 0 && (
            <p className="py-6 text-center text-muted-foreground text-sm">No messages in the last 30 days.</p>
          )}
          {deliveries && (
            <ol className="divide-y">
              {deliveries.map((delivery) => (
                <li key={delivery.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">
                      {catalog.events.find((event) => event.key === delivery.event)?.label ?? delivery.event}
                    </span>
                    <Badge variant={delivery.status === "failed" ? "destructive" : "secondary"}>
                      {deliveryStatus(delivery)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <time dateTime={delivery.sent_at ?? delivery.created_at} className="text-muted-foreground text-xs">
                      {new Date(delivery.sent_at ?? delivery.created_at).toLocaleString("en-US")}
                    </time>
                    {delivery.error_message && (
                      <Button variant="link" size="sm" onClick={() => toast.error(delivery.error_message)}>
                        View error
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
            <RefreshCw data-icon="inline-start" />
            {query.isError ? "Reload history" : "Refresh"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
