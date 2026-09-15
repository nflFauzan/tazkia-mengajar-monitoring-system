import { describe, expect, it } from "vitest";

import {
  buildCalendarGrid,
  expandSchedules,
  toDateKey,
} from "./schedule-occurrences";
import type { RecurringSchedule } from "./schedule-occurrences";

const september2026Start = new Date(Date.UTC(2026, 8, 1));
const october2026Start = new Date(Date.UTC(2026, 9, 1));

function weekly(overrides: Partial<RecurringSchedule> = {}): RecurringSchedule {
  return {
    id: "s1",
    title: "Kelas Anak",
    recurrence: "WEEKLY",
    daysOfWeek: [6], // Saturday
    startDate: new Date(Date.UTC(2026, 0, 10)),
    endDate: null,
    startTime: "13:00",
    endTime: "14:30",
    locationName: "Desa Binaan Margajaya",
    ...overrides,
  };
}

describe("expandSchedules", () => {
  it("produces one occurrence per matching weekday in the range", () => {
    const occurrences = expandSchedules(
      [weekly()],
      september2026Start,
      october2026Start,
    );

    // September 2026 begins on a Tuesday, so its Saturdays are 5, 12, 19, 26.
    expect(occurrences.map((entry) => entry.dateKey)).toEqual([
      "2026-09-05",
      "2026-09-12",
      "2026-09-19",
      "2026-09-26",
    ]);
  });

  it("supports several days per week", () => {
    const occurrences = expandSchedules(
      [weekly({ daysOfWeek: [1, 3] })], // Monday and Wednesday
      september2026Start,
      october2026Start,
    );

    expect(occurrences).toHaveLength(9);
    expect(occurrences[0].dateKey).toBe("2026-09-02");
  });

  it("does not start before the schedule's own start date", () => {
    const occurrences = expandSchedules(
      [weekly({ startDate: new Date(Date.UTC(2026, 8, 15)) })],
      september2026Start,
      october2026Start,
    );

    expect(occurrences.map((entry) => entry.dateKey)).toEqual([
      "2026-09-19",
      "2026-09-26",
    ]);
  });

  it("includes the end date itself and stops after it", () => {
    const occurrences = expandSchedules(
      [weekly({ endDate: new Date(Date.UTC(2026, 8, 12)) })],
      september2026Start,
      october2026Start,
    );

    expect(occurrences.map((entry) => entry.dateKey)).toEqual([
      "2026-09-05",
      "2026-09-12",
    ]);
  });

  it("gives a custom schedule exactly one occurrence, on its start date", () => {
    const occurrences = expandSchedules(
      [
        weekly({
          recurrence: "CUSTOM",
          daysOfWeek: [],
          startDate: new Date(Date.UTC(2026, 8, 17)),
        }),
      ],
      september2026Start,
      october2026Start,
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].dateKey).toBe("2026-09-17");
  });

  it("produces nothing for a weekly schedule with no days selected", () => {
    expect(
      expandSchedules([weekly({ daysOfWeek: [] })], september2026Start, october2026Start),
    ).toEqual([]);
  });

  it("produces nothing when the schedule ended before the range", () => {
    expect(
      expandSchedules(
        [weekly({ endDate: new Date(Date.UTC(2026, 7, 1)) })],
        september2026Start,
        october2026Start,
      ),
    ).toEqual([]);
  });
});

describe("buildCalendarGrid", () => {
  it("always returns six weeks starting on a Sunday", () => {
    const grid = buildCalendarGrid(2026, 8);
    expect(grid).toHaveLength(42);
    expect(grid[0].getUTCDay()).toBe(0);
  });

  it("starts on or before the first of the month", () => {
    const grid = buildCalendarGrid(2026, 8);
    expect(toDateKey(grid[0])).toBe("2026-08-30");
  });
});

describe("toDateKey", () => {
  it("reads the date in UTC so the calendar day never shifts", () => {
    expect(toDateKey(new Date(Date.UTC(2026, 8, 12)))).toBe("2026-09-12");
  });
});
