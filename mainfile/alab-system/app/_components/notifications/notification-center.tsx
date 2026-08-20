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
  { value: "RESPONSE", label: "Responses" },
  { value: "ACCOUNT", label: "Accounts" },
];

export function NotificationCenter({
  apiPath,
  eyebrow = "LIVE ACCOUNT UPDATES",
  desktopVariant,
}: {
  apiPath: string;
  eyebrow?: string;
  desktopVariant?: "municipal";
}) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const { notifications, unreadCount, isLoading, error, markRead, markAllRead } = useNotifications(apiPath, 50);
  const visible = useMemo(() => notifications.filter((notification) => {
    if (filter === "ALL") return true;
    if (filter === "UNREAD") return !notification.readAt;
    return notification.category === filter;
  }), [filter, notifications]);

  return (
    <section className={`${styles.center} ${desktopVariant === "municipal" ? styles.municipalDesktop : ""}`}>
      <header className={styles.centerHeader}>
        <div className={styles.centerHeading}>
          <span className={styles.centerHeaderIcon} aria-hidden="true"><i className="fa-solid fa-bell" /></span>
          <span>
            <small className={styles.eyebrow}>{eyebrow}</small>
            <h1>Notifications</h1>
          </span>
        </div>
        <div className={styles.centerActions}>
          <span className={styles.livePill}><i className="fa-solid fa-circle" /> Live updates</span>
          {unreadCount > 0 && <button className={styles.markAllButton} type="button" onClick={() => void markAllRead()}>
            <i className="fa-solid fa-check-double" /> Mark all read
          </button>}
        </div>
      </header>
      <div className={styles.toolbar}>
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
        <span className={styles.centerSummary}>
          <span>{notifications.length} updates</span>
          <b>{unreadCount} unread</b>
        </span>
      </div>
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
