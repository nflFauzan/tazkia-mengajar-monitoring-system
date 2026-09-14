"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { locationSchema } from "@/lib/validation/master-data";

import { describeBlockingReferences } from "../services/deletion";
import { fail, fromZodError, handleUnexpected, ok, readCheckbox } from "./types";
import type { ActionResult } from "./types";

const LIST_PATH = "/tempat";

/**
 * Every action here begins with `requireUser()`. The proxy redirects page
 * navigations, but a Server Action can be invoked directly, so this is the
 * check that actually matters.
 */

function parseForm(formData: FormData) {
  return locationSchema.safeParse({
    name: formData.get("name"),
    partner: formData.get("partner"),
    address: formData.get("address"),
    category: formData.get("category"),
    description: formData.get("description") ?? undefined,
    isActive: readCheckbox(formData, "isActive"),
  });
}

export async function createLocationAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const parsed = parseForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.location.create({ data: parsed.data });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "createLocationAction",
      error,
      "Gagal menyimpan tempat. Silakan coba lagi.",
    );
  }
}

export async function updateLocationAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return fail("Tempat tidak ditemukan.");
  }

  const parsed = parseForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.location.update({ where: { id }, data: parsed.data });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "updateLocationAction",
      error,
      "Gagal memperbarui tempat. Silakan coba lagi.",
    );
  }
}

/** Archiving is always safe: the row stays joinable so old reports still work. */
export async function setLocationActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.location.update({ where: { id }, data: { isActive } });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "setLocationActiveAction",
      error,
      "Gagal mengubah status tempat. Silakan coba lagi.",
    );
  }
}

export async function deleteLocationAction(id: string): Promise<ActionResult> {
  await requireUser();

  try {
    const [activityCount, scheduleCount, groupCount] = await prisma.$transaction(
      [
        prisma.activity.count({ where: { locationId: id } }),
        prisma.schedule.count({ where: { locationId: id } }),
        prisma.studentGroup.count({ where: { locationId: id } }),
      ],
    );

    const blocked = describeBlockingReferences([
      { label: "kegiatan", count: activityCount },
      { label: "jadwal", count: scheduleCount },
      { label: "kelompok murid", count: groupCount },
    ]);

    if (blocked) return fail(blocked);

    await prisma.location.delete({ where: { id } });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deleteLocationAction",
      error,
      "Gagal menghapus tempat. Silakan coba lagi.",
    );
  }
}
