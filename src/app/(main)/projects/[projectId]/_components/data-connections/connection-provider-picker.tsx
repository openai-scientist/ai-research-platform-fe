import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConnectionKind } from "@/lib/api/services/fetch-data-connections";

import { CONNECTION_PROVIDERS, ConnectionLogo } from "./connection-display";
import type { ConnectionFlowState } from "./use-connection-flow";

const groups: { label: string; kinds: ConnectionKind[] }[] = [
  { label: "Database", kinds: ["postgres", "mysql", "bigquery"] },
  { label: "Google", kinds: ["google_sheets", "google_drive"] },
  { label: "Time series", kinds: ["prometheus", "influxdb"] },
];

export function ConnectionProviderPicker({ flow }: { flow: ConnectionFlowState }) {
  return (
    <div className="flex flex-col gap-5">
      {groups
        .filter((group) => group.label !== "Google" || flow.googleAvailable)
        .map((group) => (
          <section key={group.label} aria-label={group.label} className="flex flex-col gap-2">
            <h2 className="font-medium text-sm">{group.label}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.kinds.map((kind) => {
                const provider = CONNECTION_PROVIDERS[kind];
                return (
                  <button
                    type="button"
                    key={kind}
                    disabled={flow.disabled}
                    onClick={() => flow.chooseKind(kind)}
                    aria-label={`${provider.label}: ${provider.description}`}
                    title={provider.description}
                    className="min-w-0 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                  >
                    <Card size="sm" className="h-full min-h-32 justify-center py-4 transition-colors hover:bg-muted/50">
                      <CardHeader className="grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-4">
                        <span className="col-start-1 row-span-3 row-start-1 size-12 [&_img]:size-12 [&_svg]:size-12">
                          <ConnectionLogo kind={kind} />
                        </span>
                        <CardTitle className="col-start-2 row-start-1">{provider.label}</CardTitle>
                        <CardDescription className="col-start-2 row-start-2 line-clamp-2">
                          {provider.description}
                        </CardDescription>
                        <div className="col-start-2 row-start-3 mt-1">
                          <Badge variant="outline" className={provider.badgeColor}>
                            {provider.category}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
    </div>
  );
}
