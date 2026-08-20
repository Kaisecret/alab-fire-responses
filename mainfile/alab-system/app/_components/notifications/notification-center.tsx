"use client";

import { useMemo, useState } from "react";

import type { NotificationCategory } from "@/lib/notifications/types";
import { NotificationCard } from "./notification-card";
import styles from "./notification-ui.module.css";
import { useNotifications } from "./use-notifications";

type Filter = "ALL" | "UNREAD" | NotificationCategory;
const filters: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "UNREAD", label: "Unread" },
  { value: "INCIDENT", label: "Incidents" },
  { value: "APPLICATION", label: "Applications" },
];

export function NotificationCenter({ apiPath, eyebrow = "LIVE ACCOUNT UPDATES" }: { apiPath: string; eyebrow?: string }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const { notifications, unreadCount, isLoading, error, markRead, markAllRead } = useNotifications(apiPath, 50);
  const visible = useMemo(() => notifications.filter((notification) => {
    if (filter === "ALL") return true;
    if (filter === "UNREAD") return !notification.readAt;
    return notification.category === filter;
  }), [filter, notifications]);

  return (
    <section className={styles.center}>
      <header className={styles.centerHeader}>
        <span>
          <small className={styles.eyebrow}><i className="fa-solid fa-circle" /> {eyebrow}</small>
          <h1>Notifications</h1>
          <p>Incident, response, and account updates in one place.</p>
        </span>
        {unreadCount > 0 && <button className={styles.markAllButton} type="button" onClick={() => void markAllRead()}>
          <i className="fa-solid fa-check-double" /> Mark all read
        </button>}
      </header>
      <nav className={styles.filters} aria-label="Notification filters">
        {filters.map((item) => (
          <button
            type="button"
            key={item.value}
            className={filter === item.value ? styles.filterActive : ""}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}{item.value === "UNREAD" && unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        ))}
      </nav>
      <div className={styles.centerList}>
        {isLoading && <div className={styles.state}>Loading account updates…</div>}
        {!isLoading && error && <div className={styles.state}>{error}</div>}
        {!isLoading && !error && visible.length === 0 && (
          <div className={styles.emptyStateLarge}>
            <span><i className="fa-regular fa-bell" /></span>
            <strong>No updates in this view</strong>
            <small>New activity will appear automatically.</small>
          </div>
        )}
        {visible.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} onOpen={(selected) => void markRead(selected.id)} />
        ))}
      </div>
    </section>
  );
}
