"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import {
  deleteStudentAssessment,
  getStudentAssessments,
  saveStudentAssessment,
} from "../services/student-assessments";
import type { StudentAssessmentItem } from "../services/student-assessments";
import { handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

interface SaveAssessmentInput {
  studentId: string;
  materialId?: string | null;
  customTitle?: string | null;
  status: string;
  notes?: string | null;
  activityId?: string | null;
}

export async function saveStudentAssessmentAction(
  input: SaveAssessmentInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  try {
    const result = await saveStudentAssessment({
      studentId: input.studentId,
      assessedById: user.id,
      materialId: input.materialId,
      customTitle: input.customTitle,
      status: input.status,
      notes: input.notes,
      activityId: input.activityId,
    });

    revalidatePath("/murid");
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "saveStudentAssessmentAction",
      error,
      error instanceof Error ? error.message : "Gagal menyimpan penilaian capaian murid.",
    );
  }
}

export async function getStudentAssessmentsAction(
  studentId: string,
): Promise<ActionResult<StudentAssessmentItem[]>> {
  await requireUser();

  try {
    const assessments = await getStudentAssessments(studentId);
    return ok(assessments);
  } catch (error) {
    return handleUnexpected(
      "getStudentAssessmentsAction",
      error,
      "Gagal memuat riwayat capaian murid.",
    );
  }
}

export async function deleteStudentAssessmentAction(
  assessmentId: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  try {
    const result = await deleteStudentAssessment(assessmentId, user.id, isAdmin);
    revalidatePath("/murid");
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "deleteStudentAssessmentAction",
      error,
      error instanceof Error ? error.message : "Gagal menghapus penilaian.",
    );
  }
}
