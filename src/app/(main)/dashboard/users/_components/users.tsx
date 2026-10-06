"use client";
import * as React from "react";

import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { cn } from "cn";
import { Cog, Download, Grid, Plus, Rows3, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { dataTableFeatures } from "@/lib/data-table-features";
import { getLocalStorageValue, setLocalStorageValue } from "@/lib/local-storage.client";

import { filters, type UserRow } from "./data";
import { createUsersColumns } from "./users-columns";
import { UsersGrid } from "./users-grid";
import { UsersTable } from "./users-table";

const VIEW_STORAGE_KEY = "users-view";

type UsersView = "list" | "grid";

function FilterSelect({
  label,
  value,
  options,
  align = "start",
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  align?: "start" | "end";
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align={align}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

type UsersProps = {
  readonly server?: {
    search: string;
    roleFilter: string;
    statusFilter: string;
    emailVerifiedFilter: string;
    pagination: PaginationState;
    total: number;
    busy: boolean;
    onSearchChange: (value: string) => void;
    onFilterChange: (filter: "role" | "status" | "emailVerified", value: string) => void;
    onPaginationChange: (value: PaginationState) => void;
  };
  readonly renderActions?: (user: UserRow) => React.ReactNode;
  /** Puts the filters in the card header instead of a row below it. */
  readonly compactToolbar?: boolean;
  readonly description?: string;
  readonly getDetailsHref?: (user: UserRow) => string | undefined;
  readonly onChangeRole?: (user: UserRow, role: string) => void;
  readonly onToggleStatus?: (user: UserRow) => void;
  readonly roleOptions?: readonly string[];
  readonly showPrimaryActions?: boolean;
  readonly showViewControls?: boolean;
  readonly statusOptions?: readonly string[];
  readonly teamOptions?: readonly string[];
  readonly title?: string;
  readonly users: UserRow[];
  readonly workspaceOptions?: readonly string[];
};

export function Users({
  server,
  renderActions,
  compactToolbar = false,
  description = "Manage your organization members and their access.",
  getDetailsHref,
  onChangeRole,
  onToggleStatus,
  roleOptions = filters.role,
  showPrimaryActions = true,
  showViewControls = true,
  statusOptions = filters.status,
  teamOptions = filters.team,
  title = "Users",
  users,
  workspaceOptions = filters.workspace,
}: UsersProps) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "joinedDate", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
    team: false,
  });
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [view, setView] = React.useState<UsersView>("list");

  // Read after mount so the server render and the first client render match.
  React.useEffect(() => {
    if (getLocalStorageValue(VIEW_STORAGE_KEY) === "grid") setView("grid");
  }, []);

  // Phones always get the card grid: the table does not fit a narrow screen.
  const isMobile = useIsMobile();
  const activeView: UsersView = isMobile ? "grid" : view;

  function changeView(next: UsersView) {
    setView(next);
    setLocalStorageValue(VIEW_STORAGE_KEY, next);
  }

  const roleChoices = React.useMemo(() => roleOptions.filter((option) => option !== "All"), [roleOptions]);

  const columns = React.useMemo(
    () =>
      createUsersColumns({
        renderActions,
        onChangeRole,
        onToggleStatus,
        roleChoices,
        showTeam: teamOptions.length > 0,
        showWorkspace: workspaceOptions.length > 0,
      }),
    [renderActions, onChangeRole, onToggleStatus, roleChoices, teamOptions.length, workspaceOptions.length],
  );

  const table = useTable({
    features: dataTableFeatures,
    data: users,
    columns,
    state: {
      rowSelection,
      sorting,
      columnFilters,
      columnVisibility,
      pagination: server?.pagination ?? pagination,
    },
    getRowId: (row) => row.email,
    autoResetPageIndex: false,
    manualFiltering: Boolean(server),
    manualPagination: Boolean(server),
    manualSorting: Boolean(server),
    enableSorting: !server,
    rowCount: server?.total,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const previous = server?.pagination ?? pagination;
      const next = typeof updater === "function" ? updater(previous) : updater;
      if (server)
        server.onPaginationChange({ ...next, pageIndex: next.pageSize !== previous.pageSize ? 0 : next.pageIndex });
      else setPagination(next);
    },
  });

  const selectionScope = JSON.stringify([
    server?.search,
    server?.roleFilter,
    server?.statusFilter,
    server?.emailVerifiedFilter,
    server?.pagination.pageIndex,
    server?.pagination.pageSize,
  ]);
  const previousSelectionScope = React.useRef(selectionScope);
  React.useEffect(() => {
    if (previousSelectionScope.current !== selectionScope) {
      previousSelectionScope.current = selectionScope;
      setRowSelection({});
    }
  }, [selectionScope]);

  const searchQuery = server?.search ?? (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const roleFilter =
    server?.roleFilter ?? (table.getColumn("role")?.getFilterValue() as string | undefined) ?? roleOptions[0];
  const teamFilter = (table.getColumn("team")?.getFilterValue() as string | undefined) ?? teamOptions[0];
  const statusFilter =
    server?.statusFilter ?? (table.getColumn("status")?.getFilterValue() as string | undefined) ?? statusOptions[0];
  const workspaceFilter =
    ((workspaceOptions.length > 0 ? table.getColumn("workspace")?.getFilterValue() : undefined) as
      | string
      | undefined) ?? workspaceOptions[0];
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  function setColumnSelectFilter(columnId: string, value: string) {
    if (server && (columnId === "role" || columnId === "status")) {
      server.onFilterChange(columnId, value);
      return;
    }
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  const roleSelect = (
    <FilterSelect
      label={server ? "Platform role" : "Role"}
      value={roleFilter}
      options={roleOptions}
      onChange={(value) => setColumnSelectFilter("role", value)}
    />
  );
  const teamSelect =
    teamOptions.length > 0 ? (
      <FilterSelect
        label="Team"
        value={teamFilter}
        options={teamOptions}
        onChange={(value) => setColumnSelectFilter("team", value)}
      />
    ) : null;
  const statusSelect = (
    <FilterSelect
      label="Status"
      value={statusFilter}
      options={statusOptions}
      onChange={(value) => setColumnSelectFilter("status", value)}
    />
  );
  const verificationSelect = server ? (
    <FilterSelect
      label="Email verification"
      value={server.emailVerifiedFilter}
      options={["All", "Verified", "Unverified"]}
      onChange={(value) => server.onFilterChange("emailVerified", value)}
    />
  ) : null;
  const workspaceSelect =
    workspaceOptions.length > 0 ? (
      <FilterSelect
        label="Workspace"
        value={workspaceFilter}
        options={workspaceOptions}
        align="end"
        onChange={(value) => setColumnSelectFilter("workspace", value)}
      />
    ) : null;
  const viewTabs = (
    <Tabs value={activeView} onValueChange={(value) => changeView(value === "grid" ? "grid" : "list")}>
      <TabsList>
        <TabsTrigger value="list" aria-label="List view">
          <Rows3 />
        </TabsTrigger>
        <TabsTrigger value="grid" aria-label="Grid view">
          <Grid />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const grid = server?.busy ? (
    <div className="flex h-24 items-center justify-center text-muted-foreground text-sm" role="status">
      Loading users...
    </div>
  ) : (
    <UsersGrid
      renderActions={renderActions}
      table={table}
      getDetailsHref={getDetailsHref}
      onChangeRole={onChangeRole}
      onToggleStatus={onToggleStatus}
      roleChoices={roleChoices}
      showTeam={teamOptions.length > 0}
    />
  );

  return (
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">{title}</CardTitle>
        {description ? <CardDescription className="max-w-sm leading-snug">{description}</CardDescription> : null}
        <CardAction
          className={cn(
            "col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:justify-end md:justify-self-end",
            server ? "md:flex-wrap" : "md:flex-nowrap",
          )}
        >
          {compactToolbar ? (
            <>
              {roleSelect}
              {teamSelect}
              {statusSelect}
              {verificationSelect}
              {workspaceSelect}
            </>
          ) : null}
          <InputGroup className="h-7 w-full md:w-64">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              className="h-7"
              placeholder={server ? "Search users (min. 3 characters)..." : "Search users..."}
              aria-label="Search users by name or email"
              maxLength={server ? 120 : undefined}
              value={searchQuery}
              onChange={(event) => {
                if (server) {
                  server.onSearchChange(event.target.value);
                  return;
                }
                table.getColumn("search")?.setFilterValue(event.target.value || undefined);
                table.setPageIndex(0);
              }}
            />
            {server ? null : (
              <InputGroupAddon align="inline-end">
                <Kbd className="h-4 text-[10px]">⌘K</Kbd>
              </InputGroupAddon>
            )}
          </InputGroup>
          {showViewControls ? (
            <>
              <Button variant="outline" size="sm">
                <SlidersHorizontal /> Hide
              </Button>
              <Button variant="outline" size="sm">
                <Cog /> Customize
              </Button>
            </>
          ) : null}
          {showPrimaryActions ? (
            <>
              <Button variant="outline" size="sm">
                <Download /> Export
              </Button>
              <Button size="sm">
                <Plus /> Add User
              </Button>
            </>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">
        {compactToolbar ? null : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              {roleSelect}
              {teamSelect}
              {statusSelect}
              {verificationSelect}
            </div>
            {workspaceSelect}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-4">
          <div className="text-muted-foreground text-sm tabular-nums">{selectedCount} selected</div>
          {isMobile ? null : viewTabs}
        </div>

        <UsersTable
          busy={server?.busy}
          pageSizes={server ? [10, 20, 50, 100] : undefined}
          table={table}
          grid={activeView === "grid" ? grid : undefined}
        />
      </CardContent>
    </Card>
  );
}
