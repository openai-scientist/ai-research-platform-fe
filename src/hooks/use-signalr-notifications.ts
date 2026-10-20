"use client";

import { useContext } from "react";

import { SignalRNotificationsContext } from "@/lib/providers/signalr-provider";

/** Reads the shared notification snapshot without opening another connection. */
export function useSignalRNotifications() {
  const notifications = useContext(SignalRNotificationsContext);
  if (!notifications) throw new Error("useSignalRNotifications must be used within SignalRProvider.");
  return notifications;
}
