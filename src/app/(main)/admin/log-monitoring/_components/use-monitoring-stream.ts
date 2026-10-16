"use client";

import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { monitoringKeys } from "@/hooks/use-admin-monitoring-query";
import type { MonitoringPipeline } from "@/lib/api/services/admin-monitoring-types";
import { ApiError } from "@/types/api";

import { parsePipeline, readMonitoringStream } from "./monitoring-stream";

type StreamStatus = "connecting" | "live" | "reconnecting" | "paused" | "ended";
export function useMonitoringStream({
  enabled,
  paused,
  serviceId,
  environment,
}: {
  enabled: boolean;
  paused: boolean;
  serviceId?: string;
  environment?: string;
}) {
  const client = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [pipeline, setPipeline] = useState<MonitoringPipeline | null>(null);
  const [terminal, setTerminal] = useState(false);
  useEffect(() => {
    if (!enabled || paused || terminal) return;
    const controller = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let retryMs = 3000;
    let ended = false;
    setStatus("connecting");
    setPipeline(null);
    const refresh = () => {
      if (refreshTimer !== undefined || controller.signal.aborted || ended) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        void client.invalidateQueries({ queryKey: monitoringKeys.all }, { cancelRefetch: false });
      }, 1000);
    };
    const end = (sessionEnded: boolean, message?: string) => {
      ended = true;
      setTerminal(true);
      setStatus("ended");
      setPipeline(null);
      if (refreshTimer !== undefined) clearTimeout(refreshTimer);
      controller.abort();
      void client.cancelQueries({ queryKey: monitoringKeys.all });
      client.removeQueries({ queryKey: monitoringKeys.all });
      toast.error(
        message ?? (sessionEnded ? "Your session has ended. Sign in again." : "Platform Admin access is required."),
        { id: "monitoring-access", position: "bottom-right" },
      );
      if (sessionEnded) window.dispatchEvent(new Event("auth:expired"));
    };
    const connect = async () => {
      try {
        await readMonitoringStream(
          { service_id: serviceId, environment },
          controller.signal,
          (message) => {
            if (ended || controller.signal.aborted) return;
            if (message.event === "retry") {
              retryMs = Math.max(1000, message.retry ?? 3000);
              return;
            }
            if (message.event === "session-ended" || message.event === "access-ended") {
              end(message.event === "session-ended");
              return;
            }
            if (message.event === "pipeline-status") {
              setPipeline(parsePipeline(message.data));
              return;
            }
            // These events invalidate REST, including the wrapped alert-updated payload.
            if (["service-snapshot", "log-event", "alert-updated", "refresh-required"].includes(message.event))
              refresh();
          },
          () => {
            setStatus("live");
            refresh();
          },
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          end(error.status === 401, error.message);
          return;
        }
        if (error instanceof ApiError && (error.status === 429 || error.status === 503) && error.retryAfter !== null) {
          retryMs = Math.max(1000, error.retryAfter * 1000);
        }
        toast.error(error instanceof Error ? error.message : "Unable to connect to monitoring updates.", {
          id: "monitoring-stream",
          position: "bottom-right",
        });
      }
      if (!ended && !controller.signal.aborted) {
        setStatus("reconnecting");
        setPipeline(null);
        reconnectTimer = setTimeout(() => void connect(), retryMs);
      }
    };
    void connect();
    return () => {
      controller.abort();
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
      if (refreshTimer !== undefined) clearTimeout(refreshTimer);
    };
  }, [client, enabled, paused, serviceId, environment, terminal]);
  return { status: terminal ? "ended" : paused ? "paused" : status, pipeline, terminal };
}
