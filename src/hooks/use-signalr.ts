"use client";

import { useEffect } from "react";

import { startHubConnection, stopHubConnection } from "@/lib/realtime/signalr";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAuthenticated } from "@/lib/redux/slices/auth-slice";

/**
 * Tự động kết nối/ngắt kết nối SignalR dựa trên trạng thái đăng nhập.
 * Dùng trong SignalRProvider.
 */
export function useSignalR() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    startHubConnection().catch((err) => {
      console.error("[useSignalR] failed to connect", err);
    });

    return () => {
      void stopHubConnection();
    };
  }, [isAuthenticated]);
}
