import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";
import { getWibDateString } from "@/server/services/attendance-self";
import { getUpcomingIndonesianEvents } from "@/lib/indonesian-calendar";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

let isVapidConfigured = false;

function isValidVapidKey(key?: string | null, minLen = 10): boolean {
  if (!key) return false;
  const clean = key.replace(/['"\s\r\n]+/g, "").trim();
  return (
    clean.length >= minLen &&
    clean.length % 4 !== 1 &&
    /^[A-Za-z0-9_-]+$/.test(clean)
  );
}

function ensureVapidConfigured(): boolean {
  if (isVapidConfigured) return true;

  const rawPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const rawPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const rawSubject = process.env.VAPID_SUBJECT || "mailto:admin@tazkiamengajar.id";

  if (!isValidVapidKey(rawPublicKey, 10) || !isValidVapidKey(rawPrivateKey, 10)) {
    console.warn("[Push] VAPID keys not configured in environment variables.");
    return false;
  }

  const publicKey = rawPublicKey!.replace(/['"\s\r\n]+/g, "").trim();
  const privateKey = rawPrivateKey!.replace(/['"\s\r\n]+/g, "").trim();
  const subject = rawSubject.replace(/['"\s\r\n]+/g, "").trim();

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isVapidConfigured = true;
    return true;
  } catch (err) {
    console.error("[Push] Failed to configure VAPID details:", err);
    return false;
  }
}

/**
 * Sends a push notification to a specific subscription endpoint.
 * Automatically cleans up expired or invalid subscriptions (HTTP 404 / 410).
 */
export async function sendPushNotification(
  subscription: {
    id?: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushPayload,
): Promise<{ success: boolean; error?: string }> {
  if (!ensureVapidConfigured()) {
    return { success: false, error: "VAPID keys belum dikonfigurasi." };
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/brand/logo-tazkia-mengajar.png",
        badge: payload.badge || "/brand/logo-tazkia-mengajar.png",
        url: payload.url || "/dashboard",
      }),
    );
    return { success: true };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    // 404 Not Found or 410 Gone means the subscription is no longer valid or user revoked it
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.info(
        `[Push] Subscription expired or unsubscribed (${err.statusCode}). Removing endpoint: ${subscription.endpoint}`,
      );
      try {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint },
        });
      } catch (dbErr) {
        console.error("[Push] Failed to delete expired subscription:", dbErr);
      }
    } else {
      console.error("[Push] Error sending push notification:", err);
    }
    return { success: false, error: err.message || "Gagal mengirim push notification." };
  }
}

/**
 * Sends a push notification to all devices registered to a specific user.
 */
export async function sendNotificationToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sentCount: number; failedCount: number }> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sentCount: 0, failedCount: 0 };
  }

  let sentCount = 0;
  let failedCount = 0;

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload)),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  return { sentCount, failedCount };
}

export interface ScheduleReminderResult {
  totalTargetTeachers: number;
  totalDevicesNotified: number;
  totalSessionsToday: number;
  details: Array<{
    teacherName: string;
    sessionTitle: string;
    locationName: string;
    startTime: string;
    devicesNotified: number;
  }>;
}

/**
 * Dispatches push notifications to all teachers who have a teaching schedule today (WIB).
 */
export async function sendScheduleRemindersToday(): Promise<ScheduleReminderResult> {
  const todayStr = getWibDateString();
  const todayDate = new Date(`${todayStr}T00:00:00Z`);
  const currentDayOfWeek = new Date().getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // 1. Fetch active schedules that fall on today
  const activeSchedules = await prisma.schedule.findMany({
    where: {
      isActive: true,
      startDate: { lte: todayDate },
      OR: [
        { endDate: null },
        { endDate: { gte: todayDate } },
      ],
    },
    include: {
      location: { select: { name: true } },
      teamMembers: {
        include: {
          teamMember: {
            include: {
              user: {
                include: {
                  pushSubscriptions: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Filter schedules that match today's day of week or custom single date
  const todaySchedules = activeSchedules.filter((schedule) => {
    if (schedule.recurrence === "WEEKLY") {
      return schedule.daysOfWeek.includes(currentDayOfWeek);
    }
    // CUSTOM recurrence: check exact date
    const scheduleDateStr = schedule.startDate.toISOString().slice(0, 10);
    return scheduleDateStr === todayStr;
  });

  // 2. Also check Activities that are recorded for today (and not cancelled)
  const todayActivities = await prisma.activity.findMany({
    where: {
      date: todayDate,
      status: { not: "CANCELLED" },
    },
    include: {
      location: { select: { name: true } },
      teamMembers: {
        include: {
          teamMember: {
            include: {
              user: {
                include: {
                  pushSubscriptions: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Collect teachers and their sessions
  type TeacherSession = {
    userId: string;
    teacherName: string;
    sessionTitle: string;
    locationName: string;
    startTime: string;
    subscriptions: Array<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>;
  };

  const teacherSessionsMap = new Map<string, TeacherSession>();

  // Add from today schedules
  for (const s of todaySchedules) {
    for (const tm of s.teamMembers) {
      const user = tm.teamMember.user;
      if (!user) continue;
      const key = `${user.id}_${s.id}`;
      if (!teacherSessionsMap.has(key)) {
        teacherSessionsMap.set(key, {
          userId: user.id,
          teacherName: tm.teamMember.nickname || tm.teamMember.fullName,
          sessionTitle: s.title,
          locationName: s.location.name,
          startTime: s.startTime,
          subscriptions: user.pushSubscriptions,
        });
      }
    }
  }

  // Add from today activities
  for (const a of todayActivities) {
    for (const tm of a.teamMembers) {
      const user = tm.teamMember.user;
      if (!user) continue;
      const key = `${user.id}_activity_${a.id}`;
      if (!teacherSessionsMap.has(key)) {
        teacherSessionsMap.set(key, {
          userId: user.id,
          teacherName: tm.teamMember.nickname || tm.teamMember.fullName,
          sessionTitle: `Kegiatan di ${a.location.name}`,
          locationName: a.location.name,
          startTime: a.startTime,
          subscriptions: user.pushSubscriptions,
        });
      }
    }
  }

  let totalDevicesNotified = 0;
  const details: ScheduleReminderResult["details"] = [];

  for (const item of teacherSessionsMap.values()) {
    const payload: PushPayload = {
      title: "⏰ Pengingat Jadwal Mengajar Hari Ini!",
      body: `Halo Kak ${item.teacherName}, ada jadwal mengajar "${item.sessionTitle}" di ${item.locationName} pukul ${item.startTime} WIB. Jangan lupa presensi mandiri ya!`,
      icon: "/brand/logo-tazkia-mengajar.png",
      badge: "/brand/logo-tazkia-mengajar.png",
      url: "/absensi",
    };

    let itemNotified = 0;
    if (item.subscriptions.length > 0) {
      const results = await Promise.allSettled(
        item.subscriptions.map((sub) => sendPushNotification(sub, payload)),
      );
      for (const res of results) {
        if (res.status === "fulfilled" && res.value.success) {
          itemNotified++;
          totalDevicesNotified++;
        }
      }
    }

    details.push({
      teacherName: item.teacherName,
      sessionTitle: item.sessionTitle,
      locationName: item.locationName,
      startTime: item.startTime,
      devicesNotified: itemNotified,
    });
  }

  return {
    totalTargetTeachers: teacherSessionsMap.size,
    totalDevicesNotified,
    totalSessionsToday: todaySchedules.length + todayActivities.length,
    details,
  };
}

export interface CommemorativeReminderResult {
  totalEventsTriggered: number;
  totalDevicesNotified: number;
  events: Array<{
    name: string;
    dateKey: string;
    type: "H-3_PREPARATION" | "H-0_TODAY";
    devicesNotified: number;
  }>;
}

/**
 * Dispatches automated reminders for Indonesian commemorative days / holidays:
 * - H-3: Preparation reminder to design Instagram poster / carousel
 * - H-0: Today's reminder to publish content / poster on Instagram
 */
export async function sendCommemorativeDayReminders(): Promise<CommemorativeReminderResult> {
  const now = new Date();
  const upcomingEvents = getUpcomingIndonesianEvents(now, 3);

  // We notify on H-3 (daysRemaining === 3) and H-0 (daysRemaining === 0)
  const targetEvents = upcomingEvents.filter(
    (e) => e.daysRemaining === 3 || e.daysRemaining === 0,
  );

  if (targetEvents.length === 0) {
    return {
      totalEventsTriggered: 0,
      totalDevicesNotified: 0,
      events: [],
    };
  }

  // Fetch all active subscriptions across the system to notify team
  const subscriptions = await prisma.pushSubscription.findMany({
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (subscriptions.length === 0) {
    return {
      totalEventsTriggered: targetEvents.length,
      totalDevicesNotified: 0,
      events: targetEvents.map((e) => ({
        name: e.name,
        dateKey: e.dateKey,
        type: e.daysRemaining === 3 ? "H-3_PREPARATION" : "H-0_TODAY",
        devicesNotified: 0,
      })),
    };
  }

  let totalDevicesNotified = 0;
  const eventsResult: CommemorativeReminderResult["events"] = [];

  for (const event of targetEvents) {
    const isH3 = event.daysRemaining === 3;
    const type: "H-3_PREPARATION" | "H-0_TODAY" = isH3
      ? "H-3_PREPARATION"
      : "H-0_TODAY";

    const title = isH3
      ? `🎨 Pengingat Konten IG: 3 Hari Lagi ${event.name}!`
      : `📢 Hari Ini: ${event.name}!`;

    const body = isH3
      ? `Tanggal ${event.dateKey} adalah ${event.name}. ${
          event.suggestedContent
            ? `Ide poster: "${event.suggestedContent}"`
            : "Yuk siapkan desain poster Instagram dari sekarang!"
        }`
      : `Hari ini kita memperingati ${event.name}. Jangan lupa unggah poster & ucapan Instagram Tazkia Mengajar!`;

    const payload: PushPayload = {
      title,
      body,
      icon: "/brand/logo-tazkia-mengajar.png",
      badge: "/brand/logo-tazkia-mengajar.png",
      url: "/konten",
      tag: `commemorative-${event.dateKey}-${type}`,
    };

    let devicesNotified = 0;
    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendPushNotification(sub, payload)),
    );

    for (const res of results) {
      if (res.status === "fulfilled" && res.value.success) {
        devicesNotified++;
        totalDevicesNotified++;
      }
    }

    eventsResult.push({
      name: event.name,
      dateKey: event.dateKey,
      type,
      devicesNotified,
    });
  }

  return {
    totalEventsTriggered: targetEvents.length,
    totalDevicesNotified,
    events: eventsResult,
  };
}

export interface DailyAutomatedReminderResult {
  schedule: ScheduleReminderResult;
  commemorative: CommemorativeReminderResult;
}

/**
 * Complete autonomous daily dispatch triggered by cron (e.g. 07:00 AM WIB every day).
 * Sends both teaching session reminders and Instagram commemorative day reminders.
 */
export async function sendDailyAutomatedReminders(): Promise<DailyAutomatedReminderResult> {
  const [schedule, commemorative] = await Promise.all([
    sendScheduleRemindersToday(),
    sendCommemorativeDayReminders(),
  ]);

  return { schedule, commemorative };
}

