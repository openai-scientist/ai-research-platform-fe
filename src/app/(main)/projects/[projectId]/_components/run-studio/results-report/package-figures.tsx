"use client";

import { useApiQuery } from "@/hooks/use-api";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";
import { svgRatio } from "@/lib/run-stream/research-report";
import { type PackageFigure, packageFigures } from "@/lib/run-stream/result-figures";

import { type FrameTheme, ReportFrame, ThemeProbe, useFrameTheme } from "./report-frame";

export const RESULT_PACKAGE_SCHEMA = "platform.experiment_result/v1";

/** The figures the run's experiment result package defines, read from the published JSON file. */
export function usePackageFigures(projectId: string, runId: string, enabled = true) {
  return useApiQuery(
    [...projectKeys.run(projectId, runId), "package-figures"],
    async (signal) => {
      const list = await fetchArtifacts.getBySchema(projectId, runId, RESULT_PACKAGE_SCHEMA, signal);
      const file = [...(list.data ?? [])].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
      if (!file) return [] as PackageFigure[];
      const { blob } = await fetchArtifacts.download(projectId, runId, file.id, signal);
      return packageFigures(JSON.parse(await blob.text()));
    },
    { enabled: enabled && Boolean(projectId && runId), silentErrorCodes: ["NOT_FOUND"], retry: false },
  );
}

function FigureCard({ figure, theme }: { figure: PackageFigure; theme: FrameTheme }) {
  return (
    <figure className="m-0 grid min-w-0 gap-2 rounded-xl border bg-card p-3.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-mono text-[11px] text-muted-foreground">Figure {figure.id}</span>
        <b className="min-w-0 font-semibold text-sm">{figure.title}</b>
      </div>
      {figure.svg ? (
        <div className="overflow-x-auto">
          <ReportFrame
            markup={figure.svg}
            label={figure.title}
            ratio={svgRatio(figure.svg)}
            theme={theme}
            className="min-w-[26rem]"
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          The package defines this {figure.chart} chart, but this page cannot draw it yet.
        </p>
      )}
      <figcaption className="max-w-prose text-muted-foreground text-[12.5px]">
        {figure.sources.length > 0 && `Drawn from ${figure.sources.join(", ")}. `}
        The dot is the estimate and the line is its interval.
      </figcaption>
    </figure>
  );
}

/** The package's own figures, drawn in the same sandboxed frame as the report's figures. */
export function PackageFigureCards({ figures }: { figures: readonly PackageFigure[] }) {
  const { probe, theme } = useFrameTheme();
  if (figures.length === 0) return null;
  return (
    <section aria-label="Figures from the result package" className="grid min-w-0 gap-3">
      <ThemeProbe probe={probe} />
      <h3 className="border-b pb-2 font-semibold text-[15px]">Figures from the result package</h3>
      {theme && figures.map((figure) => <FigureCard key={figure.id} figure={figure} theme={theme} />)}
    </section>
  );
}
