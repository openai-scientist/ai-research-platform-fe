"use client";

import { useState } from "react";

import { enUS } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function WorkspaceMonthPicker({
  value,
  max,
  onChange,
}: {
  value: string;
  max: string;
  onChange: (month: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, month] = value.split("-").map(Number);
  const [maxYear, maxMonth] = max.split("-").map(Number);
  const selected = new Date(year, month - 1, 1);
  const end = new Date(maxYear, maxMonth, 0);
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(selected);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={`Usage month: ${label}`}>
          <CalendarDays data-icon="inline-start" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0" lang="en">
        <p className="px-3 pt-3 text-muted-foreground text-xs">Select a date in the month to view.</p>
        <Calendar
          mode="single"
          locale={enUS}
          captionLayout="dropdown"
          startMonth={new Date(2000, 0, 1)}
          endMonth={end}
          defaultMonth={selected}
          selected={selected}
          disabled={{ after: end }}
          onSelect={(date) => {
            if (!date) return;
            const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            if (next > max) return;
            onChange(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
