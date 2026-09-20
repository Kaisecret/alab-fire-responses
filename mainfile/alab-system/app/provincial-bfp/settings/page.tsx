'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ALARM_DOCTRINE,
  NEARBY_RADIUS_METERS,
  SECOND_ALARM_MUNICIPALITIES,
  type AlarmLevel,
} from '../../../lib/incidents/alarm-doctrine';

type ProvincialIdentity = {
  displayName: string;
  rankOrPosition: string;
  email: string;
  province: string;
  mustChangePassword: boolean;
};

type NotificationItem = { id: string; title: string; createdAt: string; readAt: string | null };
type NotificationFeed = { unreadCount: number; notifications: NotificationItem[] };

type ProvinceCounts = {
  totalMunicipalities: number;
  totalStations: number;
  totalPersonnel: number;
  totalResidents: number;
  pendingApplications: number;
  updatedAt: string;
};

const ALARM_LEVELS: AlarmLevel[] = [1, 2, 3, 4];
const RADIUS_KM = NEARBY_RADIUS_METERS / 1000;

const styles = `
  .pset {
    width: 100%;
    max-width: 1560px;
    margin: 0 auto;
    padding: 10px 24px 50px;
    color: #0f172a;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    box-sizing: border-box;
  }
  .pset ::selection { background: #fee2e2; color: #7f1d1d; }
  .pset :is(a, button):focus-visible {
    outline: 3px solid rgba(226, 54, 50, 0.24);
    outline-offset: 2px;
  }

  .pset__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }
  .pset__head h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f172a;
  }
  .pset__refresh {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 700;
    color: #475569;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 7px 14px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .pset__refresh:hover:not(:disabled) { color: #0f172a; background: #f1f5f9; border-color: #cbd5e1; }
  .pset__refresh:disabled { cursor: progress; opacity: 0.7; }

  .pset__alert {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
    padding: 14px 18px;
    border: 1px solid #fecaca;
    border-radius: 16px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 13px;
    font-weight: 700;
  }
  .pset__alert button {
    padding: 6px 14px;
    border: 1px solid #fca5a5;
    border-radius: 10px;
    background: #ffffff;
    color: #b91c1c;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .pset__grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.95fr);
    gap: 20px;
    align-items: stretch;
  }
  .pset__col {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  .pset__card {
    min-width: 0;
    border: 1px solid #e2e8f0;
    border-radius: 24px;
    background: #ffffff;
    box-shadow: 0 6px 24px -4px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.03);
    overflow: hidden;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .pset__card:hover { border-color: #cbd5e1; box-shadow: 0 10px 32px -4px rgba(15, 23, 42, 0.09); }

  /* ---------- Identity ---------- */
  .pset__profile {
    padding: 30px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    height: 100%;
    box-sizing: border-box;
  }
  .pset__card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
  }
  .pset__badge-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #047857;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    padding: 6px 12px;
    border-radius: 9999px;
  }
  .pset__badge-status--due { color: #b45309; background: #fffbeb; border-color: #fde68a; }
  .pset__pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    animation: pset-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
  }
  .pset__badge-status--due .pset__pulse-dot { background: #f59e0b; }
  @keyframes pset-pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }

  .pset__identity { display: flex; align-items: center; gap: 22px; }
  .pset__avatar {
    flex: 0 0 88px;
    width: 88px;
    height: 88px;
    border: 1px solid #d7e0ea;
    border-radius: 26px;
    display: grid;
    place-items: center;
    color: #334155;
    background: #f8fafc;
    box-shadow: 0 10px 24px rgba(15, 23, 42, .08);
  }
  .pset__avatar svg { width: 42px; height: 42px; display: block; }
  .pset__identity-text { min-width: 0; }
  .pset__identity-text strong {
    display: block;
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  .pset__role {
    display: inline-block;
    margin-top: 4px;
    color: #e23632;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: .02em;
  }
  .pset__identity-sub { margin: 6px 0 0; color: #64748b; font-size: 12.5px; font-weight: 600; }

  /* ---------- Field bento ---------- */
  .pset__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: auto;
  }
  .pset__field {
    min-height: 94px;
    padding: 18px 20px;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.18s ease;
  }
  .pset__field:hover { border-color: #cbd5e1; background: #ffffff; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04); }
  .pset__field-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-size: 18px;
  }
  .pset__field-icon--red { background: #fee2e2; color: #dc2626; }
  .pset__field-icon--blue { background: #dbeafe; color: #2563eb; }
  .pset__field-icon--purple { background: #ede9fe; color: #7c3aed; }
  .pset__field-icon--green { background: #dcfce7; color: #16a34a; }
  .pset__field-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .pset__field small {
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  .pset__field strong { overflow-wrap: anywhere; font-size: 14.5px; font-weight: 700; color: #0f172a; }
  .pset__field-action {
    margin-top: 2px;
    font-size: 12px;
    font-weight: 700;
    color: #e23632;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .pset__field-action:hover { text-decoration: underline; }

  /* ---------- Alarm doctrine ---------- */
  .pset__doctrine { padding: 24px 30px 26px; display: grid; gap: 14px; }
  .pset__section-title {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
  }
  .pset__section-title i { color: #e23632; font-size: 18px; }
  .pset__title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .pset__chip {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #475569;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 5px 11px;
    border-radius: 9999px;
  }

  .pset__levels { display: grid; gap: 10px; }
  .pset__level {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 64px;
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: #f8fafc;
    transition: all 0.15s ease;
  }
  .pset__level:hover { border-color: #cbd5e1; background: #ffffff; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); }
  .pset__level-no {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 13px;
    display: grid;
    place-items: center;
    background: #fee2e2;
    color: #dc2626;
    font-size: 15px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .pset__level--auto .pset__level-no { background: #dcfce7; color: #16a34a; }
  .pset__level-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .pset__level-body strong { font-size: 14px; font-weight: 800; color: #0f172a; }
  .pset__level-body small { color: #64748b; font-size: 12px; line-height: 1.45; }
  .pset__level-who {
    flex-shrink: 0;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 5px 10px;
    border-radius: 9999px;
    white-space: nowrap;
  }
  .pset__level--auto .pset__level-who { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
  .pset__note {
    margin: 2px 0 0;
    max-width: 68ch;
    color: #64748b;
    font-size: 12.5px;
    line-height: 1.6;
  }
  .pset__note b { color: #0f172a; font-weight: 800; font-variant-numeric: tabular-nums; }

  /* ---------- Security ---------- */
  .pset__security { padding: 24px; display: grid; gap: 16px; }
  .pset__security-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }
  .pset__security-status span {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pset__security-status span i { color: #16a34a; }
  .pset__security-status small { color: #64748b; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
  .pset__btn-dark {
    width: 100%;
    min-height: 48px;
    padding: 12px;
    border-radius: 14px;
    background: #0f172a;
    color: #ffffff;
    border: none;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: .02em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-decoration: none;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
    transition: background 0.15s ease, transform 0.1s ease;
  }
  .pset__btn-dark:hover { background: #1e293b; transform: translateY(-1px); }

  /* ---------- Notifications ---------- */
  .pset__notif { padding: 24px; display: grid; gap: 14px; flex: 1; }
  .pset__status {
    min-height: 68px;
    padding: 14px 16px;
    border: 1px solid #bbf7d0;
    border-radius: 16px;
    background: #f0fdf4;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .pset__status--unread { border-color: #fecaca; background: #fef2f2; }
  .pset__status-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    color: #047857;
    background: #dcfce7;
    font-size: 18px;
    flex-shrink: 0;
  }
  .pset__status--unread .pset__status-icon { color: #b91c1c; background: #fee2e2; }
  .pset__status strong { color: #065f46; font-size: 13.5px; display: block; }
  .pset__status small { margin-top: 2px; color: #166534; font-size: 11.5px; display: block; }
  .pset__status--unread strong { color: #991b1b; }
  .pset__status--unread small { color: #b91c1c; }

  .pset__rows { display: grid; gap: 10px; }
  .pset__row {
    min-height: 48px;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
    background: #f8fafc;
    transition: all 0.15s ease;
  }
  .pset__row:hover { border-color: #cbd5e1; color: #0f172a; background: #ffffff; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); }
  .pset__row-inner { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .pset__row-inner i { color: #e23632; font-size: 13px; flex-shrink: 0; }
  .pset__row-inner > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pset__row-meta { color: #94a3b8; font-size: 11px; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .pset__xn {
    flex-shrink: 0;
    padding: 2px 7px;
    border-radius: 7px;
    background: #fee2e2;
    color: #b91c1c;
    font-size: 10.5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .pset__row-value { color: #0f172a; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .pset__row-value--due { color: #b45309; }

  .pset__actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 4px; }
  .pset__link {
    min-height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #ffffff;
    background: #e23632;
    border: none;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.25);
    transition: background 0.15s ease, transform 0.1s ease;
  }
  .pset__link:hover:not(:disabled) { background: #c42724; transform: translateY(-1px); }
  .pset__link--ghost {
    color: #475569;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    box-shadow: none;
  }
  .pset__link--ghost:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; transform: none; }
  .pset__link:disabled { opacity: 0.55; cursor: default; transform: none; }

  .pset__empty { color: #64748b; font-size: 12.5px; padding: 4px 2px; }
  .pset__skel {
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(90deg, #f1f5f9 20%, #f8fafc 50%, #f1f5f9 80%);
    background-size: 220% 100%;
    animation: pset-shimmer 1.4s infinite linear;
  }
  .pset__skel--lg { height: 88px; border-radius: 20px; }
  @keyframes pset-shimmer { to { background-position: -220% 0; } }

  @media (max-width: 900px) {
    .pset { padding: 12px 14px 40px; }
    .pset__grid { grid-template-columns: 1fr; }
    .pset__fields { grid-template-columns: 1fr; }
    .pset__profile, .pset__doctrine { padding: 22px 20px; }
    .pset__identity { gap: 16px; }
    .pset__level { flex-wrap: wrap; }
    .pset__actions { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pset *, .pset *::before { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

const timeFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });
const counter = new Intl.NumberFormat('en-PH');

/** Five identical alerts are one event repeated, so they are shown that way. */
function groupRepeats(items: NotificationItem[]) {
  const grouped: Array<NotificationItem & { repeats: number }> = [];
  for (const item of items) {
    const previous = grouped[grouped.length - 1];
    if (previous && previous.title === item.title && Boolean(previous.readAt) === Boolean(item.readAt)) {
      previous.repeats += 1;
      continue;
    }
    grouped.push({ ...item, repeats: 1 });
  }
  return grouped;
}

export default function ProvincialSettingsPage() {
  const [identity, setIdentity] = useState<ProvincialIdentity | null>(null);
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [counts, setCounts] = useState<ProvinceCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      const options = { signal: controller.signal, cache: 'no-store' as const };
      try {
        const [meResponse, feedResponse, countsResponse] = await Promise.all([
          fetch('/api/provincial-bfp/me', options),
          fetch('/api/provincial-bfp/notifications?limit=12', options),
          fetch('/api/provincial-bfp/management-summary', options),
        ]);

        if (controller.signal.aborted) return;
        if (!meResponse.ok) {
          const body = await meResponse.json().catch(() => ({}));
          throw new Error(body.error || 'Unable to load your provincial profile.');
        }

        const me = await meResponse.json();
        setIdentity(me.user ?? null);
        setFeed(feedResponse.ok ? await feedResponse.json().catch(() => null) : null);
        setCounts(countsResponse.ok ? await countsResponse.json().catch(() => null) : null);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Unable to load settings.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [revision]);

  const markAllRead = useCallback(async () => {
    if (marking) return;
    setMarking(true);
    try {
      const response = await fetch('/api/provincial-bfp/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to mark notifications read.');
      }
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark notifications read.');
    } finally {
      setMarking(false);
    }
  }, [marking]);

  const alerts = useMemo(() => groupRepeats(feed?.notifications ?? []).slice(0, 4), [feed]);
  const unread = feed?.unreadCount ?? 0;
  const municipalities = counts?.totalMunicipalities ?? 18;
  const passwordDue = Boolean(identity?.mustChangePassword);

  const reachLabel = (level: AlarmLevel) => {
    if (level === 1) return 'Own stations';
    if (level === 2) return `${SECOND_ALARM_MUNICIPALITIES} nearest`;
    if (level === 3) return `Within ${RADIUS_KM} km`;
    return `All ${municipalities}`;
  };

  return (
    <div className="pset">
      <style>{styles}</style>

      <div className="pset__head">
        <h1>Settings</h1>
        <button type="button" className="pset__refresh" onClick={() => setRevision((value) => value + 1)} disabled={loading}>
          <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-rotate'}`} aria-hidden="true" />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="pset__alert" role="alert">
          <span><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}</span>
          <button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button>
        </div>
      )}

      <div className="pset__grid">
        <div className="pset__col">
          {/* Identity */}
          <section className="pset__card" aria-label="Account">
            <div className="pset__profile">
              <div className="pset__card-header">
                <span className={`pset__badge-status${passwordDue ? ' pset__badge-status--due' : ''}`}>
                  <span className="pset__pulse-dot" aria-hidden="true" />
                  {passwordDue ? 'Password change required' : 'Verified provincial officer'}
                </span>
                <Link href="/provincial-bfp/change-password" className="pset__refresh" style={{ textDecoration: 'none' }}>
                  <i className="fa-solid fa-key" aria-hidden="true" /> Change password
                </Link>
              </div>

              <div className="pset__identity">
                <div className="pset__avatar" data-provincial-profile-avatar>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="pset__identity-text">
                  {loading && !identity ? (
                    <div className="pset__skel pset__skel--lg" style={{ width: 240 }} aria-hidden="true" />
                  ) : (
                    <>
                      <strong>{identity?.displayName ?? 'Provincial Administrator'}</strong>
                      <span className="pset__role">{identity?.rankOrPosition ?? 'Provincial Fire Marshal'}</span>
                      <p className="pset__identity-sub">Antique BFP Provincial Headquarters · Region VI</p>
                    </>
                  )}
                </div>
              </div>

              <div className="pset__fields">
                <div className="pset__field">
                  <div className="pset__field-icon pset__field-icon--red" aria-hidden="true">
                    <i className="fa-solid fa-envelope" />
                  </div>
                  <div className="pset__field-body">
                    <small>Email</small>
                    <strong>{identity?.email ?? '—'}</strong>
                  </div>
                </div>

                <div className="pset__field">
                  <div className="pset__field-icon pset__field-icon--blue" aria-hidden="true">
                    <i className="fa-solid fa-map-location-dot" />
                  </div>
                  <div className="pset__field-body">
                    <small>Jurisdiction</small>
                    <strong>Province of {identity?.province ?? 'Antique'}</strong>
                  </div>
                </div>

                <div className="pset__field">
                  <div className="pset__field-icon pset__field-icon--purple" aria-hidden="true">
                    <i className="fa-solid fa-id-badge" />
                  </div>
                  <div className="pset__field-body">
                    <small>Assignment</small>
                    <strong>PROVINCIAL ADMIN</strong>
                  </div>
                </div>

                <div className="pset__field">
                  <div className="pset__field-icon pset__field-icon--green" aria-hidden="true">
                    <i className="fa-solid fa-lock" />
                  </div>
                  <div className="pset__field-body">
                    <small>Account security</small>
                    <strong>{passwordDue ? 'Temporary password' : 'Password active'}</strong>
                    <Link href="/provincial-bfp/change-password" className="pset__field-action">
                      Change password <i className="fa-solid fa-arrow-right" style={{ fontSize: 10 }} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Alarm doctrine */}
          <section className="pset__card" aria-label="Alarm doctrine">
            <div className="pset__doctrine">
              <div className="pset__title-row">
                <h2 className="pset__section-title">
                  <i className="fa-solid fa-tower-broadcast" aria-hidden="true" />
                  Alarm doctrine
                </h2>
                <span className="pset__chip">Standing order</span>
              </div>

              <div className="pset__levels">
                {ALARM_LEVELS.map((level) => {
                  const definition = ALARM_DOCTRINE[level];
                  const automatic = !definition.declarable;
                  return (
                    <article className={`pset__level${automatic ? ' pset__level--auto' : ''}`} key={level}>
                      <span className="pset__level-no" aria-hidden="true">{level}</span>
                      <span className="pset__level-body">
                        <strong>{definition.label} — {reachLabel(level)}</strong>
                        <small>{definition.summary}</small>
                      </span>
                      <span className="pset__level-who">{automatic ? 'Automatic' : 'Province declares'}</span>
                    </article>
                  );
                })}
              </div>

              <p className="pset__note">
                Reach is measured from the fire, not the municipal hall. A 2nd alarm calls the{' '}
                <b>{SECOND_ALARM_MUNICIPALITIES}</b> nearest municipalities, a 3rd everything within <b>{RADIUS_KM} km</b>,
                a 4th all <b>{municipalities}</b>. Fixed province-wide so every municipality is served by the same rule.
              </p>
            </div>
          </section>
        </div>

        <div className="pset__col">
          {/* Account security */}
          <section className="pset__card" aria-label="Account security">
            <div className="pset__security">
              <h2 className="pset__section-title">
                <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                Account Security
              </h2>

              <div className="pset__security-status">
                <span>
                  <i className={`fa-solid ${passwordDue ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} aria-hidden="true" />
                  {passwordDue ? 'Temporary password active' : 'Encrypted & Active'}
                </span>
                <small>scrypt + salted</small>
              </div>

              <Link href="/provincial-bfp/change-password" className="pset__btn-dark">
                <i className="fa-solid fa-key" aria-hidden="true" /> Update password
              </Link>
            </div>
          </section>

          {/* Notification service */}
          <section className="pset__card" aria-label="Notification service">
            <div className="pset__notif">
              <h2 className="pset__section-title">
                <i className="fa-solid fa-bell" aria-hidden="true" />
                Notification service
              </h2>

              <div className={`pset__status${unread > 0 ? ' pset__status--unread' : ''}`}>
                <span className="pset__status-icon" aria-hidden="true">
                  <i className={`fa-solid ${unread > 0 ? 'fa-bell' : 'fa-circle-check'}`} />
                </span>
                <span>
                  <strong>
                    {unread > 0 ? `${counter.format(unread)} unread notification${unread === 1 ? '' : 's'}` : 'In-app notifications active'}
                  </strong>
                  <small>Updates every 5 seconds while this tab is open.</small>
                </span>
              </div>

              {loading && !feed ? (
                <div className="pset__rows" aria-hidden="true">
                  {[0, 1, 2].map((row) => <div className="pset__skel" key={row} />)}
                </div>
              ) : alerts.length > 0 ? (
                <div className="pset__rows">
                  {alerts.map((item) => (
                    <div className="pset__row" key={item.id}>
                      <span className="pset__row-inner">
                        <i className={`fa-solid ${item.readAt ? 'fa-envelope-open' : 'fa-fire'}`} aria-hidden="true" />
                        <span>{item.title}</span>
                        {item.repeats > 1 && <b className="pset__xn">×{item.repeats}</b>}
                      </span>
                      <span className="pset__row-meta">{timeFormat.format(new Date(item.createdAt))}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pset__empty">Nothing new.</p>
              )}

              <div className="pset__actions">
                <button type="button" className="pset__link pset__link--ghost" onClick={markAllRead} disabled={marking || unread === 0}>
                  <i className={`fa-solid ${marking ? 'fa-circle-notch fa-spin' : 'fa-check-double'}`} aria-hidden="true" />
                  {marking ? 'Marking' : 'Mark all read'}
                </button>
                <Link href="/provincial-bfp/notifications" className="pset__link">
                  <i className="fa-solid fa-table-cells-large" aria-hidden="true" /> Open center
                </Link>
              </div>
            </div>
          </section>

          {/* Province */}
          <section className="pset__card" aria-label="Province">
            <div className="pset__notif">
              <div className="pset__title-row">
                <h2 className="pset__section-title">
                  <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
                  Province
                </h2>
                {counts && <span className="pset__chip">{timeFormat.format(new Date(counts.updatedAt))}</span>}
              </div>

              {loading && !counts ? (
                <div className="pset__rows" aria-hidden="true">
                  {[0, 1, 2].map((row) => <div className="pset__skel" key={row} />)}
                </div>
              ) : counts ? (
                <div className="pset__rows">
                  {[
                    { icon: 'fa-city', label: 'Municipalities', value: counts.totalMunicipalities, due: false },
                    { icon: 'fa-building-shield', label: 'Stations', value: counts.totalStations, due: false },
                    { icon: 'fa-user-group', label: 'Personnel', value: counts.totalPersonnel, due: false },
                    { icon: 'fa-house-user', label: 'Residents', value: counts.totalResidents, due: false },
                    { icon: 'fa-user-check', label: 'Awaiting review', value: counts.pendingApplications, due: counts.pendingApplications > 0 },
                  ].map((row) => (
                    <div className="pset__row" key={row.label}>
                      <span className="pset__row-inner">
                        <i className={`fa-solid ${row.icon}`} aria-hidden="true" />
                        <span>{row.label}</span>
                      </span>
                      <span className={`pset__row-value${row.due ? ' pset__row-value--due' : ''}`}>
                        {counter.format(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pset__empty">Province totals unavailable.</p>
              )}

              <Link href="/provincial-bfp/resident-applications" className="pset__link" style={{ marginTop: 4 }}>
                <i className="fa-solid fa-user-check" aria-hidden="true" /> Review applications
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
