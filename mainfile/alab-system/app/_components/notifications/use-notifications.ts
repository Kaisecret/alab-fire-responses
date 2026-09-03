"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AccountNotification, NotificationFeed } from "@/lib/notifications/types";

const POLL_INTERVAL_MS = 5_000;

export function useNotifications(apiPath: string, limit = 25) {
  const cacheKey = `alab_cache_notifications_${apiPath}`;
  const [notifications, setNotifications] = useState<AccountNotification[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const feed = JSON.parse(cached) as NotificationFeed;
          return feed.notifications || [];
        }
      } catch {}
    }
    return [];
  });
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const feed = JSON.parse(cached) as NotificationFeed;
          return feed.unreadCount || 0;
        }
      } catch {}
    }
    return 0;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return !localStorage.getItem(cacheKey);
      } catch {}
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (requestInFlight.current || document.visibilityState !== "visible") return;
    requestInFlight.current = true;
    try {
      const response = await fetch(`${apiPath}?limit=${limit}`, { cache: "no-store" });
      if (!response.ok) throw new Error("NOTIFICATION_FETCH_FAILED");
      const feed = await response.json() as NotificationFeed;
      setNotifications(feed.notifications);
      setUnreadCount(feed.unreadCount);
      setError(null);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(feed));
      } catch {}
    } catch {
      const hasCached = notifications.length > 0 || (typeof window !== "undefined" && Boolean(localStorage.getItem(cacheKey)));
      if (!hasCached) {
        setError("Notifications are temporarily unavailable.");
      } else {
        setError(null);
      }
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
    }
  }, [apiPath, limit, cacheKey, notifications.length]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const markRead = useCallback(async (notificationId: string) => {
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target || target.readAt) return;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) =>
      notification.id === notificationId ? { ...notification, readAt } : notification));
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      const response = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!response.ok) throw new Error("NOTIFICATION_UPDATE_FAILED");
    } catch {
      await refresh();
    }
  }, [apiPath, notifications, refresh]);

  const markAllRead = useCallback(async () => {
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt ?? readAt })));
    setUnreadCount(0);
    try {
      const response = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!response.ok) throw new Error("NOTIFICATION_UPDATE_FAILED");
    } catch {
      await refresh();
    }
  }, [apiPath, refresh]);

  return { notifications, unreadCount, isLoading, error, refresh, markRead, markAllRead };
}
