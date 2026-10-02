"use client";

import { useEffect } from "react";

import { toast } from "sonner";

import { getHubConnection } from "@/lib/realtime/signalr";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAuthenticated } from "@/lib/redux/slices/auth-slice";

/**
 * Lắng nghe events từ SignalR và hiện toast notification.
 * Tùy chỉnh các event name theo backend.
 */
export function useSignalRNotifications() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const connection = getHubConnection();

    // Đăng ký handler cho các event từ server
    const handleNotification = (message: string, title?: string) => {
      toast(title ?? "Thông báo", { description: message });
    };

    connection.on("ReceiveNotification", handleNotification);

    return () => {
      connection.off("ReceiveNotification", handleNotification);
    };
  }, [isAuthenticated]);
}
