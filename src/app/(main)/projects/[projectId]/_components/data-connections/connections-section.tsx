"use client";

import { type ReactNode, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { cn } from "cn";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useConnectionAccess, useConnectionActions, useInfiniteDataConnections } from "@/hooks/use-data-connections";
import type { ConnectionItem } from "@/lib/api/services/fetch-data-connections";

import { WorkspaceFormDialog } from "../workspace-form-dialog";
import { ListState, LoadMore, perform, type WorkspaceProps } from "../workspace-ui";
import { CONNECTION_PROVIDERS, ConnectionLogo, connectionStatus } from "./connection-display";
import { ConnectionFlow } from "./connection-flow";

function RenameConnection({
  connection,
  projectId,
  onClose,
}: {
  connection: ConnectionItem;
  projectId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(connection.name);
  const actions = useConnectionActions(projectId);
  const access = useConnectionAccess(projectId);
  return (
    <WorkspaceFormDialog
      title="Rename connection"
      description="Only the name can be changed. Credentials stay unchanged."
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      showTrigger={false}
      submitLabel="Save name"
      pending={actions.rename.isPending}
      disabled={access.rateLimited}
      noValidate
      onSubmit={async () => {
        const trimmed = name.trim();
        if (trimmed.length < 2 || trimmed.length > 120) {
          toast.error("Connection name must contain 2 to 120 characters.");
          return;
        }
        return Boolean(
          await perform(() => actions.rename.mutateAsync({ id: connection.id, name: trimmed }), "Connection renamed."),
        );
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="connection-rename-name">Connection name</FieldLabel>
          <Input
            id="connection-rename-name"
            value={name}
            maxLength={120}
            disabled={actions.rename.isPending}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </FieldGroup>
    </WorkspaceFormDialog>
  );
}

function ConnectionDetails({ connection, onClose }: { connection: ConnectionItem; onClose: () => void }) {
  return (
    <WorkspaceFormDialog
      title={connection.name}
      description={`${CONNECTION_PROVIDERS[connection.kind].label} connection`}
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      showTrigger={false}
      hideSubmit
      submitLabel="Close"
      onSubmit={() => undefined}
    >
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.entries(connection.config).map(([key, value]) => (
          <div key={key} className="min-w-0">
            <dt className="text-muted-foreground text-xs">{key.replaceAll("_", " ")}</dt>
            <dd className="mt-1 break-words text-sm">{value === null ? "—" : String(value)}</dd>
          </div>
        ))}
        <div>
          <dt className="text-muted-foreground text-xs">Status</dt>
          <dd className="mt-1 text-sm">{connectionStatus(connection)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Last tested</dt>
          <dd className="mt-1 text-sm">
            {connection.last_tested_at ? new Date(connection.last_tested_at).toLocaleString("en-US") : "Not tested"}
          </dd>
        </div>
      </dl>
    </WorkspaceFormDialog>
  );
}

export function ConnectionsSection({ project, canWrite, header }: WorkspaceProps & { header?: ReactNode }) {
  const router = useRouter();
  const access = useConnectionAccess(project.id);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState<string>();
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim().length >= 3 ? search.trim() : undefined), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = useInfiniteDataConnections(project.id, q);
  const actions = useConnectionActions(project.id);
  const [flow, setFlow] = useState<{ connection?: ConnectionItem } | null>(null);
  const [rename, setRename] = useState<ConnectionItem | null>(null);
  const [details, setDetails] = useState<ConnectionItem | null>(null);
  const [remove, setRemove] = useState<ConnectionItem | null>(null);
  const disabled = actions.pending || access.rateLimited;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {header}
        {canWrite && access.configured && (
          <Button disabled={disabled} onClick={() => setFlow({})}>
            <Plus data-icon="inline-start" />
            Add connection
          </Button>
        )}
      </div>
      <section className="flex min-w-0 flex-col gap-4" aria-labelledby="saved-connections-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="saved-connections-title" className="font-semibold text-lg">
              Saved connections
            </h2>
            <span className="text-muted-foreground text-xs">
              {query.totalItems ?? query.connections.length} connections
            </span>
          </div>
          <Field className="w-full sm:max-w-sm">
            <FieldLabel htmlFor="connection-search" className="sr-only">
              Search connections
            </FieldLabel>
            <Input
              id="connection-search"
              value={search}
              placeholder="Search connections"
              onChange={(event) => setSearch(event.target.value)}
            />
            {search.trim().length > 0 && search.trim().length < 3 && (
              <FieldDescription>Enter at least 3 characters to search.</FieldDescription>
            )}
          </Field>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <ListState
            pending={query.isPending && !access.rateLimited}
            failed={query.isError}
            empty={!query.connections.length}
            title="Connections"
            retry={query.refetch}
          />
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {query.connections.map((connection) => (
              <Card key={connection.id} size="sm" className="h-full">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center">
                    <ConnectionLogo kind={connection.kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle>
                      <button
                        type="button"
                        className="max-w-full break-words text-left font-medium text-sm underline-offset-4 hover:underline"
                        onClick={() => setDetails(connection)}
                      >
                        {connection.name}
                      </button>
                    </CardTitle>
                    <CardDescription>{CONNECTION_PROVIDERS[connection.kind].label}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-2">
                  <Badge
                    variant={connection.last_error_code ? "destructive" : "outline"}
                    className={cn(
                      !connection.last_error_code &&
                        connection.last_tested_at &&
                        "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                    )}
                  >
                    {connectionStatus(connection)}
                  </Badge>
                  {canWrite && (
                    <div className="ml-auto flex items-center gap-2">
                      {canWrite && access.configured && (
                        <Button variant="outline" disabled={disabled} onClick={() => setFlow({ connection })}>
                          Import data
                        </Button>
                      )}
                      {canWrite && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={disabled}
                              aria-label={`Manage ${connection.name}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onSelect={() => setDetails(connection)}>Details</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setRename(connection)}>Rename</DropdownMenuItem>
                              {access.configured && (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    void perform(async () => {
                                      const result = await actions.test.mutateAsync(connection.id);
                                      if (result.data.last_error_code) toast.error(connectionStatus(result.data));
                                      else toast.success("Connection test succeeded.");
                                    });
                                  }}
                                >
                                  Test connection
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem variant="destructive" onSelect={() => setRemove(connection)}>
                                Delete connection
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <LoadMore
            visible={Boolean(query.hasNextPage)}
            pending={query.isFetching || access.rateLimited}
            onClick={query.loadMore}
          />
        </div>
      </section>
      {flow && canWrite && (
        <ConnectionFlow
          project={project}
          initialConnection={flow.connection}
          canWrite={canWrite}
          onClose={() => setFlow(null)}
          onComplete={(dataset) => {
            setFlow(null);
            router.push(`/projects/${project.id}/datasets/${dataset.id}`);
          }}
        />
      )}
      {rename && canWrite && (
        <RenameConnection connection={rename} projectId={project.id} onClose={() => setRename(null)} />
      )}
      {details && <ConnectionDetails connection={details} onClose={() => setDetails(null)} />}
      <ConfirmDialog
        open={Boolean(remove)}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
        title="Delete connection?"
        description="Saved dataset versions will remain. Future refreshes using this connection will stop working."
        confirmLabel="Delete connection"
        onConfirm={() => {
          if (!remove || disabled || !canWrite) return;
          void perform(() => actions.remove.mutateAsync(remove.id), "Connection deleted.");
          setRemove(null);
        }}
      />
    </div>
  );
}
