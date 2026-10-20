"use client";

import { DateRangePicker } from "@/components/date-range-picker";
import { Button } from "@/components/ui/button";

export interface ActivityDates {
  from?: Date;
  to?: Date;
}

export function ActivityDateFilters({
  value,
  onChange,
}: {
  value: ActivityDates;
  onChange: (dates: ActivityDates) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <DateRangePicker
        id="activity-date-range"
        value={value.from ? { from: value.from, to: value.to } : undefined}
        onChange={(range) => onChange(range ?? {})}
        placeholder="From – To"
        className="w-full justify-start sm:w-auto"
      />
      {(value.from ?? value.to) && (
        <Button variant="ghost" onClick={() => onChange({})}>
          Clear dates
        </Button>
      )}
    </div>
  );
}
