self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url;
  const targetUrl = typeof requestedUrl === "string" && requestedUrl.startsWith("/resident/")
    ? requestedUrl
    : "/resident/notifications";
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url.includes("/resident/"));
    if (existing) {
      await existing.focus();
      if ("navigate" in existing) await existing.navigate(targetUrl);
      return;
    }
    await clients.openWindow(targetUrl);
  })());
});
