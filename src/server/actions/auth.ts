"use server";

import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  requireUserAllowPasswordChange,
  setSessionCookie,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  firstTimePasswordChangeSchema,
  loginSchema,
} from "@/lib/validation/auth";

import { fail, fromZodError, handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

/**
 * Deliberately identical for "no such user", "wrong password" and "account
 * disabled". Naming which one failed tells an attacker whether a username
 * exists, and the distinction is no help to a legitimate admin.
 */
const INVALID_CREDENTIALS = "Username atau password salah.";

/**
 * A valid bcrypt hash of a value nobody can supply, used to keep the comparison
 * cost identical when the username does not exist. Without it, a missing user
 * returns noticeably faster and the response time becomes a username oracle.
 */
const DUMMY_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.6Ks8nF1M1MZnLp3gEsAUGaLhCg0yMHy";

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const { username, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        teamMemberId: true,
        passwordHash: true,
      },
    });

    const passwordMatches = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !user.isActive || !passwordMatches) {
      return fail(INVALID_CREDENTIALS);
    }

    await setSessionCookie({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      teamMemberId: user.teamMemberId,
    });

    return ok();
  } catch (error) {
    return handleUnexpected(
      "loginAction",
      error,
      "Gagal masuk. Silakan coba lagi.",
    );
  }
}

export async function firstTimeChangePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUserAllowPasswordChange();

  const parsed = firstTimePasswordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return fail("Pengguna tidak ditemukan.");
    }

    const currentMatches = await verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash,
    );

    if (!currentMatches) {
      return fail("Password saat ini salah.", {
        currentPassword: "Password saat ini salah.",
      });
    }

    const newHash = await hashPassword(parsed.data.newPassword);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // Refresh session cookie with mustChangePassword = false
    await setSessionCookie({
      ...currentUser,
      mustChangePassword: false,
    });

    return ok();
  } catch (error) {
    return handleUnexpected(
      "firstTimeChangePasswordAction",
      error,
      "Gagal mengubah password. Silakan coba lagi.",
    );
  }
}

export async function logoutAction(): Promise<never> {
  await clearSessionCookie();
  redirect("/login");
}

