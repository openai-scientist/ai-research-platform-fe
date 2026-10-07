"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { showConnectionError, useConnectionAccess, useGoogleConnectionsAvailable } from "@/hooks/use-data-connections";
import { fetchDataConnections, isGoogleConnection } from "@/lib/api/services/fetch-data-connections";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/auth-slice";

import { beginGoogleConnection } from "./google-connection-state";

export function GoogleReconnectButton({
  projectId,
  connectionId,
  accountEmail,
  disabled = false,
}: {
  projectId: string;
  connectionId: string;
  accountEmail?: string;
  disabled?: boolean;
}) {
  const user = useAppSelector(selectUser);
  const access = useConnectionAccess(projectId);
  const available = useGoogleConnectionsAvailable(!disabled);
  const [email, setEmail] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!available) return null;

  async function confirmAccount() {
    if (!user || pending || access.rateLimited || disabled) return;
    if (accountEmail) {
      setEmail(accountEmail);
      return;
    }
    setPending(true);
    try {
      const connection = (await fetchDataConnections.getById(projectId, connectionId)).data;
      if (!isGoogleConnection(connection.kind)) throw new Error("This connection does not use Google authorization.");
      setEmail(String(connection.config.account_email ?? ""));
    } catch (error) {
      showConnectionError(error, projectId);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={[disabled, pending, !user, access.rateLimited].some(Boolean)}
        onClick={() => void confirmAccount()}
      >
        {pending ? "Loading account..." : "Reconnect"}
      </Button>
      <ConfirmDialog
        open={email !== null}
        onOpenChange={(open) => {
          if (!open) setEmail(null);
        }}
        title="Reconnect Google account"
        description={
          email
            ? `Choose ${email} on Google's consent screen. The saved destination and existing datasets will be preserved.`
            : "Choose the original Google account on Google's consent screen. The saved destination will be preserved."
        }
        confirmLabel="Continue to Google"
        disabled={[disabled, !user, access.rateLimited].some(Boolean)}
        onConfirm={() => {
          if (!user || disabled || access.rateLimited) return;
          try {
            beginGoogleConnection(projectId, user.id, {
              action: "reauthorize",
              connectionId,
              accountEmail: email ?? "",
            });
          } catch (error) {
            showConnectionError(error, projectId);
          }
        }}
      />
    </>
  );
}
