import { readable } from "./research-report";

/**
 * Figures the experiment result package (`platform.experiment_result/v1`) defines as data. The Platform's report page
 * only draws the figures its own package builder knows (rows used, lock, specifications, sensitivity, shape), so a
 * chart defined here, such as the F2 interval chart, is drawn from its definition.
 */

export interface IntervalRow {
  id: string;
  estimate: number;
  low: number;
  high: number;
  n: number | null;
}

export interface PackageFigure {
  id: string;
  chart: string;
  title: string;
  unit: string | null;
  /** Names of the results the figure was drawn from. */
  sources: string[];
  /** The figure as SVG, or null when this page cannot draw that kind of chart. */
  svg: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function intervalRows(rows: unknown): IntervalRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row, index) => {
    if (!isRecord(row)) return [];
    const [estimate, low, high] = [num(row.estimate), num(row.ci_low), num(row.ci_high)];
    if (estimate === null || low === null || high === null) return [];
    return [
      {
        id: text(row.comparison_id) ?? `Analysis ${index + 1}`,
        estimate,
        low: Math.min(low, high),
        high: Math.max(low, high),
        n: num(row.n_used),
      },
    ];
  });
}

/** An interval chart: one row per analysis, a dot for the estimate and a line for its interval. */
export function intervalSvg(rows: readonly IntervalRow[], unit: string | null): string {
  const width = 520;
  const left = 110;
  const right = 24;
  const top = 14;
  const rowHeight = 34;
  const plotBottom = top + rowHeight * rows.length;
  const height = plotBottom + 46;
  const lo = Math.min(...rows.map((row) => row.low));
  const hi = Math.max(...rows.map((row) => row.high));
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.1;
  const [min, max] = [lo - pad, hi + pad];
  const x = (value: number) => (left + ((value - min) / (max - min)) * (width - left - right)).toFixed(1);
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
  const grid = ticks
    .map(
      (tick) =>
        `<line x1="${x(tick)}" y1="${top}" x2="${x(tick)}" y2="${plotBottom}" stroke="var(--rule)" stroke-width="1"/>` +
        `<text x="${x(tick)}" y="${plotBottom + 16}" text-anchor="middle" font-size="11" fill="var(--mute)">${esc(readable(tick))}</text>`,
    )
    .join("");
  const zero =
    min < 0 && max > 0
      ? `<line x1="${x(0)}" y1="${top}" x2="${x(0)}" y2="${plotBottom}" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="4 3"/>`
      : "";
  const marks = rows
    .map((row, i) => {
      const y = top + rowHeight * i + rowHeight / 2;
      return (
        `<text x="${left - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="var(--ink)">${esc(row.id)}</text>` +
        `<line x1="${x(row.low)}" y1="${y}" x2="${x(row.high)}" y2="${y}" stroke="var(--mark)" stroke-width="3" stroke-linecap="round"/>` +
        `<circle cx="${x(row.estimate)}" cy="${y}" r="5" fill="var(--mark)" stroke="var(--bg)" stroke-width="1.5"/>`
      );
    })
    .join("");
  const axis = `Estimate${unit && unit !== "unknown" ? ` (${unit})` : ""}, with its interval`;
  const desc = rows
    .map(
      (row) => `${row.id}: estimate ${readable(row.estimate)}, interval ${readable(row.low)} to ${readable(row.high)}`,
    )
    .join("; ");
  return (
    `<svg class="lg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(desc)}">` +
    `<rect width="${width}" height="${height}" fill="var(--bg)"/>${grid}${zero}${marks}` +
    `<text x="${(left + width - right) / 2}" y="${height - 6}" text-anchor="middle" font-size="11.5" fill="var(--mute)">${esc(axis)}</text>` +
    "</svg>"
  );
}

/** Every figure the package defines, drawn when its chart kind is one this page knows. */
export function packageFigures(value: unknown): PackageFigure[] {
  const figures = isRecord(value) && Array.isArray(value.figures) ? value.figures : [];
  return figures.flatMap((figure, index) => {
    if (!isRecord(figure)) return [];
    const chart = text(figure.chart) ?? "unknown";
    const rows = chart === "interval" ? intervalRows(figure.rows) : [];
    const unit = text(isRecord(figure.y) ? figure.y.unit : null);
    return [
      {
        id: text(figure.figure_id) ?? `F${index + 1}`,
        chart,
        title: text(figure.title) ?? "Figure",
        unit,
        sources: Array.isArray(figure.source_ids)
          ? figure.source_ids.filter((id): id is string => typeof id === "string")
          : [],
        svg: rows.length ? intervalSvg(rows, unit) : null,
      },
    ];
  });
}
