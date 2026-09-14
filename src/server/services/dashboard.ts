import { prisma } from "@/lib/db/prisma";
import { monthBounds } from "@/lib/dates";

/**
 * Every number the dashboard shows, computed in SQL.
 *
 * All of it is issued inside one `$transaction` so the figures are a consistent
 * snapshot, and so the page makes a single round trip rather than a dozen.
 * Counts and sums are aggregates — no table is ever pulled into memory to be
 * counted in JavaScript.
 */
export interface DashboardStats {
  totalActivities: number;
  activitiesThisMonth: number;
  totalBeneficiaries: number;
  totalTeamMembers: number;
  totalLocations: number;
  /** Percentage of recorded team attendances marked HADIR, or null if none yet. */
  teamAttendanceRate: number | null;
  recentActivities: Array<{
    id: string;
    date: Date;
    status: "DRAFT" | "COMPLETED" | "CANCELLED";
    beneficiaryCount: number;
    locationName: string;
    teamCount: number;
    hasReport: boolean;
  }>;
  upcomingSchedules: Array<{
    id: string;
    title: string;
    locationName: string;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const { start, end } = monthBounds(now);

  const [
    totalActivities,
    activitiesThisMonth,
    beneficiarySum,
    totalTeamMembers,
    totalLocations,
    attendanceTotal,
    presentCount,
    recentRows,
    upcomingRows,
  ] = await prisma.$transaction([
    // Cancelled activities are excluded below: they record that something did
    // not happen, so counting them would overstate the work done.
    prisma.activity.count({ where: { status: { not: "CANCELLED" } } }),

    prisma.activity.count({
      where: {
        status: { not: "CANCELLED" },
        date: { gte: start, lt: end },
      },
    }),

    prisma.activity.aggregate({
      where: { status: "COMPLETED" },
      _sum: { beneficiaryCount: true },
    }),

    prisma.teamMember.count({ where: { isActive: true } }),
    prisma.location.count({ where: { isActive: true } }),

    // Two counts rather than a groupBy: the rate only needs "present" over
    // "recorded", and groupBy would return every status just to have most of
    // them discarded.
    prisma.activityTeamMember.count({
      where: { activity: { status: "COMPLETED" } },
    }),
    prisma.activityTeamMember.count({
      where: { activity: { status: "COMPLETED" }, attendance: "HADIR" },
    }),

    prisma.activity.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true,
        date: true,
        status: true,
        beneficiaryCount: true,
        location: { select: { name: true } },
        report: { select: { id: true } },
        _count: { select: { teamMembers: true } },
      },
    }),

    prisma.schedule.findMany({
      where: {
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        daysOfWeek: true,
        startTime: true,
        endTime: true,
        location: { select: { name: true } },
      },
    }),
  ]);

  return {
    totalActivities,
    activitiesThisMonth,
    totalBeneficiaries: beneficiarySum._sum.beneficiaryCount ?? 0,
    totalTeamMembers,
    totalLocations,
    // null rather than 0 when nothing is recorded: "no data yet" and "nobody
    // showed up" are different facts and must not look identical.
    teamAttendanceRate:
      attendanceTotal === 0
        ? null
        : Math.round((presentCount / attendanceTotal) * 100),
    recentActivities: recentRows.map((row) => ({
      id: row.id,
      date: row.date,
      status: row.status,
      beneficiaryCount: row.beneficiaryCount,
      locationName: row.location.name,
      teamCount: row._count.teamMembers,
      hasReport: row.report !== null,
    })),
    upcomingSchedules: upcomingRows.map((row) => ({
      id: row.id,
      title: row.title,
      locationName: row.location.name,
      daysOfWeek: row.daysOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
    })),
  };
}
