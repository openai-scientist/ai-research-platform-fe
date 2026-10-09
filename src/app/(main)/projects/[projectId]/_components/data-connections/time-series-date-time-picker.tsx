"use client";

import { useState } from "react";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TimeSeriesDateTimePicker({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsed = new Date(value);
  const date = Number.isFinite(parsed.getTime()) ? parsed : undefined;
  const time = value.split("T")[1] ?? "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-label={label}
          title={date ? format(date, "MMM d, yyyy · h:mm:ss.SSS a") : undefined}
          disabled={disabled}
          className="h-16 w-full min-w-0 justify-between bg-background px-3 font-normal hover:bg-muted"
        >
          <span className="flex min-w-0 flex-col items-start gap-1">
            {date ? (
              <>
                <span>{format(date, "MMM d, yyyy")}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{format(date, "h:mm a")}</span>
              </>
            ) : (
              "Choose date and time"
            )}
          </span>
          <CalendarIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] gap-0 p-0">
        <Calendar
          mode="single"
          required
          autoFocus
          selected={date}
          defaultMonth={date}
          disabled={disabled}
          onSelect={(next) => {
            if (next) onChange(`${format(next, "yyyy-MM-dd")}T${time || "00:00"}`);
          }}
        />
        <div className="flex flex-col gap-3 border-t p-3">
          <Field>
            <FieldLabel htmlFor={`${id}-time`}>Time</FieldLabel>
            <Input
              id={`${id}-time`}
              type="time"
              step="0.001"
              value={time}
              disabled={disabled || !date}
              className="h-11 bg-background md:h-10"
              onChange={(event) => {
                if (date && event.target.value) onChange(`${format(date, "yyyy-MM-dd")}T${event.target.value}`);
              }}
            />
          </Field>
          <Button type="button" variant="outline" className="self-end" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
