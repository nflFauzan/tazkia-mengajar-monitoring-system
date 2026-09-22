import { describe, expect, it, vi } from "vitest";

import {
  calculateHoursUntilStart,
  getActivityStartInstant,
  getWibDateString,
} from "./attendance-self";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    activity: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
    },
  },
}));

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

  describe("strict student attendance gate (HADIR required)", () => {
    it("blocks non-admin if teacher is not marked HADIR in activity", async () => {
      const { getActivityStudentsForAttendance } = await import("./attendance-self");
      const { prisma } = await import("@/lib/db/prisma");

      vi.spyOn(prisma.activity, "findUnique").mockResolvedValueOnce({
        id: "act-1",
        locationId: "loc-1",
        partner: "Mitra A",
        date: new Date("2026-09-23T00:00:00Z"),
        startTime: "08:00",
        endTime: "10:00",
        beneficiaryCount: 0,
        location: { id: "loc-1", name: "Rumah Belajar", partner: "Mitra A" },
        teamMembers: [
          { teamMemberId: "tm-1", attendance: "IZIN" },
        ],
        schedule: null,
      } as never);

      await expect(
        getActivityStudentsForAttendance("act-1", {
          id: "user-1",
          role: "PENGAJAR",
          teamMemberId: "tm-1",
        }),
      ).rejects.toThrow(
        "Anda harus melakukan presensi hadir terlebih dahulu sebelum dapat melihat atau mengisi absensi murid.",
      );
    });

    it("allows non-admin if teacher is marked HADIR in activity", async () => {
      const { getActivityStudentsForAttendance } = await import("./attendance-self");
      const { prisma } = await import("@/lib/db/prisma");

      vi.spyOn(prisma.activity, "findUnique").mockResolvedValueOnce({
        id: "act-1",
        locationId: "loc-1",
        partner: "Mitra A",
        date: new Date("2026-09-23T00:00:00Z"),
        startTime: "08:00",
        endTime: "10:00",
        beneficiaryCount: 0,
        location: { id: "loc-1", name: "Rumah Belajar", partner: "Mitra A" },
        teamMembers: [
          { teamMemberId: "tm-1", attendance: "HADIR" },
        ],
        schedule: null,
      } as never);

      vi.spyOn(prisma.student, "findMany").mockResolvedValueOnce([
        {
          id: "student-1",
          fullName: "Ahmad",
          studentGroup: { id: "grp-1", name: "Kelompok A" },
          attendances: [{ attendance: "HADIR", note: null }],
        },
      ] as never);

      const result = await getActivityStudentsForAttendance("act-1", {
        id: "user-1",
        role: "PENGAJAR",
        teamMemberId: "tm-1",
      });

      expect(result.students).toHaveLength(1);
      expect(result.students[0].fullName).toBe("Ahmad");
    });

    it("allows admin even if not checked in or not in teamMembers", async () => {
      const { getActivityStudentsForAttendance } = await import("./attendance-self");
      const { prisma } = await import("@/lib/db/prisma");

      vi.spyOn(prisma.activity, "findUnique").mockResolvedValueOnce({
        id: "act-1",
        locationId: "loc-1",
        partner: "Mitra A",
        date: new Date("2026-09-23T00:00:00Z"),
        startTime: "08:00",
        endTime: "10:00",
        beneficiaryCount: 0,
        location: { id: "loc-1", name: "Rumah Belajar", partner: "Mitra A" },
        teamMembers: [],
        schedule: null,
      } as never);

      vi.spyOn(prisma.student, "findMany").mockResolvedValueOnce([
        {
          id: "student-1",
          fullName: "Ahmad",
          studentGroup: { id: "grp-1", name: "Kelompok A" },
          attendances: [],
        },
      ] as never);

      const result = await getActivityStudentsForAttendance("act-1", {
        id: "admin-1",
        role: "ADMIN",
        teamMemberId: null,
      });

      expect(result.students).toHaveLength(1);
    });

    it("blocks non-admin from saving student attendance if not HADIR", async () => {
      const { saveStudentAttendanceForSession } = await import("./attendance-self");
      const { prisma } = await import("@/lib/db/prisma");

      vi.spyOn(prisma.activity, "findUnique").mockResolvedValueOnce({
        id: "act-1",
        locationId: "loc-1",
        beneficiaryCount: 0,
        teamMembers: [
          { teamMemberId: "tm-1", attendance: "SAKIT" },
        ],
        schedule: null,
      } as never);

      await expect(
        saveStudentAttendanceForSession(
          "act-1",
          {
            id: "user-1",
            role: "PENGAJAR",
            teamMemberId: "tm-1",
          },
          [{ studentId: "s-1", attendance: "HADIR" }],
        ),
      ).rejects.toThrow(
        "Anda harus melakukan presensi hadir terlebih dahulu sebelum dapat menyimpan absensi murid.",
      );
    });
  });
});
