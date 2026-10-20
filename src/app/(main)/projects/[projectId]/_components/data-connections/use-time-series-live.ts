"use client";

import { useEffect, useState } from "react";

import { showConnectionError } from "@/hooks/use-data-connections";
import {
  type ConnectionLiveData,
  type ConnectionLiveRequest,
  fetchDataConnections,
} from "@/lib/api/services/fetch-data-connections";

import { LIVE_WINDOWS, startLivePolling } from "./time-series-live";

export function useTimeSeriesLive(
  projectId: string,
  connectionId: string,
  input: ConnectionLiveRequest,
  paused: boolean,
) {
  const [snapshot, setSnapshot] = useState<{
    input: ConnectionLiveRequest;
    data: ConnectionLiveData;
    updatedAt: string;
  } | null>(null);
  const [stopped, setStopped] = useState(false);
  const [retryable, setRetryable] = useState(false);
  useEffect(() => {
    if (paused || stopped) return;
    const poller = startLivePolling({
      interval: LIVE_WINDOWS[input.last].interval,
      visible: document.visibilityState !== "hidden",
      request: async (signal) => (await fetchDataConnections.live(projectId, connectionId, input, signal)).data,
      onData: (data) => setSnapshot({ input, data, updatedAt: new Date().toISOString() }),
      onError: (error) => showConnectionError(error, projectId),
      onStop: (canRetry) => {
        setStopped(true);
        setRetryable(canRetry);
      },
    });
    const onVisibility = () => poller.setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      poller.dispose();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [projectId, connectionId, input, paused, stopped]);
  return {
    data: snapshot && snapshot.input === input ? snapshot.data : null,
    updatedAt: snapshot && snapshot.input === input ? snapshot.updatedAt : undefined,
    stopped,
    retryable,
    retry: () => {
      setSnapshot(null);
      setStopped(false);
      setRetryable(false);
    },
  };
}
