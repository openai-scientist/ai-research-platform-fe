import type { TimeRangeParams } from "@/lib/api/types";

export const ADMIN_PAGE_SIZE = 20;

export function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US");
}

// Keep decimal money strings intact rather than calculating with binary floating point.
export function formatUsd(value: string) {
  return `${value} USD`;
}

export function toTimeRange(from: string, to: string): Pick<TimeRangeParams, "from" | "to"> {
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
    throw new Error("Enter a valid date and time.");
  }
  if (start && end && start > end) throw new Error("The start time must be before the end time.");
  return { from: start?.toISOString(), to: end?.toISOString() };
}
