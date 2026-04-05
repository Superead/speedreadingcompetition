/**
 * Safely parse a date string — handles Safari's strict date parsing.
 * Safari rejects "2026-04-03 10:33:00" but accepts "2026-04-03T10:33:00".
 */
export function safeDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  // Replace space between date and time with T for Safari compatibility
  const fixed = typeof value === "string" ? value.replace(" ", "T") : value;
  const d = new Date(fixed);
  return isNaN(d.getTime()) ? new Date(0) : d;
}
