"use server";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  sendNotificationToUser,
  sendScheduleRemindersToday,
  type ScheduleReminderResult,
} from "@/server/services/push-notification";
import { fail, handleUnexpected, ok, type ActionResult } from "./types";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export async function savePushSubscriptionAction(
  input: PushSubscriptionInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  if (!input.endpoint || !input.keys?.p256dh || !input.keys?.auth) {
    return fail("Data subscription push notification tidak valid.");
  }

  try {
    const record = await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        userId: user.id,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent || null,
      },
      create: {
        userId: user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent || null,
      },
      select: { id: true },
    });

    return ok({ id: record.id });
  } catch (error) {
    return handleUnexpected(
      "savePushSubscriptionAction",
      error,
      "Gagal menyimpan pendaftaran notifikasi perangkat.",
    );
  }
}

export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<ActionResult> {
  const user = await requireUser();

  try {
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: user.id,
      },
    });

    return ok();
  } catch (error) {
    return handleUnexpected(
      "removePushSubscriptionAction",
      error,
      "Gagal menghapus pendaftaran notifikasi perangkat.",
    );
  }
}

export async function sendTestPushNotificationAction(): Promise<
  ActionResult<{ sentCount: number }>
> {
  const user = await requireUser();

  try {
    const { sentCount, failedCount } = await sendNotificationToUser(user.id, {
      title: "🔔 Notifikasi Tazkia Mengajar Aktif!",
      body: `Alhamdulillah, pengingat jadwal di perangkat Kak ${user.name} berhasil dihubungkan dan siap digunakan.`,
      url: "/dashboard",
    });

    if (sentCount === 0) {
      return fail(
        failedCount > 0
          ? "Gagal mengirim notifikasi ke perangkat Anda. Pastikan izin notifikasi di browser tidak diblokir."
          : "Belum ada perangkat terdaftar. Silakan klik 'Aktifkan Pengingat di HP' terlebih dahulu.",
      );
    }

    return ok({ sentCount });
  } catch (error) {
    return handleUnexpected(
      "sendTestPushNotificationAction",
      error,
      "Terjadi kendala saat mengirim notifikasi uji coba.",
    );
  }
}

export async function broadcastTodayScheduleRemindersAction(): Promise<
  ActionResult<ScheduleReminderResult>
> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return fail("Hanya Admin yang dapat memicu pengingat jadwal ke tim.");
  }

  try {
    const result = await sendScheduleRemindersToday();
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "broadcastTodayScheduleRemindersAction",
      error,
      "Gagal mengirimkan pengingat jadwal ke tim pengajar.",
    );
  }
}

const FALLBACK_VAPID_PUBLIC_KEY =
  "BCxHLSJaqmUMJ4zmjLbLzT71A2b90VmFKDlimx49amZRqrQ1OqYfNOqkAAIKQJ_nStPELnYCRyoNS2rR2DVVYWg";

function isValidVapidKey(key?: string | null): boolean {
  if (!key) return false;
  const clean = key.replace(/['"]+/g, "").trim();
  return clean.length >= 80 && /^[A-Za-z0-9_-]+$/.test(clean);
}

export async function getUserPushSubscriptionCountAction(): Promise<
  ActionResult<{ count: number; vapidPublicKey: string }>
> {
  const user = await requireUser();
  const count = await prisma.pushSubscription.count({
    where: { userId: user.id },
  });

  const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPublicKey = isValidVapidKey(rawKey)
    ? rawKey!.replace(/['"]+/g, "").trim()
    : FALLBACK_VAPID_PUBLIC_KEY;

  return ok({
    count,
    vapidPublicKey,
  });
}
