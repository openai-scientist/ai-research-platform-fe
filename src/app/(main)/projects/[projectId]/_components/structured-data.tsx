import { cn } from "cn";

import { Badge } from "@/components/ui/badge";

import { ContextDisclosure } from "./context-disclosure";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const labels: Record<string, string> = {
  r_squared: "R² · explained variation",
  adjusted_r_squared: "Adjusted R²",
  rmse: "Root mean squared error",
  mae: "Mean absolute error",
  f_statistic: "F-statistic",
  p_value: "P-value",
  log_likelihood: "Log likelihood",
  aic: "Akaike information criterion (AIC)",
  bic: "Bayesian information criterion (BIC)",
  confidence_interval_95: "95% confidence interval",
  z_score: "Z-score",
  approve_all: "All items approved",
  signal: "Decision",
  text: "Text",
  value: "Value",
  id: "Item",
};

const explanations: Record<string, string> = {
  r_squared: "How much variation the model explains.",
  rmse: "Prediction error, with more weight given to larger errors.",
  mae: "Average size of prediction errors.",
  p_value: "Evidence against the tested null hypothesis; this is not an effect size.",
};

export function dataLabel(key: string): string {
  if (labels[key]) return labels[key];
  if (key.startsWith("variables.")) {
    const name = key.slice("variables.".length).replace(/\.role$/, "");
    return `Variable: ${name}`;
  }
  if (key.startsWith("questions.")) return `Research question ${key.slice("questions.".length)}`;
  if (key.startsWith("hypotheses.")) return `Hypothesis ${key.slice("hypotheses.".length)}`;
  const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function ScalarValue({ value, label }: { value: unknown; label?: string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">Not provided</span>;
  if (typeof value === "boolean") return <Badge variant="secondary">{value ? "Yes" : "No"}</Badge>;
  if (typeof value === "string" && ["status", "signal", "decision", "role"].includes(label ?? "")) {
    return (
      <Badge variant="secondary" className="h-auto whitespace-normal">
        {dataLabel(value.toLowerCase())}
      </Badge>
    );
  }
  return <span className="whitespace-pre-wrap break-words tabular-nums">{String(value)}</span>;
}

function DataValue({ value, depth = 0, flat = false }: { value: unknown; depth?: number; flat?: boolean }) {
  if (depth > 7)
    return <p className="text-muted-foreground text-sm">Open technical details to view deeper nested data.</p>;
  if (Array.isArray(value)) {
    if (!value.length) return <p className="text-muted-foreground text-sm">No items.</p>;
    if (value.every((item) => !isRecord(item) && !Array.isArray(item))) {
      return (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {value.slice(0, 100).map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Immutable JSON array positions identify repeated values.
            <li key={index}>
              <ScalarValue value={item} />
            </li>
          ))}
          {value.length > 100 && <li className="text-muted-foreground">More items in technical details.</li>}
        </ul>
      );
    }
    return (
      <div className="flex min-w-0 flex-col gap-3">
        {value.slice(0, 100).map((item, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: Immutable JSON array positions identify each entry.
            key={index}
            className={cn(
              "min-w-0",
              flat ? "border-b py-4 first:pt-0 last:border-0 last:pb-0" : "rounded-lg border p-3",
            )}
          >
            <DataValue value={item} depth={depth + 1} flat={flat} />
          </div>
        ))}
        {value.length > 100 && <p className="text-muted-foreground text-sm">More items in technical details.</p>}
      </div>
    );
  }
  if (!isRecord(value)) return <ScalarValue value={value} />;
  const entries = Object.entries(value);
  const simple = entries.filter(([, item]) => !isRecord(item) && !Array.isArray(item));
  const groups = entries.filter(([, item]) => isRecord(item) || Array.isArray(item));
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {!entries.length && <p className="text-muted-foreground text-sm">No details provided.</p>}
      {simple.length > 0 && (
        <dl className="@container grid gap-3 text-sm">
          {simple.slice(0, 100).map(([key, item]) => (
            <div
              key={key}
              className={cn(
                "grid min-w-0 @xl:gap-6 gap-1 border-b pb-3 last:border-0 last:pb-0",
                flat ? "@xl:grid-cols-[minmax(8rem,1fr)_minmax(0,3fr)]" : "@xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
              )}
            >
              <dt className="flex flex-col gap-1 break-words text-muted-foreground">
                <span>{dataLabel(key)}</span>
                {explanations[key] && <span className="text-xs leading-relaxed">{explanations[key]}</span>}
              </dt>
              <dd className="min-w-0">
                <ScalarValue value={item} label={key} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {groups.slice(0, 50).map(([key, item]) => (
        <section
          key={key}
          className={cn("flex min-w-0 flex-col gap-3", flat ? "border-t pt-4" : "rounded-lg border p-4")}
          aria-label={dataLabel(key)}
        >
          <h3 className="break-words font-medium text-sm">{dataLabel(key)}</h3>
          <GroupValue name={key} value={item} depth={depth + 1} flat={flat} />
        </section>
      ))}
      {(simple.length > 100 || groups.length > 50) && (
        <p className="text-muted-foreground text-sm">More fields in technical details.</p>
      )}
    </div>
  );
}

function GroupValue({ name, value, depth, flat }: { name: string; value: unknown; depth: number; flat: boolean }) {
  if (
    name === "confidence_interval_95" &&
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "number")
  ) {
    return (
      <p className="text-sm tabular-nums">
        {value[0]} to {value[1]}
      </p>
    );
  }
  if (
    name === "feature_importances" &&
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "number" && Number.isFinite(item) && item >= 0)
  ) {
    return <ImportanceScores values={value as Record<string, number>} />;
  }
  return <DataValue value={value} depth={depth} flat={flat} />;
}

function ImportanceScores({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values);
  const maximum = Math.max(...entries.map(([, value]) => value), 0);
  return (
    <dl className="flex flex-col gap-4 text-sm">
      {entries.slice(0, 100).map(([label, score]) => (
        <div key={label} className="flex min-w-0 flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <dt className="min-w-0 break-words">{dataLabel(label)}</dt>
            <dd className="shrink-0 font-medium tabular-nums">{score}</dd>
          </div>
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${maximum > 0 ? (score / maximum) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
      {entries.length > 100 && <div className="text-muted-foreground">More factors in technical details.</div>}
    </dl>
  );
}

export function StructuredData({
  value,
  technical = true,
  flat = false,
}: {
  value: unknown;
  technical?: boolean;
  flat?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <DataValue value={value} flat={flat} />
      {technical && (
        <ContextDisclosure title="Technical details">
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs">
            {JSON.stringify(value, null, 2)}
          </pre>
        </ContextDisclosure>
      )}
    </div>
  );
}
