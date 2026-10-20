"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { SettingsGroup, SettingsHeading } from "./settings-panel";
import { useSettingsPreview } from "./settings-preview";

export function SettingsPreviewActivity() {
  const { activity } = useSettingsPreview();
  return (
    <div className="flex flex-col gap-6">
      <SettingsHeading title="Activity" />
      <SettingsGroup title="Sample activity and your preview changes">
        <ol className="divide-y">
          {activity.map((event) => (
            <li key={event.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <Avatar className="size-8 shrink-0">
                {event.avatarUrl && <AvatarImage src={event.avatarUrl} alt="" />}
                <AvatarFallback>
                  {event.actor
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="wrap-anywhere text-sm leading-relaxed">
                  <span className="font-medium">{event.actor}</span>{" "}
                  <span className="text-muted-foreground">{event.message}</span>
                </p>
                <time dateTime={event.createdAt} className="text-muted-foreground text-xs">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Asia/Ho_Chi_Minh",
                  }).format(new Date(event.createdAt))}{" "}
                  · GMT+7
                </time>
              </div>
            </li>
          ))}
        </ol>
      </SettingsGroup>
    </div>
  );
}
