import { toDateInputValue } from "@/lib/dates";

export interface PengajarSession {
  key: string;
  activityId: string | null;
  scheduleId: string | null;
  title: string;
  locationName: string;
  partner: string;
  date: Date;
  dateStr: string;
  startTime: string;
  endTime: string;
  currentAttendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA" | null;
  checkedInAt: Date | null;
  note: string | null;
  isToday: boolean;
  canCheckInHadir: boolean;
  canRequestIzin: boolean;
  hoursUntilStart: number;
  appealStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  appealReason?: string | null;
  appealAdminNote?: string | null;
  studentAttendanceCount?: number;
}

export function getWibDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function getActivityStartInstant(
  dateStr: string,
  startTime: string,
): Date {
  const paddedTime = startTime.padStart(5, "0");
  return new Date(`${dateStr}T${paddedTime}:00+07:00`);
}

export function calculateHoursUntilStart(
  dateStr: string,
  startTime: string,
  now: Date = new Date(),
): number {
  const startInstant = getActivityStartInstant(dateStr, startTime);
  const diffMs = startInstant.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

export async function getPengajarAttendanceSessions(
  teamMemberId: string,
): Promise<{
  todaySessions: PengajarSession[];
  upcomingSessions: PengajarSession[];
  recentHistory: Array<{
    id: string;
    date: Date;
    locationName: string;
    startTime: string;
    endTime: string;
    attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
    checkedInAt: Date | null;
    note: string | null;
  }>;
}> {
  const { prisma } = await import("@/lib/db/prisma");
  const now = new Date();
  const todayStr = getWibDateString(now);
  const todayDate = new Date(`${todayStr}T00:00:00Z`);

  // 1. Fetch activities where this team member is assigned or recorded
  const activities = await prisma.activity.findMany({
    where: {
      date: { gte: todayDate },
      status: { not: "CANCELLED" },
      OR: [
        { teamMembers: { some: { teamMemberId } } },
        {
          schedule: {
            teamMembers: { some: { teamMemberId } },
          },
        },
        {
          schedule: {
            teamMembers: { none: {} },
          },
        },
      ],
    },
    include: {
      location: { select: { name: true } },
      teamMembers: {
        where: { teamMemberId },
        select: {
          attendance: true,
          checkedInAt: true,
          note: true,
        },
      },
      _count: {
        select: {
          students: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const sessions: PengajarSession[] = [];
  const coveredActivityIds = new Set<string>();

  for (const act of activities) {
    coveredActivityIds.add(act.id);
    const dateStr = toDateInputValue(act.date);
    const isToday = dateStr === todayStr;
    const hoursUntilStart = calculateHoursUntilStart(dateStr, act.startTime, now);
    const teamRecord = act.teamMembers[0] ?? null;

    sessions.push({
      key: `act-${act.id}`,
      activityId: act.id,
      scheduleId: act.scheduleId,
      title: `Kegiatan ${act.location.name}`,
      locationName: act.location.name,
      partner: act.partner,
      date: act.date,
      dateStr,
      startTime: act.startTime,
      endTime: act.endTime,
      currentAttendance: teamRecord?.attendance ?? null,
      checkedInAt: teamRecord?.checkedInAt ?? null,
      note: teamRecord?.note ?? null,
      isToday,
      canCheckInHadir: isToday,
      canRequestIzin: hoursUntilStart >= 5,
      hoursUntilStart,
      studentAttendanceCount: act._count.students,
    });
  }

  // 2. Check schedules where this team member is assigned OR open schedules (0 team members assigned)
  const memberSchedules = await prisma.schedule.findMany({
    where: {
      isActive: true,
      OR: [
        { teamMembers: { some: { teamMemberId } } },
        { teamMembers: { none: {} } },
      ],
    },
    include: {
      location: { select: { name: true, partner: true } },
    },
  });

  const todayDayOfWeek = todayDate.getUTCDay();

  // A. Check if any schedule occurs TODAY and isn't covered by an existing activity
  for (const sch of memberSchedules) {
    let occursToday = false;

    if (sch.recurrence === "WEEKLY") {
      const isDayMatch = sch.daysOfWeek.includes(todayDayOfWeek);
      const isDateValid =
        sch.startDate <= todayDate &&
        (sch.endDate === null || sch.endDate >= todayDate);
      occursToday = isDayMatch && isDateValid;
    } else if (sch.recurrence === "CUSTOM") {
      const isDateValid =
        sch.startDate <= todayDate &&
        (sch.endDate === null
          ? toDateInputValue(sch.startDate) === todayStr
          : sch.endDate >= todayDate);
      occursToday = isDateValid;
    }

    if (occursToday) {
      const alreadyCovered = activities.some(
        (a) => a.scheduleId === sch.id && toDateInputValue(a.date) === todayStr,
      );
      if (!alreadyCovered) {
        const hoursUntilStart = calculateHoursUntilStart(
          todayStr,
          sch.startTime,
          now,
        );
        sessions.push({
          key: `sch-${sch.id}-${todayStr}`,
          activityId: null,
          scheduleId: sch.id,
          title: sch.title,
          locationName: sch.location.name,
          partner: sch.location.partner,
          date: todayDate,
          dateStr: todayStr,
          startTime: sch.startTime,
          endTime: sch.endTime,
          currentAttendance: null,
          checkedInAt: null,
          note: null,
          isToday: true,
          canCheckInHadir: true,
          canRequestIzin: hoursUntilStart >= 5,
          hoursUntilStart,
          studentAttendanceCount: 0,
        });
      }
    }
  }

  // B. Also expand upcoming schedule occurrences for the next 14 days
  const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);
  const futureEnd = new Date(todayDate.getTime() + 15 * 24 * 60 * 60 * 1000);

  const { expandSchedules } = await import("./schedule-occurrences");
  const upcomingOccurrences = expandSchedules(
    memberSchedules.map((s) => ({
      id: s.id,
      title: s.title,
      recurrence: s.recurrence,
      daysOfWeek: s.daysOfWeek,
      startDate: s.startDate,
      endDate: s.endDate,
      startTime: s.startTime,
      endTime: s.endTime,
      locationName: s.location.name,
    })),
    tomorrowDate,
    futureEnd,
  );

  for (const occ of upcomingOccurrences) {
    const alreadyCovered = activities.some(
      (a) => a.scheduleId === occ.scheduleId && toDateInputValue(a.date) === occ.dateKey,
    );
    if (!alreadyCovered) {
      const occDate = new Date(`${occ.dateKey}T00:00:00Z`);
      const hoursUntilStart = calculateHoursUntilStart(
        occ.dateKey,
        occ.startTime,
        now,
      );
      const schedule = memberSchedules.find((s) => s.id === occ.scheduleId);
      sessions.push({
        key: `sch-${occ.scheduleId}-${occ.dateKey}`,
        activityId: null,
        scheduleId: occ.scheduleId,
        title: occ.title,
        locationName: occ.locationName,
        partner: schedule?.location.partner ?? "",
        date: occDate,
        dateStr: occ.dateKey,
        startTime: occ.startTime,
        endTime: occ.endTime,
        currentAttendance: null,
        checkedInAt: null,
        note: null,
        isToday: false,
        canCheckInHadir: false,
        canRequestIzin: hoursUntilStart >= 5,
        hoursUntilStart,
        studentAttendanceCount: 0,
      });
    }
  }

  const todaySessions = sessions.filter((s) => s.isToday);
  const upcomingSessions = sessions
    .filter((s) => !s.isToday)
    .sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime() ||
        a.startTime.localeCompare(b.startTime),
    );

  // 3. Auto-ALPA: past activities where member was assigned but has no attendance recorded
  const unattendedPastActivities = await prisma.activity.findMany({
    where: {
      date: { lt: todayDate },
      status: { not: "CANCELLED" },
      OR: [
        { teamMembers: { some: { teamMemberId } } },
        { schedule: { teamMembers: { some: { teamMemberId } } } },
      ],
      NOT: {
        teamMembers: {
          some: {
            teamMemberId,
          },
        },
      },
    },
    select: { id: true },
  });

  if (unattendedPastActivities.length > 0) {
    await prisma.$transaction(
      unattendedPastActivities.map((act) =>
        prisma.activityTeamMember.upsert({
          where: {
            activityId_teamMemberId: {
              activityId: act.id,
              teamMemberId,
            },
          },
          create: {
            activityId: act.id,
            teamMemberId,
            attendance: "ALPA",
            note: "Otomatis ALPA (tidak ada presensi/izin)",
          },
          update: {
            attendance: "ALPA",
            note: "Otomatis ALPA (tidak ada presensi/izin)",
          },
        }),
      ),
    );
  }

  // 4. Fetch past attendances for history (with appeals)
  const recentAttendances = await prisma.activityTeamMember.findMany({
    where: {
      teamMemberId,
      activity: {
        date: { lt: todayDate },
      },
    },
    orderBy: { activity: { date: "desc" } },
    take: 10,
    select: {
      id: true,
      activityId: true,
      attendance: true,
      checkedInAt: true,
      note: true,
      activity: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          location: { select: { name: true } },
        },
      },
    },
  });

  const activityIds = recentAttendances.map((item) => item.activityId);

  // Fetch appeals separately to avoid relying on nested relation on Activity
  const appeals =
    activityIds.length > 0 && Boolean(prisma?.attendanceAppeal)
      ? await prisma.attendanceAppeal.findMany({
          where: {
            teamMemberId,
            activityId: { in: activityIds },
          },
          select: {
            activityId: true,
            status: true,
            reason: true,
            adminNote: true,
          },
        })
      : [];

  const appealByActivityId = new Map(
    appeals.map((ap) => [ap.activityId, ap]),
  );

  const recentHistory = recentAttendances.map((item) => {
    const appeal = appealByActivityId.get(item.activityId) ?? null;
    return {
      id: item.id,
      activityId: item.activityId,
      date: item.activity.date,
      locationName: item.activity.location.name,
      startTime: item.activity.startTime,
      endTime: item.activity.endTime,
      attendance: item.attendance,
      checkedInAt: item.checkedInAt,
      note: item.note,
      appealStatus: appeal?.status ?? null,
      appealReason: appeal?.reason ?? null,
      appealAdminNote: appeal?.adminNote ?? null,
    };
  });

  return {
    todaySessions,
    upcomingSessions,
    recentHistory,
  };
}

export interface StudentAttendanceItem {
  id: string;
  fullName: string;
  groupName: string;
  attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA" | null;
  note: string | null;
}

export interface ActivityStudentsData {
  sessionKey: string;
  activityId: string | null;
  locationId: string;
  locationName: string;
  partner: string;
  dateStr: string;
  students: StudentAttendanceItem[];
}

export async function getActivityStudentsForAttendance(
  sessionKey: string,
  user: { id: string; role: "ADMIN" | "PENGAJAR" | "PEMBIMBING"; teamMemberId: string | null },
): Promise<ActivityStudentsData> {
  if (!sessionKey.startsWith("act-") && !sessionKey.startsWith("sch-")) {
    throw new Error("Format sesi tidak valid.");
  }

  const { prisma } = await import("@/lib/db/prisma");
  const { parseDateInput } = await import("@/lib/dates");

  let locationId: string;
  let locationName: string;
  let partner: string;
  let dateStr: string;
  let activityId: string | null = null;

  if (sessionKey.startsWith("act-")) {
    activityId = sessionKey.slice(4);
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        location: { select: { id: true, name: true, partner: true } },
        teamMembers: { select: { teamMemberId: true, attendance: true } },
        schedule: {
          select: {
            teamMembers: { select: { teamMemberId: true } },
          },
        },
      },
    });

    if (!activity) {
      throw new Error("Kegiatan tidak ditemukan.");
    }

    if (user.role !== "ADMIN") {
      if (!user.teamMemberId) {
        throw new Error("Akun Anda belum terhubung dengan data personil tim.");
      }
      const userRecord = activity.teamMembers.find(
        (tm) => tm.teamMemberId === user.teamMemberId,
      );
      if (!userRecord || userRecord.attendance !== "HADIR") {
        throw new Error(
          "Anda harus melakukan presensi hadir terlebih dahulu sebelum dapat melihat atau mengisi absensi murid.",
        );
      }
    }

    locationId = activity.locationId;
    locationName = activity.location.name;
    partner = activity.partner;
    dateStr = toDateInputValue(activity.date);

    // Scoped strictly to this activity's location
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { isActive: true, studentGroup: { locationId } },
          { attendances: { some: { activityId } } },
        ],
      },
      include: {
        studentGroup: { select: { id: true, name: true } },
        attendances: {
          where: { activityId },
          select: { attendance: true, note: true },
        },
      },
      orderBy: [
        { studentGroup: { name: "asc" } },
        { fullName: "asc" },
      ],
    });

    return {
      sessionKey,
      activityId,
      locationId,
      locationName,
      partner,
      dateStr,
      students: students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        groupName: s.studentGroup.name,
        attendance: s.attendances[0]?.attendance ?? null,
        note: s.attendances[0]?.note ?? null,
      })),
    };
  } else if (sessionKey.startsWith("sch-")) {
    const [, scheduleId, dateStrInput] = sessionKey.split("-");
    dateStr = dateStrInput;

    const existingActivity = await prisma.activity.findFirst({
      where: {
        scheduleId,
        date: parseDateInput(dateStr),
      },
      include: {
        location: { select: { id: true, name: true, partner: true } },
        teamMembers: { select: { teamMemberId: true, attendance: true } },
        schedule: {
          select: {
            teamMembers: { select: { teamMemberId: true } },
          },
        },
      },
    });

    if (existingActivity) {
      if (user.role !== "ADMIN") {
        if (!user.teamMemberId) {
          throw new Error("Akun Anda belum terhubung dengan data personil tim.");
        }
        const userRecord = existingActivity.teamMembers.find(
          (tm) => tm.teamMemberId === user.teamMemberId,
        );
        if (!userRecord || userRecord.attendance !== "HADIR") {
          throw new Error(
            "Anda harus melakukan presensi hadir terlebih dahulu sebelum dapat melihat atau mengisi absensi murid.",
          );
        }
      }

      activityId = existingActivity.id;
      locationId = existingActivity.locationId;
      locationName = existingActivity.location.name;
      partner = existingActivity.partner;

      const students = await prisma.student.findMany({
        where: {
          OR: [
            { isActive: true, studentGroup: { locationId } },
            { attendances: { some: { activityId } } },
          ],
        },
        include: {
          studentGroup: { select: { id: true, name: true } },
          attendances: {
            where: { activityId },
            select: { attendance: true, note: true },
          },
        },
        orderBy: [
          { studentGroup: { name: "asc" } },
          { fullName: "asc" },
        ],
      });

      return {
        sessionKey,
        activityId,
        locationId,
        locationName,
        partner,
        dateStr,
        students: students.map((s) => ({
          id: s.id,
          fullName: s.fullName,
          groupName: s.studentGroup.name,
          attendance: s.attendances[0]?.attendance ?? null,
          note: s.attendances[0]?.note ?? null,
        })),
      };
    }

    // If activity does not exist yet and user is not admin, they must check in first
    if (user.role !== "ADMIN") {
      throw new Error(
        "Anda harus melakukan presensi hadir terlebih dahulu sebelum dapat melihat atau mengisi absensi murid.",
      );
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        location: { select: { id: true, name: true, partner: true } },
        teamMembers: { select: { teamMemberId: true } },
      },
    });

    if (!schedule) {
      throw new Error("Jadwal kegiatan tidak ditemukan.");
    }

    locationId = schedule.locationId;
    locationName = schedule.location.name;
    partner = schedule.location.partner;

    const students = await prisma.student.findMany({
      where: {
        isActive: true,
        studentGroup: { locationId },
      },
      include: {
        studentGroup: { select: { id: true, name: true } },
      },
      orderBy: [
        { studentGroup: { name: "asc" } },
        { fullName: "asc" },
      ],
    });

    return {
      sessionKey,
      activityId: null,
      locationId,
      locationName,
      partner,
      dateStr,
      students: students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        groupName: s.studentGroup.name,
        attendance: null,
        note: null,
      })),
    };
  }

  throw new Error("Format sesi tidak valid.");
}

export async function saveStudentAttendanceForSession(
  sessionKey: string,
  user: { id: string; role: "ADMIN" | "PENGAJAR" | "PEMBIMBING"; teamMemberId: string | null },
  entries: Array<{
    studentId: string;
    attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
    note?: string;
  }>,
): Promise<{ activityId: string }> {
  if (!sessionKey.startsWith("act-") && !sessionKey.startsWith("sch-")) {
    throw new Error("Format sesi tidak valid.");
  }

  const { prisma } = await import("@/lib/db/prisma");
  const { parseDateInput } = await import("@/lib/dates");

  let targetActivityId: string | null = null;
  let targetLocationId: string;
  let targetBeneficiaryCount: number = 0;

  if (sessionKey.startsWith("act-")) {
    targetActivityId = sessionKey.slice(4);
    const activity = await prisma.activity.findUnique({
      where: { id: targetActivityId },
      include: {
        teamMembers: { select: { teamMemberId: true, attendance: true } },
        schedule: { select: { teamMembers: { select: { teamMemberId: true } } } },
      },
    });

    if (!activity) {
      throw new Error("Kegiatan tidak ditemukan.");
    }

    if (user.role !== "ADMIN") {
      if (!user.teamMemberId) {
        throw new Error("Akun Anda belum terhubung dengan data personil tim.");
      }
      const userRecord = activity.teamMembers.find(
        (tm) => tm.teamMemberId === user.teamMemberId,
      );
      if (!userRecord || userRecord.attendance !== "HADIR") {
        throw new Error(
          "Anda harus melakukan presensi hadir terlebih dahulu sebelum dapat menyimpan absensi murid.",
        );
      }
    }

    targetLocationId = activity.locationId;
    targetBeneficiaryCount = activity.beneficiaryCount;
  } else if (sessionKey.startsWith("sch-")) {
    const [, scheduleId, dateStr] = sessionKey.split("-");

    let activity = await prisma.activity.findFirst({
      where: {
        scheduleId,
        date: parseDateInput(dateStr),
      },
      include: {
        teamMembers: { select: { teamMemberId: true, attendance: true } },
        schedule: { select: { teamMembers: { select: { teamMemberId: true } } } },
      },
    });

    if (user.role !== "ADMIN") {
      if (!user.teamMemberId) {
        throw new Error("Akun Anda belum terhubung dengan data personil tim.");
      }
      if (!activity) {
        throw new Error(
          "Anda harus melakukan presensi hadir terlebih dahulu sebelum dapat menyimpan absensi murid.",
        );
      }
      const userRecord = activity.teamMembers.find(
        (tm) => tm.teamMemberId === user.teamMemberId,
      );
      if (!userRecord || userRecord.attendance !== "HADIR") {
        throw new Error(
          "Anda harus melakukan presensi hadir terlebih dahulu sebelum dapat menyimpan absensi murid.",
        );
      }
    }

    if (!activity) {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          location: true,
          teamMembers: true,
        },
      });

      if (!schedule) {
        throw new Error("Jadwal kegiatan tidak ditemukan.");
      }

      activity = await prisma.activity.create({
        data: {
          locationId: schedule.locationId,
          scheduleId: schedule.id,
          date: parseDateInput(dateStr),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          partner: schedule.location.partner,
          beneficiary: "Anak Binaan",
          beneficiaryCount: 0,
          aidType: "Pendidikan & Pengajaran",
          status: "DRAFT",
          createdById: user.id,
        },
        include: {
          teamMembers: { select: { teamMemberId: true, attendance: true } },
          schedule: { select: { teamMembers: { select: { teamMemberId: true } } } },
        },
      });
    }

    targetActivityId = activity.id;
    targetLocationId = activity.locationId;
    targetBeneficiaryCount = activity.beneficiaryCount;
  } else {
    throw new Error("Format sesi tidak valid.");
  }

  // Security & Isolation Check: All student IDs must strictly belong to targetLocationId!
  const validStudents = await prisma.student.findMany({
    where: {
      id: { in: entries.map((e) => e.studentId) },
      studentGroup: { locationId: targetLocationId },
    },
    select: { id: true },
  });

  const validStudentIdSet = new Set(validStudents.map((s) => s.id));
  const filteredEntries = entries.filter((e) => validStudentIdSet.has(e.studentId));

  const hadirCount = filteredEntries.filter((e) => e.attendance === "HADIR").length;
  const newBeneficiaryCount =
    targetBeneficiaryCount === 0 || hadirCount > targetBeneficiaryCount
      ? hadirCount
      : targetBeneficiaryCount;

  await prisma.$transaction([
    prisma.activityStudent.deleteMany({
      where: { activityId: targetActivityId },
    }),
    prisma.activityStudent.createMany({
      data: filteredEntries.map((e) => ({
        activityId: targetActivityId!,
        studentId: e.studentId,
        attendance: e.attendance,
        note: e.note ? e.note.trim() : null,
      })),
    }),
    prisma.activity.update({
      where: { id: targetActivityId },
      data: {
        beneficiaryCount: newBeneficiaryCount,
        updatedById: user.id,
      },
    }),
  ]);

  return { activityId: targetActivityId };
}
