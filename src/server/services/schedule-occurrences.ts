/**
 * Expands recurring schedules into the dates they fall on within a month.
 *
 * Nothing is persisted: occurrences are derived on demand for the calendar.
 * Materialising them would create rows that look like activities but are not,
 * which is exactly the confusion CLAUDE.md section 15 warns against — a planned
 * date only becomes real when an Activity is recorded for it.
 */

export interface RecurringSchedule {
  id: string;
  title: string;
  recurrence: "WEEKLY" | "CUSTOM";
  daysOfWeek: number[];
  startDate: Date;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  locationName: string;
}

export interface ScheduleOccurrence {
  scheduleId: string;
  title: string;
  /** `YYYY-MM-DD`, the key the calendar groups by. */
  dateKey: string;
  startTime: string;
  endTime: string;
  locationName: string;
}

/** `YYYY-MM-DD` from a UTC-midnight date, without touching local time. */
export function toDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Every occurrence of every schedule that lands inside [monthStart, monthEnd).
 *
 * A CUSTOM schedule has no weekly rhythm, so it contributes a single occurrence
 * on its start date; WEEKLY repeats on each selected weekday until its end date
 * (or forever, if none is set).
 */
export function expandSchedules(
  schedules: RecurringSchedule[],
  monthStart: Date,
  monthEnd: Date,
): ScheduleOccurrence[] {
  const occurrences: ScheduleOccurrence[] = [];

  for (const schedule of schedules) {
    const rangeStart =
      schedule.startDate > monthStart ? schedule.startDate : monthStart;
    const rangeEnd =
      schedule.endDate && schedule.endDate < monthEnd
        ? new Date(schedule.endDate.getTime() + 24 * 60 * 60 * 1000)
        : monthEnd;

    if (rangeStart >= rangeEnd) continue;

    if (schedule.recurrence === "CUSTOM") {
      if (schedule.startDate >= monthStart && schedule.startDate < monthEnd) {
        occurrences.push(toOccurrence(schedule, schedule.startDate));
      }
      continue;
    }

    if (schedule.daysOfWeek.length === 0) continue;

    const days = new Set(schedule.daysOfWeek);

    for (
      let cursor = new Date(rangeStart);
      cursor < rangeEnd;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      if (days.has(cursor.getUTCDay())) {
        occurrences.push(toOccurrence(schedule, cursor));
      }
    }
  }

  return occurrences;
}

function toOccurrence(
  schedule: RecurringSchedule,
  date: Date,
): ScheduleOccurrence {
  return {
    scheduleId: schedule.id,
    title: schedule.title,
    dateKey: toDateKey(date),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    locationName: schedule.locationName,
  };
}

/**
 * The 6x7 grid a month calendar renders, starting on Sunday to match
 * `daysOfWeek` where 0 is Sunday.
 */
export function buildCalendarGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setUTCDate(day.getUTCDate() + index);
    return day;
  });
}
