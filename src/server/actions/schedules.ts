"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import { scheduleSchema } from "@/lib/validation/schedule";

import { fail, fromZodError, handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

const LIST_PATH = "/jadwal";

function revalidateSchedules() {
  revalidatePath(LIST_PATH);
  revalidatePath("/jadwal/kalender");
  revalidatePath("/dashboard");
}

export interface SchedulePayload {
  id?: string;
  locationId: string;
  title: string;
  recurrence: "WEEKLY" | "CUSTOM";
  daysOfWeek: number[];
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  notes?: string;
  teamMemberIds: string[];
  studentGroupIds: string[];
  isActive: boolean;
}

export async function saveScheduleAction(
  payload: SchedulePayload,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  const parsed = scheduleSchema.safeParse(payload);
  if (!parsed.success) return fromZodError(parsed.error);

  const {
    teamMemberIds,
    studentGroupIds,
    startDate,
    endDate,
    ...rest
  } = parsed.data;

  const data = {
    ...rest,
    startDate: parseDateInput(startDate),
    endDate: endDate ? parseDateInput(endDate) : null,
  };

  try {
    if (payload.id) {
      // The assignment tables are rewritten rather than diffed: the form always
      // submits the complete set, so replacing them in one transaction is both
      // simpler and cannot half-apply.
      const id = payload.id;

      await prisma.$transaction([
        prisma.schedule.update({ where: { id }, data }),
        prisma.scheduleTeamMember.deleteMany({ where: { scheduleId: id } }),
        prisma.scheduleStudentGroup.deleteMany({ where: { scheduleId: id } }),
        prisma.scheduleTeamMember.createMany({
          data: teamMemberIds.map((teamMemberId) => ({
            scheduleId: id,
            teamMemberId,
          })),
        }),
        prisma.scheduleStudentGroup.createMany({
          data: studentGroupIds.map((studentGroupId) => ({
            scheduleId: id,
            studentGroupId,
          })),
        }),
      ]);

      revalidateSchedules();
      revalidatePath(`/jadwal/${id}`);
      return ok({ id });
    }

    const schedule = await prisma.schedule.create({
      data: {
        ...data,
        teamMembers: {
          create: teamMemberIds.map((teamMemberId) => ({ teamMemberId })),
        },
        studentGroups: {
          create: studentGroupIds.map((studentGroupId) => ({
            studentGroupId,
          })),
        },
      },
      select: { id: true },
    });

    revalidateSchedules();
    return ok({ id: schedule.id });
  } catch (error) {
    return handleUnexpected(
      "saveScheduleAction",
      error,
      "Gagal menyimpan jadwal. Silakan coba lagi.",
    );
  }
}

export async function setScheduleActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.schedule.update({ where: { id }, data: { isActive } });
    revalidateSchedules();
    return ok();
  } catch (error) {
    return handleUnexpected(
      "setScheduleActiveAction",
      error,
      "Gagal mengubah status jadwal. Silakan coba lagi.",
    );
  }
}

export async function deleteScheduleAction(id: string): Promise<ActionResult> {
  await requireUser();

  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!schedule) return fail("Jadwal tidak ditemukan.");

    // Assignments cascade. Activities that referenced this plan keep their own
    // record — the foreign key is SET NULL — because deleting a plan must never
    // erase what actually happened.
    await prisma.schedule.delete({ where: { id } });

    revalidateSchedules();
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deleteScheduleAction",
      error,
      "Gagal menghapus jadwal. Silakan coba lagi.",
    );
  }
}
