"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { teamMemberSchema } from "@/lib/validation/master-data";

import { describeBlockingReferences } from "../services/deletion";
import { fail, fromZodError, handleUnexpected, ok, readCheckbox } from "./types";
import type { ActionResult } from "./types";

const LIST_PATH = "/tim";

function parseForm(formData: FormData) {
  return teamMemberSchema.safeParse({
    fullName: formData.get("fullName"),
    nickname: formData.get("nickname") ?? undefined,
    status: formData.get("status") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    photoUrl: formData.get("photoUrl") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    isActive: readCheckbox(formData, "isActive"),
  });
}

export async function createTeamMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const parsed = parseForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.teamMember.create({ data: parsed.data });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "createTeamMemberAction",
      error,
      "Gagal menyimpan anggota tim. Silakan coba lagi.",
    );
  }
}

export async function updateTeamMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return fail("Anggota tim tidak ditemukan.");
  }

  const parsed = parseForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.teamMember.update({ where: { id }, data: parsed.data });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "updateTeamMemberAction",
      error,
      "Gagal memperbarui anggota tim. Silakan coba lagi.",
    );
  }
}

export async function setTeamMemberActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.teamMember.update({ where: { id }, data: { isActive } });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "setTeamMemberActiveAction",
      error,
      "Gagal mengubah status anggota tim. Silakan coba lagi.",
    );
  }
}

export async function deleteTeamMemberAction(
  id: string,
): Promise<ActionResult> {
  await requireUser();

  try {
    const [attendanceCount, scheduleCount] = await prisma.$transaction([
      prisma.activityTeamMember.count({ where: { teamMemberId: id } }),
      prisma.scheduleTeamMember.count({ where: { teamMemberId: id } }),
    ]);

    const blocked = describeBlockingReferences([
      { label: "absensi kegiatan", count: attendanceCount },
      { label: "jadwal", count: scheduleCount },
    ]);

    if (blocked) return fail(blocked);

    await prisma.teamMember.delete({ where: { id } });
    revalidatePath(LIST_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deleteTeamMemberAction",
      error,
      "Gagal menghapus anggota tim. Silakan coba lagi.",
    );
  }
}
