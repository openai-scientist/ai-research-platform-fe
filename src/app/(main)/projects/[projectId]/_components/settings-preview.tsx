"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

import type { ProjectItem } from "@/lib/api/services/fetch-project";

export type PreviewActivity = {
  id: string;
  actor: string;
  avatarUrl?: string;
  message: string;
  createdAt: string;
};

const SAMPLE_ACTIVITY: PreviewActivity[] = [
  {
    id: "sample-access",
    actor: "Amelia Chen",
    avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    message: "updated the invitation policy.",
    createdAt: "2026-10-15T09:30:00Z",
  },
  {
    id: "sample-review",
    actor: "Noah Williams",
    avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    message: "changed the paper approval requirements.",
    createdAt: "2026-10-15T08:15:00Z",
  },
  {
    id: "sample-data",
    actor: "System",
    message: "finished importing weekly_sales.csv.",
    createdAt: "2026-10-14T14:45:00Z",
  },
  {
    id: "sample-created",
    actor: "Amelia Chen",
    avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    message: "configured the project workspace.",
    createdAt: "2026-10-14T10:00:00Z",
  },
];

type PreviewContext = {
  project: ProjectItem;
  activity: PreviewActivity[];
  drafts: Map<string, Record<string, unknown>>;
  updateProject: (changes: Partial<ProjectItem>) => void;
  record: (message: string) => void;
};

const Context = createContext<PreviewContext | null>(null);

/** Session-only mock state. No settings action in this provider writes to the API. */
export function SettingsPreviewProvider({ project: initial, children }: { project: ProjectItem; children: ReactNode }) {
  const [project, setProject] = useState(initial);
  const [activity, setActivity] = useState(SAMPLE_ACTIVITY);
  const drafts = useRef(new Map<string, Record<string, unknown>>());
  const record = useCallback((message: string) => {
    setActivity((current) => [
      { id: crypto.randomUUID(), actor: "You", message, createdAt: new Date().toISOString() },
      ...current,
    ]);
  }, []);
  const updateProject = useCallback((changes: Partial<ProjectItem>) => {
    setProject((current) => ({ ...current, ...changes }));
  }, []);
  const value = useMemo(
    () => ({ project, activity, drafts: drafts.current, updateProject, record }),
    [project, activity, updateProject, record],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSettingsPreview() {
  const preview = useContext(Context);
  if (!preview) throw new Error("Project settings must be inside SettingsPreviewProvider.");
  return preview;
}
