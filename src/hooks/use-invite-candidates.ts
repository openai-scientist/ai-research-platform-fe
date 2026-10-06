"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import type { InviteCandidateParams, InviteCandidatesResponse } from "@/lib/api/services/fetch-members";
import { subscribeInviteCandidates } from "@/lib/realtime/invite-candidates";

export function useInviteCandidates(projectId: string, params: InviteCandidateParams, onAccessEnded: () => void) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([projectId, params.q, params.limit, params.offset, revision]);
  const [state, setState] = useState<{
    key: string;
    snapshot: InviteCandidatesResponse | null;
    connected: boolean;
    ended: boolean;
  } | null>(null);
  const q = params.q;
  const limit = params.limit;
  const offset = params.offset;
  useEffect(() => {
    let active = true;
    const update = (
      values: Partial<{ snapshot: InviteCandidatesResponse | null; connected: boolean; ended: boolean }>,
    ) => {
      if (!active) return;
      setState((current) => ({
        key,
        snapshot: null,
        connected: false,
        ended: false,
        ...(current?.key === key ? current : {}),
        ...values,
      }));
    };
    const terminate = () => {
      update({ snapshot: null, connected: false, ended: true });
      onAccessEnded();
    };
    if (q && q.length > 120) return;
    const stop = subscribeInviteCandidates(
      projectId,
      { q, limit, offset },
      {
        onSnapshot: (snapshot) => update({ snapshot }),
        onStatus: (connected) => update({ connected }),
        onSessionEnded: () => {
          terminate();
          window.dispatchEvent(new Event("auth:expired"));
        },
        onAccessEnded: () => {
          toast.error("Your access to invite members has ended.");
          terminate();
        },
        onError: (error) => {
          if (active) toast.error(error.message, { id: `invite-candidates:${projectId}` });
        },
      },
    );
    const expire = () => {
      stop();
      terminate();
    };
    window.addEventListener("auth:expired", expire);
    return () => {
      active = false;
      stop();
      window.removeEventListener("auth:expired", expire);
    };
  }, [projectId, q, limit, offset, key, onAccessEnded]);
  const current = state?.key === key ? state : null;
  return {
    snapshot: current?.snapshot ?? null,
    connected: current?.connected ?? false,
    ended: current?.ended ?? false,
    refresh: () => setRevision((value) => value + 1),
  };
}
