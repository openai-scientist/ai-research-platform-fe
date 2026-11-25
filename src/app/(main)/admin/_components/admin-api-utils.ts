import { format } from "date-fns";

import type { TimeRangeParams } from "@/lib/api/types";

export const ADMIN_PAGE_SIZE = 20;

export function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US");
}

export function formatTokens(value: number) {
  return value.toLocaleString("en-US");
}

/** 14,140,784 as "14.1M", for places that are short of room. */
export function formatCompactTokens(value: number) {
  return value.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

/** The date format of the Users page ("15 Nov 2026, 6:41 PM"), so every admin screen reads dates the same way. */
export function formatJoinedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "dd MMM yyyy, h:mm a");
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
