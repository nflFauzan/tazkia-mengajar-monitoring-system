import {
  endOfISOWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
} from "date-fns";
import { id } from "date-fns/locale";

import { toCalendarDate } from "@/lib/dates";

export const AUTO_ALPA_NOTE_PREFIX = "Otomatis ALPA: Tidak mengikuti kegiatan mengajar pekan ini";

export function isAutoAlpaNote(note: string | null | undefined): boolean {
  if (!note) return false;
  return (
    note.startsWith("Otomatis ALPA") ||
    note.includes("Otomatis ALPA") ||
    note.toLowerCase().includes("alpa mingguan") ||
    note.toLowerCase().includes("otomatis alpa")
  );
}

export interface IsoWeekRange {
  weekKey: string;
  start: Date;
  end: Date;
  label: string;
}

/**
 * Returns the Monday-Sunday week bounds and display label for a calendar date.
 * Pinned to UTC midnight calendar days matching how `@db.Date` is stored.
 */
export function getIsoWeekRange(date: Date): IsoWeekRange {
  const cal = toCalendarDate(date);
  const weekStart = startOfISOWeek(cal);
  const weekEnd = endOfISOWeek(cal);

  const startUtc = new Date(
    Date.UTC(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate(),
    ),
  );
  const endUtc = new Date(
    Date.UTC(
      weekEnd.getFullYear(),
      weekEnd.getMonth(),
      weekEnd.getDate(),
    ),
  );

  const year = getISOWeekYear(cal);
  const weekNumber = getISOWeek(cal);
  const weekKey = `${year}-W${String(weekNumber).padStart(2, "0")}`;

  const label = `${format(weekStart, "d MMM", { locale: id })} - ${format(
    weekEnd,
    "d MMM yyyy",
    { locale: id },
  )}`;

  return {
    weekKey,
    start: startUtc,
    end: endUtc,
    label,
  };
}

export function getWibDate(date: Date = new Date()): Date {
  const wibStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(date);
  const [year, month, day] = wibStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export interface SyncWeeklyAttendanceResult {
  weeksEvaluated: number;
  alpaCreated: number;
  alpaRemoved: number;
}

/**
 * Synchronizes weekly attendance across all past activities.
 *
 * Rule:
 * In every completed/past week where teaching activities occurred,
 * every active team member is expected to attend at least one session.
 * If a team member has no HADIR and no valid IZIN/SAKIT in that week,
 * they receive exactly one ALPA record for that week.
 *
 * This function is idempotent, safe to run frequently, and requires
 * no user login.
 */
export async function syncWeeklyAttendance(options?: {
  now?: Date;
}): Promise<SyncWeeklyAttendanceResult> {
  const { prisma } = await import("@/lib/db/prisma");
  const now = options?.now ?? new Date();
  const todayWib = getWibDate(now);

  // 1. Fetch all past, non-cancelled activities
  const activities = await prisma.activity.findMany({
    where: {
      status: { not: "CANCELLED" },
      date: { lt: todayWib },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      schedule: {
        select: {
          id: true,
          locationId: true,
          teamMembers: { select: { teamMemberId: true } },
        },
      },
      teamMembers: {
        select: {
          id: true,
          activityId: true,
          teamMemberId: true,
          attendance: true,
          note: true,
        },
      },
    },
  });

  if (activities.length === 0) {
    return { weeksEvaluated: 0, alpaCreated: 0, alpaRemoved: 0 };
  }

  const deleteIds: string[] = [];

  // Purge any auto-ALPA on activities that are already CANCELLED (libur / dibatalkan)
  const cancelledAlpas = await prisma.activityTeamMember.findMany({
    where: {
      activity: { status: "CANCELLED" },
      attendance: "ALPA",
    },
    select: { id: true, note: true },
  });
  for (const row of cancelledAlpas) {
    if (isAutoAlpaNote(row.note) || !row.note) {
      deleteIds.push(row.id);
    }
  }

  // Identify past activities where 0 volunteers were HADIR (empty / libur sessions).
  // Sesi mengajar tanpa presensi hadir relawan dianggap libur dan tidak boleh memicu ALPA.
  const emptyPastActivities = activities.filter(
    (act) => !act.teamMembers.some((tm) => tm.attendance === "HADIR"),
  );

  if (emptyPastActivities.length > 0) {
    const emptyIds = emptyPastActivities.map((a) => a.id);
    await prisma.activity.updateMany({
      where: { id: { in: emptyIds } },
      data: { status: "CANCELLED" },
    });
    for (const emptyAct of emptyPastActivities) {
      for (const tm of emptyAct.teamMembers) {
        if (tm.attendance === "ALPA" && (isAutoAlpaNote(tm.note) || !tm.note)) {
          deleteIds.push(tm.id);
        }
      }
    }
  }

  // 2. Fetch all active team members
  const activeMembers = await prisma.teamMember.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      locationId: true,
      createdAt: true,
      scheduleAssignments: {
        select: {
          scheduleId: true,
          schedule: {
            select: {
              id: true,
              locationId: true,
            },
          },
        },
      },
    },
  });

  if (activeMembers.length === 0) {
    if (deleteIds.length > 0) {
      await prisma.activityTeamMember.deleteMany({
        where: { id: { in: deleteIds } },
      });
    }
    return { weeksEvaluated: 0, alpaCreated: 0, alpaRemoved: deleteIds.length };
  }

  // 3. Group past activities by ISO week
  const weekMap = new Map<
    string,
    {
      range: IsoWeekRange;
      activities: typeof activities;
    }
  >();

  for (const act of activities) {
    const range = getIsoWeekRange(act.date);
    const existing = weekMap.get(range.weekKey);
    if (existing) {
      existing.activities.push(act);
    } else {
      weekMap.set(range.weekKey, {
        range,
        activities: [act],
      });
    }
  }

  const creates: Array<{
    activityId: string;
    teamMemberId: string;
    attendance: "ALPA";
    note: string;
  }> = [];

  // 4. Evaluate each week
  for (const { range, activities: weekActivities } of weekMap.values()) {
    // Only evaluate weeks that are strictly past (Sunday has passed relative to todayWib)
    // or all activities in that week are in the past.
    // If today is Monday or later relative to the week's Sunday:
    const isWeekFinished = range.end < todayWib;
    if (!isWeekFinished) {
      continue;
    }

    // Active activities in this week: not CANCELLED and at least 1 volunteer HADIR
    const weekActiveActivities = weekActivities.filter(
      (act) =>
        act.status !== "CANCELLED" &&
        !emptyPastActivities.some((e) => e.id === act.id) &&
        act.teamMembers.some((tm) => tm.attendance === "HADIR"),
    );

    // If no active teaching sessions happened in this week, the entire week was libur
    if (weekActiveActivities.length === 0) {
      for (const act of weekActivities) {
        for (const tm of act.teamMembers) {
          if (tm.attendance === "ALPA" && (isAutoAlpaNote(tm.note) || !tm.note)) {
            deleteIds.push(tm.id);
          }
        }
      }
      continue;
    }

    const noteText = `${AUTO_ALPA_NOTE_PREFIX} (${range.label})`;

    for (const member of activeMembers) {
      // If the member joined after this week ended, do not evaluate
      if (member.createdAt > range.end) {
        continue;
      }

      // Collect all attendances for this member in this week across ALL activities
      const memberAttendances = weekActivities.flatMap((act) =>
        act.teamMembers.filter((tm) => tm.teamMemberId === member.id),
      );

      const hasHadir = memberAttendances.some((tm) => tm.attendance === "HADIR");
      const hasExcused = memberAttendances.some(
        (tm) => tm.attendance === "IZIN" || tm.attendance === "SAKIT",
      );

      // Rule 1: Cross-location attendance or excuse satisfies the weekly duty!
      // "saya adalah petugas relawan di petir, saya boleh ikut kegiatan di margajaya juga.
      // jadi ketika saya ikut kegiatan di margajaya saya tidak harus mengikuti kegiatan di petir
      // padahal saya relawan petir."
      if (hasHadir || hasExcused) {
        const obsoleteAutoAlpas = memberAttendances.filter(
          (tm) => tm.attendance === "ALPA" && (isAutoAlpaNote(tm.note) || !tm.note),
        );
        for (const alpa of obsoleteAutoAlpas) {
          deleteIds.push(alpa.id);
        }
        continue;
      }

      // Collect assigned schedule IDs and location IDs for this member
      const assignedScheduleIds = new Set(
        member.scheduleAssignments.map((sa) => sa.scheduleId),
      );
      const assignedLocationIds = new Set(
        member.scheduleAssignments
          .map((sa) => sa.schedule?.locationId)
          .filter((locId): locId is string => Boolean(locId)),
      );
      if (member.locationId) {
        assignedLocationIds.add(member.locationId);
      }

      // Active activities in this week matching member's assigned location or schedules
      const memberActiveActivities = weekActiveActivities.filter((act) => {
        if (member.locationId) {
          return act.locationId === member.locationId;
        }
        if (act.scheduleId && assignedScheduleIds.has(act.scheduleId)) return true;
        if (act.schedule?.teamMembers.some((tm) => tm.teamMemberId === member.id)) return true;
        if (assignedLocationIds.size > 0 && assignedLocationIds.has(act.locationId)) return true;
        return false;
      });

      const hasSpecificAssignment =
        Boolean(member.locationId) ||
        assignedScheduleIds.size > 0 ||
        assignedLocationIds.size > 0 ||
        weekActivities.some((act) =>
          act.schedule?.teamMembers.some((tm) => tm.teamMemberId === member.id),
        );

      // Rule 2: If the member has an assigned location or schedule, but no active session
      // took place there this week (0 volunteers HADIR or session was libur):
      // "tetapi ketika kegiatan itu tidak berlangsung maka kegiatan tersebut di anggap libur"
      // The member is on LIBUR and must NEVER receive ALPA!
      if (hasSpecificAssignment && memberActiveActivities.length === 0) {
        const obsoleteAutoAlpas = memberAttendances.filter(
          (tm) => tm.attendance === "ALPA" && (isAutoAlpaNote(tm.note) || !tm.note),
        );
        for (const alpa of obsoleteAutoAlpas) {
          deleteIds.push(alpa.id);
        }
        continue;
      }

      // Rule 3: If the member has NO specific location or schedule assigned (open volunteer):
      // Only evaluate if there was an open activity this week.
      if (!hasSpecificAssignment) {
        const openActiveActivities = weekActiveActivities.filter(
          (act) => !act.schedule || act.schedule.teamMembers.length === 0,
        );
        if (openActiveActivities.length === 0) {
          const obsoleteAutoAlpas = memberAttendances.filter(
            (tm) => tm.attendance === "ALPA" && (isAutoAlpaNote(tm.note) || !tm.note),
          );
          for (const alpa of obsoleteAutoAlpas) {
            deleteIds.push(alpa.id);
          }
          continue;
        }
      }

      // Rule 4: Member did not attend anywhere, their assigned location held an active session,
      // and member has no valid excuse (izin/sakit) -> Record ALPA on THEIR assigned session.
      // "tapi kalau saya tidak ikut di margajaya saya wajib ikut kegiatan di petir.
      // ketika saya di petir tidak hadir maka alpa."
      const existingAlpas = memberAttendances.filter(
        (tm) => tm.attendance === "ALPA",
      );

      if (existingAlpas.length === 0) {
        const targetActivity =
          memberActiveActivities[0] ??
          weekActiveActivities.find(
            (act) => !act.schedule || act.schedule.teamMembers.length === 0,
          ) ??
          weekActiveActivities[0];

        creates.push({
          activityId: targetActivity.id,
          teamMemberId: member.id,
          attendance: "ALPA",
          note: noteText,
        });
      } else if (existingAlpas.length > 1) {
        // If there are duplicate auto-ALPAs in the same week, keep the first and delete duplicates
        const autoAlpas = existingAlpas.filter((tm) => isAutoAlpaNote(tm.note));
        if (autoAlpas.length > 1) {
          for (let i = 1; i < autoAlpas.length; i++) {
            deleteIds.push(autoAlpas[i].id);
          }
        }
      }
    }
  }

  // 5. Apply changes in database
  let alpaCreated = 0;
  let alpaRemoved = 0;

  if (deleteIds.length > 0 || creates.length > 0) {
    await prisma.$transaction([
      ...(deleteIds.length > 0
        ? [
            prisma.activityTeamMember.deleteMany({
              where: { id: { in: deleteIds } },
            }),
          ]
        : []),
      ...creates.map((c) =>
        prisma.activityTeamMember.upsert({
          where: {
            activityId_teamMemberId: {
              activityId: c.activityId,
              teamMemberId: c.teamMemberId,
            },
          },
          create: {
            activityId: c.activityId,
            teamMemberId: c.teamMemberId,
            attendance: c.attendance,
            note: c.note,
          },
          update: {
            attendance: c.attendance,
            note: c.note,
          },
        }),
      ),
    ]);

    alpaCreated = creates.length;
    alpaRemoved = deleteIds.length;
  }

  return {
    weeksEvaluated: weekMap.size,
    alpaCreated,
    alpaRemoved,
  };
}
