"use client";

import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { SAMPLE_ACTIVITY } from "./workspace-preview-data";

export function WorkspaceActivityPreview() {
  const [category, setCategory] = useState("All activity");
  const events = SAMPLE_ACTIVITY.filter((event) => category === "All activity" || event.category === category);

  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold text-lg">Activity</h2>
          <p className="text-muted-foreground text-sm">A shared history of what happened in your project.</p>
        </div>
        <Badge variant="outline">Preview · Sample data</Badge>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{events.length} sample events · Last 2 days</p>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Filter activity" className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {["All activity", "Research", "Data", "Members", "Settings"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {["Today", "Yesterday"].map((day) => {
        const items = events.filter((event) => event.day === day);
        if (!items.length) return null;
        return (
          <Card key={day}>
            <CardHeader>
              <CardTitle>{day}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="divide-y">
                {items.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback>{event.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-sm">
                        <span className="font-medium">{event.actor}</span>{" "}
                        <span className="text-muted-foreground">{event.action}</span>
                      </p>
                      <p className="break-words text-sm">{event.subject}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary">{event.category}</Badge>
                        <span className="text-muted-foreground text-xs tabular-nums">{event.time}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        );
      })}
      <p className="text-muted-foreground text-xs">
        End of sample activity. Names and events are fictional; this preview does not read the project's audit history.
      </p>
    </section>
  );
}
