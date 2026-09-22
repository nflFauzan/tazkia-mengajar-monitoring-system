"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import {
  createPengajarUserSchema,
  createUserSchema,
  passwordSchema,
} from "@/lib/validation/auth";

import { fail, fromZodError, handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

const SETTINGS_PATH = "/pengaturan";
const TIM_PATH = "/tim";

export async function createAdminAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createUserSchema.safeParse({
    username: formData.get("username"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.user.create({
      data: {
        username: parsed.data.username,
        name: parsed.data.name,
        passwordHash: await hashPassword(parsed.data.password),
        role: "ADMIN",
        mustChangePassword: false,
      },
    });

    revalidatePath(SETTINGS_PATH);
    return ok();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    ) {
      return fail("Periksa kembali data yang diisi.", {
        username: "Username sudah dipakai.",
      });
    }
    return handleUnexpected(
      "createAdminAction",
      error,
      "Gagal menambah admin. Silakan coba lagi.",
    );
  }
}

export async function createPengajarUserAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const phoneVal = formData.get("phone");
  const parsed = createPengajarUserSchema.safeParse({
    teamMemberId: formData.get("teamMemberId"),
    phone: typeof phoneVal === "string" ? phoneVal : undefined,
    username: formData.get("username"),
    initialPassword: formData.get("initialPassword"),
  });

  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: parsed.data.teamMemberId },
      include: { user: { select: { id: true } } },
    });

    if (!teamMember || !teamMember.isActive) {
      return fail("Anggota tim tidak ditemukan atau tidak aktif.");
    }

    if (teamMember.user) {
      return fail("Anggota tim ini sudah memiliki akun pengguna.");
    }

    await prisma.$transaction(async (tx) => {
      if (parsed.data.phone !== undefined) {
        await tx.teamMember.update({
          where: { id: teamMember.id },
          data: { phone: parsed.data.phone.trim() || null },
        });
      }

      await tx.user.create({
        data: {
          username: parsed.data.username,
          name: teamMember.fullName,
          passwordHash: await hashPassword(parsed.data.initialPassword),
          role: "PENGAJAR",
          mustChangePassword: true,
          teamMemberId: teamMember.id,
        },
      });
    });

    revalidatePath(SETTINGS_PATH);
    revalidatePath(TIM_PATH);
    return ok();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    ) {
      return fail("Periksa kembali data yang diisi.", {
        username: "Username sudah dipakai.",
      });
    }
    return handleUnexpected(
      "createPengajarUserAction",
      error,
      "Gagal membuat akun pengajar. Silakan coba lagi.",
    );
  }
}

export async function resetPengajarPasswordAction(
  userId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const temporaryPassword = formData.get("temporaryPassword");
  const parsed = passwordSchema.safeParse(temporaryPassword);

  if (!parsed.success) {
    return fail("Periksa kembali data yang diisi.", {
      temporaryPassword:
        parsed.error.issues[0]?.message ?? "Password tidak valid.",
    });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(parsed.data),
        mustChangePassword: true,
      },
    });

    revalidatePath(SETTINGS_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "resetPengajarPasswordAction",
      error,
      "Gagal mereset password pengajar. Silakan coba lagi.",
    );
  }
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireAdmin();

  const userId = formData.get("userId");
  const password = formData.get("password");

  if (typeof userId !== "string" || !userId) {
    return fail("Pengguna tidak ditemukan.");
  }

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return fail("Periksa kembali data yang diisi.", {
      password: parsed.error.issues[0]?.message ?? "Password tidak valid.",
    });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(parsed.data) },
    });

    // Changing your own password does not invalidate your session here: the
    // JWT carries no password material, and forcing a re-login would be
    // surprising for the admin who just changed it deliberately.
    revalidatePath(SETTINGS_PATH);
    console.info(
      `[changePasswordAction] password changed for ${userId} by ${currentUser.id}`,
    );
    return ok();
  } catch (error) {
    return handleUnexpected(
      "changePasswordAction",
      error,
      "Gagal mengubah password. Silakan coba lagi.",
    );
  }
}

export async function setUserActiveAction(
  userId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const currentUser = await requireAdmin();

  // Deactivating yourself would sign you out on the next request and, if you
  // were the only admin, lock everyone out permanently.
  if (userId === currentUser.id && !isActive) {
    return fail("Anda tidak bisa menonaktifkan akun Anda sendiri.");
  }

  try {
    if (!isActive) {
      const activeAdmins = await prisma.user.count({
        where: { isActive: true },
      });
      if (activeAdmins <= 1) {
        return fail("Minimal harus ada satu admin aktif.");
      }
    }

    await prisma.user.update({ where: { id: userId }, data: { isActive } });
    revalidatePath(SETTINGS_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "setUserActiveAction",
      error,
      "Gagal mengubah status pengguna. Silakan coba lagi.",
    );
  }
}
