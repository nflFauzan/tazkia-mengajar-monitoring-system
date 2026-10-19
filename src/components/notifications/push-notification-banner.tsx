"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellCheck, BellOff, BellRing, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getUserPushSubscriptionCountAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushNotificationAction,
} from "@/server/actions/notifications";

const FALLBACK_VAPID_PUBLIC_KEY =
  "BCxHLSJaqmUMJ4zmjLbLzT71A2b90VmFKDlimx49amZRqrQ1OqYfNOqkAAIKQJ_nStPELnYCRyoNS2rR2DVVYWg";

function isValidVapidKey(key?: string | null): boolean {
  if (!key) return false;
  const clean = key.replace(/['"]+/g, "").trim();
  return clean.length >= 80 && /^[A-Za-z0-9_-]+$/.test(clean);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const clean = base64String ? base64String.replace(/['"]+/g, "").trim() : "";
  const keyToDecode = isValidVapidKey(clean) ? clean : FALLBACK_VAPID_PUBLIC_KEY;

  const unpadded = keyToDecode.replace(/=+$/, "");
  const padding = "=".repeat((4 - (unpadded.length % 4)) % 4);
  const base64 = (unpadded + padding).replace(/-/g, "+").replace(/_/g, "/");

  try {
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (err) {
    console.warn("[Push] Error decoding VAPID key with atob, using fallback:", err);
    const fallbackBase64 = (FALLBACK_VAPID_PUBLIC_KEY + "=").replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(fallbackBase64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export function PushNotificationBanner() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidKey, setVapidKey] = useState<string>("");
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    const checkPushSupportAndStatus = async () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!isMounted) return;
      setIsSupported(supported);

      if (!supported) return;

      setPermission(Notification.permission);

      const [res, reg] = await Promise.all([
        getUserPushSubscriptionCountAction(),
        navigator.serviceWorker.ready,
      ]);

      if (!isMounted) return;

      if (res.ok) {
        setVapidKey(res.data.vapidPublicKey);
      }

      const sub = await reg.pushManager.getSubscription();
      if (!isMounted) return;

      if (sub) {
        setIsSubscribed(true);
        setCurrentEndpoint(sub.endpoint);
      } else {
        setIsSubscribed(false);
      }
    };

    const timer = setTimeout(() => {
      void checkPushSupportAndStatus();
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleSubscribe = () => {
    if (!isSupported) {
      toast.error("Browser ini tidak mendukung Web Push Notification.");
      return;
    }

    startTransition(async () => {
      try {
        let keyToUse = vapidKey;
        if (!isValidVapidKey(keyToUse)) {
          const resKey = await getUserPushSubscriptionCountAction();
          if (resKey.ok && isValidVapidKey(resKey.data.vapidPublicKey)) {
            keyToUse = resKey.data.vapidPublicKey;
            setVapidKey(keyToUse);
          }
        }
        if (!isValidVapidKey(keyToUse)) {
          keyToUse = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
        }
        if (!isValidVapidKey(keyToUse)) {
          keyToUse = FALLBACK_VAPID_PUBLIC_KEY;
        }

        const perm = await Notification.requestPermission();
        setPermission(perm);

        if (perm !== "granted") {
          toast.warning("Izin notifikasi tidak diberikan.");
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const convertedKey = urlBase64ToUint8Array(keyToUse);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        const subJson = subscription.toJSON();
        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
          throw new Error("Format subscription browser tidak lengkap.");
        }

        const res = await savePushSubscriptionAction({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          userAgent: navigator.userAgent,
        });

        if (!res.ok) {
          toast.error(res.error);
          return;
        }

        setIsSubscribed(true);
        setCurrentEndpoint(subJson.endpoint);
        toast.success("Notifikasi jadwal di perangkat ini berhasil diaktifkan!");
      } catch (err) {
        console.error("[Push] Error during subscription:", err);
        toast.error("Gagal mendaftarkan notifikasi pada perangkat ini.");
      }
    });
  };

  const handleUnsubscribe = () => {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }

        if (currentEndpoint) {
          await removePushSubscriptionAction(currentEndpoint);
        }

        setIsSubscribed(false);
        setCurrentEndpoint(null);
        toast.info("Notifikasi pengingat di perangkat ini dinonaktifkan.");
      } catch (err) {
        console.error("[Push] Error unsubscribing:", err);
        toast.error("Gagal menonaktifkan notifikasi.");
      }
    });
  };

  const handleTestNotification = () => {
    startTestTransition(async () => {
      const res = await sendTestPushNotificationAction();
      if (res.ok) {
        toast.success("Notifikasi uji coba terkirim! Cek layar atau status bar HP Anda.");
      } else {
        toast.error(res.error);
      }
    });
  };

  // If browser definitely doesn't support Push Notification
  if (isSupported === false) {
    return null;
  }

  // State 1: Permission is explicitly blocked by user in browser
  if (permission === "denied") {
    return (
      <div className="mb-6 rounded-lg border-2 border-border bg-muted/60 p-4 shadow-[var(--shadow-brutal-sm)]">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-destructive/15 text-destructive">
            <BellOff className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-bold tracking-tight">
              Izin Notifikasi Diblokir
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Notifikasi browser Anda saat ini diblokir. Silakan izinkan notifikasi di pengaturan situs browser Anda untuk menerima pengingat jadwal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Already subscribed & active
  if (isSubscribed) {
    return (
      <div className="mb-6 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 shadow-[var(--shadow-brutal-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-primary/30 bg-primary/15 text-primary">
              <BellCheck className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-heading text-sm font-bold tracking-tight">
                  Pengingat Jadwal Aktif di Perangkat Ini
                </p>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                >
                  Tersambung
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5">
                Layar HP/laptop Anda akan berbunyi dan memunculkan pop-up saat ada jadwal mengajar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestNotification}
              disabled={isTesting || isPending}
              className="text-xs h-8 gap-1.5"
            >
              {isTesting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Uji Coba Notifikasi
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUnsubscribe}
              disabled={isPending || isTesting}
              className="text-xs h-8 text-muted-foreground hover:text-destructive"
            >
              Matikan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Not subscribed yet (Permission default or prompt)
  return (
    <div className="mb-6 rounded-lg border-2 border-border bg-card p-4 shadow-[var(--shadow-brutal)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-primary/10 text-primary">
            <BellRing className="size-5" />
          </div>
          <div>
            <p className="font-heading text-sm font-bold tracking-tight">
              Aktifkan Pengingat Jadwal di HP / Laptop
            </p>
            <p className="text-muted-foreground text-xs mt-0.5 max-w-xl">
              Dapatkan notifikasi pop-up langsung ke layar perangkat Anda saat ada jadwal mengajar. 100% otomatis tanpa perlu cek web terus-menerus.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubscribe}
          disabled={isPending}
          className="gap-2 shrink-0"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Bell className="size-4" />
          )}
          Aktifkan Notifikasi
        </Button>
      </div>
    </div>
  );
}
