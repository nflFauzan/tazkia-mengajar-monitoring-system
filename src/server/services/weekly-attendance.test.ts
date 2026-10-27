import { describe, expect, it, vi } from "vitest";

import {
  AUTO_ALPA_NOTE_PREFIX,
  getIsoWeekRange,
  getWibDate,
  isAutoAlpaNote,
} from "./weekly-attendance";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    activity: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    teamMember: {
      findMany: vi.fn(),
    },
    activityTeamMember: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

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

describe("syncWeeklyAttendance schedule-aware & libur logic", () => {
  it("exempts Sunday volunteer when Sunday was libur and cleans up false ALPA", async () => {
    const { syncWeeklyAttendance } = await import("./weekly-attendance");
    const { prisma } = await import("@/lib/db/prisma");

    // Evaluation date: Monday 2026-10-26 (Week 43 has completed)
    const evalDate = new Date("2026-10-26T08:00:00Z");

    // Saturday 2026-10-24 had an active activity (sch-1)
    const actSat = {
      id: "act-sat",
      date: new Date(Date.UTC(2026, 9, 24)),
      status: "COMPLETED",
      scheduleId: "sch-1",
      schedule: {
        id: "sch-1",
        locationId: "loc-1",
        teamMembers: [{ teamMemberId: "member-sat-1" }],
      },
      teamMembers: [
        {
          id: "atm-1",
          activityId: "act-sat",
          teamMemberId: "member-sat-1",
          attendance: "HADIR",
          note: null,
        },
        // Old false auto-ALPA for Sunday volunteer from before
        {
          id: "atm-false-alpa",
          activityId: "act-sat",
          teamMemberId: "member-sun-1",
          attendance: "ALPA",
          note: `${AUTO_ALPA_NOTE_PREFIX} (19 Okt - 25 Okt 2026)`,
        },
      ],
    };

    vi.spyOn(prisma.activity, "findMany").mockResolvedValueOnce([actSat] as any);
    vi.spyOn(prisma.activity, "updateMany").mockResolvedValue({ count: 0 });

    vi.spyOn(prisma.teamMember, "findMany").mockResolvedValueOnce([
      {
        id: "member-sat-1",
        fullName: "Sabtu Volunteer",
        createdAt: new Date("2026-01-01"),
        scheduleAssignments: [{ scheduleId: "sch-1" }],
      },
      {
        id: "member-sun-1",
        fullName: "Ahad Volunteer",
        createdAt: new Date("2026-01-01"),
        scheduleAssignments: [{ scheduleId: "sch-2" }],
      },
    ] as any);

    const deleteManySpy = vi
      .spyOn(prisma.activityTeamMember, "deleteMany")
      .mockResolvedValueOnce({ count: 1 });
    const upsertSpy = vi
      .spyOn(prisma.activityTeamMember, "upsert")
      .mockResolvedValue({} as any);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (ops: any) => ops);

    const result = await syncWeeklyAttendance({ now: evalDate });

    // Sunday volunteer's false ALPA on Saturday was purged!
    expect(result.alpaCreated).toBe(0);
    expect(result.alpaRemoved).toBe(1);
    expect(deleteManySpy).toHaveBeenCalledWith({
      where: { id: { in: ["atm-false-alpa"] } },
    });
    // No new ALPA created for Sunday volunteer because Sunday had no active session
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("penalizes Saturday volunteer if they skipped their scheduled session without excuse", async () => {
    const { syncWeeklyAttendance } = await import("./weekly-attendance");
    const { prisma } = await import("@/lib/db/prisma");

    const evalDate = new Date("2026-10-26T08:00:00Z");

    const actSat = {
      id: "act-sat",
      date: new Date(Date.UTC(2026, 9, 24)),
      status: "COMPLETED",
      scheduleId: "sch-1",
      schedule: {
        id: "sch-1",
        locationId: "loc-1",
        teamMembers: [{ teamMemberId: "member-sat-1" }, { teamMemberId: "member-sat-2" }],
      },
      teamMembers: [
        {
          id: "atm-1",
          activityId: "act-sat",
          teamMemberId: "member-sat-1",
          attendance: "HADIR",
          note: null,
        },
      ],
    };

    vi.spyOn(prisma.activity, "findMany").mockResolvedValueOnce([actSat] as any);
    vi.spyOn(prisma.activity, "updateMany").mockResolvedValue({ count: 0 });

    vi.spyOn(prisma.teamMember, "findMany").mockResolvedValueOnce([
      {
        id: "member-sat-1",
        fullName: "Sabtu Volunteer 1",
        createdAt: new Date("2026-01-01"),
        scheduleAssignments: [{ scheduleId: "sch-1" }],
      },
      {
        id: "member-sat-2",
        fullName: "Sabtu Volunteer 2 (Skipped)",
        createdAt: new Date("2026-01-01"),
        scheduleAssignments: [{ scheduleId: "sch-1" }],
      },
    ] as any);

    vi.spyOn(prisma.activityTeamMember, "deleteMany").mockResolvedValue({ count: 0 });
    const upsertSpy = vi
      .spyOn(prisma.activityTeamMember, "upsert")
      .mockResolvedValue({} as any);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (ops: any) => ops);

    const result = await syncWeeklyAttendance({ now: evalDate });

    // member-sat-2 was scheduled for sch-1 and skipped without excuse -> ALPA created
    expect(result.alpaCreated).toBe(1);
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          activityId: "act-sat",
          teamMemberId: "member-sat-2",
          attendance: "ALPA",
        }),
      }),
    );
  });

  it("marks past activities with 0 HADIR as CANCELLED and does not generate ALPA", async () => {
    const { syncWeeklyAttendance } = await import("./weekly-attendance");
    const { prisma } = await import("@/lib/db/prisma");

    const evalDate = new Date("2026-10-26T08:00:00Z");

    // An activity in the past where 0 volunteers attended (everyone was absent/off)
    const emptyAct = {
      id: "act-empty",
      date: new Date(Date.UTC(2026, 9, 25)),
      status: "DRAFT",
      scheduleId: "sch-2",
      schedule: {
        id: "sch-2",
        locationId: "loc-2",
        teamMembers: [{ teamMemberId: "member-sun-1" }],
      },
      teamMembers: [], // 0 volunteers attended
    };

    vi.spyOn(prisma.activity, "findMany").mockResolvedValueOnce([emptyAct] as any);
    const updateManySpy = vi
      .spyOn(prisma.activity, "updateMany")
      .mockResolvedValueOnce({ count: 1 });

    vi.spyOn(prisma.teamMember, "findMany").mockResolvedValueOnce([
      {
        id: "member-sun-1",
        fullName: "Ahad Volunteer",
        createdAt: new Date("2026-01-01"),
        scheduleAssignments: [{ scheduleId: "sch-2" }],
      },
    ] as any);

    vi.spyOn(prisma.activityTeamMember, "deleteMany").mockResolvedValue({ count: 0 });
    const upsertSpy = vi.spyOn(prisma.activityTeamMember, "upsert");
    vi.spyOn(prisma, "$transaction").mockImplementation(async (ops: any) => ops);

    const result = await syncWeeklyAttendance({ now: evalDate });

    // Empty activity was cancelled
    expect(updateManySpy).toHaveBeenCalledWith({
      where: { id: { in: ["act-empty"] } },
      data: { status: "CANCELLED" },
    });
    // No ALPA created because the session was libur
    expect(result.alpaCreated).toBe(0);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("does not penalize volunteers from Location B (Petir) when only Location A (Margajaya) held an activity", async () => {
    const { syncWeeklyAttendance } = await import("./weekly-attendance");
    const { prisma } = await import("@/lib/db/prisma");

    const evalDate = new Date("2026-10-26T08:00:00Z");

    // Margajaya activity created via wizard (scheduleId: null, locationId: loc-margajaya)
    const actMargajaya = {
      id: "act-margajaya",
      locationId: "loc-margajaya",
      date: new Date(Date.UTC(2026, 9, 24)),
      status: "COMPLETED",
      scheduleId: null,
      schedule: null,
      teamMembers: [
        {
          id: "atm-margajaya",
          activityId: "act-margajaya",
          teamMemberId: "member-margajaya",
          attendance: "HADIR",
          note: null,
        },
        // Petir volunteer had a false ALPA placed here
        {
          id: "atm-petir-alpa",
          activityId: "act-margajaya",
          teamMemberId: "member-petir",
          attendance: "ALPA",
          note: "Otomatis ALPA (tidak ada presensi/izin)",
        },
      ],
    };

    vi.spyOn(prisma.activity, "findMany").mockResolvedValueOnce([actMargajaya] as any);
    vi.spyOn(prisma.activity, "updateMany").mockResolvedValue({ count: 0 });

    vi.spyOn(prisma.teamMember, "findMany").mockResolvedValueOnce([
      {
        id: "member-margajaya",
        fullName: "Margajaya Volunteer",
        createdAt: new Date("2026-01-01"),
        scheduleAssignments: [
          {
            scheduleId: "sch-margajaya",
            schedule: { id: "sch-margajaya", locationId: "loc-margajaya" },
          },
        ],
      },
      {
        id: "member-petir",
        fullName: "Petir Volunteer",
        createdAt: new Date("2026-01-01"),
        scheduleAssignments: [
          {
            scheduleId: "sch-petir",
            schedule: { id: "sch-petir", locationId: "loc-petir" },
          },
        ],
      },
    ] as any);

    const deleteManySpy = vi
      .spyOn(prisma.activityTeamMember, "deleteMany")
      .mockResolvedValueOnce({ count: 1 });
    const upsertSpy = vi
      .spyOn(prisma.activityTeamMember, "upsert")
      .mockResolvedValue({} as any);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (ops: any) => ops);

    const result = await syncWeeklyAttendance({ now: evalDate });

    // Petir volunteer is exempt from Margajaya activity, false ALPA removed!
    expect(result.alpaRemoved).toBe(1);
    expect(result.alpaCreated).toBe(0);
    expect(deleteManySpy).toHaveBeenCalledWith({
      where: { id: { in: ["atm-petir-alpa"] } },
    });
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
