"use client";

import { cn } from "cn";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type ConnectionItem, isGoogleConnection } from "@/lib/api/services/fetch-data-connections";

import { CONNECTION_PROVIDERS, ConnectionLogo, connectionStatus, connectionTarget } from "./connection-display";
import { GoogleReconnectButton } from "./google-reconnect-button";

/**
 * One saved source and what the project imported from it. Opening it shows that data, or starts its import
 * when nothing was imported yet.
 */
export function ConnectionCard({
  connection,
  projectId,
  datasetCount,
  canImport,
  canRemove,
  revoked,
  disabled,
  onOpen,
  onRemove,
}: {
  connection: ConnectionItem;
  projectId: string;
  /** Datasets imported from it; `undefined` while they load. */
  datasetCount: number | undefined;
  canImport: boolean;
  /** Its creator or a manager deletes it. */
  canRemove: boolean;
  revoked: boolean;
  disabled: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const failed = Boolean(connection.last_error_code) || revoked;
  const target =
    isGoogleConnection(connection.kind) && typeof connection.config.account_email === "string"
      ? connection.config.account_email
      : connectionTarget(connection);
  let status: string;
  if (revoked) status = "Reconnect required";
  else if (failed) status = connectionStatus(connection);
  else if (datasetCount) status = `${datasetCount} ${datasetCount === 1 ? "dataset" : "datasets"}`;
  else status = "Not imported yet";
  // With nothing imported, opening it imports; without the right to import, there is nothing to open.
  const opens = datasetCount !== undefined && (Boolean(datasetCount) || canImport);

  return (
    <Card
      size="sm"
      className="group/card relative h-full transition-colors has-[[data-slot=card-open]:hover]:border-foreground/25 has-[[data-slot=card-open]:hover]:bg-muted/40"
    >
      {opens && (
        // The whole card opens; the buttons inside sit above this.
        <button
          type="button"
          data-slot="card-open"
          disabled={disabled}
          onClick={onOpen}
          aria-label={datasetCount ? `Open data from ${connection.name}` : `Import data from ${connection.name}`}
          className="absolute inset-0 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
        />
      )}
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center [&_img]:size-9 [&_svg]:size-9">
          <ConnectionLogo kind={connection.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate font-medium text-sm">{connection.name}</CardTitle>
          <CardDescription className="truncate" title={target || undefined}>
            {CONNECTION_PROVIDERS[connection.kind].label}
            {target && <> · {target}</>}
          </CardDescription>
        </div>
        {canRemove && (
          // Shown on hover or keyboard focus where there is a pointer; always on touch screens.
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="relative -mr-1 shrink-0 self-start text-muted-foreground pointer-fine:opacity-0 hover:text-destructive pointer-fine:focus-visible:opacity-100 pointer-fine:group-hover/card:opacity-100"
                disabled={disabled}
                onClick={onRemove}
                aria-label={`Delete ${connection.name}`}
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete connection</TooltipContent>
          </Tooltip>
        )}
      </CardHeader>
      {/* Lines up with the name, past the logo (size-10) and the header gap (gap-3). */}
      <CardContent className="mt-auto ml-13 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <Badge
          variant={failed ? "destructive" : "outline"}
          className={cn(
            datasetCount === undefined && !failed && "invisible",
            !failed && datasetCount && "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            !failed && !datasetCount && "text-muted-foreground",
          )}
        >
          {status}
        </Badge>
        {revoked && canImport && (
          <div className="relative ml-auto">
            <GoogleReconnectButton
              projectId={projectId}
              connectionId={connection.id}
              accountEmail={String(connection.config.account_email ?? "")}
              disabled={disabled}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
