"use client";

import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { cn } from "cn";
import { Download, MoreHorizontal, Plug, PlugZap, Search, X } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  useAllDataConnections,
  useConnectionAccess,
  useConnectionActions,
  useGoogleConnectionsAvailable,
} from "@/hooks/use-data-connections";
import {
  type ConnectionItem,
  type ConnectionKind,
  isGoogleConnection,
  isTimeSeriesConnection,
} from "@/lib/api/services/fetch-data-connections";

import { WorkspaceFormDialog } from "../workspace-form-dialog";
import { ListState, perform, type WorkspaceProps } from "../workspace-ui";
import { CONNECTION_PROVIDERS, ConnectionLogo, connectionStatus, connectionTarget } from "./connection-display";
import { ConnectionFlow } from "./connection-flow";
import { ConnectionProviderPicker, type ProviderCounts } from "./connection-provider-picker";
import { GoogleReconnectButton } from "./google-reconnect-button";
import { useGoogleConnectionCallback } from "./use-google-connection-callback";

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
  const maxNameLength = isTimeSeriesConnection(connection.kind) ? 160 : 120;
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
        if (trimmed.length < 2 || trimmed.length > maxNameLength) {
          toast.error(`Connection name must contain 2 to ${maxNameLength} characters.`);
          return;
        }
        return Boolean(
          await perform(
            () => actions.rename.mutateAsync({ id: connection.id, name: trimmed }),
            `Connection renamed to "${trimmed}".`,
          ),
        );
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="connection-rename-name">Connection name</FieldLabel>
          <Input
            id="connection-rename-name"
            value={name}
            maxLength={maxNameLength}
            disabled={actions.rename.isPending}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </FieldGroup>
    </WorkspaceFormDialog>
  );
}

const DETAIL_LABELS: Record<string, string> = {
  ssl: "TLS mode",
  url: "Server URL",
  project_id: "Project ID",
  account_email: "Google account",
  folder_name: "Folder",
  title: "Spreadsheet",
};

function detailValue(value: unknown) {
  if (value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
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
        {Object.entries(connection.config)
          .filter(([key]) => key !== "google_subject")
          .map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-muted-foreground text-xs first-letter:uppercase">
                {DETAIL_LABELS[key] ?? key.replaceAll("_", " ")}
              </dt>
              <dd className="mt-1 break-words text-sm">{detailValue(value)}</dd>
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

function matches(connection: ConnectionItem, term: string) {
  const text = [
    connection.name,
    CONNECTION_PROVIDERS[connection.kind].label,
    connectionTarget(connection),
    typeof connection.config.account_email === "string" ? connection.config.account_email : "",
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(term);
}

// Search only helps once there are more connections than fit at a glance.
const SEARCH_FROM = 7;

export function ConnectionsSection({ project, canWrite, userId, header }: WorkspaceProps & { header?: ReactNode }) {
  const router = useRouter();
  const access = useConnectionAccess(project.id);
  const query = useAllDataConnections(project.id);
  const connections = useMemo(() => query.data ?? [], [query.data]);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<ConnectionKind | null>(null);
  const listRef = useRef<HTMLElement>(null);
  const actions = useConnectionActions(project.id);
  const googleAvailable = useGoogleConnectionsAvailable(canWrite);
  const [flow, setFlow] = useState<{
    connection?: ConnectionItem;
    kind?: ConnectionKind;
  } | null>(null);
  const resumeGoogle = useCallback((connection: ConnectionItem) => setFlow({ connection }), []);
  const googleCallback = useGoogleConnectionCallback(project.id, userId, canWrite, resumeGoogle);
  const [rename, setRename] = useState<ConnectionItem | null>(null);
  const [details, setDetails] = useState<ConnectionItem | null>(null);
  const [remove, setRemove] = useState<ConnectionItem | null>(null);
  const disabled = actions.pending || googleCallback.pending || access.rateLimited;
  const canAdd = canWrite && access.configured;

  const isRevoked = (connection: ConnectionItem) =>
    isGoogleConnection(connection.kind) &&
    (connection.last_error_code === "access_revoked" || access.revokedConnectionIds.has(connection.id));
  const counts: ProviderCounts = {};
  for (const connection of connections) {
    const count = counts[connection.kind] ?? { total: 0, failing: 0 };
    count.total += 1;
    if (connection.last_error_code || isRevoked(connection)) count.failing += 1;
    counts[connection.kind] = count;
  }
  const term = search.trim().toLowerCase();
  const shown = connections.filter(
    (connection) => (!kindFilter || connection.kind === kindFilter) && (!term || matches(connection, term)),
  );
  const loading = query.isPending && !access.rateLimited;
  const hasConnections = connections.length > 0;

  const add = (kind: ConnectionKind) => {
    if (disabled || !canAdd) return;
    if (!isGoogleConnection(kind)) {
      setFlow({ kind });
      return;
    }
    // Finish Google's popup on this page, then open the saved connection at source selection.
    googleCallback.startCreate(kind);
  };
  const show = (kind: ConnectionKind) => {
    setKindFilter(kind);
    setSearch("");
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <div className="flex flex-col gap-4">
        {header}
        {canWrite && !access.configured && (
          <Alert>
            <PlugZap />
            <AlertTitle>Data connections are turned off</AlertTitle>
            <AlertDescription>
              This server is not set up to connect external data sources. Contact your administrator to enable them.
            </AlertDescription>
          </Alert>
        )}
      </div>
      {(loading || query.isError || hasConnections) && (
        <section
          ref={listRef}
          className="flex min-w-0 scroll-mt-6 flex-col gap-4"
          aria-labelledby="saved-connections-title"
        >
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <h2 id="saved-connections-title" className="font-semibold text-lg">
                Your connections
              </h2>
              {hasConnections && (
                <span className="text-muted-foreground text-sm tabular-nums">
                  {shown.length === connections.length
                    ? connections.length
                    : `${shown.length} of ${connections.length}`}
                </span>
              )}
              {kindFilter && (
                <Badge variant="secondary" className="h-6 gap-1 pr-1 pl-2">
                  {CONNECTION_PROVIDERS[kindFilter].label}
                  <button
                    type="button"
                    onClick={() => setKindFilter(null)}
                    aria-label={`Show all connections, not only ${CONNECTION_PROVIDERS[kindFilter].label}`}
                    className="grid size-4 cursor-pointer place-items-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
            </div>
            {(connections.length >= SEARCH_FROM || search) && (
              <InputGroup className="w-full sm:max-w-xs">
                <InputGroupInput
                  id="connection-search"
                  value={search}
                  placeholder="Search by name, host or account"
                  aria-label="Search connections"
                  onChange={(event) => setSearch(event.target.value)}
                />
                <InputGroupAddon align="inline-start">
                  <Search aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
            )}
          </div>
          <ListState pending={loading} failed={query.isError} empty={false} title="Connections" retry={query.refetch} />
          {hasConnections && !shown.length && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-muted-foreground text-sm">
              No connections match {term ? <>“{search.trim()}”</> : "this filter"}.
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setKindFilter(null);
                }}
              >
                Clear search
              </Button>
            </div>
          )}
          <ul className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((connection) => {
              const revoked = isRevoked(connection);
              const failed = Boolean(connection.last_error_code) || revoked;
              const target =
                isGoogleConnection(connection.kind) && typeof connection.config.account_email === "string"
                  ? connection.config.account_email
                  : connectionTarget(connection);
              return (
                <li key={connection.id} className="min-w-0">
                  <Card size="sm" className="h-full">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center [&_img]:size-9 [&_svg]:size-9">
                        <ConnectionLogo kind={connection.kind} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <CardTitle>
                          <button
                            type="button"
                            className="max-w-full cursor-pointer break-words text-left font-medium text-sm underline-offset-4 outline-none hover:underline focus-visible:underline"
                            onClick={() => setDetails(connection)}
                          >
                            {connection.name}
                          </button>
                        </CardTitle>
                        <CardDescription className="truncate" title={target || undefined}>
                          {CONNECTION_PROVIDERS[connection.kind].label}
                          {target && <> · {target}</>}
                        </CardDescription>
                      </div>
                      {canWrite && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="-mr-1 shrink-0 self-start"
                              disabled={disabled}
                              aria-label={`Manage ${connection.name}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
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
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setRemove(connection)}>
                              Delete connection
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </CardHeader>
                    <CardContent className="mt-auto flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        variant={failed ? "destructive" : "outline"}
                        title={
                          connection.last_tested_at
                            ? `Last tested ${new Date(connection.last_tested_at).toLocaleString("en-US")}`
                            : undefined
                        }
                        className={cn(
                          !failed &&
                            connection.last_tested_at &&
                            "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                        )}
                      >
                        {revoked ? "Reconnect required" : connectionStatus(connection)}
                      </Badge>
                      {canAdd && (
                        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                          {revoked && (
                            <GoogleReconnectButton
                              projectId={project.id}
                              connectionId={connection.id}
                              accountEmail={String(connection.config.account_email ?? "")}
                              disabled={disabled}
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disabled || revoked}
                            onClick={() => setFlow({ connection })}
                          >
                            <Download data-icon="inline-start" />
                            Import data
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {canWrite ? (
        <section className="flex min-w-0 flex-col gap-4" aria-labelledby="add-source-title">
          <h2 id="add-source-title" className="font-semibold text-lg">
            {hasConnections || loading ? "Add a data source" : "Connect your first data source"}
          </h2>
          <ConnectionProviderPicker
            counts={counts}
            googleAvailable={googleAvailable}
            disabled={disabled || !canAdd}
            onAdd={add}
            onShow={show}
          />
        </section>
      ) : (
        !loading &&
        !query.isError &&
        !hasConnections && (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Plug />
              </EmptyMedia>
              <EmptyTitle>No connections yet</EmptyTitle>
              <EmptyDescription>
                Project members who can edit will see the data sources they connect here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      )}
      {flow && canWrite && (flow.connection ?? (flow.kind && !isGoogleConnection(flow.kind))) && (
        <ConnectionFlow
          project={project}
          initialConnection={flow.connection}
          initialKind={flow.kind}
          googleAvailable={googleAvailable}
          userId={userId}
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
      {canWrite && googleAvailable && (
        <ConfirmDialog
          open={Boolean(googleCallback.reconnect) && !googleCallback.pending}
          onOpenChange={(open) => {
            if (!open) googleCallback.setReconnect(null);
          }}
          title="Reconnect Google account"
          description={
            googleCallback.reconnect?.accountEmail
              ? `Use ${googleCallback.reconnect.accountEmail}. The connection and existing datasets will be preserved.`
              : "Use the original Google account. The connection and existing datasets will be preserved."
          }
          confirmLabel={googleCallback.reconnect?.grantId ? "Retry reconnection" : "Continue to Google"}
          disabled={disabled}
          onConfirm={googleCallback.confirmReconnect}
        />
      )}
      <ConfirmDialog
        open={Boolean(remove)}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
        title="Delete connection?"
        description="Saved dataset versions will remain. Future refreshes using this connection will stop working."
        confirmLabel="Delete connection"
        destructive
        onConfirm={() => {
          if (!remove || disabled || !canWrite) return;
          void perform(() => actions.remove.mutateAsync(remove.id), `Connection "${remove.name}" deleted.`);
          setRemove(null);
        }}
      />
    </div>
  );
}
