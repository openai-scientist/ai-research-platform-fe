"use client";

import type { Dispatch, SetStateAction } from "react";

import { cn } from "cn";

import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type ConnectionKind,
  type ConnectionSsl,
  type CreateConnectionRequest,
  isGoogleConnection,
} from "@/lib/api/services/fetch-data-connections";

const CONNECTION_INPUT_CLASSNAME = "h-11 bg-background md:h-10";

export interface ConnectionDraft {
  name: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: ConnectionSsl;
  projectId: string;
  location: string;
  serviceAccountJson: string;
  googleTarget: string;
}
export const EMPTY_CONNECTION_DRAFT: ConnectionDraft = {
  name: "",
  host: "",
  port: "5432",
  database: "",
  username: "",
  password: "",
  ssl: "disable",
  projectId: "",
  location: "",
  serviceAccountJson: "",
  googleTarget: "",
};

function connectionName(value: string) {
  const name = value.trim();
  if (name.length < 2 || name.length > 120) throw new Error("Connection name must contain 2 to 120 characters.");
  return name;
}

export function googleConnectionDetails(draft: Pick<ConnectionDraft, "name" | "googleTarget">) {
  const name = connectionName(draft.name);
  const target = draft.googleTarget.trim();
  if (!target || target.length > 2048)
    throw new Error("Provide a Google URL or ID containing at most 2,048 characters.");
  return { name, target };
}

export function createConnectionInput(
  kind: ConnectionKind,
  draft: ConnectionDraft,
  grantId?: string,
): CreateConnectionRequest {
  if (isGoogleConnection(kind)) {
    const { name, target } = googleConnectionDetails(draft);
    if (!grantId) throw new Error("Connect your Google account before saving this connection.");
    return kind === "google_sheets"
      ? { name, kind, config: { spreadsheet: target }, grant_id: grantId }
      : { name, kind, config: { folder: target }, grant_id: grantId };
  }
  const name = connectionName(draft.name);
  if (kind === "bigquery") {
    if (!draft.serviceAccountJson.trim() || draft.serviceAccountJson.length > 16_384) {
      throw new Error("Provide a service account JSON key containing at most 16,384 characters.");
    }
    let key: unknown;
    try {
      key = JSON.parse(draft.serviceAccountJson);
    } catch {
      throw new Error("The service account key must be valid JSON.");
    }
    if (!key || typeof key !== "object" || Array.isArray(key))
      throw new Error("The service account key must be a JSON object.");
    return {
      name,
      kind,
      config: {
        ...(draft.projectId.trim() ? { project_id: draft.projectId.trim() } : {}),
        ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
      },
      secret: { service_account_json: draft.serviceAccountJson },
    };
  }
  if (!draft.host.trim() || !draft.database.trim() || !draft.username.trim()) {
    throw new Error("Host, database and username are required.");
  }
  if (draft.host.includes("://") || draft.host.includes("/") || draft.host.includes(" ")) {
    throw new Error("Enter a database hostname or IP address without a URL scheme, path or port.");
  }
  const portText = draft.port.trim();
  const port = Number(portText);
  if (portText && (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65_535)) {
    throw new Error("Port must be a whole number between 1 and 65,535.");
  }
  if (draft.password.length > 1024) throw new Error("Password must contain at most 1,024 characters.");
  return {
    name,
    kind,
    config: {
      host: draft.host.trim(),
      ...(portText ? { port } : {}),
      database: draft.database.trim(),
      username: draft.username.trim(),
      ssl: draft.ssl,
    },
    secret: { password: draft.password },
  };
}

export function ConnectionGuidance({
  kind,
  ssl,
  compact = false,
}: {
  kind: ConnectionKind;
  ssl: ConnectionSsl;
  compact?: boolean;
}) {
  if (isGoogleConnection(kind)) {
    return (
      <div className="flex flex-col gap-3 text-pretty text-muted-foreground text-xs leading-relaxed">
        <h3 className="font-semibold text-foreground">Before you connect</h3>
        <p>All project members who can contribute will be able to read this source using your Google account.</p>
        <p>
          Grant permission to view Google Drive files when Google asks. Signing in with Google does not grant this
          access.
        </p>
        <p>The first row must contain unique column names. Data below an empty header is not supported.</p>
        {kind === "google_drive" ? (
          <p>
            Only files directly inside the folder are read. Subfolders are excluded. Supported: CSV, Google Sheets and
            Excel .xlsx.
          </p>
        ) : (
          <p>
            Excel files opened in Google Sheets must be converted using File → Save as Google Sheets, or connected
            through Google Drive.
          </p>
        )}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col text-pretty text-muted-foreground text-xs",
        compact ? "gap-2 leading-normal" : "gap-3 leading-relaxed",
      )}
    >
      <h3 className="font-semibold text-foreground">Before you connect</h3>
      {kind === "bigquery" ? (
        <>
          <p>
            SQL previews and imports may incur charges to this Google Cloud project. Table previews are free. Queries
            scanning more than 1 GiB are rejected.
          </p>
          <p>The service account needs BigQuery Job User and BigQuery Data Viewer permissions.</p>
        </>
      ) : (
        <p>
          {ssl === "disable"
            ? "Passwords and data will travel without encryption. Only use this when the server does not support TLS."
            : ssl === "require"
              ? "The connection is encrypted, but the server certificate is not verified. Use verify-full for a publicly trusted certificate."
              : "The connection is encrypted and the server certificate is verified."}
        </p>
      )}
      <p>
        Use a read-only database account. Project Managers and Researchers can run any SELECT query allowed by this
        account.
      </p>
      <p>
        The server has no fixed outbound IP. Databases requiring a firewall IP allowlist cannot currently be connected.
      </p>
      <p>Credentials are never returned by the API. Only the connection name can be edited after saving.</p>
      {kind !== "bigquery" && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              Read-only account setup
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <p>Run these commands as your database administrator. Replace mydb and the password first.</p>
            <pre className="mt-2 max-w-full overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
              <code>
                {kind === "postgres"
                  ? "CREATE ROLE platform_reader LOGIN PASSWORD '...';\nGRANT CONNECT ON DATABASE mydb TO platform_reader;\nGRANT USAGE ON SCHEMA public TO platform_reader;\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO platform_reader;\nALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO platform_reader;"
                  : "CREATE USER 'platform_reader'@'%' IDENTIFIED BY '...';\nGRANT SELECT ON mydb.* TO 'platform_reader'@'%';"}
              </code>
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export function ConnectionForm({
  kind,
  draft,
  setDraft,
  disabled,
}: {
  kind: ConnectionKind;
  draft: ConnectionDraft;
  setDraft: Dispatch<SetStateAction<ConnectionDraft>>;
  disabled: boolean;
}) {
  const update = (key: keyof ConnectionDraft, value: string) => setDraft((previous) => ({ ...previous, [key]: value }));
  const input = (key: keyof ConnectionDraft, label: string, required = false, type = "text") => {
    const Control = type === "password" ? PasswordInput : Input;
    return (
      <Field key={key}>
        <FieldLabel htmlFor={`connection-${key}`}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </FieldLabel>
        <Control
          id={`connection-${key}`}
          type={type}
          value={draft[key]}
          maxLength={key === "name" ? 120 : undefined}
          disabled={disabled}
          aria-required={required}
          autoComplete={key === "password" ? "new-password" : "off"}
          className={CONNECTION_INPUT_CLASSNAME}
          onChange={(event) => update(key, event.target.value)}
        />
      </Field>
    );
  };
  return (
    <FieldGroup
      className={cn(!isGoogleConnection(kind) && kind !== "bigquery" && "grid grid-cols-1 gap-4 md:grid-cols-2")}
    >
      {input("name", "Connection name", true)}
      {isGoogleConnection(kind) ? (
        <Field>
          <FieldLabel htmlFor="connection-google-target">
            {kind === "google_sheets" ? "Spreadsheet URL or ID" : "Folder URL or ID"}
            <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="connection-google-target"
            className={CONNECTION_INPUT_CLASSNAME}
            value={draft.googleTarget}
            maxLength={2048}
            disabled={disabled}
            aria-required
            autoComplete="off"
            placeholder={
              kind === "google_sheets"
                ? "https://docs.google.com/spreadsheets/d/..."
                : "https://drive.google.com/drive/folders/..."
            }
            onChange={(event) => update("googleTarget", event.target.value)}
          />
          <FieldDescription>Paste the full URL or ID of the source you want this project to read.</FieldDescription>
        </Field>
      ) : kind === "bigquery" ? (
        <>
          {input("projectId", "Google Cloud project ID")}
          {input("location", "Location")}
          <Field>
            <FieldLabel htmlFor="connection-service-key">
              Service account JSON <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="connection-service-key"
              value={draft.serviceAccountJson}
              disabled={disabled}
              aria-required
              maxLength={16_384}
              autoComplete="off"
              spellCheck={false}
              className="min-h-40 bg-background font-mono"
              onChange={(event) => update("serviceAccountJson", event.target.value)}
            />
            <FieldDescription>Paste the JSON key. It stays in this form until you connect or leave.</FieldDescription>
          </Field>
        </>
      ) : (
        <>
          {input("host", "Host", true)}
          {input("port", "Port", false, "number")}
          {input("database", "Database", true)}
          {input("username", "Username", true)}
          {input("password", "Password", false, "password")}
          <Field className="md:col-span-2 md:max-w-sm">
            <FieldLabel htmlFor="connection-ssl">TLS mode</FieldLabel>
            <Select
              value={draft.ssl}
              disabled={disabled}
              onValueChange={(value) => {
                if (value === "require" || value === "verify-full" || value === "disable") update("ssl", value);
              }}
            >
              <SelectTrigger id="connection-ssl" className={cn("w-full", CONNECTION_INPUT_CLASSNAME)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {["require", "verify-full", "disable"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}
      <FieldDescription className={cn(!isGoogleConnection(kind) && kind !== "bigquery" && "md:col-span-2")}>
        {isGoogleConnection(kind)
          ? "Connecting checks access to this source and saves the connection only when successful."
          : "Connecting tests these credentials and saves the connection only when successful."}
      </FieldDescription>
    </FieldGroup>
  );
}
