"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { passwordSchema } from "@/lib/validation/auth";
import { teamMemberSchema } from "@/lib/validation/master-data";
import { z } from "zod";

import { describeBlockingReferences } from "../services/deletion";
import { fail, fromZodError, handleUnexpected, ok, readCheckbox } from "./types";
import type { ActionResult } from "./types";

const LIST_PATH = "/tim";
const SETTINGS_PATH = "/pengaturan";

const accountFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .max(64, "Username terlalu panjang.")
    .regex(
      /^[a-zA-Z0-9._@-]+$/,
      "Username hanya boleh berisi huruf, angka, titik, garis bawah, strip, dan @.",
    ),
  initialPassword: passwordSchema,
});

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
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const shouldCreateAccount = readCheckbox(formData, "createAccount");

  if (shouldCreateAccount) {
    const accountParsed = accountFormSchema.safeParse({
      username: formData.get("username"),
      initialPassword: formData.get("initialPassword"),
    });

    if (!accountParsed.success) {
      return fromZodError(accountParsed.error);
    }

    const { username, initialPassword } = accountParsed.data;

    try {
      const existingUser = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (existingUser) {
        return fail("Username sudah digunakan. Silakan pilih username lain.", {
          username: "Username sudah digunakan.",
        });
      }

      const passwordHash = await hashPassword(initialPassword);

      await prisma.$transaction(async (tx) => {
        const member = await tx.teamMember.create({ data: parsed.data });
        await tx.user.create({
          data: {
            username,
            passwordHash,
            name: member.fullName,
            role: "PENGAJAR",
            mustChangePassword: true,
            teamMemberId: member.id,
            isActive: member.isActive,
          },
        });
      });

      revalidatePath(LIST_PATH);
      revalidatePath(SETTINGS_PATH);
      return ok();
    } catch (error) {
      return handleUnexpected(
        "createTeamMemberAction",
        error,
        "Gagal menyimpan anggota tim dan akun pengajar. Silakan coba lagi.",
      );
    }
  }

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
  await requireAdmin();

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
  await requireAdmin();

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
  await requireAdmin();

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
