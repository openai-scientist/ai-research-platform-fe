"use client";

import { History, Loader2, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { IntegrationCatalog, ProjectIntegration } from "@/lib/api/services/fetch-project-integrations";

import { ProviderMark } from "./provider-mark";
import type { IntegrationActions } from "./use-integration-actions";

export function IntegrationRow({
  integration,
  catalog,
  canWrite,
  canManage,
  actions,
  onEdit,
  onHistory,
  onRemove,
}: {
  integration: ProjectIntegration;
  catalog: IntegrationCatalog;
  canWrite: boolean;
  canManage: boolean;
  actions: IntegrationActions;
  onEdit: (repair: boolean) => void;
  onHistory: () => void;
  onRemove: () => void;
}) {
  const provider = catalog.providers.find((item) => item.key === integration.provider);
  const active = integration.status === "active";
  const testing = actions.testing && actions.testingId === integration.id;
  return (
    <li className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <ProviderMark provider={integration.provider} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words font-medium text-sm [overflow-wrap:anywhere]">{integration.name}</h3>
            <Badge variant={integration.status === "error" ? "destructive" : "secondary"}>
              {{ active: "Active", paused: "Paused", error: "Error" }[integration.status]}
            </Badge>
          </div>
          <p className="break-all text-muted-foreground text-xs">
            {provider?.label ?? integration.provider} · {integration.url_hint}
          </p>
          <p className="text-muted-foreground text-xs">
            {integration.events.length} {integration.events.length === 1 ? "event" : "events"} ·{" "}
            {integration.last_delivered_at ? (
              <>
                Last message{" "}
                <time dateTime={integration.last_delivered_at}>
                  {new Date(integration.last_delivered_at).toLocaleString("en-US")}
                </time>
              </>
            ) : (
              "No messages yet"
            )}
          </p>
        </div>
        {canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={actions.pending || actions.testing}
                aria-label={`Actions for ${integration.name}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => onEdit(false)}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                  <Trash2 />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:pl-14">
        <div className="flex flex-wrap items-center gap-2">
          {integration.last_error && (
            <Button
              variant="link"
              size="sm"
              onClick={() =>
                toast.error(integration.last_error?.message, {
                  description: new Date(integration.last_error?.at ?? integration.updated_at).toLocaleString("en-US"),
                })
              }
            >
              View error
            </Button>
          )}
          {canWrite && integration.status === "error" && (
            <Button
              variant="outline"
              size="sm"
              disabled={actions.pending || actions.testing}
              onClick={() => onEdit(true)}
            >
              Paste new URL
            </Button>
          )}
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              disabled={actions.testBlocked || actions.pending}
              title={
                actions.retryAt ? `Try again after ${new Date(actions.retryAt).toLocaleTimeString("en-US")}` : undefined
              }
              onClick={() =>
                void actions.test({ id: integration.id }, provider?.label ?? integration.provider, () => onEdit(true))
              }
            >
              {testing ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Send data-icon="inline-start" />
              )}
              {testing ? "Sending…" : "Send test"}
            </Button>
          )}
          {canManage && (
            <Button variant="ghost" size="sm" onClick={onHistory}>
              <History data-icon="inline-start" />
              History
            </Button>
          )}
        </div>
        {canWrite && (
          <label htmlFor={`integration-${integration.id}-enabled`} className="flex shrink-0 items-center gap-2 text-sm">
            <Switch
              id={`integration-${integration.id}-enabled`}
              aria-label={`Enable ${integration.name}`}
              checked={active}
              disabled={actions.pending || actions.testing}
              onCheckedChange={(enabled) => void actions.update(integration.id, { enabled }, integration.name)}
            />
            {active ? "On" : "Off"}
          </label>
        )}
      </div>
    </li>
  );
}
