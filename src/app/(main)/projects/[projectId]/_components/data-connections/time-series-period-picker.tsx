"use client";

import { useState } from "react";

import { cn } from "cn";
import { format } from "date-fns";

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { TimeSeriesDateTimePicker } from "./time-series-date-time-picker";
import type { TimeSeriesDraft } from "./time-series-source";

const PERIODS = {
  "1h": { label: "Last hour", hours: 1 },
  "6h": { label: "Last 6 hours", hours: 6 },
  "24h": { label: "Last 24 hours", hours: 24 },
};

const periodControlClassName =
  "h-7 rounded-md px-3 data-[state=on]:bg-background data-[state=on]:ring-1 data-[state=on]:ring-border focus-visible:ring-2";

export function TimeSeriesPeriodPicker({
  id,
  draft,
  disabled,
  onChange,
  compact = false,
}: {
  id: string;
  draft: TimeSeriesDraft;
  disabled: boolean;
  onChange: (draft: TimeSeriesDraft) => void;
  compact?: boolean;
}) {
  const [preset, setPreset] = useState(() => ({
    value:
      Math.abs(Date.now() - Date.parse(draft.end)) < 60_000 &&
      Date.parse(draft.end) - Date.parse(draft.start) === 3_600_000
        ? "1h"
        : "custom",
    start: draft.start,
    end: draft.end,
  }));
  const period = preset.start === draft.start && preset.end === draft.end ? preset.value : "custom";
  const display = (value: string) =>
    Number.isFinite(Date.parse(value)) ? format(new Date(value), "MMM d, h:mm a") : "Choose a date";
  const selectPeriod = (value: string) => {
    if (value === "custom") {
      setPreset({ value, start: draft.start, end: draft.end });
    } else if (value in PERIODS) {
      const hours = PERIODS[value as keyof typeof PERIODS].hours;
      const end = Date.now();
      const dates = {
        start: format(new Date(end - hours * 3_600_000), "yyyy-MM-dd'T'HH:mm:ss.SSS"),
        end: format(new Date(end), "yyyy-MM-dd'T'HH:mm:ss.SSS"),
      };
      setPreset({ value, start: dates.start, end: dates.end });
      onChange({ ...draft, ...dates });
    }
  };
  const customDates = (
    <FieldGroup className={cn("gap-3", !compact && "grid sm:grid-cols-2")}>
      <Field>
        <FieldLabel htmlFor={`${id}-start`}>From</FieldLabel>
        <TimeSeriesDateTimePicker
          id={`${id}-start`}
          label="From"
          value={draft.start}
          disabled={disabled}
          onChange={(start) => onChange({ ...draft, start })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-end`}>To</FieldLabel>
        <TimeSeriesDateTimePicker
          id={`${id}-end`}
          label="To"
          value={draft.end}
          disabled={disabled}
          onChange={(end) => onChange({ ...draft, end })}
        />
      </Field>
      <FieldDescription className={cn(!compact && "sm:col-span-2")}>
        The end time is excluded. Dates use your local timezone.
      </FieldDescription>
    </FieldGroup>
  );
  if (compact) {
    return (
      <Field orientation="horizontal" className="w-auto min-w-0 gap-2">
        <FieldLabel htmlFor={id} className="sr-only">
          Time period
        </FieldLabel>
        <ToggleGroup
          id={id}
          type="single"
          variant="default"
          spacing={1}
          value={period}
          disabled={disabled}
          onValueChange={selectPeriod}
          aria-label="Time period"
          className="w-max shrink-0 bg-muted p-0.5"
        >
          {Object.entries(PERIODS).map(([value, item]) => (
            <ToggleGroupItem key={value} value={value} aria-label={item.label} className={periodControlClassName}>
              {value}
            </ToggleGroupItem>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <ToggleGroupItem value="custom" className={periodControlClassName}>
                Custom
              </ToggleGroupItem>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="font-medium text-sm">Custom time period</h3>
                <p className="text-muted-foreground text-xs">Choose the dates to preview and import.</p>
              </div>
              {customDates}
            </PopoverContent>
          </Popover>
        </ToggleGroup>
      </Field>
    );
  }
  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel htmlFor={id}>Which time period?</FieldLabel>
        <Select value={period} disabled={disabled} onValueChange={selectPeriod}>
          <SelectTrigger id={id} className="w-full data-[size=default]:h-11 md:data-[size=default]:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.entries(PERIODS).map(([value, item]) => (
                <SelectItem key={value} value={value}>
                  {item.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom dates</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>
          {display(draft.start)} – {display(draft.end)} · local time
        </FieldDescription>
      </Field>
      {period === "custom" && customDates}
    </FieldGroup>
  );
}
