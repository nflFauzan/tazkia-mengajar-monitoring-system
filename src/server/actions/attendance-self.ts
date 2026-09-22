"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { parseDateInput } from "@/lib/dates";
import {
  calculateHoursUntilStart,
  getActivityStudentsForAttendance,
  getWibDateString,
  saveStudentAttendanceForSession,
} from "../services/attendance-self";
import type { ActivityStudentsData } from "../services/attendance-self";
import { fail, handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

interface SelfCheckInInput {
  activityId?: string | null;
  scheduleId?: string | null;
  dateStr: string;
  startTime: string;
  attendance: "HADIR" | "IZIN" | "SAKIT";
  note?: string | null;
}

export async function selfCheckInAction(
  input: SelfCheckInInput,
): Promise<ActionResult> {
  const user = await requireUser();

  if (!user.teamMemberId) {
    return fail(
      "Akun Anda belum terhubung dengan data personil tim. Silakan hubungi Admin.",
    );
  }

  const teamMemberId = user.teamMemberId;
  const now = new Date();
  const todayStr = getWibDateString(now);

  // 1. Validation for HADIR
  if (input.attendance === "HADIR") {
    if (input.dateStr !== todayStr) {
      return fail(
        "Presensi hadir hanya dapat dilakukan pada hari kegiatan berlangsung (Hari-H).",
      );
    }
  }

  // 2. Validation for IZIN / SAKIT (Max 5 hours before activity start)
  if (input.attendance === "IZIN" || input.attendance === "SAKIT") {
    const hoursUntilStart = calculateHoursUntilStart(
      input.dateStr,
      input.startTime,
      now,
    );

    if (hoursUntilStart < 5) {
      return fail(
        "Pengajuan izin atau sakit mandiri harus dilakukan paling lambat 5 jam sebelum waktu kegiatan dimulai. Silakan hubungi Admin secara langsung untuk konfirmasi ketidakhadiran.",
      );
    }
  }

  try {
    let targetActivityId = input.activityId;

    // If no activityId is provided, check if an activity already exists for this schedule today, or create one
    if (!targetActivityId && input.scheduleId) {
      const existingActivity = await prisma.activity.findFirst({
        where: {
          scheduleId: input.scheduleId,
          date: parseDateInput(input.dateStr),
        },
        select: { id: true },
      });

      if (existingActivity) {
        targetActivityId = existingActivity.id;
      } else {
        const schedule = await prisma.schedule.findUnique({
          where: { id: input.scheduleId },
          include: {
            location: true,
            teamMembers: true,
          },
        });

        if (!schedule) {
          return fail("Jadwal kegiatan tidak ditemukan.");
        }

        // If schedule has assigned team members, only assigned members or admin can check in.
        // If teamMembers is empty (0 dipilih), it is open to all active team members.
        if (user.role !== "ADMIN" && schedule.teamMembers.length > 0) {
          const isAssigned = schedule.teamMembers.some(
            (tm) => tm.teamMemberId === teamMemberId,
          );
          if (!isAssigned) {
            return fail("Anda tidak terdaftar pada jadwal kegiatan ini.");
          }
        }

        const newActivity = await prisma.activity.create({
          data: {
            locationId: schedule.locationId,
            scheduleId: schedule.id,
            date: parseDateInput(input.dateStr),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            partner: schedule.location.partner,
            beneficiary: "Anak Binaan",
            beneficiaryCount: 0,
            aidType: "Pendidikan & Pengajaran",
            status: "DRAFT",
            createdById: user.id,
          },
        });

        targetActivityId = newActivity.id;
      }
    }

    if (!targetActivityId) {
      return fail("Kegiatan tidak ditemukan.");
    }

    const activity = await prisma.activity.findUnique({
      where: { id: targetActivityId },
      include: {
        schedule: {
          include: { teamMembers: true },
        },
      },
    });

    if (!activity) {
      return fail("Kegiatan tidak ditemukan.");
    }

    if (user.role !== "ADMIN") {
      if (
        activity.schedule &&
        activity.schedule.teamMembers.length > 0 &&
        !activity.schedule.teamMembers.some((tm) => tm.teamMemberId === teamMemberId)
      ) {
        return fail("Anda tidak terdaftar pada kegiatan ini.");
      }
    }

    // Upsert the team member attendance record
    const checkedInAt = input.attendance === "HADIR" ? now : null;

    const existingRecord = await prisma.activityTeamMember.findUnique({
      where: {
        activityId_teamMemberId: {
          activityId: targetActivityId,
          teamMemberId,
        },
      },
    });

    if (existingRecord) {
      await prisma.activityTeamMember.update({
        where: { id: existingRecord.id },
        data: {
          attendance: input.attendance,
          note: input.note ? input.note.trim() : null,
          checkedInAt: checkedInAt ?? existingRecord.checkedInAt,
        },
      });
    } else {
      await prisma.activityTeamMember.create({
        data: {
          activityId: targetActivityId,
          teamMemberId,
          attendance: input.attendance,
          note: input.note ? input.note.trim() : null,
          checkedInAt,
        },
      });
    }

    revalidatePath("/absensi");
    revalidatePath("/dashboard");
    revalidatePath(`/kegiatan/${targetActivityId}`);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "selfCheckInAction",
      error,
      "Gagal menyimpan presensi. Silakan coba lagi.",
    );
  }
}

export async function getStudentAttendanceListAction(
  sessionKey: string,
): Promise<ActionResult<ActivityStudentsData>> {
  const user = await requireUser();

  try {
    const data = await getActivityStudentsForAttendance(sessionKey, {
      id: user.id,
      role: user.role,
      teamMemberId: user.teamMemberId ?? null,
    });
    return ok(data);
  } catch (error) {
    return handleUnexpected(
      "getStudentAttendanceListAction",
      error,
      error instanceof Error ? error.message : "Gagal memuat data murid.",
    );
  }
}

export async function savePengajarStudentAttendanceAction(
  sessionKey: string,
  entries: Array<{
    studentId: string;
    attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
    note?: string;
  }>,
): Promise<ActionResult<{ activityId: string }>> {
  const user = await requireUser();

  try {
    const result = await saveStudentAttendanceForSession(
      sessionKey,
      {
        id: user.id,
        role: user.role,
        teamMemberId: user.teamMemberId ?? null,
      },
      entries,
    );

    revalidatePath("/absensi");
    revalidatePath("/dashboard");
    revalidatePath(`/kegiatan/${result.activityId}`);
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "savePengajarStudentAttendanceAction",
      error,
      error instanceof Error ? error.message : "Gagal menyimpan absensi murid.",
    );
  }
}
