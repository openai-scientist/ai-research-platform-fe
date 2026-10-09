"use client";

import { useId } from "react";

import { cn } from "cn";

import { Checkbox } from "@/components/ui/checkbox";
import { FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConnectionColumn } from "@/lib/api/services/fetch-data-connections";

export function TimeSeriesColumnChoices({
  label,
  columns,
  selected,
  limit,
  disabled,
  excluded = [],
  showTypes = false,
  description,
  compact = false,
  onToggle,
}: {
  label: string;
  columns: ConnectionColumn[];
  selected: string[];
  limit: number;
  disabled: boolean;
  excluded?: string[];
  showTypes?: boolean;
  description?: string;
  compact?: boolean;
  onToggle: (name: string, checked: boolean) => void;
}) {
  const id = useId();
  const choices = (
    <FieldGroup
      data-slot="checkbox-group"
      className={cn(
        compact ? "gap-1 data-[slot=checkbox-group]:gap-1" : "gap-2 data-[slot=checkbox-group]:gap-2",
        !compact && "flex-row flex-wrap",
      )}
    >
      {columns.map((column, index) => (
        <FieldLabel
          key={column.name}
          htmlFor={`${id}-${index}`}
          className={cn(
            "w-full max-w-full min-w-0 cursor-pointer items-center rounded-md",
            compact
              ? "min-h-9 gap-2 px-2 py-1.5 hover:bg-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
              : "min-h-11 border border-input bg-background px-3 py-2 sm:min-h-10 sm:w-auto",
            selected.includes(column.name) && (compact ? "bg-primary/10" : "border-primary bg-primary/10"),
          )}
        >
          <Checkbox
            id={`${id}-${index}`}
            checked={selected.includes(column.name)}
            disabled={
              disabled ||
              excluded.includes(column.name) ||
              (!selected.includes(column.name) && selected.length >= limit)
            }
            onCheckedChange={(checked) => onToggle(column.name, checked === true)}
          />
          <span className={cn("min-w-0", compact ? "flex-1 truncate" : "break-all")} title={column.name}>
            {column.name}
            {showTypes && <span className="text-muted-foreground text-xs"> ({column.type})</span>}
          </span>
        </FieldLabel>
      ))}
    </FieldGroup>
  );
  return (
    <FieldSet className="min-w-0 gap-3">
      <FieldLegend variant="label" className={cn("mb-0", compact && "flex w-full items-center justify-between gap-2")}>
        <span>{label}</span>{" "}
        <span className="text-muted-foreground">
          {!compact && "· "}
          {selected.length}/{limit}
        </span>
      </FieldLegend>
      {!compact && columns.length > 8 ? (
        <ScrollArea className="h-48 [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
          <div className="p-1 pr-4">{choices}</div>
        </ScrollArea>
      ) : (
        choices
      )}
      {!columns.length && <FieldDescription>No {label === "Fields" ? "fields" : "tags"} available.</FieldDescription>}
      {description && <FieldDescription>{description}</FieldDescription>}
    </FieldSet>
  );
}
