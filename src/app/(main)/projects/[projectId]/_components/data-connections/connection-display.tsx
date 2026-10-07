import Image from "next/image";

import { cn } from "cn";
import { siGooglebigquery, siPostgresql } from "simple-icons";

import type { ConnectionItem, ConnectionKind } from "@/lib/api/services/fetch-data-connections";

// Official Google Workspace product logos, bundled locally to preserve their shapes and colors.
import googleDriveLogo from "./google-drive.svg";
import googleSheetsLogo from "./google-sheets.svg";
import { MYSQL_DOLPHIN_ICON } from "./mysql-dolphin";

export const CONNECTION_PROVIDERS = {
  postgres: {
    label: "PostgreSQL",
    description: "Connect PostgreSQL or Supabase.",
    category: "Database",
    icon: siPostgresql,
    viewBox: "0 0 24 24",
    color: "text-sky-600",
    badgeColor: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  mysql: {
    label: "MySQL",
    description: "Connect MySQL or MariaDB.",
    category: "Database",
    icon: MYSQL_DOLPHIN_ICON,
    viewBox: "0 0 128 128",
    color: "text-cyan-600",
    badgeColor: "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  bigquery: {
    label: "BigQuery",
    description: "Connect a Google Cloud data warehouse.",
    category: "Data warehouse",
    icon: siGooglebigquery,
    viewBox: "0 0 24 24",
    color: "text-blue-500",
    badgeColor: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  google_sheets: {
    label: "Google Sheets",
    description: "Read tabs from a Google spreadsheet.",
    category: "Spreadsheet",
    icon: null,
    viewBox: "0 0 24 24",
    color: "text-emerald-600",
    badgeColor: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  google_drive: {
    label: "Google Drive",
    description: "Read CSV, Google Sheets and Excel files in a folder.",
    category: "File storage",
    icon: null,
    viewBox: "0 0 24 24",
    color: "text-yellow-500",
    badgeColor: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
} satisfies Record<
  ConnectionKind,
  {
    label: string;
    description: string;
    category: string;
    icon: { path: string } | null;
    viewBox: string;
    color: string;
    badgeColor: string;
  }
>;

export function ConnectionLogo({ kind }: { kind: ConnectionKind }) {
  if (kind === "google_drive" || kind === "google_sheets") {
    return (
      <Image
        src={kind === "google_drive" ? googleDriveLogo : googleSheetsLogo}
        width={32}
        height={32}
        className="size-8 shrink-0"
        alt=""
        aria-hidden="true"
        unoptimized
      />
    );
  }
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
  access_revoked: "Reconnect required",
  rate_limited: "Rate limited",
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
  if (connection.kind === "google_sheets") return String(connection.config.title ?? "Spreadsheet");
  if (connection.kind === "google_drive") return String(connection.config.folder_name ?? "Folder");
  return connection.kind === "bigquery"
    ? [connection.config.project_id, connection.config.location].filter(Boolean).join(" · ")
    : [connection.config.host, connection.config.database].filter(Boolean).join(" · ");
}
