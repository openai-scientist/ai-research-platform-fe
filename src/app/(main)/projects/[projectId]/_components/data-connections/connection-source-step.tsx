"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ConnectionCatalogBrowser } from "./connection-catalog-browser";
import { SqlQueryInput } from "./sql-query-input";
import { TimeSeriesSourceStep } from "./time-series-source-step";
import type { ConnectionFlowState } from "./use-connection-flow";

export function ConnectionSourceControls({ flow }: { flow: ConnectionFlowState }) {
  if (flow.isGoogle || flow.isTimeSeries) return null;
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Tabs
        value={flow.mode}
        onValueChange={(value) => {
          if (value === "table" || value === "query") flow.setMode(value);
        }}
      >
        <TabsList variant="line" aria-label="Source type">
          <TabsTrigger
            value="table"
            id="source-browse-tab"
            aria-controls="source-browse-panel"
            disabled={flow.disabled}
          >
            Browse
          </TabsTrigger>
          <TabsTrigger value="query" id="source-query-tab" aria-controls="source-query-panel" disabled={flow.disabled}>
            SQL query
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

export function ConnectionCatalogRefresh({ flow }: { flow: ConnectionFlowState }) {
  if (!flow.configured) return null;
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      disabled={flow.disabled}
      onClick={() => void flow.reloadCatalog()}
      aria-label="Reload catalog"
      title="Reload catalog"
    >
      <RefreshCw />
    </Button>
  );
}

export function ConnectionSourceStep({ flow }: { flow: ConnectionFlowState }) {
  if (flow.isTimeSeries) return <TimeSeriesSourceStep key={flow.connection?.id} flow={flow} />;
  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-col"
      role={flow.isGoogle ? "region" : "tabpanel"}
      id={flow.mode === "table" ? "source-browse-panel" : "source-query-panel"}
      aria-label={flow.isGoogle ? "Browse Google files and tabs" : undefined}
      aria-labelledby={flow.isGoogle ? undefined : flow.mode === "table" ? "source-browse-tab" : "source-query-tab"}
    >
      {flow.mode === "table" ? (
        <ConnectionCatalogBrowser flow={flow} />
      ) : (
        <ScrollArea
          type="hover"
          className="min-h-0 flex-1 rounded-lg border [&_[data-slot=scroll-area-viewport]]:overscroll-contain"
        >
          <FieldGroup className="p-4">
            <Field>
              <FieldLabel htmlFor="connection-sql">SQL query</FieldLabel>
              <SqlQueryInput flow={flow} />
              <FieldDescription>Use a single SELECT statement. Maximum 20,000 characters.</FieldDescription>
              <FieldDescription>
                Type a table or column name for suggestions. Press Ctrl+Space to show available suggestions.
              </FieldDescription>
            </Field>
            {flow.kind === "bigquery" && (
              <FieldDescription>
                Queries may incur Google Cloud charges. Queries scanning more than 1 GiB are rejected. Use fully
                qualified names for tables in another project.
              </FieldDescription>
            )}
          </FieldGroup>
        </ScrollArea>
      )}
    </section>
  );
}
