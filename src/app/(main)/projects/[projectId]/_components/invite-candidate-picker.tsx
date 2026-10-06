"use client";

import { type UIEvent, useEffect, useRef } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { InviteCandidate } from "@/lib/api/services/fetch-members";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { getInitials } from "@/lib/utils";

export function InviteCandidatePicker({
  search,
  onSearchChange,
  users,
  loading,
  loadingMore,
  hasMore,
  failed,
  nextPageFailed,
  disabled,
  onAdd,
  loadMore,
  retry,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  users: InviteCandidate[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  failed: boolean;
  nextPageFailed: boolean;
  disabled: boolean;
  onAdd: (user: InviteCandidate) => void;
  loadMore: () => Promise<unknown>;
  retry: () => Promise<unknown>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousSearch = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousSearch.current === search) return;
    previousSearch.current = search;
    const viewport = scrollRef.current?.querySelector("[data-slot=scroll-area-viewport]");
    if (viewport) viewport.scrollTop = 0;
  }, [search]);
  const scroll = (event: UIEvent<HTMLDivElement>) => {
    const viewport = event.target;
    if (!(viewport instanceof HTMLElement) || viewport.dataset.slot !== "scroll-area-viewport") return;
    if (
      hasMore &&
      !nextPageFailed &&
      !loadingMore &&
      !disabled &&
      viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 80
    )
      void loadMore();
  };
  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="candidate-search">Find a user</FieldLabel>
        <Input
          id="candidate-search"
          type="search"
          value={search}
          maxLength={120}
          disabled={disabled}
          placeholder="Search by name or email"
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <FieldDescription>Search by name or email, or browse the list below.</FieldDescription>
      </Field>
      {loading ? (
        <Skeleton className="h-40 w-full" aria-label="Loading available users" />
      ) : failed ? (
        <Button variant="outline" type="button" onClick={() => void retry()}>
          Reload users
        </Button>
      ) : (
        <ScrollArea
          ref={scrollRef}
          className="max-h-72 [&_[data-slot=scroll-area-viewport]]:max-h-72"
          onScrollCapture={scroll}
        >
          <ul className="flex flex-col">
            {users.map((user) => (
              <li key={user.id} className="flex items-center gap-3 border-b py-3 last:border-0">
                <Avatar>
                  <AvatarImage
                    src={resolveAvatarUrl(user.avatar_url)}
                    alt={user.display_name ?? user.email}
                    crossOrigin="use-credentials"
                  />
                  <AvatarFallback>{getInitials(user.display_name ?? user.email)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-medium text-sm">{user.display_name ?? user.email}</span>
                  <span className="truncate text-muted-foreground text-xs">{user.email}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  aria-label={"Add " + user.email}
                  onClick={() => onAdd(user)}
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
          {users.length === 0 && (
            <p className="py-6 text-center text-muted-foreground text-sm">No users available to invite.</p>
          )}
          {loadingMore && (
            <div className="flex justify-center py-3" role="status" aria-label="Loading more users">
              <Spinner />
            </div>
          )}
          {nextPageFailed ? (
            <Button variant="outline" type="button" className="my-2 w-full" onClick={() => void loadMore()}>
              Retry loading more users
            </Button>
          ) : (
            hasMore &&
            !loadingMore && (
              <Button
                variant="ghost"
                type="button"
                className="my-2 w-full"
                disabled={disabled}
                onClick={() => void loadMore()}
              >
                Load more users
              </Button>
            )
          )}
        </ScrollArea>
      )}
    </div>
  );
}
