"use client";

import { useId, useState } from "react";

import { cn } from "cn";
import { Bell, BellDot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from "@/hooks/use-notifications-query";
import { useSignalRNotifications } from "@/hooks/use-signalr-notifications";

import { NotificationRow } from "./notification-row";

export function NotificationBell() {
  const { items, unreadCount, hasSnapshot, status, isAuthenticated } = useSignalRNotifications();
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const titleId = useId();
  const busy = markRead.isPending || markAll.isPending || markRead.isRateLimited || markAll.isRateLimited;
  const connectionLabels = { connected: "Live updates on", connecting: "Connecting", reconnecting: "Reconnecting" };

  if (!isAuthenticated) {
    return (
      <Button size="icon" disabled aria-label="Notifications">
        <Bell aria-hidden="true" />
      </Button>
    );
  }

  const renderList = (filter: string) => {
    const visibleItems = filter === "unread" ? items.filter((item) => item.read_at === null) : items;
    if (!hasSnapshot) {
      return (
        <div className="flex flex-col gap-4 p-4" role="status" aria-label="Loading notifications">
          {["first", "second", "third"].map((key) => (
            <div key={key} className="flex gap-3" aria-hidden="true">
              <Skeleton className="size-8 shrink-0 rounded-lg motion-reduce:animate-none" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-full motion-reduce:animate-none" />
                <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (visibleItems.length === 0) {
      return (
        <Empty className="py-10">
          <EmptyDescription>
            {filter === "unread" ? "No unread notifications in your recent activity." : "No notifications yet."}
          </EmptyDescription>
        </Empty>
      );
    }
    return (
      <ul className="flex flex-col gap-1 p-2">
        {visibleItems.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            pending={markRead.isPending && markRead.variables === notification.id}
            disabled={busy}
            onRead={(id) => markRead.mutate(id)}
            onOpen={() => setOpen(false)}
          />
        ))}
      </ul>
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTab("all");
      }}
    >
      <PopoverTrigger asChild>
        <Button size="icon" aria-label={`Notifications, ${unreadCount} unread`}>
          {unreadCount > 0 ? (
            <BellDot aria-hidden="true" className="[&_circle]:fill-current" />
          ) : (
            <Bell aria-hidden="true" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        aria-labelledby={titleId}
        className="w-96 max-w-[calc(100vw-2rem)] gap-0 p-0 motion-reduce:animate-none"
      >
        <div className="flex min-w-0 items-center justify-between gap-2 p-4">
          <div className="flex min-w-0 items-center gap-2">
            <PopoverTitle id={titleId}>Notifications</PopoverTitle>
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" disabled={busy || !hasSnapshot} onClick={() => markAll.mutate()}>
              {markAll.isPending && <Spinner data-icon="inline-start" className="motion-reduce:animate-none" />}
              Mark all as read
            </Button>
          )}
        </div>
        <Tabs value={tab} onValueChange={setTab} className="gap-0">
          <TabsList variant="line" className="mx-4 mb-2" aria-label="Notification filter">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
          <Separator />
          {/* Overlap the panels in one grid cell so filtering keeps the natural All height. */}
          <div className="grid">
            {["all", "unread"].map((value) => (
              <TabsContent
                key={value}
                value={value}
                forceMount
                inert={tab !== value}
                aria-hidden={tab !== value}
                className={cn("col-start-1 row-start-1 mt-0 min-w-0", tab !== value && "pointer-events-none invisible")}
              >
                <ScrollArea className="[&_[data-slot=scroll-area-viewport]]:max-h-[min(24rem,calc(100dvh-14rem))]">
                  {renderList(value)}
                </ScrollArea>
              </TabsContent>
            ))}
          </div>
        </Tabs>
        <Separator />
        <div className="flex items-center justify-between gap-2 px-4 py-3 text-muted-foreground text-xs">
          <span>Latest 50 notifications</span>
          <span role="status" aria-live="polite">
            {connectionLabels[status]}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
