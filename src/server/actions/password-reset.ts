"use server";

import crypto from "crypto";

import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import {
  requestResetOtpSchema,
  verifyOtpAndResetPasswordSchema,
} from "@/lib/validation/auth";
import {
  buildOtpResetMessage,
  buildPasswordResetSuccessMessage,
  maskPhoneNumber,
  sanitizeIndonesianPhone,
} from "@/lib/whatsapp";
import { sendWhatsAppMessage } from "@/server/services/fonnte";

import { fail, fromZodError, handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export interface RequestOtpSuccessData {
  resetSessionId: string;
  maskedPhone: string;
}

export async function requestPasswordResetOtpAction(
  _prev: ActionResult<RequestOtpSuccessData> | null,
  formData: FormData,
): Promise<ActionResult<RequestOtpSuccessData>> {
  const parsed = requestResetOtpSchema.safeParse({
    identifier: formData.get("identifier"),
  });

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const rawInput = parsed.data.identifier.trim();

  try {
    // 1. Try finding by username
    let user = await prisma.user.findFirst({
      where: {
        username: { equals: rawInput, mode: "insensitive" },
      },
      include: {
        teamMember: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            phone: true,
          },
        },
      },
    });

    // 2. If not found by username, try finding by phone number
    if (!user) {
      const sanitizedInput = sanitizeIndonesianPhone(rawInput);
      if (sanitizedInput) {
        const teamMembers = await prisma.teamMember.findMany({
          where: {
            isActive: true,
            phone: { not: null },
            user: { isActive: true },
          },
          include: {
            user: {
              include: {
                teamMember: {
                  select: {
                    id: true,
                    fullName: true,
                    nickname: true,
                    phone: true,
                  },
                },
              },
            },
          },
        });

        const matched = teamMembers.find(
          (m) => sanitizeIndonesianPhone(m.phone) === sanitizedInput,
        );

        if (matched?.user) {
          user = matched.user;
        }
      }
    }

    if (!user || !user.isActive) {
      return fail(
        "Akun tidak ditemukan atau tidak aktif. Pastikan username atau nomor WhatsApp benar.",
      );
    }

    const phone = user.teamMember?.phone;
    if (!phone || !sanitizeIndonesianPhone(phone)) {
      return fail(
        "Akun ini belum memiliki nomor WhatsApp terdaftar di sistem. Silakan hubungi Admin.",
      );
    }

    // 3. Rate limiting check (minimum 60s cooldown between OTP requests)
    const lastToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (lastToken) {
      const elapsedMs = Date.now() - lastToken.createdAt.getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return fail(
          `Mohon tunggu ${waitSeconds} detik sebelum meminta kode OTP baru.`,
        );
      }
    }

    // 4. Invalidate older unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // 5. Generate secure 6-digit numeric OTP
    const otp = String(crypto.randomInt(100000, 1000000));
    const tokenHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const tokenRecord = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // 6. Send OTP message via WhatsApp (Fonnte)
    const displayName = user.teamMember?.nickname || user.name;
    const message = buildOtpResetMessage({
      name: displayName,
      otp,
    });

    const sendResult = await sendWhatsAppMessage({
      to: phone,
      message,
    });

    if (!sendResult.ok) {
      return fail(
        sendResult.error || "Gagal mengirimkan kode OTP ke WhatsApp Anda.",
      );
    }

    return ok({
      resetSessionId: tokenRecord.id,
      maskedPhone: maskPhoneNumber(phone),
    });
  } catch (error) {
    return handleUnexpected(
      "requestPasswordResetOtpAction",
      error,
      "Gagal memproses permintaan reset password. Silakan coba lagi.",
    );
  }
}

export async function resendPasswordResetOtpAction(
  resetSessionId: string,
): Promise<ActionResult<RequestOtpSuccessData>> {
  try {
    const existing = await prisma.passwordResetToken.findUnique({
      where: { id: resetSessionId },
      include: {
        user: {
          include: {
            teamMember: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!existing || existing.usedAt !== null) {
      return fail("Sesi reset tidak valid. Silakan mulai ulang dari awal.");
    }

    // Cooldown check
    const elapsedMs = Date.now() - existing.createdAt.getTime();
    const cooldownMs = 60 * 1000;
    if (elapsedMs < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return fail(
        `Mohon tunggu ${waitSeconds} detik sebelum meminta kirim ulang kode.`,
      );
    }

    const phone = existing.user.teamMember?.phone;
    if (!phone || !sanitizeIndonesianPhone(phone)) {
      return fail("Nomor WhatsApp tidak terdaftar.");
    }

    // Invalidate old token
    await prisma.passwordResetToken.deleteMany({
      where: { userId: existing.userId, usedAt: null },
    });

    // Generate new OTP
    const otp = String(crypto.randomInt(100000, 1000000));
    const tokenHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const tokenRecord = await prisma.passwordResetToken.create({
      data: {
        userId: existing.userId,
        tokenHash,
        expiresAt,
      },
    });

    const displayName =
      existing.user.teamMember?.nickname || existing.user.name;
    const message = buildOtpResetMessage({
      name: displayName,
      otp,
    });

    const sendResult = await sendWhatsAppMessage({
      to: phone,
      message,
    });

    if (!sendResult.ok) {
      return fail(
        sendResult.error || "Gagal mengirimkan kode OTP ke WhatsApp Anda.",
      );
    }

    return ok({
      resetSessionId: tokenRecord.id,
      maskedPhone: maskPhoneNumber(phone),
    });
  } catch (error) {
    return handleUnexpected(
      "resendPasswordResetOtpAction",
      error,
      "Gagal mengirim ulang kode OTP. Silakan coba lagi.",
    );
  }
}

export async function verifyOtpAndResetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = verifyOtpAndResetPasswordSchema.safeParse({
    resetSessionId: formData.get("resetSessionId"),
    otp: formData.get("otp"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const { resetSessionId, otp, newPassword } = parsed.data;

  try {
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { id: resetSessionId },
      include: {
        user: {
          include: {
            teamMember: {
              select: {
                nickname: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.usedAt !== null) {
      return fail("Sesi reset password tidak valid atau sudah digunakan.");
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      return fail(
        "Kode OTP sudah kadaluarsa (batas waktu 10 menit). Silakan minta kode baru.",
      );
    }

    if (tokenRecord.attempts >= 5) {
      return fail(
        "Batas percobaan OTP terlampaui (maksimal 5 kali). Silakan minta kode baru.",
      );
    }

    // Verify OTP using constant-time comparison
    const expectedBuf = Buffer.from(tokenRecord.tokenHash, "hex");
    const actualBuf = Buffer.from(hashOtp(otp), "hex");
    const isMatch =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isMatch) {
      await prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const remainingAttempts = 5 - (tokenRecord.attempts + 1);
      return fail(
        `Kode OTP salah. Sisa kesempatan: ${remainingAttempts} kali.`,
        { otp: "Kode OTP tidak cocok." },
      );
    }

    // OTP matches! Hash new password and update user
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
        },
      });
    });

    // Send confirmation WA in background
    if (tokenRecord.user.teamMember?.phone) {
      const displayName =
        tokenRecord.user.teamMember.nickname || tokenRecord.user.name;
      sendWhatsAppMessage({
        to: tokenRecord.user.teamMember.phone,
        message: buildPasswordResetSuccessMessage({ name: displayName }),
      }).catch((err) => {
        console.error("Gagal mengirim WA konfirmasi reset password:", err);
      });
    }

    return ok();
  } catch (error) {
    return handleUnexpected(
      "verifyOtpAndResetPasswordAction",
      error,
      "Gagal mereset password. Silakan coba lagi.",
    );
  }
}
