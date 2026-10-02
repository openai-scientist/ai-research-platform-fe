"use client";

import * as React from "react";

import { cn } from "cn";
import { format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface DateRangePickerProps {
  id?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  value?: DateRange;
  onChange?: (value: DateRange | undefined) => void;
}

export function DateRangePicker(props: DateRangePickerProps) {
  const { value, onChange, id, className, disabled, placeholder = "Select date" } = props;
  const generatedId = React.useId();
  const isMobile = useIsMobile();
  const controlled = "value" in props;
  const [open, setOpen] = React.useState(false);
  const [internalDateRange, setInternalDateRange] = React.useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = subDays(to, 29);
    return { from, to };
  });
  const dateRange = controlled ? value : internalDateRange;
  let dateRangeLabel = placeholder;

  if (dateRange?.from) {
    dateRangeLabel = format(dateRange.from, "d MMM yyyy");
  }

  if (dateRange?.from && dateRange.to) {
    dateRangeLabel = `${format(dateRange.from, "d MMM yyyy")} - ${format(dateRange.to, "d MMM yyyy")}`;
  }

  const handleDateChange = (nextValue: DateRange | undefined) => {
    if (!controlled) {
      setInternalDateRange(nextValue);
    }
    onChange?.(nextValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id ?? generatedId}
          disabled={disabled}
          className={cn("font-normal", className)}
        >
          <CalendarIcon data-icon="inline-start" />
          {dateRangeLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-(--radix-popover-content-available-width) overflow-auto p-0"
        align="start"
      >
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleDateChange}
          numberOfMonths={isMobile ? 1 : 2}
          fixedWeeks
          showOutsideDays={isMobile}
        />
      </PopoverContent>
    </Popover>
  );
}
