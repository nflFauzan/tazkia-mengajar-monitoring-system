import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Columns declared `@db.Date` come back from Prisma as a Date pinned to UTC
 * midnight. Formatting one directly with local-time getters shifts the calendar
 * day backwards for anyone west of UTC, so every formatter here first rebuilds
 * the value as local midnight of the same calendar day.
 */
export function toCalendarDate(value: Date): Date {
  return new Date(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

/**
 * Turns a calendar date into the UTC-midnight Date that Postgres stores for a
 * `@db.Date` column. The inverse of {@link toCalendarDate}.
 */
export function toStorageDate(value: Date): Date {
  return new Date(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
  );
}

/** Parses a `YYYY-MM-DD` form value into a storage-ready date. */
export function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formats a date as `YYYY-MM-DD` for use as an `<input type="date">` value. */
export function toDateInputValue(value: Date): string {
  return format(toCalendarDate(value), "yyyy-MM-dd");
}

/** "Sabtu" — the day name used by the report template. */
export function formatHari(value: Date): string {
  return format(toCalendarDate(value), "EEEE", { locale: id });
}

/** "12 September 2026" — the date used by the report template. */
export function formatTanggal(value: Date): string {
  return format(toCalendarDate(value), "d MMMM yyyy", { locale: id });
}

/** "Sabtu, 12 September 2026" */
export function formatHariTanggal(value: Date): string {
  return `${formatHari(value)}, ${formatTanggal(value)}`;
}

/** "12 Sep 2026" — compact form for tables. */
export function formatTanggalSingkat(value: Date): string {
  return format(toCalendarDate(value), "d MMM yyyy", { locale: id });
}

/** "13.00 - 14.30 WIB" */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime} WIB`;
}

/** Day names indexed the way `Schedule.daysOfWeek` stores them (0 = Sunday). */
export const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

/** "Senin, Rabu, Sabtu" from `[1, 3, 6]`. */
export function formatDaysOfWeek(days: number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => DAY_NAMES[day] ?? "?")
    .join(", ");
}

/** First and last instant of the month containing `reference`, in UTC. */
export function monthBounds(reference: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1),
  );
  return { start, end };
}
