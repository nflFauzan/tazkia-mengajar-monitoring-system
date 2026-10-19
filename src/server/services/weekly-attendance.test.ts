import { describe, expect, it } from "vitest";

import {
  AUTO_ALPA_NOTE_PREFIX,
  getIsoWeekRange,
  getWibDate,
  isAutoAlpaNote,
} from "./weekly-attendance";

describe("getIsoWeekRange", () => {
  it("computes the correct Monday to Sunday bounds for a given date", () => {
    // 2026-10-17 is Saturday
    const date = new Date(Date.UTC(2026, 9, 17));
    const range = getIsoWeekRange(date);

    expect(range.weekKey).toBe("2026-W42");
    // Monday 2026-10-12
    expect(range.start.getUTCFullYear()).toBe(2026);
    expect(range.start.getUTCMonth()).toBe(9);
    expect(range.start.getUTCDate()).toBe(12);

    // Sunday 2026-10-18
    expect(range.end.getUTCFullYear()).toBe(2026);
    expect(range.end.getUTCMonth()).toBe(9);
    expect(range.end.getUTCDate()).toBe(18);

    expect(range.label).toContain("12 Okt");
    expect(range.label).toContain("18 Okt 2026");
  });

  it("handles a date on Sunday correctly as the end of the current week", () => {
    // 2026-10-18 is Sunday
    const date = new Date(Date.UTC(2026, 9, 18));
    const range = getIsoWeekRange(date);

    expect(range.weekKey).toBe("2026-W42");
    expect(range.start.getUTCDate()).toBe(12);
    expect(range.end.getUTCDate()).toBe(18);
  });

  it("handles a date on Monday correctly as the start of a new week", () => {
    // 2026-10-19 is Monday
    const date = new Date(Date.UTC(2026, 9, 19));
    const range = getIsoWeekRange(date);

    expect(range.weekKey).toBe("2026-W43");
    expect(range.start.getUTCDate()).toBe(19);
    expect(range.end.getUTCDate()).toBe(25);
  });
});

describe("isAutoAlpaNote", () => {
  it("identifies automated ALPA notes correctly", () => {
    const validNote = `${AUTO_ALPA_NOTE_PREFIX} (12 Okt - 18 Okt 2026)`;
    expect(isAutoAlpaNote(validNote)).toBe(true);
  });

  it("returns false for regular notes or null/undefined", () => {
    expect(isAutoAlpaNote("Sakit flu")).toBe(false);
    expect(isAutoAlpaNote("Alpa tanpa kabar")).toBe(false);
    expect(isAutoAlpaNote(null)).toBe(false);
    expect(isAutoAlpaNote(undefined)).toBe(false);
    expect(isAutoAlpaNote("")).toBe(false);
  });
});

describe("getWibDate", () => {
  it("formats and returns WIB calendar date correctly", () => {
    // 2026-10-19 14:00:00 UTC is 2026-10-19 21:00:00 WIB
    const utcDate = new Date("2026-10-19T14:00:00Z");
    const wib = getWibDate(utcDate);
    expect(wib.getUTCFullYear()).toBe(2026);
    expect(wib.getUTCMonth()).toBe(9);
    expect(wib.getUTCDate()).toBe(19);
  });
});
