import { describe, expect, it } from "vitest";

import {
  calculateHoursUntilStart,
  getActivityStartInstant,
  getWibDateString,
} from "./attendance-self";

describe("attendance-self service logic", () => {
  it("formats date in WIB timezone (Asia/Jakarta)", () => {
    // 2026-09-22T01:00:00Z is 2026-09-22T08:00:00 in WIB (UTC+7)
    const utcMorning = new Date("2026-09-22T01:00:00Z");
    expect(getWibDateString(utcMorning)).toBe("2026-09-22");

    // 2026-09-22T18:00:00Z is 2026-09-23T01:00:00 in WIB (UTC+7)
    const utcNight = new Date("2026-09-22T18:00:00Z");
    expect(getWibDateString(utcNight)).toBe("2026-09-23");
  });

  it("constructs correct activity start instant with WIB (+07:00)", () => {
    const instant = getActivityStartInstant("2026-09-22", "14:00");
    // 14:00 WIB = 07:00 UTC
    expect(instant.toISOString()).toBe("2026-09-22T07:00:00.000Z");
  });

  it("correctly calculates hours until activity start", () => {
    // Activity starts at 2026-09-22 14:00 WIB (07:00 UTC)
    // 1. Current time is 08:00 WIB (01:00 UTC) -> 6 hours before start
    const sixHoursBefore = new Date("2026-09-22T01:00:00Z");
    const hours1 = calculateHoursUntilStart(
      "2026-09-22",
      "14:00",
      sixHoursBefore,
    );
    expect(hours1).toBeCloseTo(6, 1);
    expect(hours1 >= 5).toBe(true); // Can request izin

    // 2. Current time is 10:00 WIB (03:00 UTC) -> 4 hours before start
    const fourHoursBefore = new Date("2026-09-22T03:00:00Z");
    const hours2 = calculateHoursUntilStart(
      "2026-09-22",
      "14:00",
      fourHoursBefore,
    );
    expect(hours2).toBeCloseTo(4, 1);
    expect(hours2 >= 5).toBe(false); // Cannot request izin (less than 5 hours)

    // 3. Current time is 15:00 WIB (08:00 UTC) -> 1 hour after start (past)
    const afterStart = new Date("2026-09-22T08:00:00Z");
    const hours3 = calculateHoursUntilStart("2026-09-22", "14:00", afterStart);
    expect(hours3).toBeLessThan(0);
    expect(hours3 >= 5).toBe(false);
  });

  it("throws error on invalid session key format", async () => {
    const { getActivityStudentsForAttendance, saveStudentAttendanceForSession } =
      await import("./attendance-self");

    await expect(
      getActivityStudentsForAttendance("invalid-key", {
        id: "user-1",
        role: "PENGAJAR",
        teamMemberId: "tm-1",
      }),
    ).rejects.toThrow("Format sesi tidak valid.");

    await expect(
      saveStudentAttendanceForSession(
        "invalid-key",
        {
          id: "user-1",
          role: "PENGAJAR",
          teamMemberId: "tm-1",
        },
        [],
      ),
    ).rejects.toThrow("Format sesi tidak valid.");
  });
});
