"use client";

import type { ReactNode } from "react";

// Tạm thời comment SignalR hooks vì chưa dùng đến
// import { useSignalR } from "@/hooks/use-signalr";
// import { useSignalRNotifications } from "@/hooks/use-signalr-notifications";

/**
 * Auto-connects SignalR WebSocket khi app load.
 * Đặt cao trong cây component để giữ 1 connection duy nhất.
 */
export function SignalRProvider({ children }: { children: ReactNode }) {
  // useSignalR();
  // useSignalRNotifications();
  return <>{children}</>;
}
