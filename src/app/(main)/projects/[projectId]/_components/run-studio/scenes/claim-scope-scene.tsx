import { CLAIM_FIELDS, type ClaimScope } from "@/lib/run-stream/claim-scope";

import { Pane } from "./scene-ui";

export function ClaimScopeScene({ scope }: { scope: ClaimScope }) {
  const { claim, protocol } = scope;
  const rows = [
    ["Review question", protocol.question],
    ["Search sources", protocol.sources?.join(", ")],
    ["Publication year", protocol.yearMin ? `${protocol.yearMin} and later` : undefined],
    ["Include", protocol.inclusion?.join(" · ")],
    ["Exclude", protocol.exclusion?.join(" · ")],
  ];
  const status = { pending: "Pending", drafted: "Drafted", locked: "Locked" }[protocol.status];
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Pane title="Research claim">
        {scope.status === "stated" && claim && (
          <dl className="grid gap-3 text-sm">
            {(Object.keys(CLAIM_FIELDS) as (keyof typeof CLAIM_FIELDS)[]).map((key) =>
              claim[key] ? (
                <div key={key} className="grid gap-0.5">
                  <dt className="font-medium text-muted-foreground text-xs">{CLAIM_FIELDS[key]}</dt>
                  <dd className="wrap-anywhere">{claim[key]}</dd>
                </div>
              ) : null,
            )}
          </dl>
        )}
        {scope.status === "skipped" && <p className="text-sm">Skipped: the review proposes claims.</p>}
        {scope.status === "pending" && <p className="text-muted-foreground text-sm">Waiting for the claim decision.</p>}
      </Pane>
      <Pane title="Review plan" aside={status}>
        {protocol.status === "locked" && (
          <p className="mb-3 text-sm">The review plan is locked for searching and screening the literature.</p>
        )}
        {protocol.status === "pending" && <p className="text-muted-foreground text-sm">The review plan is pending.</p>}
        {rows.some(([, value]) => value) && (
          <dl className="grid gap-3 text-sm">
            {rows.map(([label, value]) =>
              value ? (
                <div key={label} className="grid gap-0.5">
                  <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
                  <dd className="wrap-anywhere">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
        )}
      </Pane>
    </div>
  );
}
