self.addEventListener("install", (event) => {
  console.log("[v0] Service Worker installing")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[v0] Service Worker activating")
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  console.log("[v0] Push message received")

  const options = {
    body: event.data ? event.data.text() : "New event update!",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  }

  event.waitUntil(self.registration.showNotification("EventHub", options))
})

self.addEventListener("notificationclick", (event) => {
  console.log("[v0] Notification click received")

  event.notification.close()

  event.waitUntil(clients.openWindow("/"))
})
