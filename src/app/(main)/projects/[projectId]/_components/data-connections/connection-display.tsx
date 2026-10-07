import { cn } from "cn";
import { siGooglebigquery, siPostgresql } from "simple-icons";

import type { ConnectionItem, ConnectionKind } from "@/lib/api/services/fetch-data-connections";

import { MYSQL_DOLPHIN_ICON } from "./mysql-dolphin";

export const CONNECTION_PROVIDERS = {
  postgres: {
    label: "PostgreSQL",
    description: "Connect PostgreSQL or Supabase.",
    category: "Database",
    icon: siPostgresql,
    viewBox: "0 0 24 24",
    color: "text-sky-600",
  },
  mysql: {
    label: "MySQL",
    description: "Connect MySQL or MariaDB.",
    category: "Database",
    icon: MYSQL_DOLPHIN_ICON,
    viewBox: "0 0 128 128",
    color: "text-cyan-600",
  },
  bigquery: {
    label: "BigQuery",
    description: "Connect a Google Cloud data warehouse.",
    category: "Data warehouse",
    icon: siGooglebigquery,
    viewBox: "0 0 24 24",
    color: "text-blue-500",
  },
} satisfies Record<
  ConnectionKind,
  { label: string; description: string; category: string; icon: { path: string }; viewBox: string; color: string }
>;

export function ConnectionLogo({ kind }: { kind: ConnectionKind }) {
  return (
    <svg
      viewBox={CONNECTION_PROVIDERS[kind].viewBox}
      fill="currentColor"
      className={cn("size-8 shrink-0", CONNECTION_PROVIDERS[kind].color)}
      aria-hidden="true"
    >
      <path d={CONNECTION_PROVIDERS[kind].icon.path} />
    </svg>
  );
}

const statuses: Record<string, string> = {
  host_not_allowed: "Host not allowed",
  unreachable: "Unreachable",
  timeout: "Timed out",
  auth_failed: "Authentication failed",
  permission_denied: "Permission denied",
  tls_unavailable: "TLS unavailable",
  tls_verify_failed: "Certificate verification failed",
};

export function connectionStatus(connection: ConnectionItem) {
  if (connection.last_error_code) return statuses[connection.last_error_code] ?? "Connection failed";
  return connection.last_tested_at ? "Connected" : "Not tested";
}

export function connectionTarget(connection: ConnectionItem) {
  return connection.kind === "bigquery"
    ? [connection.config.project_id, connection.config.location].filter(Boolean).join(" · ")
    : [connection.config.host, connection.config.database].filter(Boolean).join(" · ");
}
