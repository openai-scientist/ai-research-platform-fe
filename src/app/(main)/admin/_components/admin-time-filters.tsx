"use client";

import { endOfDay, format, parseISO, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/date-range-picker";
import { Field, FieldLabel } from "@/components/ui/field";

export function AdminTimeFilters({
  prefix,
  from,
  to,
  onChange,
}: {
  prefix: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const range: DateRange | undefined = from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined;
  const selectRange = (next: DateRange | undefined) => {
    const start = next?.from ? format(startOfDay(next.from), "yyyy-MM-dd'T'HH:mm:ss.SSS") : "";
    const end = next?.to ? format(endOfDay(next.to), "yyyy-MM-dd'T'HH:mm:ss.SSS") : "";
    onChange(start, end);
  };
  return (
    <Field className="w-full min-w-0 sm:w-auto">
      <FieldLabel htmlFor={`${prefix}-date-range`}>Date range (local time)</FieldLabel>
      <DateRangePicker
        id={`${prefix}-date-range`}
        value={range}
        onChange={selectRange}
        placeholder="All time"
        className="w-full justify-start sm:min-w-64"
      />
    </Field>
  );
}
