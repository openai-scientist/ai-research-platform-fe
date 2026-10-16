"use client";

import { type ReactNode, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronRight, Loader2, Plug, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAllDataConnections,
  useConnectionAccess,
  useGoogleConnectionsAvailable,
} from "@/hooks/use-data-connections";
import {
  type ConnectionItem,
  type ConnectionKind,
  isGoogleConnection,
} from "@/lib/api/services/fetch-data-connections";

import {
  CONNECTION_PROVIDERS,
  ConnectionLogo,
  connectionStatus,
  connectionTarget,
} from "./data-connections/connection-display";
import { ConnectionFlow } from "./data-connections/connection-flow";
import type { GoogleFileKind, GoogleSelectionResult } from "./data-connections/google-connection-selection";
import { PickedImportFlow } from "./data-connections/picked-import-flow";
import { useGoogleConnectionCallback } from "./data-connections/use-google-connection-callback";
import type { WorkspaceProps } from "./workspace-ui";

// Search only helps once there are more connections than fit at a glance.
const SEARCH_FROM = 7;

function ChoiceRow({
  kind,
  title,
  detail,
  problem,
  disabled,
  busy,
  onChoose,
}: {
  kind: ConnectionKind;
  title: string;
  detail: ReactNode;
  problem?: string | null;
  disabled?: boolean;
  busy?: boolean;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={busy}
      onClick={onChoose}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
    >
      <span className="grid size-9 shrink-0 place-items-center [&_img]:size-8 [&_svg]:size-8">
        <ConnectionLogo kind={kind} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium text-sm">{title}</span>
        <span className="truncate text-muted-foreground text-xs">{detail}</span>
        {problem && <span className="text-destructive text-xs">{problem}</span>}
      </span>
      {busy ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-disabled:hidden"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function ConnectionChoice({
  connection,
  revoked,
  onChoose,
}: {
  connection: ConnectionItem;
  revoked: boolean;
  onChoose: () => void;
}) {
  const target =
    isGoogleConnection(connection.kind) && typeof connection.config.account_email === "string"
      ? `${connectionTarget(connection)} · ${connection.config.account_email}`
      : connectionTarget(connection);
  let problem: string | null = null;
  if (revoked) problem = "Reconnect required";
  else if (connection.last_error_code) problem = connectionStatus(connection);
  return (
    <ChoiceRow
      kind={connection.kind}
      title={connection.name}
      detail={
        <>
          {CONNECTION_PROVIDERS[connection.kind].label}
          {target && <> · {target}</>}
        </>
      }
      problem={problem}
      disabled={revoked}
      onChoose={onChoose}
    />
  );
}

const GOOGLE_PICKS: { kind: GoogleFileKind; what: string }[] = [
  { kind: "google_sheets", what: "a spreadsheet" },
  { kind: "google_drive", what: "a folder" },
];

function ChoiceGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col gap-2">
      <h3 className="font-medium text-muted-foreground text-xs">{title}</h3>
      {children}
    </section>
  );
}

/** Choose a saved connection, then pick, preview and import its data as a dataset. */
export function DatasetConnectionImport({
  project,
  userId,
  canWrite,
  picking,
  onPickingChange,
}: Pick<WorkspaceProps, "project" | "userId" | "canWrite"> & {
  picking: boolean;
  onPickingChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const query = useAllDataConnections(project.id);
  const access = useConnectionAccess(project.id);
  const googleAvailable = useGoogleConnectionsAvailable(canWrite);
  // The member's own Google account picks files here; others' accounts are never listed.
  const account = query.data?.find(
    (connection) => connection.kind === "google" && connection.created_by_user_id === userId,
  );
  // A member's Google account only picks files; the spreadsheets and folders picked with it are sources.
  const connections = useMemo(
    () => (query.data ?? []).filter((connection) => connection.kind !== "google"),
    [query.data],
  );
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<ConnectionItem | null>(null);
  const [googleKind, setGoogleKind] = useState<GoogleFileKind | null>(null);
  const connectionsPage = `/projects/${project.id}/connections`;
  // A picked spreadsheet or folder goes straight on to choosing what to import from it.
  const [picked, setPicked] = useState<GoogleSelectionResult | null>(null);
  const google = useGoogleConnectionCallback(project.id, userId, canWrite, account, setPicked, "datasets");
  const pickGoogle = (kind: GoogleFileKind) => {
    setGoogleKind(kind);
    // The dialog closes only once Google Picker shows, so a failure leaves the member where they were.
    google.startCreate(kind, () => {
      onPickingChange(false);
      setSearch("");
    });
  };

  const isRevoked = (connection: ConnectionItem) =>
    isGoogleConnection(connection.kind) &&
    (connection.last_error_code === "access_revoked" || access.revokedConnectionIds.has(connection.id));
  const term = search.trim().toLowerCase();
  const shown = term
    ? connections.filter((connection) =>
        [connection.name, CONNECTION_PROVIDERS[connection.kind].label, connectionTarget(connection)]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : connections;
  const anyRevoked = connections.some(isRevoked);
  const showGoogle = googleAvailable && access.configured;

  const savedList = (
    <div className="flex min-h-0 flex-col gap-3">
      {(connections.length >= SEARCH_FROM || search) && (
        <InputGroup>
          <InputGroupInput
            value={search}
            placeholder="Search connections"
            aria-label="Search connections"
            onChange={(event) => setSearch(event.target.value)}
          />
          <InputGroupAddon align="inline-start">
            <Search aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      )}
      <ul className="-mx-1 flex max-h-[min(20rem,45dvh)] flex-col gap-2 overflow-y-auto px-1 py-1">
        {shown.map((connection) => (
          <li key={connection.id}>
            <ConnectionChoice
              connection={connection}
              revoked={isRevoked(connection)}
              onChoose={() => {
                onPickingChange(false);
                setChosen(connection);
              }}
            />
          </li>
        ))}
        {!shown.length && (
          <li className="rounded-lg border border-dashed px-3 py-4 text-center text-muted-foreground text-sm">
            No connections match “{search.trim()}”.
          </li>
        )}
      </ul>
      {anyRevoked && (
        <p className="text-muted-foreground text-xs">
          Google connections that lost access can be reconnected on the Data connections page.
        </p>
      )}
    </div>
  );

  let body: ReactNode;
  if (!access.configured)
    body = (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Plug />
          </EmptyMedia>
          <EmptyTitle>Data connections are turned off</EmptyTitle>
          <EmptyDescription>This server is not set up to connect external data sources.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  else if (query.isPending)
    body = (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading connections">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-15 w-full rounded-lg" />
        ))}
      </div>
    );
  else if (query.isError)
    body = (
      <Button variant="outline" className="self-start" onClick={() => void query.refetch()}>
        Reload connections
      </Button>
    );
  else if (!connections.length && !showGoogle)
    body = (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Plug />
          </EmptyMedia>
          <EmptyTitle>No data connections yet</EmptyTitle>
          <EmptyDescription>
            Connect a database, Google Sheets or another source once, then import from it as often as you need.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href={connectionsPage}>
              <Plus data-icon="inline-start" />
              Connect a data source
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  else
    body = (
      <div className="flex min-h-0 min-w-0 flex-col gap-5">
        {showGoogle && (
          <ChoiceGroup title="Pick from Google">
            <ul className="flex flex-col gap-2">
              {GOOGLE_PICKS.map(({ kind, what }) => (
                <li key={kind}>
                  <ChoiceRow
                    kind={kind}
                    title={CONNECTION_PROVIDERS[kind].label}
                    detail={
                      account ? `Pick ${what} · ${connectionTarget(account)}` : `Sign in with Google, then pick ${what}`
                    }
                    disabled={google.pending || access.rateLimited}
                    busy={google.pending && googleKind === kind}
                    onChoose={() => pickGoogle(kind)}
                  />
                </li>
              ))}
            </ul>
          </ChoiceGroup>
        )}
        {connections.length > 0 && <ChoiceGroup title="Connected sources">{savedList}</ChoiceGroup>}
      </div>
    );

  return (
    <>
      <Dialog
        open={picking}
        onOpenChange={(open) => {
          onPickingChange(open);
          if (!open) setSearch("");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from a connection</DialogTitle>
            <DialogDescription>
              Pick where the data comes from. Next you choose what to import and check a preview.
            </DialogDescription>
          </DialogHeader>
          {body}
          {access.configured && (connections.length > 0 || showGoogle) && (
            <DialogFooter className="items-center sm:justify-between">
              <span className="text-muted-foreground text-xs">Data somewhere else?</span>
              <Button variant="outline" size="sm" asChild>
                <Link href={connectionsPage}>
                  <Plus data-icon="inline-start" />
                  Connect a new source
                </Link>
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      {chosen && canWrite && (
        <ConnectionFlow
          key={chosen.id}
          project={project}
          initialConnection={chosen}
          canWrite={canWrite}
          backLabel="Datasets"
          onClose={() => setChosen(null)}
          onComplete={(dataset) => {
            setChosen(null);
            router.push(`/projects/${project.id}/datasets/${dataset.id}`);
          }}
        />
      )}
      {picked && canWrite && (
        <PickedImportFlow
          project={project}
          canWrite={canWrite}
          picked={picked}
          backLabel="Datasets"
          onClose={() => setPicked(null)}
        />
      )}
    </>
  );
}
