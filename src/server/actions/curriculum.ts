"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  curriculumMaterialSchema,
  curriculumPeriodSchema,
  curriculumSchema,
} from "@/lib/validation/master-data";

import { describeBlockingReferences } from "../services/deletion";
import { fail, fromZodError, handleUnexpected, ok, readCheckbox } from "./types";
import type { ActionResult } from "./types";

const LIST_PATH = "/kurikulum";

/**
 * Curriculum is a three-level tree: Curriculum -> Period -> Material.
 * Periods and materials cascade from their parent, so only materials — the
 * level an Activity can reference — need a deletion guard.
 */

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------

export async function createCurriculumAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = curriculumSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    isActive: readCheckbox(formData, "isActive"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.curriculum.create({ data: parsed.data });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "createCurriculumAction",
      error,
      "Gagal menyimpan kurikulum. Silakan coba lagi.",
    );
  }
}

export async function updateCurriculumAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Kurikulum tidak ditemukan.");

  const parsed = curriculumSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    isActive: readCheckbox(formData, "isActive"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.curriculum.update({ where: { id }, data: parsed.data });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "updateCurriculumAction",
      error,
      "Gagal memperbarui kurikulum. Silakan coba lagi.",
    );
  }
}

export async function deleteCurriculumAction(
  id: string,
): Promise<ActionResult> {
  await requireAdmin();

  try {
    // Deleting a curriculum cascades to its periods and materials, so the real
    // question is whether any of those materials is already used by an activity.
    const usedCount = await prisma.activityMaterial.count({
      where: { material: { period: { curriculumId: id } } },
    });

    const blocked = describeBlockingReferences([
      { label: "materi yang dipakai kegiatan", count: usedCount },
    ]);
    if (blocked) return fail(blocked);

    await prisma.curriculum.delete({ where: { id } });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deleteCurriculumAction",
      error,
      "Gagal menghapus kurikulum. Silakan coba lagi.",
    );
  }
}

// ---------------------------------------------------------------------------
// Period
// ---------------------------------------------------------------------------

export async function createPeriodAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = curriculumPeriodSchema.safeParse({
    curriculumId: formData.get("curriculumId"),
    name: formData.get("name"),
    orderIndex: formData.get("orderIndex") ?? 0,
  });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.curriculumPeriod.create({ data: parsed.data });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    ) {
      return fail("Periksa kembali data yang diisi.", {
        name: "Periode dengan nama ini sudah ada pada kurikulum tersebut.",
      });
    }
    return handleUnexpected(
      "createPeriodAction",
      error,
      "Gagal menyimpan periode. Silakan coba lagi.",
    );
  }
}

export async function deletePeriodAction(id: string): Promise<ActionResult> {
  await requireAdmin();

  try {
    const usedCount = await prisma.activityMaterial.count({
      where: { material: { periodId: id } },
    });

    const blocked = describeBlockingReferences([
      { label: "materi yang dipakai kegiatan", count: usedCount },
    ]);
    if (blocked) return fail(blocked);

    await prisma.curriculumPeriod.delete({ where: { id } });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deletePeriodAction",
      error,
      "Gagal menghapus periode. Silakan coba lagi.",
    );
  }
}

// ---------------------------------------------------------------------------
// Material
// ---------------------------------------------------------------------------

function parseMaterialForm(formData: FormData) {
  return curriculumMaterialSchema.safeParse({
    periodId: formData.get("periodId"),
    title: formData.get("title"),
    meetingLabel: formData.get("meetingLabel") ?? undefined,
    objective: formData.get("objective") ?? undefined,
    description: formData.get("description") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    orderIndex: formData.get("orderIndex") ?? 0,
    isActive: readCheckbox(formData, "isActive"),
  });
}

export async function createMaterialAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseMaterialForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.curriculumMaterial.create({ data: parsed.data });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "createMaterialAction",
      error,
      "Gagal menyimpan materi. Silakan coba lagi.",
    );
  }
}

export async function updateMaterialAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Materi tidak ditemukan.");

  const parsed = parseMaterialForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.curriculumMaterial.update({
      where: { id },
      data: parsed.data,
    });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "updateMaterialAction",
      error,
      "Gagal memperbarui materi. Silakan coba lagi.",
    );
  }
}

export async function deleteMaterialAction(id: string): Promise<ActionResult> {
  await requireAdmin();

  try {
    const usedCount = await prisma.activityMaterial.count({
      where: { materialId: id },
    });

    const blocked = describeBlockingReferences([
      { label: "kegiatan", count: usedCount },
    ]);
    if (blocked) return fail(blocked);

    await prisma.curriculumMaterial.delete({ where: { id } });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deleteMaterialAction",
      error,
      "Gagal menghapus materi. Silakan coba lagi.",
    );
  }
}
