"use client";

import { BookOpenCheck, Library, RefreshCw, Star, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { WritingBankStatus } from "@/lib/api/services/fetch-writing-bank";

import { timeAgo } from "../../../projects/[projectId]/_components/dataset-format";
import { MetricCard } from "../../_components/admin-primitives";
import { type Tone, ToneBadge } from "./writing-bank-badges";
import { formatDate } from "./writing-bank-format";

export interface DefaultNames {
  journal: string | null;
  context: string | null;
}

function connection(status: WritingBankStatus): { tone: Tone; label: string; detail: string | null } {
  if (!status.configured)
    return { tone: "off", label: "Not configured", detail: "No bank key is set, so no journal can be offered." };
  if (status.stale)
    return {
      tone: "look",
      label: "Stale",
      detail: `Showing cached release ${status.release?.release ?? "—"}; the bank is unreachable.`,
    };
  if (!status.reachable)
    return { tone: "blocked", label: "Unreachable", detail: "The bank does not answer and nothing is cached yet." };
  return { tone: "ok", label: "Connected", detail: null };
}

/** The bank connection and its release, beside the page title, with the one action that reloads it. */
export function BankConnection({
  status,
  pending,
  refreshing,
  onRefresh,
}: {
  readonly status: WritingBankStatus | undefined;
  readonly pending: boolean;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}) {
  if (pending || !status) return <Skeleton className="h-9 w-64" />;
  const state = connection(status);
  const release = status.release;
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex items-center gap-3">
        <ToneBadge tone={state.tone}>{state.label}</ToneBadge>
        <Button variant="outline" onClick={onRefresh} disabled={refreshing || !status.configured}>
          {refreshing ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
          Refresh
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        {state.detail ??
          (release
            ? `Release ${release.release}, published ${formatDate(release.date)}${
                status.checked_at ? ` · checked ${timeAgo(status.checked_at)}` : ""
              }`
            : "No release read yet")}
      </p>
    </div>
  );
}

/** What users can pick today: the four numbers an admin acts on, in the platform's metric cards. */
export function BankMetrics({
  status,
  pending,
  defaultNames,
}: {
  readonly status: WritingBankStatus | undefined;
  readonly pending: boolean;
  readonly defaultNames: DefaultNames;
}) {
  if (pending || !status)
    return (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" role="status" aria-label="Loading bank status">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton key={key} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  const counts = status.counts;
  const fallback = status.default;
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <MetricCard label="Journals in the bank" value={String(counts.journals)} icon={Library} />
      <MetricCard
        label="Offered to users"
        value={String(counts.enabled_journals)}
        detail={`of ${counts.journals} journals`}
        icon={BookOpenCheck}
      />
      <MetricCard label="Contexts users can pick" value={String(counts.enabled_contexts)} icon={Waypoints} />
      <MetricCard
        label="Default research context"
        value={fallback ? "Set" : "None"}
        detail={
          fallback
            ? `${defaultNames.context ?? fallback.context_id} in ${defaultNames.journal ?? fallback.journal_id}`
            : "Users start with no context chosen"
        }
        icon={Star}
      />
    </div>
  );
}
