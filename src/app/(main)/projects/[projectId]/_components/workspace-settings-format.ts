/** Round the server's decimal money to cents using integers, without floating point arithmetic. */
export function formatWorkspaceMoney(value: string | null) {
  if (value === null || !/^\d+(\.\d{1,6})?$/.test(value)) return "—";
  const [whole, fraction = ""] = value.split(".");
  const micros = BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
  const cents = (micros + BigInt(5_000)) / BigInt(10_000);
  return `$${(cents / BigInt(100)).toLocaleString("en-US")}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}

export function workspaceMonth(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}
