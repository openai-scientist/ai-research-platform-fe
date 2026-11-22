"use client";

import Link from "next/link";

import { ArrowLeft, CloudOff, KeyRound, RefreshCw, SearchX, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { type BankRelease, WRITING_BANK_ERRORS } from "@/lib/api/services/fetch-writing-bank";
import { ApiError } from "@/types/api";

import { formatDate } from "./writing-bank-format";

/** A short code in running text, e.g. an environment variable. */
export function Code({ children }: { readonly children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8125rem] text-foreground">{children}</code>;
}

export function errorCode(error: unknown) {
  return error instanceof ApiError ? error.code : null;
}

/**
 * Why a Writing Bank screen has nothing to show, and what the admin can do about it. The error itself was already
 * toasted (or is explained here instead), so this only states the situation.
 */
export function BankProblem({
  code,
  subject = "journal",
  onRetry,
  retrying = false,
}: {
  /** The API error code (`errorCode(error)`), or null for an unexpected failure. */
  readonly code: string | null;
  readonly subject?: "journal" | "context" | "list";
  readonly onRetry?: () => void;
  readonly retrying?: boolean;
}) {
  const retry = onRetry && (
    <Button variant="outline" onClick={onRetry} disabled={retrying}>
      <RefreshCw data-icon="inline-start" />
      Try again
    </Button>
  );

  if (code === WRITING_BANK_ERRORS.notConfigured)
    return (
      <ProblemFrame
        icon={<KeyRound />}
        title="The Writing Bank is not connected"
        description={
          <>
            Set <Code>WRITING_BANK_KEY</Code> in the management service's environment and restart it. Set{" "}
            <Code>WRITING_BANK_URL</Code> too if the bank is not at its default address. The key stays on the server;
            this page never sees it.
          </>
        }
      />
    );

  if (code === WRITING_BANK_ERRORS.unavailable)
    return (
      <ProblemFrame
        icon={<CloudOff />}
        title="The bank cannot be reached"
        description={
          <>
            The Platform has no cached copy to show yet. Check that the bank is running and that{" "}
            <Code>WRITING_BANK_URL</Code> points to it, then try again.
          </>
        }
        action={retry}
      />
    );

  if (code === WRITING_BANK_ERRORS.notFound)
    return (
      <ProblemFrame
        icon={<SearchX />}
        title={subject === "context" ? "Research context not found" : "Journal not found"}
        description="The current bank release has no entry with this id. It may have been renamed or removed."
        action={
          <Button variant="outline" asChild>
            <Link href="/admin/writing-bank">
              <ArrowLeft data-icon="inline-start" />
              Back to Writing Bank
            </Link>
          </Button>
        }
      />
    );

  return (
    <ProblemFrame
      icon={<TriangleAlert />}
      title={subject === "list" ? "The journals could not be loaded" : "This page could not be loaded"}
      description="The management service did not answer as expected. Try again in a moment."
      action={retry}
    />
  );
}

function ProblemFrame({
  icon,
  title,
  description,
  action,
}: {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: React.ReactNode;
  readonly action?: React.ReactNode;
}) {
  return (
    <Empty className="border bg-card py-12">
      <EmptyHeader className="max-w-md">
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

/** Shown once, at the top of a journal or context page, when the bank was down and a cached body is served. */
export function StaleNotice({ release }: { readonly release: BankRelease | null }) {
  return (
    <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200">
      <TriangleAlert />
      <AlertTitle>Showing cached release {release?.release ?? "—"}; the bank is unreachable</AlertTitle>
      <AlertDescription className="text-amber-900/80 dark:text-amber-200/80">
        {release ? `This copy was published on ${formatDate(release.date)}. ` : ""}Changes to what users may pick are
        still saved. The page updates when the bank answers again.
      </AlertDescription>
    </Alert>
  );
}

export function DetailSkeleton({ label }: { readonly label: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {["a", "b", "c"].map((key) => (
          <Skeleton key={key} className="h-40 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
