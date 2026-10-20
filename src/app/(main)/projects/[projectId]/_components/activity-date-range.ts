/** First instant of a calendar day in the project's timezone, including midnight DST transitions. */
export function projectDayBoundary(date: Date, timezone: string, nextDay = false): string {
  // Picker Dates represent calendar dates in the browser; only extract their date parts.
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + (nextDay ? 1 : 0)));
  const targetDay = target.toISOString().slice(0, 10).replaceAll("-", "");
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // Search for the first second whose local calendar date reaches the requested day.
  // Unlike adding 24 hours to a zoned instant, this also handles 23/25-hour days.
  let low = target.getTime() / 1000 - 48 * 60 * 60;
  let high = target.getTime() / 1000 + 48 * 60 * 60;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const parts = formatter.formatToParts(new Date(middle * 1000));
    const day = ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value ?? "").join("");
    if (day < targetDay) low = middle + 1;
    else high = middle;
  }
  return new Date(low * 1000).toISOString();
}
