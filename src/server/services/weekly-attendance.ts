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
  return note.startsWith(AUTO_ALPA_NOTE_PREFIX);
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
  }

  // 2. Fetch all active team members
  const activeMembers = await prisma.teamMember.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      createdAt: true,
      scheduleAssignments: { select: { scheduleId: true } },
    },
  });

  if (activeMembers.length === 0) {
    return { weeksEvaluated: 0, alpaCreated: 0, alpaRemoved: 0 };
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

  const deleteIds: string[] = [];

  // Purge any auto-ALPA on empty/libur activities
  for (const emptyAct of emptyPastActivities) {
    for (const tm of emptyAct.teamMembers) {
      if (tm.attendance === "ALPA" && isAutoAlpaNote(tm.note)) {
        deleteIds.push(tm.id);
      }
    }
  }

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
          if (tm.attendance === "ALPA" && isAutoAlpaNote(tm.note)) {
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

      // Collect all attendances for this member in this week
      const memberAttendances = weekActivities.flatMap((act) =>
        act.teamMembers.filter((tm) => tm.teamMemberId === member.id),
      );

      const hasHadir = memberAttendances.some((tm) => tm.attendance === "HADIR");
      const hasExcused = memberAttendances.some(
        (tm) => tm.attendance === "IZIN" || tm.attendance === "SAKIT",
      );

      // Assigned schedules for this member
      const assignedScheduleIds = new Set(
        member.scheduleAssignments.map((sa) => sa.scheduleId),
      );

      // Active activities in this week matching member's assigned schedules
      const memberActiveActivities = weekActiveActivities.filter(
        (act) =>
          (act.scheduleId && assignedScheduleIds.has(act.scheduleId)) ||
          act.schedule?.teamMembers.some((tm) => tm.teamMemberId === member.id),
      );

      const hasSpecificSchedules =
        assignedScheduleIds.size > 0 ||
        weekActivities.some((act) =>
          act.schedule?.teamMembers.some((tm) => tm.teamMemberId === member.id),
        );

      // Schedule-Aware Exemption:
      // If the member is assigned to specific schedule(s), but none of those schedules
      // held an active session this week (e.g. Day 2 was libur), the member is exempt!
      if (hasSpecificSchedules && memberActiveActivities.length === 0) {
        const obsoleteAutoAlpas = memberAttendances.filter(
          (tm) => tm.attendance === "ALPA" && isAutoAlpaNote(tm.note),
        );
        for (const alpa of obsoleteAutoAlpas) {
          deleteIds.push(alpa.id);
        }
        continue;
      }

      // If the member has NO specific schedule assigned (open volunteer):
      // Only evaluate if there was an open activity (schedule with 0 assigned members)
      if (!hasSpecificSchedules) {
        const openActiveActivities = weekActiveActivities.filter(
          (act) => !act.schedule || act.schedule.teamMembers.length === 0,
        );
        if (openActiveActivities.length === 0) {
          const obsoleteAutoAlpas = memberAttendances.filter(
            (tm) => tm.attendance === "ALPA" && isAutoAlpaNote(tm.note),
          );
          for (const alpa of obsoleteAutoAlpas) {
            deleteIds.push(alpa.id);
          }
          continue;
        }
      }

      if (hasHadir || hasExcused) {
        // If the member fulfilled the weekly duty or had an excuse,
        // remove any auto-generated ALPA that might have been created previously.
        const obsoleteAutoAlpas = memberAttendances.filter(
          (tm) => tm.attendance === "ALPA" && isAutoAlpaNote(tm.note),
        );
        for (const alpa of obsoleteAutoAlpas) {
          deleteIds.push(alpa.id);
        }
      } else {
        // Member did not attend and was not excused in this entire week
        const existingAlpas = memberAttendances.filter(
          (tm) => tm.attendance === "ALPA",
        );

        if (existingAlpas.length === 0) {
          // Choose the most appropriate active activity to record ALPA on:
          // Priority 1: Activity matching member's assigned schedule
          // Priority 2: Open activity
          // Priority 3: First active activity of the week
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
          // If there are multiple auto-ALPAs in the same week, keep the first and delete duplicates
          const autoAlpas = existingAlpas.filter((tm) => isAutoAlpaNote(tm.note));
          if (autoAlpas.length > 1) {
            for (let i = 1; i < autoAlpas.length; i++) {
              deleteIds.push(autoAlpas[i].id);
            }
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
