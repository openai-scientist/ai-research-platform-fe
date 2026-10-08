"use client";

import { type ReactNode, useState } from "react";

import { cn } from "cn";
import { Columns3, Database, type LucideIcon, Search, Table2 } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import type { ConnectionFlowState } from "./use-connection-flow";

function CatalogSearch({
  id,
  placeholder,
  value,
  disabled,
  onChange,
  onSearch,
}: {
  id: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSearch?: () => void;
}) {
  return (
    <Field data-disabled={disabled}>
      <FieldLabel htmlFor={id} className="sr-only">
        {placeholder}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch?.();
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <span className="flex size-6 items-center justify-center">
            {onSearch ? (
              <InputGroupButton
                size="icon-sm"
                className="size-6"
                disabled={disabled}
                aria-label={placeholder}
                title="Up to 500 tables are returned. Search to narrow larger schemas."
                onClick={onSearch}
              >
                <Search />
              </InputGroupButton>
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
          </span>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

function CatalogPane({
  id,
  title,
  icon: Icon,
  count,
  controls,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  count: number;
  controls: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-h-52 min-w-0 flex-col overflow-hidden border-b last:border-b-0 md:min-h-0 md:border-r md:border-b-0 md:last:border-r-0"
    >
      <header className="flex min-h-10 shrink-0 items-center gap-2 bg-muted/50 px-3 text-sm">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 id={id} className="font-medium">
          {title}
        </h2>
        <span className="ml-auto text-muted-foreground text-xs tabular-nums">{count}</span>
      </header>
      {controls && <div className="shrink-0 p-2">{controls}</div>}
      <ScrollArea
        type="hover"
        className="h-48 min-h-0 flex-1 md:h-0 [&_[data-slot=scroll-area-viewport]]:overscroll-contain"
      >
        {children}
      </ScrollArea>
    </section>
  );
}

function CatalogEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="px-4 py-6">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function CatalogLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2 p-3" role="status" aria-label={label}>
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
    </div>
  );
}

const itemClass =
  "flex min-h-10 w-full items-start gap-2 border-l-2 border-transparent px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50";
const selectedItemClass = "border-primary bg-primary/15 font-medium";

export function ConnectionCatalogBrowser({ flow }: { flow: ConnectionFlowState }) {
  const [schemaSearch, setSchemaSearch] = useState("");
  const [columnSearch, setColumnSearch] = useState("");
  const schemas = flow.schemas.filter((name) => name.toLowerCase().includes(schemaSearch.trim().toLowerCase()));
  const columns = flow.columns.filter((column) =>
    `${column.name} ${column.type}`.toLowerCase().includes(columnSearch.trim().toLowerCase()),
  );
  const chooseSchema = (value: string) => {
    if (value === flow.schema) return;
    setColumnSearch("");
    void flow.selectSchema(value);
  };
  const chooseTable = (value: string) => {
    setColumnSearch("");
    void flow.selectTable(value);
  };
  const searchTables = () => {
    setColumnSearch("");
    void flow.searchTables();
  };

  if (!flow.schemas.length) {
    if (flow.busy)
      return (
        <div className="max-w-xl">
          <CatalogLoading label="Loading data catalog" />
        </div>
      );
    return (
      <Empty className="mx-auto max-w-2xl flex-none py-8">
        <EmptyHeader>
          <EmptyTitle>{flow.catalogLoaded ? "No accessible sources" : "Load your data catalog"}</EmptyTitle>
          <EmptyDescription>
            {flow.catalogLoaded
              ? "The catalog returned no sources. Check the account's read permissions, then reload."
              : "Reload the catalog to list the sources and columns available to this connection."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center">
          {flow.configured && (
            <Button variant="outline" disabled={flow.disabled} onClick={() => void flow.reloadCatalog()}>
              Reload catalog
            </Button>
          )}
          {!flow.isGoogle && (
            <Button variant="outline" disabled={flow.disabled} onClick={() => flow.setMode("query")}>
              Use SQL query
            </Button>
          )}
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap overflow-x-auto">
          <BreadcrumbItem className="shrink-0">
            <Database className="size-4 text-muted-foreground" aria-hidden="true" />
            {flow.table ? (
              <span>{flow.schema}</span>
            ) : (
              <BreadcrumbPage>{flow.schema || "Choose a schema"}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {flow.table && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="shrink-0">
                <Table2 className="size-4 text-muted-foreground" aria-hidden="true" />
                <BreadcrumbPage>{flow.table}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto rounded-lg border bg-card text-card-foreground md:grid-cols-3 md:overflow-hidden">
        <CatalogPane
          id="catalog-schemas"
          title={
            flow.kind === "google_sheets"
              ? "Spreadsheet"
              : flow.kind === "google_drive"
                ? "Files"
                : flow.kind === "bigquery"
                  ? "Datasets"
                  : "Schemas"
          }
          icon={Database}
          count={flow.schemas.length}
          controls={
            <CatalogSearch
              id="schema-filter"
              value={schemaSearch}
              placeholder="Search schemas"
              disabled={flow.disabled}
              onChange={setSchemaSearch}
            />
          }
        >
          {!schemas.length ? (
            <CatalogEmpty title="No matching schemas" description="Try another schema name." />
          ) : (
            <ul>
              {schemas.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    disabled={flow.disabled}
                    aria-current={flow.schema === name ? "true" : undefined}
                    onClick={() => chooseSchema(name)}
                    className={cn(itemClass, flow.schema === name ? selectedItemClass : "hover:bg-foreground/5")}
                  >
                    <span className="min-w-0 break-all">{name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CatalogPane>
        <CatalogPane
          id="catalog-tables"
          title="Tables"
          icon={Table2}
          count={flow.tables.length}
          controls={
            flow.schema && (
              <CatalogSearch
                id="table-filter"
                placeholder="Search tables"
                value={flow.tableSearch}
                disabled={flow.disabled}
                onChange={flow.setTableSearch}
                onSearch={flow.configured ? searchTables : undefined}
              />
            )
          }
        >
          {flow.busy && flow.schema && !flow.tables.length ? (
            <CatalogLoading label="Loading tables" />
          ) : !flow.schema ? (
            <CatalogEmpty title="Choose a schema" description="Its tables and views will appear here." />
          ) : !flow.tables.length ? (
            <CatalogEmpty title="No tables found" description="Try another schema or table search." />
          ) : (
            <ul>
              {flow.tables.map((item) => (
                <li key={`${item.schema}.${item.name}`}>
                  <button
                    type="button"
                    disabled={flow.disabled}
                    aria-current={flow.table === item.name ? "true" : undefined}
                    onClick={() => chooseTable(item.name)}
                    className={cn(itemClass, flow.table === item.name ? selectedItemClass : "hover:bg-foreground/5")}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="break-all">{item.name}</span>
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          flow.table === item.name ? "text-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        <Columns3 className="size-3" aria-hidden="true" />
                        {item.column_count === null
                          ? item.type === "view"
                            ? "View"
                            : "Table"
                          : `${item.column_count} cols${item.type === "view" ? " · View" : ""}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CatalogPane>
        <CatalogPane
          id="catalog-columns"
          title="Columns"
          icon={Columns3}
          count={flow.columns.length}
          controls={
            flow.table && (
              <CatalogSearch
                id="column-filter"
                placeholder="Search columns"
                value={columnSearch}
                disabled={flow.disabled}
                onChange={setColumnSearch}
              />
            )
          }
        >
          {flow.busy && flow.table && !flow.columns.length ? (
            <CatalogLoading label="Loading columns" />
          ) : !flow.table ? (
            <CatalogEmpty
              title="Select a table"
              description="Choose a table on the left to see its columns and preview its data."
            />
          ) : !columns.length ? (
            <CatalogEmpty title="No matching columns" description="Try another column name or data type." />
          ) : (
            <ul>
              {columns.map((column) => (
                <li key={column.name} className="flex min-h-10 flex-col gap-1 px-3 py-2 text-sm">
                  <span className="break-all">{column.name}</span>
                  <span className="break-words text-foreground/70 text-xs">{column.type}</span>
                </li>
              ))}
            </ul>
          )}
        </CatalogPane>
      </div>
    </div>
  );
}
