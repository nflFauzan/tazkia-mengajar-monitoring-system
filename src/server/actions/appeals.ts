"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@prisma/client";

import { requireAdmin, requireUser } from "@/lib/auth/session";
import {
  getPendingAppeals,
  reviewAttendanceAppeal,
  submitAttendanceAppeal,
} from "../services/appeals";
import type { AttendanceAppealItem } from "../services/appeals";
import { fail, handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

interface SubmitAppealInput {
  activityId: string;
  proposedAttendance: AttendanceStatus;
  reason: string;
}

export async function submitAttendanceAppealAction(
  input: SubmitAppealInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  if (!user.teamMemberId) {
    return fail("Akun Anda belum terhubung dengan data personil tim.");
  }

  try {
    const result = await submitAttendanceAppeal({
      activityId: input.activityId,
      teamMemberId: user.teamMemberId,
      proposedAttendance: input.proposedAttendance,
      reason: input.reason,
    });

    revalidatePath("/absensi");
    revalidatePath("/dashboard");
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "submitAttendanceAppealAction",
      error,
      error instanceof Error ? error.message : "Gagal mengajukan banding.",
    );
  }
}

interface ReviewAppealInput {
  appealId: string;
  approved: boolean;
  adminNote?: string;
}

export async function reviewAttendanceAppealAction(
  input: ReviewAppealInput,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  try {
    const result = await reviewAttendanceAppeal({
      appealId: input.appealId,
      reviewerId: admin.id,
      approved: input.approved,
      adminNote: input.adminNote,
    });

    revalidatePath("/absensi");
    revalidatePath("/dashboard");
    revalidatePath("/laporan/rekap");
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "reviewAttendanceAppealAction",
      error,
      error instanceof Error ? error.message : "Gagal memproses banding.",
    );
  }
}

export async function getPendingAppealsAction(): Promise<
  ActionResult<AttendanceAppealItem[]>
> {
  await requireAdmin();

  try {
    const appeals = await getPendingAppeals();
    return ok(appeals);
  } catch (error) {
    return handleUnexpected(
      "getPendingAppealsAction",
      error,
      "Gagal memuat daftar pengajuan banding.",
    );
  }
}
