"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { NotificationCard } from "./notification-card";
import styles from "./notification-ui.module.css";
import { useNotifications } from "./use-notifications";

export function NotificationBell({ apiPath, allHref, inverse = false }: {
  apiPath: string;
  allHref: string;
  inverse?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, error, markRead, markAllRead } = useNotifications(apiPath, 6);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className={styles.bellRoot} ref={containerRef}>
      <button
        type="button"
        className={`${styles.bellButton} ${inverse ? styles.bellInverse : ""}`}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <i className="fa-solid fa-bell" aria-hidden="true" />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {isOpen && (
        <>
          <button type="button" className={styles.mobileBackdrop} aria-label="Close notifications" onClick={() => setIsOpen(false)} />
          <section className={styles.popover} aria-label="Recent notifications">
            <header className={styles.popoverHeader}>
              <span>
                <strong>Notifications</strong>
                <small>{unreadCount ? `${unreadCount} unread` : "You’re all caught up"}</small>
              </span>
              {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()}>Mark all read</button>}
            </header>
            <div className={styles.popoverList}>
              {isLoading && <div className={styles.state}>Checking for updates…</div>}
              {!isLoading && error && <div className={styles.state}>{error}</div>}
              {!isLoading && !error && notifications.length === 0 && (
                <div className={styles.emptyState}>
                  <span><i className="fa-regular fa-bell" /></span>
                  <strong>No notifications yet</strong>
                  <small>Important updates will appear here.</small>
                </div>
              )}
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onOpen={(selected) => {
                    void markRead(selected.id);
                    setIsOpen(false);
                  }}
                />
              ))}
            </div>
            <Link className={styles.viewAll} href={allHref} onClick={() => setIsOpen(false)}>
              View notification center <i className="fa-solid fa-arrow-right" />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
