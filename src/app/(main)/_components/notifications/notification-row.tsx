"use client";

import Link from "next/link";

import { cn } from "cn";
import { formatDistanceToNow } from "date-fns";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { NotificationItem } from "@/lib/api/services/fetch-notifications";

import { getNotificationContent } from "./notification-content";

interface NotificationRowProps {
  notification: NotificationItem;
  pending: boolean;
  disabled: boolean;
  onRead: (id: string) => void;
  onOpen: () => void;
}

export function NotificationRow({ notification, pending, disabled, onRead, onOpen }: NotificationRowProps) {
  const { icon: Icon, text, href } = getNotificationContent(notification);
  const unread = notification.read_at === null;

  return (
    <li className="flex items-start gap-1 rounded-lg hover:bg-muted">
      <Link
        href={href}
        prefetch={false}
        className="flex min-w-0 flex-1 gap-3 rounded-lg px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => {
          if (unread && !disabled) onRead(notification.id);
          onOpen();
        }}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn("line-clamp-2 break-words text-sm/5", unread && "font-medium")} title={text}>
            {text}
          </span>
          <time dateTime={notification.created_at} title={new Date(notification.created_at).toLocaleString("en-US")}>
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
          </time>
          {unread && <span className="sr-only">Unread</span>}
        </span>
        {unread && <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" />}
      </Link>
      {unread && (
        <Button
          variant="ghost"
          size="icon"
          className="mt-3 mr-1"
          aria-label={`Mark as read: ${text}`}
          disabled={disabled}
          onClick={() => onRead(notification.id)}
        >
          {pending ? <Spinner className="motion-reduce:animate-none" /> : <Check aria-hidden="true" />}
        </Button>
      )}
    </li>
  );
}
