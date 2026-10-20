"use client";

import { type FormEvent, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LogLevel, MonitoringEventsParams, MonitoringService } from "@/lib/api/services/admin-monitoring-types";

import { toTimeRange } from "../../_components/admin-api-utils";
import { AdminTimeFilters } from "../../_components/admin-time-filters";

const initial = {
  q: "",
  environment: "",
  service_id: "",
  level: "",
  from: "",
  to: "",
  request_id: "",
  trace_id: "",
  project_id: "",
  run_id: "",
};

export function MonitoringFilters({
  services,
  busy,
  onApply,
  filters = {},
}: {
  services: MonitoringService[];
  busy: boolean;
  onApply: (params: MonitoringEventsParams) => void;
  filters?: MonitoringEventsParams;
}) {
  const [draft, setDraft] = useState(() => ({
    ...initial,
    q: filters.q ?? "",
    environment: filters.environment ?? "",
    service_id: filters.service_id ?? "",
    level: filters.level ?? "",
    from: filters.from ?? "",
    to: filters.to ?? "",
    request_id: filters.request_id ?? "",
    trace_id: filters.trace_id ?? "",
    project_id: filters.project_id ?? "",
    run_id: filters.run_id ?? "",
  }));
  const input = (key: keyof typeof initial, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (Boolean(draft.from) !== Boolean(draft.to)) throw new Error("Select both a start and end date.");
      const range = toTimeRange(draft.from, draft.to);
      if (range.from && range.to && Date.parse(range.to) - Date.parse(range.from) > 14 * 86400000) {
        throw new Error("Choose a monitoring time range of 14 days or less.");
      }
      onApply({
        ...range,
        q: draft.q.trim() || undefined,
        environment: draft.environment.trim() || undefined,
        service_id: draft.service_id || undefined,
        level: (draft.level || undefined) as LogLevel | undefined,
        request_id: draft.request_id.trim() || undefined,
        trace_id: draft.trace_id.trim() || undefined,
        project_id: draft.project_id.trim() || undefined,
        run_id: draft.run_id.trim() || undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the filters and try again.");
    }
  }
  return (
    <form onSubmit={apply} noValidate className="flex min-w-0 flex-col gap-3">
      <FieldGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="monitor-q">Search logs</FieldLabel>
          <Input
            id="monitor-q"
            placeholder="Search messages"
            value={draft.q}
            onChange={(event) => input("q", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="monitor-environment">Environment</FieldLabel>
          <Input
            id="monitor-environment"
            placeholder="Current environment"
            value={draft.environment}
            onChange={(event) => setDraft({ ...draft, environment: event.target.value, service_id: "" })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="monitor-service">Service</FieldLabel>
          <Select
            value={draft.service_id || "all"}
            onValueChange={(value) => input("service_id", value === "all" ? "" : value)}
          >
            <SelectTrigger id="monitor-service" className="w-full">
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All services</SelectItem>
                {services
                  .filter((service) => !draft.environment.trim() || service.environment === draft.environment.trim())
                  .map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="monitor-level">Level</FieldLabel>
          <Select value={draft.level || "all"} onValueChange={(value) => input("level", value === "all" ? "" : value)}>
            <SelectTrigger id="monitor-level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All levels</SelectItem>
                {["DEBUG", "INFO", "WARN", "ERROR"].map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <details>
        <summary className="w-fit cursor-pointer rounded-sm text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">
          Correlation filters
        </summary>
        <FieldGroup className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(["request_id", "trace_id", "project_id", "run_id"] as const).map((key) => (
            <Field key={key}>
              <FieldLabel htmlFor={`monitor-${key}`}>
                {key.replace("_id", " ID").replace(/^./, (letter) => letter.toUpperCase())}
              </FieldLabel>
              <Input id={`monitor-${key}`} value={draft[key]} onChange={(event) => input(key, event.target.value)} />
            </Field>
          ))}
        </FieldGroup>
      </details>
      <FieldGroup className="flex-row flex-wrap items-end gap-2">
        <AdminTimeFilters
          prefix="monitor"
          placeholder="Last 90 minutes"
          {...draft}
          onChange={(from, to) => setDraft({ ...draft, from, to })}
        />
        <Button type="submit" variant="outline" disabled={busy}>
          Apply filters
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setDraft(initial);
            onApply({});
          }}
        >
          Reset
        </Button>
        <p className="text-muted-foreground text-xs sm:ml-auto">Default window: last 90 minutes</p>
      </FieldGroup>
    </form>
  );
}
