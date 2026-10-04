import type { Automation, Frequency } from "./model";

export const SNAPSHOT = "2026-09-27T12:00:00Z";
export const SCHEDULE_ANCHOR = "2026-12-01";
export const isISODate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
  new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
/** Calendar dates deliberately use UTC midday; a day remains a day across DST. */
export function addDays(date: string, days: number): string {
  if (!isISODate(date) || !Number.isInteger(days))
    throw new Error(
      "A valid calendar date and whole number of days are required.",
    );
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function addMonths(date: string, months: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + months);
  const end = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
  ).getUTCDate();
  value.setUTCDate(Math.min(day, end));
  return value.toISOString().slice(0, 10);
}
export function nextOccurrence(date: string, frequency: Frequency): string {
  return frequency === "Monthly"
    ? addMonths(date, 1)
    : addDays(date, Number.parseInt(frequency, 10) * 7);
}
export function monthCells(month: string): (string | null)[] {
  const first = `${month.slice(0, 7)}-01`;
  if (!isISODate(first)) return [];
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const cells: (string | null)[] = Array(weekday).fill(null);
  for (
    let date = first;
    date.slice(0, 7) === first.slice(0, 7);
    date = addDays(date, 1)
  )
    cells.push(date);
  while (cells.length % 7) cells.push(null);
  return cells;
}
function zonedParts(
  instant: string | Date,
  timezone: string,
): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}
/** Converts a merchant wall-clock time to an instant. DST gaps roll forward by one hour. */
export function zonedDateTime(
  date: string,
  time: string,
  timezone: string,
): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = wall;
  for (let count = 0; count < 4; count++) {
    const parts = zonedParts(new Date(candidate), timezone);
    const actual = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    if (actual === wall) return new Date(candidate).toISOString();
    candidate += wall - actual;
  }
  // Nonexistent 02:xx spring-forward wall time becomes 03:xx rather than moving backward.
  const options = [candidate, candidate + 3600000, candidate - 3600000];
  return new Date(
    options
      .filter((value) => {
        const p = zonedParts(new Date(value), timezone);
        return (
          p.year === year &&
          p.month === month &&
          p.day === day &&
          p.hour >= hour
        );
      })
      .sort((a, b) => a - b)[0] ?? candidate,
  ).toISOString();
}
export function nextAutomationRun(
  automation: Automation,
  now = SNAPSHOT,
): string | null {
  if (automation.status === "Paused" || automation.cadence === "On trigger")
    return null;
  const p = zonedParts(now, automation.timezone);
  let date = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  for (let index = 0; index < 63; index++, date = addDays(date, 1)) {
    const d = new Date(`${date}T12:00:00Z`);
    const lastDay = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const matches =
      automation.cadence === "Daily" ||
      (automation.cadence === "Weekly" && d.getUTCDay() === automation.day) ||
      (automation.cadence === "Monthly" &&
        d.getUTCDate() === Math.min(automation.day, lastDay));
    if (matches) {
      const run = zonedDateTime(date, automation.time, automation.timezone);
      if (run > now) return run;
    }
  }
  return null;
}
