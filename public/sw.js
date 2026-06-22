const CACHE = "mentoria-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

// Recebe push em background (quando o app está fechado)
self.addEventListener("push", (e) => {
  let data = { title: "Mentoria BD", body: "Novo evento no formulário" };
  try { data = e.data.json(); } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
      data: { url: "/acessdash" },
    })
  );
});

// Abre o dashboard ao clicar na notificação
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes("/acessdash")) return c.focus();
      }
      return clients.openWindow("/acessdash");
    })
  );
});
