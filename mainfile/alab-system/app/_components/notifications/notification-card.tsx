"use client";

import Link from "next/link";

import type { AccountNotification, NotificationCategory } from "@/lib/notifications/types";
import styles from "./notification-ui.module.css";

const iconByCategory: Record<NotificationCategory, string> = {
  INCIDENT: "fa-solid fa-fire-flame-curved",
  RESPONSE: "fa-solid fa-truck-medical",
  APPLICATION: "fa-solid fa-id-card",
  ACCOUNT: "fa-solid fa-user-shield",
  SYSTEM: "fa-solid fa-bell",
};

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(new Date(value));
}

export function NotificationCard({ notification, onOpen }: {
  notification: AccountNotification;
  onOpen: (notification: AccountNotification) => void;
}) {
  const body = (
    <>
      <span className={`${styles.iconTile} ${styles[`icon${notification.category}`]}`} aria-hidden="true">
        <i className={iconByCategory[notification.category]} />
      </span>
      <span className={styles.cardCopy}>
        <span className={styles.cardTitle}>{notification.title}</span>
        <span className={styles.cardSummary}>{notification.summary}</span>
      </span>
      <span className={styles.cardMeta}>
        {!notification.readAt && <span className={styles.unreadDot} aria-label="Unread" />}
        <time dateTime={notification.createdAt}>{relativeTime(notification.createdAt)}</time>
      </span>
    </>
  );

  if (notification.actionHref) {
    return (
      <Link
        href={notification.actionHref}
        className={`${styles.card} ${!notification.readAt ? styles.cardUnread : ""}`}
        aria-label={`Open ${notification.title}`}
        onClick={() => onOpen(notification)}
      >
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={`${styles.card} ${styles.cardButton} ${!notification.readAt ? styles.cardUnread : ""}`}
      aria-label={`Read ${notification.title}`}
      onClick={() => onOpen(notification)}
    >
      {body}
    </button>
  );
}
