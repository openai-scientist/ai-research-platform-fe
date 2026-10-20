"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_CONFIG } from "@/config/app-config";
import { useAdminOverviewQuery } from "@/hooks/use-admin-monitoring-query";
import type { OverviewSection } from "@/lib/api/services/admin-monitoring-types";

import { AnalyticsToolbar } from "../../dashboard/analytics/_components/analytics-toolbar";
import { OverviewContent } from "./overview-content";
import { useAdminAccess } from "./use-admin-access";

const sections: { value: OverviewSection; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "operations", label: "Operations" },
  { value: "projects", label: "Projects" },
  { value: "governance", label: "Governance" },
];

export function AdminOverview() {
  const { enabled } = useAdminAccess();
  const [section, setSection] = useState<OverviewSection>("overview");
  const [range, setRange] = useState("default");
  const [dates, setDates] = useState<{ from?: string; to?: string }>({});
  const timezone = enabled ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const query = useAdminOverviewQuery({ section, ...dates, timezone }, enabled);
  const data = enabled && !query.isError ? query.data?.data : undefined;
  const defaultRange = section === "operations" || section === "governance" ? "Last 24 hours" : "Last 4 weeks";
  function selectRange(value: string) {
    setRange(value);
    if (value === "default") {
      setDates({});
      return;
    }
    const to = new Date();
    const from =
      value === "year-to-date" ? new Date(to.getFullYear(), 0, 1) : new Date(to.getTime() - Number(value) * 86400000);
    setDates({ from: from.toISOString(), to: to.toISOString() });
  }
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl tracking-tight">{APP_CONFIG.name}</h1>
        <p className="text-muted-foreground text-sm">
          Monitor projects, experiment runs, providers, and review activity in one view.
        </p>
      </div>
      <Tabs
        value={section}
        onValueChange={(value) => setSection(value as OverviewSection)}
        className="flex min-w-0 flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="max-w-full gap-1">
            {sections.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <AnalyticsToolbar
            actionLabel="Admin actions"
            value={range}
            onValueChange={selectRange}
            onRefresh={() => void query.refetch()}
            refreshDisabled={!enabled || query.isFetching}
            options={[
              { value: "default", label: defaultRange },
              { value: "7", label: "Last 7 days" },
              { value: "28", label: "Last 4 weeks" },
              { value: "90", label: "Last 3 months" },
              { value: "year-to-date", label: "Year to date" },
            ]}
          />
        </div>
        {sections.map((item) => (
          <TabsContent key={item.value} value={item.value} className="mt-0">
            <OverviewContent data={data} section={item.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
