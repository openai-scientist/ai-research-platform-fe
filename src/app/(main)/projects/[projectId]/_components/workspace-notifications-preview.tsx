"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { SAMPLE_NOTIFICATION_EVENTS } from "./workspace-preview-data";

function initialPreferences() {
  return Object.fromEntries(SAMPLE_NOTIFICATION_EVENTS.map((event) => [event.id, { app: true, email: event.email }]));
}

export function WorkspaceNotificationsPreview() {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [digest, setDigest] = useState("daily");
  const [quiet, setQuiet] = useState(false);
  const [saved, setSaved] = useState({ preferences: initialPreferences(), digest: "daily", quiet: false });
  const dirty = JSON.stringify({ preferences, digest, quiet }) !== JSON.stringify(saved);

  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold text-lg">Notifications</h2>
          <p className="max-w-xl text-muted-foreground text-sm">Choose how you hear about updates in this project.</p>
        </div>
        <Badge variant="outline">Preview · Sample data</Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        Try these controls. Preview preferences stay on this screen and do not send notifications.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Project updates</CardTitle>
          <CardDescription>Choose a delivery channel for each event.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] gap-3 border-b pb-3 text-muted-foreground text-xs sm:grid-cols-[minmax(0,1fr)_5rem_5rem]">
            <span>Event</span>
            <span className="text-center">In-app</span>
            <span className="text-center">Email</span>
          </div>
          <div className="divide-y">
            {SAMPLE_NOTIFICATION_EVENTS.map((event) => (
              <div
                key={event.id}
                className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] items-center gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_5rem_5rem]"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium text-sm">{event.label}</p>
                  <p className="text-muted-foreground text-xs">{event.description}</p>
                </div>
                {(["app", "email"] as const).map((channel) => (
                  <div key={channel} className="flex justify-center">
                    <Switch
                      aria-label={`${event.label}: ${channel === "app" ? "in-app" : "email"}`}
                      checked={preferences[event.id][channel]}
                      onCheckedChange={(checked) =>
                        setPreferences((current) => ({
                          ...current,
                          [event.id]: { ...current[event.id], [channel]: checked },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Delivery schedule</CardTitle>
          <CardDescription>Keep routine updates together and protect your focus time.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="responsive">
              <FieldContent>
                <FieldLabel htmlFor="preview-digest">Email summary</FieldLabel>
                <FieldDescription>A summary of project activity, separate from event emails.</FieldDescription>
              </FieldContent>
              <Select value={digest} onValueChange={setDigest}>
                <SelectTrigger id="preview-digest" className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="preview-quiet">Quiet hours</FieldLabel>
                <FieldDescription>Pause routine alerts from 10 PM to 8 AM in your local time.</FieldDescription>
              </FieldContent>
              <Switch id="preview-quiet" checked={quiet} onCheckedChange={setQuiet} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-muted-foreground text-xs">Preview only · Changes reset when you leave this tab.</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!dirty}
            onClick={() => {
              setPreferences(saved.preferences);
              setDigest(saved.digest);
              setQuiet(saved.quiet);
            }}
          >
            Discard
          </Button>
          <Button
            disabled={!dirty}
            onClick={() => {
              setSaved({ preferences, digest, quiet });
              toast.info("Preview preferences applied", { description: "No preferences were saved to the server." });
            }}
          >
            Apply preview
          </Button>
        </div>
      </div>
    </section>
  );
}
