"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import {
  generateActivityReport,
  toReportInput,
} from "@/lib/reports";
import {
  activityInfoSchema,
  activityMaterialsSchema,
  activityStudentsSchema,
  activityTeamSchema,
  narrativeSchema,
} from "@/lib/validation/activity";

import { fail, fromZodError, handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

const LIST_PATH = "/kegiatan";

function revalidateActivity(id: string) {
  revalidatePath(LIST_PATH);
  revalidatePath(`/kegiatan/${id}`);
  revalidatePath("/dashboard");
}

function parseInfoForm(formData: FormData) {
  return activityInfoSchema.safeParse({
    locationId: formData.get("locationId"),
    scheduleId: formData.get("scheduleId") ?? undefined,
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    partner: formData.get("partner"),
    beneficiary: formData.get("beneficiary"),
    beneficiaryCount: formData.get("beneficiaryCount"),
    aidType: formData.get("aidType"),
    notes: formData.get("notes") ?? undefined,
  });
}

/**
 * Step 1 of the wizard. Creates the activity as a DRAFT immediately and returns
 * its id, so every later step edits a persisted row.
 *
 * This is what makes "save draft" real rather than a button that has to
 * serialise a half-filled form: a refresh, a navigation or a failed upload can
 * no longer lose what was already entered (PRD section 35).
 */
export async function createActivityAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = parseInfoForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const { date, ...rest } = parsed.data;

  try {
    const activity = await prisma.activity.create({
      data: {
        ...rest,
        date: parseDateInput(date),
        status: "DRAFT",
        createdById: user.id,
      },
      select: { id: true },
    });

    revalidateActivity(activity.id);
    return ok({ id: activity.id });
  } catch (error) {
    return handleUnexpected(
      "createActivityAction",
      error,
      "Gagal menyimpan kegiatan. Silakan coba lagi.",
    );
  }
}

/**
 * Returns the id like `createActivityAction` does, so the shared info form can
 * be typed against one result shape rather than a union of two.
 */
export async function updateActivityInfoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Kegiatan tidak ditemukan.");

  const parsed = parseInfoForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const { date, ...rest } = parsed.data;

  try {
    await prisma.activity.update({
      where: { id },
      data: {
        ...rest,
        date: parseDateInput(date),
        updatedById: user.id,
      },
    });

    revalidateActivity(id);
    return ok({ id });
  } catch (error) {
    return handleUnexpected(
      "updateActivityInfoAction",
      error,
      "Gagal memperbarui kegiatan. Silakan coba lagi.",
    );
  }
}

/**
 * Replaces the team attendance list wholesale.
 *
 * The whole set is rewritten inside a transaction rather than diffed: the step
 * submits the complete list every time, so a delete-then-insert is both simpler
 * and immune to a partially applied update.
 */
export async function saveActivityTeamAction(
  activityId: string,
  entries: Array<{
    teamMemberId: string;
    attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
    note?: string;
  }>,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = activityTeamSchema.safeParse({ entries });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.$transaction([
      prisma.activityTeamMember.deleteMany({ where: { activityId } }),
      prisma.activityTeamMember.createMany({
        data: parsed.data.entries.map((entry, index) => ({
          activityId,
          teamMemberId: entry.teamMemberId,
          attendance: entry.attendance,
          note: entry.note ?? null,
          orderIndex: index,
        })),
      }),
      prisma.activity.update({
        where: { id: activityId },
        data: { updatedById: user.id },
      }),
    ]);

    revalidateActivity(activityId);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "saveActivityTeamAction",
      error,
      "Gagal menyimpan absensi tim. Silakan coba lagi.",
    );
  }
}

export async function saveActivityStudentsAction(
  activityId: string,
  entries: Array<{
    studentId: string;
    attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
    note?: string;
  }>,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = activityStudentsSchema.safeParse({ entries });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.$transaction([
      prisma.activityStudent.deleteMany({ where: { activityId } }),
      prisma.activityStudent.createMany({
        data: parsed.data.entries.map((entry) => ({
          activityId,
          studentId: entry.studentId,
          attendance: entry.attendance,
          note: entry.note ?? null,
        })),
      }),
      prisma.activity.update({
        where: { id: activityId },
        data: { updatedById: user.id },
      }),
    ]);

    revalidateActivity(activityId);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "saveActivityStudentsAction",
      error,
      "Gagal menyimpan absensi murid. Silakan coba lagi.",
    );
  }
}

export async function saveActivityMaterialsAction(
  activityId: string,
  materialIds: string[],
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = activityMaterialsSchema.safeParse({ materialIds });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.$transaction([
      prisma.activityMaterial.deleteMany({ where: { activityId } }),
      prisma.activityMaterial.createMany({
        data: parsed.data.materialIds.map((materialId) => ({
          activityId,
          materialId,
        })),
      }),
      prisma.activity.update({
        where: { id: activityId },
        data: { updatedById: user.id },
      }),
    ]);

    revalidateActivity(activityId);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "saveActivityMaterialsAction",
      error,
      "Gagal menyimpan materi. Silakan coba lagi.",
    );
  }
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

/** The includes the report module needs. Kept next to its only two callers. */
const REPORT_INCLUDE = {
  location: { select: { name: true, address: true } },
  teamMembers: {
    select: {
      attendance: true,
      orderIndex: true,
      teamMember: { select: { fullName: true } },
    },
  },
  _count: { select: { documents: true } },
} as const;

/**
 * Marks the activity COMPLETED, but only when the report checklist is clean.
 *
 * A completed activity is what the dashboard counts and what the recap
 * exports, so letting one through with no documentation or no team would
 * quietly corrupt every downstream figure.
 */
export async function completeActivityAction(
  activityId: string,
): Promise<ActionResult> {
  const user = await requireUser();

  try {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: REPORT_INCLUDE,
    });

    if (!activity) return fail("Kegiatan tidak ditemukan.");

    const report = await prisma.report.findUnique({
      where: { activityId },
      select: { narrative: true },
    });

    const generated = generateActivityReport(toReportInput(activity), {
      existingNarrative: report?.narrative,
    });

    if (!generated.validation.isComplete) {
      return fail(
        `Kegiatan belum bisa diselesaikan. Lengkapi dulu: ${generated.validation.missing.join(", ")}.`,
      );
    }

    await prisma.activity.update({
      where: { id: activityId },
      data: { status: "COMPLETED", updatedById: user.id },
    });

    revalidateActivity(activityId);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "completeActivityAction",
      error,
      "Gagal menyelesaikan kegiatan. Silakan coba lagi.",
    );
  }
}

export async function setActivityStatusAction(
  activityId: string,
  status: "DRAFT" | "CANCELLED",
): Promise<ActionResult> {
  const user = await requireUser();

  try {
    await prisma.activity.update({
      where: { id: activityId },
      data: { status, updatedById: user.id },
    });

    revalidateActivity(activityId);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "setActivityStatusAction",
      error,
      "Gagal mengubah status kegiatan. Silakan coba lagi.",
    );
  }
}

export async function deleteActivityAction(
  activityId: string,
): Promise<ActionResult> {
  await requireUser();

  try {
    // Attendance, materials, documentation and the report all cascade from the
    // activity, so no reference check is needed — they exist only for this row.
    await prisma.activity.delete({ where: { id: activityId } });
    revalidatePath(LIST_PATH);
    revalidatePath("/dashboard");
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deleteActivityAction",
      error,
      "Gagal menghapus kegiatan. Silakan coba lagi.",
    );
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/**
 * Builds (or rebuilds) the stored report.
 *
 * `regenerateNarrative` is the explicit "Regenerate Narrative" action. Without
 * it an admin-edited narrative is preserved, so regenerating the report body
 * after, say, fixing a time never silently discards their wording
 * (CLAUDE.md section 23).
 */
export async function generateReportAction(
  activityId: string,
  options: { regenerateNarrative?: boolean } = {},
): Promise<ActionResult<{ content: string }>> {
  const user = await requireUser();

  try {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: REPORT_INCLUDE,
    });

    if (!activity) return fail("Kegiatan tidak ditemukan.");

    const existing = await prisma.report.findUnique({
      where: { activityId },
      select: { narrative: true, narrativeEdited: true },
    });

    const generated = generateActivityReport(toReportInput(activity), {
      existingNarrative: existing?.narrative,
      regenerateNarrative: options.regenerateNarrative,
    });

    if (!generated.validation.isComplete) {
      return fail(
        `Laporan belum lengkap. Yang harus dilengkapi: ${generated.validation.missing.join(", ")}.`,
      );
    }

    const narrativeEdited = options.regenerateNarrative
      ? false
      : (existing?.narrativeEdited ?? false);

    await prisma.report.upsert({
      where: { activityId },
      create: {
        activityId,
        content: generated.text,
        narrative: generated.narrative,
        narrativeEdited,
        createdById: user.id,
      },
      update: {
        content: generated.text,
        narrative: generated.narrative,
        narrativeEdited,
        generatedAt: new Date(),
      },
    });

    revalidateActivity(activityId);
    return ok({ content: generated.text });
  } catch (error) {
    return handleUnexpected(
      "generateReportAction",
      error,
      "Gagal membuat laporan. Silakan coba lagi.",
    );
  }
}

/** Saves an admin-edited narrative and re-renders the report around it. */
export async function updateNarrativeAction(
  activityId: string,
  narrative: string,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = narrativeSchema.safeParse(narrative);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Narasi tidak valid.");
  }

  try {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: REPORT_INCLUDE,
    });

    if (!activity) return fail("Kegiatan tidak ditemukan.");

    const generated = generateActivityReport(toReportInput(activity), {
      existingNarrative: parsed.data,
    });

    await prisma.report.upsert({
      where: { activityId },
      create: {
        activityId,
        content: generated.text,
        narrative: parsed.data,
        narrativeEdited: true,
        createdById: user.id,
      },
      update: {
        content: generated.text,
        narrative: parsed.data,
        narrativeEdited: true,
        generatedAt: new Date(),
      },
    });

    revalidateActivity(activityId);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "updateNarrativeAction",
      error,
      "Gagal menyimpan narasi. Silakan coba lagi.",
    );
  }
}
