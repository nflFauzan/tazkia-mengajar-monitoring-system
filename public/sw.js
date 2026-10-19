// Tazkia Mengajar Service Worker for Web Push Notifications

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {
    title: "Tazkia Mengajar",
    body: "Ada pemberitahuan jadwal kegiatan baru.",
    icon: "/brand/logo-tazkia-mengajar.png",
    badge: "/brand/logo-tazkia-mengajar.png",
    url: "/dashboard",
  };

  try {
    const json = event.data.json();
    payload = { ...payload, ...json };
  } catch {
    const text = event.data.text();
    if (text) {
      payload.body = text;
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || "/brand/logo-tazkia-mengajar.png",
    badge: payload.badge || "/brand/logo-tazkia-mengajar.png",
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || "/dashboard",
      dateOfArrival: Date.now(),
    },
    actions: payload.actions || [
      { action: "open", title: "Buka Aplikasi" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If there is already an open tab matching our domain, focus it
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
