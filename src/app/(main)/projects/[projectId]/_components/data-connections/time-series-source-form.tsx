"use client";

import { type ReactNode, useId } from "react";

import { cn } from "cn";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ConnectionColumn,
  ConnectionTable,
  TimeSeriesAggregate,
  TimeSeriesBucket,
  TimeSeriesConnectionKind,
} from "@/lib/api/services/fetch-data-connections";

import { TimeSeriesColumnChoices } from "./time-series-column-choices";
import { TimeSeriesMetricPicker } from "./time-series-metric-picker";
import { TimeSeriesPeriodPicker } from "./time-series-period-picker";
import {
  isNumericTimeSeriesColumn,
  TIME_SERIES_AGGREGATES,
  TIME_SERIES_BUCKETS,
  type TimeSeriesDraft,
} from "./time-series-source";

export interface TimeSeriesSourceFormProps {
  children?: ReactNode | ((queryControls: ReactNode) => ReactNode);
  footer?: ReactNode;
  layout?: "form" | "workspace";
  series?: ReactNode;
  toolbarActions?: ReactNode;
  toolbarLeading?: ReactNode;
  kind: TimeSeriesConnectionKind;
  name: string;
  tables: ConnectionTable[];
  columns: ConnectionColumn[];
  draft: TimeSeriesDraft;
  search: string;
  disabled: boolean;
  loading: boolean;
  onSearchChange: (search: string) => void;
  onSearch: () => void;
  onSelect: (name: string) => void;
  onChange: (draft: TimeSeriesDraft) => void;
}

export function TimeSeriesSourceForm({
  children,
  footer,
  layout = "form",
  series,
  toolbarActions,
  toolbarLeading,
  kind,
  name,
  tables,
  columns,
  draft,
  search,
  disabled,
  loading,
  onSearchChange,
  onSearch,
  onSelect,
  onChange,
}: TimeSeriesSourceFormProps) {
  const id = useId();
  const isPrometheus = kind === "prometheus";
  const workspace = layout === "workspace";
  const queryFieldClassName = cn(workspace && "grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-2");
  const queryControlClassName = cn(
    workspace
      ? "w-28 min-w-28 bg-background focus-visible:ring-1 focus-visible:ring-ring/30"
      : "w-full data-[size=default]:h-11 md:data-[size=default]:h-10",
  );
  const label = isPrometheus ? "Metric" : "Measurement";
  const fields = columns.filter((column) => column.role === "field" && column.name !== "time");
  const tags = columns.filter(
    (column) => column.role === "tag" && column.name !== "time" && (!isPrometheus || column.name !== "value"),
  );
  const nonNumeric = columns.some(
    (column) => column.role === "field" && draft.fields.includes(column.name) && !isNumericTimeSeriesColumn(column),
  );
  const toggle = (key: "fields" | "tags", value: string, checked: boolean) => {
    const values = checked ? [...draft[key], value] : draft[key].filter((name) => name !== value);
    const next = { ...draft, [key]: values };
    if (
      key === "fields" &&
      columns.some(
        (column) => values.includes(column.name) && column.role === "field" && !isNumericTimeSeriesColumn(column),
      )
    )
      next.aggregate = "count";
    onChange(next);
  };
  const fieldChoices =
    !isPrometheus &&
    (loading ? (
      <Skeleton className="h-20 w-full" />
    ) : name ? (
      <TimeSeriesColumnChoices
        label="Fields"
        columns={fields}
        selected={draft.fields}
        limit={20}
        disabled={disabled}
        showTypes
        compact={workspace}
        onToggle={(value, checked) => toggle("fields", value, checked)}
      />
    ) : null);
  const metric = (
    <Field orientation={workspace ? "horizontal" : "vertical"} className={cn(workspace && "min-w-0 sm:w-auto")}>
      <FieldLabel htmlFor={id + "-name"} className={cn(workspace && "shrink-0")}>
        {workspace ? label : "What data do you need?"}
      </FieldLabel>
      <TimeSeriesMetricPicker
        id={id + "-name"}
        label={label}
        value={name}
        tables={tables}
        search={search}
        disabled={disabled}
        loading={loading}
        onSearchChange={onSearchChange}
        onSearch={onSearch}
        onSelect={onSelect}
        compact={workspace}
      />
      {!workspace && (
        <FieldDescription>Search for a {label.toLowerCase()} from your connected server.</FieldDescription>
      )}
    </Field>
  );
  const queryFields = (
    <FieldGroup className={cn(workspace ? "@container-normal gap-3" : "grid gap-4 sm:grid-cols-2")}>
      <Field orientation={workspace ? "horizontal" : "vertical"} className={queryFieldClassName}>
        <FieldLabel htmlFor={`${id}-bucket`} className={cn(workspace && "whitespace-nowrap")}>
          {workspace ? "Interval" : "Group every"}
        </FieldLabel>
        <Select
          value={draft.bucket}
          disabled={disabled}
          onValueChange={(value) => {
            if (value === "raw" && !isPrometheus) onChange({ ...draft, bucket: "raw" });
            else if (value in TIME_SERIES_BUCKETS) onChange({ ...draft, bucket: value as TimeSeriesBucket });
          }}
        >
          <SelectTrigger id={`${id}-bucket`} className={queryControlClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {!isPrometheus && <SelectItem value="raw">Raw data</SelectItem>}
              {Object.entries(TIME_SERIES_BUCKETS).map(([value, item]) => (
                <SelectItem key={value} value={value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field orientation={workspace ? "horizontal" : "vertical"} className={queryFieldClassName}>
        <FieldLabel htmlFor={`${id}-aggregate`} className={cn(workspace && "whitespace-nowrap")}>
          Calculate
        </FieldLabel>
        <Select
          value={draft.aggregate}
          disabled={disabled || draft.bucket === "raw"}
          onValueChange={(value) => {
            if (value in TIME_SERIES_AGGREGATES) onChange({ ...draft, aggregate: value as TimeSeriesAggregate });
          }}
        >
          <SelectTrigger id={`${id}-aggregate`} className={queryControlClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.entries(TIME_SERIES_AGGREGATES)
                .filter(([value]) => (!nonNumeric || value === "count") && (isPrometheus || value !== "increase"))
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {value === "mean" ? "Average" : label}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
  const labelChoices = (
    <FieldGroup className="gap-5">
      {name && !loading && (
        <TimeSeriesColumnChoices
          label={workspace ? "Group by labels" : "Separate series by label"}
          columns={tags}
          selected={draft.tags}
          excluded={draft.fields}
          limit={10}
          disabled={disabled}
          compact={workspace}
          description={
            draft.tags.length
              ? "Each label combination becomes a separate series."
              : "Leave empty to combine all series."
          }
          onToggle={(value, checked) => toggle("tags", value, checked)}
        />
      )}
      {draft.aggregate === "increase" && (
        <FieldDescription>
          Increase estimates counter changes. Choose an interval at least twice the server's collection interval.
        </FieldDescription>
      )}
    </FieldGroup>
  );
  const options = (
    <FieldGroup className="gap-5">
      {queryFields}
      {labelChoices}
    </FieldGroup>
  );
  const hasLabelChoices = Boolean(name && !loading && tags.length > 0) || draft.aggregate === "increase";
  const hasSeries = Boolean(series && name);
  const queryControls = workspace ? (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <SlidersHorizontal data-icon="inline-start" />
          Chart options
          <ChevronDown data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Chart options"
        className={cn(
          "w-88 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0",
          "max-h-[min(32rem,var(--radix-popover-content-available-height))]",
        )}
      >
        <div className="shrink-0 p-4">{queryFields}</div>
        {(hasSeries || fieldChoices || hasLabelChoices) && (
          <>
            <Separator />
            <ScrollArea
              type="always"
              className={cn(
                "min-h-0 [&_[data-slot=scroll-area-viewport]]:overscroll-contain",
                "[&_[data-slot=scroll-area-viewport]]:max-h-[min(22rem,calc(var(--radix-popover-content-available-height)-8rem))]",
              )}
            >
              <div className="flex flex-col gap-4 p-4 pr-5">
                {hasSeries && series}
                {fieldChoices && (
                  <>
                    {hasSeries && <Separator />}
                    {fieldChoices}
                  </>
                )}
                {hasLabelChoices && (
                  <>
                    {(hasSeries || fieldChoices) && <Separator />}
                    {labelChoices}
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </PopoverContent>
    </Popover>
  ) : (
    queryFields
  );
  const content = typeof children === "function" ? children(queryControls) : children;
  const period = (
    <TimeSeriesPeriodPicker
      id={id + "-period"}
      draft={draft}
      disabled={disabled}
      onChange={onChange}
      compact={workspace}
    />
  );
  if (workspace) {
    return (
      <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:h-full">
        <header className="shrink-0 border-b pb-3">
          <FieldGroup className="min-w-0 flex-row flex-wrap items-center gap-3">
            {toolbarLeading && <div className="w-full min-w-0 sm:mr-auto sm:w-auto">{toolbarLeading}</div>}
            {metric}
            {period}
            {toolbarActions && <div className="flex shrink-0 items-center gap-2">{toolbarActions}</div>}
          </FieldGroup>
        </header>
        <section
          aria-label="Time series workspace"
          className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border bg-card text-card-foreground lg:min-h-120"
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{content}</div>
          {footer && (
            <footer className="flex shrink-0 flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
              {footer}
            </footer>
          )}
        </section>
      </div>
    );
  }
  return (
    <Card className="shrink-0 gap-0 overflow-hidden py-0">
      <CardContent className="p-5 md:p-6">
        <FieldGroup className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <FieldGroup className="gap-4">
            {metric}
            {fieldChoices}
          </FieldGroup>
          {period}
        </FieldGroup>
      </CardContent>
      {content && <div className="min-w-0 border-t">{content}</div>}
      <Collapsible className="px-5 pb-5 md:px-6">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="group" type="button">
            <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
            Advanced options
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">{options}</CollapsibleContent>
      </Collapsible>
      {footer && (
        <CardFooter className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/30 p-5 md:px-6">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
