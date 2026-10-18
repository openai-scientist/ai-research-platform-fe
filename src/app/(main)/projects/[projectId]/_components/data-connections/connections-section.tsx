"use client";

import { type ReactNode, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Plug, PlugZap, Search, X } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  useAllDataConnections,
  useConnectionAccess,
  useConnectionActions,
  useDatasetsByConnection,
  useGoogleConnectionsAvailable,
} from "@/hooks/use-data-connections";
import {
  type ConnectionItem,
  type ConnectionKind,
  isGoogleConnection,
} from "@/lib/api/services/fetch-data-connections";

import { ConnectionCardsSkeleton } from "../workspace-skeletons";
import { ListState, perform, type WorkspaceProps } from "../workspace-ui";
import { ConnectionCard } from "./connection-card";
import { CONNECTION_PROVIDERS, connectionTarget } from "./connection-display";
import { ConnectionFlow } from "./connection-flow";
import { ConnectionProviderPicker, type ProviderCounts } from "./connection-provider-picker";
import type { GoogleSelectionResult } from "./google-connection-selection";
import { PickedImportFlow } from "./picked-import-flow";
import { useGoogleConnectionCallback } from "./use-google-connection-callback";

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

export function ConnectionsSection({
  project,
  canWrite,
  canManage,
  userId,
  header,
}: WorkspaceProps & { header?: ReactNode }) {
  const router = useRouter();
  const access = useConnectionAccess(project.id);
  const query = useAllDataConnections(project.id);
  const all = useMemo(() => query.data ?? [], [query.data]);
  // The member's own Google account picks files and is not a source: it shows on the Google cards instead.
  const account = all.find((connection) => connection.kind === "google" && connection.created_by_user_id === userId);
  const connections = useMemo(() => all.filter((connection) => connection.kind !== "google"), [all]);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<ConnectionKind | null>(null);
  const listRef = useRef<HTMLElement>(null);
  const actions = useConnectionActions(project.id);
  const googleAvailable = useGoogleConnectionsAvailable(canWrite);
  const datasets = useDatasetsByConnection(project.id);
  // A provider without Google's sign-in starts with its details form, then goes on to import from it.
  const [adding, setAdding] = useState<ConnectionKind | null>(null);
  const [importing, setImporting] = useState<ConnectionItem | null>(null);
  // A picked spreadsheet or folder goes straight on to its import; it is listed once something was imported.
  const [picked, setPicked] = useState<GoogleSelectionResult | null>(null);
  const googleCallback = useGoogleConnectionCallback(project.id, userId, canWrite, account, setPicked);
  const [disconnecting, setDisconnecting] = useState(false);
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
  const canImport = canWrite && access.configured;
  // Anyone who can edit the project imports through it; its creator or a manager changes it.
  const datasetsOf = (connection: ConnectionItem) =>
    datasets.data ? (datasets.data.get(connection.id) ?? []) : undefined;
  // A source with data opens its most recent dataset; one with nothing imported yet starts its import.
  const open = (connection: ConnectionItem) => {
    const imported = datasetsOf(connection);
    if (!imported) return;
    const latest = imported.reduce<(typeof imported)[number] | undefined>(
      (newest, dataset) => (!newest || dataset.updated_at > newest.updated_at ? dataset : newest),
      undefined,
    );
    if (latest) router.push(`/projects/${project.id}/datasets/${latest.id}`);
    else if (canImport) setImporting(connection);
  };

  const add = (kind: ConnectionKind) => {
    if (disabled || !canAdd) return;
    if (!isGoogleConnection(kind)) {
      setAdding(kind);
      return;
    }
    // Google Picker opens with the saved account, after signing in when there is none yet.
    googleCallback.startCreate(kind === "google_drive" ? "google_drive" : "google_sheets");
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
                Connections
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
          <ListState
            pending={loading}
            failed={query.isError}
            empty={false}
            title="Connections"
            retry={query.refetch}
            loading={<ConnectionCardsSkeleton label="Loading connections" />}
          />
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
            {shown.map((connection) => (
              <li key={connection.id} className="min-w-0">
                <ConnectionCard
                  connection={connection}
                  projectId={project.id}
                  datasetCount={datasetsOf(connection)?.length}
                  canImport={canImport}
                  canRemove={canWrite && (canManage || connection.created_by_user_id === userId)}
                  revoked={isRevoked(connection)}
                  disabled={disabled}
                  onOpen={() => open(connection)}
                  onRemove={() => setRemove(connection)}
                />
              </li>
            ))}
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
            googleAccount={account && String(account.config.account_email ?? "")}
            onDisconnectGoogle={() => setDisconnecting(true)}
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
      {adding && canWrite && (
        <ConnectionFlow
          project={project}
          initialKind={adding}
          canWrite={canWrite}
          onClose={() => setAdding(null)}
          onComplete={(dataset) => {
            setAdding(null);
            router.push(`/projects/${project.id}/datasets/${dataset.id}`);
          }}
        />
      )}
      {picked && canWrite && (
        <PickedImportFlow
          project={project}
          canWrite={canWrite}
          picked={picked}
          backLabel="Data connections"
          onClose={() => setPicked(null)}
        />
      )}
      {importing && canWrite && (
        <ConnectionFlow
          key={importing.id}
          project={project}
          initialConnection={importing}
          canWrite={canWrite}
          backLabel="Data connections"
          onClose={() => setImporting(null)}
          onComplete={(dataset) => {
            setImporting(null);
            router.push(`/projects/${project.id}/datasets/${dataset.id}`);
          }}
        />
      )}
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
        open={disconnecting && Boolean(account)}
        onOpenChange={setDisconnecting}
        title="Disconnect your Google account?"
        description="Spreadsheets and folders already added keep working for the project. To add more, you will sign in with Google again."
        confirmLabel="Disconnect"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => {
          if (!account || disabled) return;
          void perform(() => actions.remove.mutateAsync(account.id), {
            title: "Google account disconnected",
            description: String(account.config.account_email ?? ""),
          });
          setDisconnecting(false);
        }}
      />
      <ConfirmDialog
        open={Boolean(remove)}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
        title={`Delete ${remove?.name ?? "connection"}?`}
        description="Datasets already imported from it stay. Refreshing them from this source will stop working."
        confirmLabel="Delete connection"
        destructive
        onConfirm={() => {
          if (!remove || disabled || !canWrite) return;
          void perform(() => actions.remove.mutateAsync(remove.id), {
            title: "Connection deleted",
            description: remove.name,
          });
          setRemove(null);
        }}
      />
    </div>
  );
}
