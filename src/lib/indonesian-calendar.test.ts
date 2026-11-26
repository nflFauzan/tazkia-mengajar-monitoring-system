import { describe, expect, it } from "vitest";
import {
  getIndonesianEventsForMonth,
  getIndonesianEventsForYear,
  getUpcomingIndonesianEvents,
} from "./indonesian-calendar";

describe("Indonesian Calendar Events", () => {
  it("includes fixed annual national events", () => {
    const events2026 = getIndonesianEventsForYear(2026);
    const hardiknas = events2026.find((e) => e.name.includes("Pendidikan Nasional"));
    const hariGuru = events2026.find((e) => e.name.includes("Guru Nasional"));
    const kemerdekaan = events2026.find((e) => e.name.includes("Kemerdekaan RI"));

    expect(hardiknas).toBeDefined();
    expect(hardiknas?.dateKey).toBe("2026-05-02");

    expect(hariGuru).toBeDefined();
    expect(hariGuru?.dateKey).toBe("2026-11-25");

    expect(kemerdekaan).toBeDefined();
    expect(kemerdekaan?.dateKey).toBe("2026-08-17");
    expect(kemerdekaan?.isHoliday).toBe(true);
  });

  it("filters events for a specific month", () => {
    // Mei = month index 4
    const meiEvents = getIndonesianEventsForMonth(2026, 4);
    expect(meiEvents.some((e) => e.name.includes("Pendidikan Nasional"))).toBe(true);
    expect(meiEvents.every((e) => e.dateKey.startsWith("2026-05"))).toBe(true);
  });

  it("calculates upcoming events with days remaining", () => {
    // 2026-11-22 -> 3 days before Hari Guru (2026-11-25)
    const testDate = new Date(2026, 10, 22); // Month index 10 = Nov
    const upcoming = getUpcomingIndonesianEvents(testDate, 7);

    const guru = upcoming.find((e) => e.name.includes("Guru Nasional"));
    expect(guru).toBeDefined();
    expect(guru?.daysRemaining).toBe(3);
  });
});
