const labels = ["Execution status", "Statistical verdict", "Claim assessment"] as const;

export function ExecutionLayers({
  layers,
}: {
  layers: readonly (readonly [status: string, reason?: string | null])[];
}) {
  return (
    <dl className="divide-y px-4">
      {labels.map((label, index) => {
        const [status, reason] = layers[index];
        return (
          <div key={label} className="grid gap-1 py-3 text-sm md:grid-cols-[10rem_10rem_1fr] md:gap-3">
            <dt className="font-medium">{label}</dt>
            <dd>{status}</dd>
            {reason && <dd className="text-muted-foreground text-xs leading-relaxed">{reason}</dd>}
          </div>
        );
      })}
    </dl>
  );
}
