"use client";

import type { ReactNode } from "react";

import { useAuthSyncAcrossTabs } from "@/hooks/use-auth-sync-across-tabs";

import { QueryProvider } from "./query-provider";
import { ReduxProvider } from "./redux-provider";
import { SignalRProvider } from "./signalr-provider";

function AuthSyncProvider({ children }: { children: ReactNode }) {
  useAuthSyncAcrossTabs();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider>
      <QueryProvider>
        <AuthSyncProvider>
          <SignalRProvider>{children}</SignalRProvider>
        </AuthSyncProvider>
      </QueryProvider>
    </ReduxProvider>
  );
}
