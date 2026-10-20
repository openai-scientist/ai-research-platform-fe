"use client";

import { useQuery } from "@tanstack/react-query";

const repositoryStarsUrl = "https://api.github.com/repos/arhamkhnz/next-shadcn-admin-dashboard/stargazers/count";

type GitHubStarsResponse = {
  count: number;
};

export const githubStarKeys = {
  all: ["github-stars"] as const,
  count: () => [...githubStarKeys.all, "count"] as const,
};

async function fetchGitHubStarCount({ signal }: { signal?: AbortSignal }): Promise<number | null> {
  const response = await fetch(repositoryStarsUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
    },
    signal,
  });

  if (!response.ok) return null;

  const data = (await response.json()) as GitHubStarsResponse;
  return Number.isFinite(data.count) ? data.count : null;
}

export function useGitHubStarCount(initialCount: number | null) {
  const { data } = useQuery({
    queryKey: githubStarKeys.count(),
    queryFn: ({ signal }) => fetchGitHubStarCount({ signal }),
    initialData: initialCount ?? undefined,
    enabled: initialCount === null,
    staleTime: 5 * 60 * 1000,
  });

  return data ?? initialCount;
}
