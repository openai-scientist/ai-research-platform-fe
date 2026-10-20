"use client";

import { createContext, type ReactNode } from "react";

import { useSignalR } from "@/hooks/use-signalr";

export const SignalRNotificationsContext = createContext<ReturnType<typeof useSignalR> | null>(null);

/**
 * Reuses the existing provider for the backend's SSE notification transport.
 * A single owner keeps one authenticated connection per tab.
 */
export function SignalRProvider({ children }: { children: ReactNode }) {
  const notifications = useSignalR();
  return <SignalRNotificationsContext.Provider value={notifications}>{children}</SignalRNotificationsContext.Provider>;
}
