/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    pushSubscription: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    schedule: {
      findMany: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
    },
  },
}));

import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";
import {
  sendPushNotification,
  sendNotificationToUser,
  sendScheduleRemindersToday,
} from "./push-notification";

describe("Push Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
  });

  describe("sendPushNotification", () => {
    it("successfully sends push notification when webpush resolves", async () => {
      (webpush.sendNotification as any).mockResolvedValueOnce({});

      const sub = {
        endpoint: "https://fcm.googleapis.com/fcm/send/123",
        p256dh: "key_p256dh",
        auth: "key_auth",
      };

      const result = await sendPushNotification(sub, {
        title: "Test Judul",
        body: "Test Isi",
      });

      expect(result.success).toBe(true);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    });

    it("automatically deletes subscription if response status is 410 (expired)", async () => {
      const error: any = new Error("Subscription expired");
      error.statusCode = 410;
      (webpush.sendNotification as any).mockRejectedValueOnce(error);

      const sub = {
        endpoint: "https://fcm.googleapis.com/fcm/send/expired_endpoint",
        p256dh: "key_p256dh",
        auth: "key_auth",
      };

      const result = await sendPushNotification(sub, {
        title: "Test",
        body: "Test",
      });

      expect(result.success).toBe(false);
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: "https://fcm.googleapis.com/fcm/send/expired_endpoint" },
      });
    });
  });

  describe("sendNotificationToUser", () => {
    it("returns zero counts when user has no subscriptions", async () => {
      (prisma.pushSubscription.findMany as any).mockResolvedValueOnce([]);

      const result = await sendNotificationToUser("user-1", {
        title: "Halo",
        body: "Pesan",
      });

      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it("sends to all active subscriptions of user", async () => {
      (prisma.pushSubscription.findMany as any).mockResolvedValueOnce([
        {
          id: "sub-1",
          endpoint: "https://push.example.com/1",
          p256dh: "key1",
          auth: "auth1",
        },
        {
          id: "sub-2",
          endpoint: "https://push.example.com/2",
          p256dh: "key2",
          auth: "auth2",
        },
      ]);
      (webpush.sendNotification as any).mockResolvedValue({});

      const result = await sendNotificationToUser("user-1", {
        title: "Halo",
        body: "Pesan",
      });

      expect(result.sentCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });
  });

  describe("sendScheduleRemindersToday", () => {
    it("handles zero schedules gracefully", async () => {
      (prisma.schedule.findMany as any).mockResolvedValueOnce([]);
      (prisma.activity.findMany as any).mockResolvedValueOnce([]);

      const result = await sendScheduleRemindersToday();

      expect(result.totalTargetTeachers).toBe(0);
      expect(result.totalDevicesNotified).toBe(0);
      expect(result.totalSessionsToday).toBe(0);
    });
  });
});
