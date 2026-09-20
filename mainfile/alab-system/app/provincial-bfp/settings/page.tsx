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

/*
 * Where each level's bar ends on the shared axis.
 *
 * The axis reads "distance from the fire", so the third alarm's edge is the
 * 35 km tick and the fourth runs to the province edge. The first two have no
 * distance of their own — they are counted in municipalities — so they sit
 * proportionally inside the radius rather than claiming a measurement.
 */
const REACH_TICK = 64;
const REACH_EXTENT: Record<AlarmLevel, number> = { 1: 9, 2: 30, 3: REACH_TICK, 4: 100 };

const styles = `
  .cmd{--ink:#081A3A;--navy:#10234A;--body:#33506F;--muted:#5B7089;--line:#DCE6F2;--red:#D00F09;
    display:flex;flex-direction:column;gap:1.25rem;max-width:1080px;margin:0 auto;color:var(--body);font-family:inherit}
  .cmd ::selection{background:#FEE2E2;color:#7F1D1D}
  .cmd :is(a,button):focus-visible{outline:3px solid rgba(208,15,9,.28);outline-offset:3px;border-radius:8px}

  .cmd-util{display:flex;align-items:baseline;justify-content:space-between;gap:1rem}
  .cmd-util h1{margin:0;color:var(--muted);font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
  .cmd-refresh{display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .2rem;border:0;background:none;
    color:var(--muted);font:inherit;font-size:.75rem;font-weight:700;cursor:pointer;transition:color .15s ease}
  .cmd-refresh:hover:not(:disabled){color:var(--red)}
  .cmd-refresh:disabled{cursor:progress;opacity:.65}

  /* 1 — Identity. The officer, at the weight the page opens on. */
  .cmd-id{position:relative;padding:1.75rem 1.9rem;border-radius:16px;overflow:hidden;
    background:radial-gradient(120% 140% at 88% 0%,#1B3765 0%,#0B1C38 58%,#081428 100%);
    box-shadow:0 18px 40px -26px rgba(8,26,58,.75)}
  .cmd-id-top{display:flex;align-items:flex-start;justify-content:space-between;gap:1.5rem;flex-wrap:wrap}
  .cmd-id h2{margin:0;color:#FFF;font-size:clamp(1.6rem,3.4vw,2.15rem);font-weight:800;letter-spacing:-.035em;line-height:1.08}
  .cmd-id-meta{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .7rem;margin:.6rem 0 0;
    color:#A9C0DE;font-size:.86rem;font-weight:500}
  .cmd-id-meta b{color:#E2ECF9;font-weight:700}
  .cmd-id-sep{color:#48648C}
  .cmd-id-skel{height:34px;width:min(340px,70%);border-radius:8px;background:rgba(255,255,255,.14)}

  .cmd-pw{display:inline-flex;align-items:center;gap:.45rem;padding:.62rem 1.05rem;border:1px solid rgba(255,255,255,.22);
    border-radius:10px;background:rgba(255,255,255,.08);color:#FFF;font:inherit;font-size:.82rem;font-weight:700;
    text-decoration:none;white-space:nowrap;transition:background .16s ease,border-color .16s ease,transform .16s ease}
  .cmd-pw:hover{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.4);transform:translateY(-1px)}
  .cmd-pw--due{border-color:#FCA5A5;background:var(--red)}
  .cmd-pw--due:hover{background:#B91C1C;border-color:#FCA5A5}

  .cmd-warn{display:flex;align-items:center;gap:.5rem;margin:1.15rem 0 0;padding:.6rem .85rem;
    border:1px solid rgba(252,165,165,.45);border-radius:10px;background:rgba(220,38,38,.16);
    color:#FFD9D9;font-size:.8rem;font-weight:600;line-height:1.45}

  .cmd-error{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.8rem 1.1rem;
    border:1px solid #FECACA;border-radius:12px;background:#FEF2F2;color:#991B1B;font-size:.82rem;font-weight:600}
  .cmd-error button{padding:.3rem .7rem;border:1px solid #FCA5A5;border-radius:7px;background:#FFF;
    color:#B91C1C;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer}

  /* 2 — Doctrine. The centrepiece: one axis, four reaches. */
  .cmd-reach{padding:1.5rem 1.9rem 1.65rem;border:1px solid var(--line);border-radius:16px;background:#FFF;
    box-shadow:0 2px 10px rgba(15,23,42,.045)}
  .cmd-reach-top{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap}
  .cmd-reach h2{margin:0;color:var(--ink);font-size:1.12rem;font-weight:800;letter-spacing:-.02em}
  .cmd-reach-note{color:var(--muted);font-size:.78rem;font-weight:600}

  /* Levels and the axis share one column template, so the 35 km tick lands
     exactly where the third alarm's bar ends. */
  .cmd-axis{margin:1.4rem 0 0}
  .cmd-level,.cmd-axis-foot{display:grid;grid-template-columns:2.4rem minmax(0,1fr) 8.6rem;gap:.3rem .9rem}
  .cmd-level{align-items:center;padding:.7rem 0}
  .cmd-level+.cmd-level{border-top:1px solid #F1F5F9}
  .cmd-level-no{grid-row:span 3;align-self:start;width:2.4rem;height:2.4rem;display:grid;place-items:center;
    border-radius:9px;background:#FEF2F2;color:var(--red);font-size:.92rem;font-weight:800;font-variant-numeric:tabular-nums}
  .cmd-level-name{margin:0;color:var(--ink);font-size:.95rem;font-weight:800;letter-spacing:-.015em}
  .cmd-who{justify-self:end;color:var(--body);font-size:.67rem;font-weight:800;letter-spacing:.05em;
    text-transform:uppercase;white-space:nowrap}
  .cmd-who--auto{color:#0E7049}
  .cmd-bar{grid-column:2/-1;position:relative;height:9px;border-radius:999px;background:#EEF3F9;overflow:hidden}
  .cmd-bar i{position:absolute;inset:0;transform-origin:left center;border-radius:999px;
    background:linear-gradient(90deg,#E23632,#B91C1C);animation:cmdReach .5s cubic-bezier(.2,.75,.3,1) both}
  .cmd-bar--auto i{background:linear-gradient(90deg,#16865A,#0E7049)}
  @keyframes cmdReach{from{transform:scaleX(0)}}
  .cmd-level-sub{grid-column:2/-1;margin:0;color:var(--muted);font-size:.77rem;line-height:1.4}

  .cmd-axis-foot{padding-top:.2rem}
  .cmd-track{grid-column:2/-1;position:relative;height:1.7rem}
  .cmd-track::before{content:'';position:absolute;left:0;right:0;top:0;height:1px;background:var(--line)}
  .cmd-tick{position:absolute;top:0;transform:translateX(-50%);text-align:center;white-space:nowrap}
  .cmd-tick::before{content:'';display:block;width:1px;height:7px;margin:0 auto 3px;background:#B6C7DC}
  .cmd-tick span{color:var(--muted);font-size:.68rem;font-weight:800;letter-spacing:.05em;font-variant-numeric:tabular-nums}
  .cmd-tick--end{transform:translateX(-100%)}
  .cmd-tick--end::before{margin-right:0}

  .cmd-reach-foot{margin:1.1rem 0 0;padding-top:.95rem;border-top:1px solid var(--line);
    max-width:68ch;color:var(--muted);font-size:.8rem;line-height:1.6}
  .cmd-reach-foot b{color:var(--ink);font-weight:800;font-variant-numeric:tabular-nums}

  /* 3 — Status. Quiet, and the last thing read. */
  .cmd-strip{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:1.25rem;
    padding:1.3rem 1.9rem;border:1px solid var(--line);border-radius:16px;background:#FBFDFF}
  .cmd-strip h2{margin:0 0 .75rem;color:var(--muted);font-size:.68rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}

  .cmd-alerts{display:flex;flex-direction:column;gap:.5rem;min-width:0}
  .cmd-alert{display:flex;align-items:baseline;justify-content:space-between;gap:.85rem;min-width:0}
  .cmd-alert-name{display:flex;align-items:baseline;gap:.45rem;min-width:0;color:var(--ink);font-size:.83rem;font-weight:700}
  .cmd-alert-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cmd-dot{flex:0 0 auto;width:6px;height:6px;border-radius:50%;background:var(--red);transform:translateY(-1px)}
  .cmd-xn{flex:0 0 auto;padding:.05rem .32rem;border-radius:5px;background:#FEF2F2;color:#B91C1C;
    font-size:.68rem;font-weight:800;font-variant-numeric:tabular-nums}
  .cmd-alert-time{flex:0 0 auto;color:var(--muted);font-size:.73rem;font-variant-numeric:tabular-nums}

  .cmd-tally{display:flex;flex-wrap:wrap;gap:.35rem 1.5rem;min-width:0}
  .cmd-tally div{min-width:0}
  .cmd-tally dt{color:var(--muted);font-size:.68rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
  .cmd-tally dd{margin:.1rem 0 0;color:var(--ink);font-size:1.05rem;font-weight:800;font-variant-numeric:tabular-nums}
  .cmd-tally dd.due{color:#B45309}

  .cmd-links{display:flex;flex-wrap:wrap;gap:.45rem 1.1rem;margin-top:.95rem}
  .cmd-link{display:inline-flex;align-items:center;gap:.4rem;padding:.25rem 0;border:0;background:none;
    color:var(--red);font:inherit;font-size:.79rem;font-weight:800;text-decoration:none;cursor:pointer;
    transition:opacity .15s ease}
  .cmd-link:hover:not(:disabled){opacity:.7}
  .cmd-link:disabled{color:var(--muted);cursor:default;opacity:.8}

  .cmd-quiet{color:var(--muted);font-size:.8rem}
  .cmd-skel{height:11px;border-radius:999px;background:linear-gradient(90deg,#EDF2F7 20%,#F8FAFC 50%,#EDF2F7 80%);
    background-size:220% 100%;animation:cmdShimmer 1.4s infinite linear}
  .cmd-skel+.cmd-skel{margin-top:.6rem}
  @keyframes cmdShimmer{to{background-position:-220% 0}}

  @media(max-width:760px){
    .cmd-id,.cmd-reach,.cmd-strip{padding-left:1.15rem;padding-right:1.15rem}
    .cmd-strip{grid-template-columns:1fr;gap:1.4rem}
    .cmd-level,.cmd-axis-foot{grid-template-columns:2.4rem minmax(0,1fr)}
    .cmd-level-no{grid-row:span 4}
    .cmd-who{grid-column:2;justify-self:start}
  }
  @media(prefers-reduced-motion:reduce){.cmd *,.cmd *::before{animation-duration:.01ms!important;transition-duration:.01ms!important}}
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

  const reachLabel = (level: AlarmLevel) => {
    if (level === 1) return 'Own stations';
    if (level === 2) return `${SECOND_ALARM_MUNICIPALITIES} nearest`;
    if (level === 3) return `Within ${RADIUS_KM} km`;
    return `All ${municipalities}`;
  };

  return (
    <div className="cmd" style={{ padding: '1.25rem 1.5rem 3rem' }}>
      <style>{styles}</style>

      <div className="cmd-util">
        <h1>Settings</h1>
        <button type="button" className="cmd-refresh" onClick={() => setRevision((value) => value + 1)} disabled={loading}>
          <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-rotate'}`} aria-hidden="true" />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="cmd-error" role="alert">
          <span><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}</span>
          <button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button>
        </div>
      )}

      <section className="cmd-id" aria-label="Account">
        <div className="cmd-id-top">
          <div style={{ minWidth: 0 }}>
            {loading && !identity ? (
              <div className="cmd-id-skel" aria-hidden="true" />
            ) : (
              <>
                <h2>{identity?.displayName ?? 'Provincial Administrator'}</h2>
                <p className="cmd-id-meta">
                  <b>{identity?.rankOrPosition ?? 'Provincial Fire Marshal'}</b>
                  <span className="cmd-id-sep" aria-hidden="true">·</span>
                  <span>{identity?.email ?? 'Sign in again to load your account'}</span>
                  <span className="cmd-id-sep" aria-hidden="true">·</span>
                  <span>Province of {identity?.province ?? 'Antique'}</span>
                </p>
              </>
            )}
          </div>

          <Link
            href="/provincial-bfp/change-password"
            className={`cmd-pw${identity?.mustChangePassword ? ' cmd-pw--due' : ''}`}
          >
            <i className="fa-solid fa-key" aria-hidden="true" /> Change password
          </Link>
        </div>

        {identity?.mustChangePassword && (
          <p className="cmd-warn">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            Your temporary password is still active. Change it to keep official exports available.
          </p>
        )}
      </section>

      <section className="cmd-reach" aria-label="Alarm reach">
        <div className="cmd-reach-top">
          <h2>Alarm reach</h2>
          <span className="cmd-reach-note">Standing order · not configurable</span>
        </div>

        <div className="cmd-axis">
          {ALARM_LEVELS.map((level) => {
            const definition = ALARM_DOCTRINE[level];
            const automatic = !definition.declarable;
            return (
              <article className="cmd-level" key={level}>
                <span className="cmd-level-no" aria-hidden="true">{level}</span>
                <h3 className="cmd-level-name">{definition.label}</h3>
                <span className={`cmd-who${automatic ? ' cmd-who--auto' : ''}`}>
                  {automatic ? 'Automatic' : 'Province declares'}
                </span>
                <div className={`cmd-bar${automatic ? ' cmd-bar--auto' : ''}`} aria-hidden="true">
                  <i style={{ transform: `scaleX(${REACH_EXTENT[level] / 100})`, animationDelay: `${level * 70}ms` }} />
                </div>
                <p className="cmd-level-sub">{reachLabel(level)} — {definition.summary}</p>
              </article>
            );
          })}

          <div className="cmd-axis-foot" aria-hidden="true">
            <span />
            <div className="cmd-track">
              <span className="cmd-tick" style={{ left: `${REACH_TICK}%` }}><span>{RADIUS_KM} km</span></span>
              <span className="cmd-tick cmd-tick--end" style={{ left: '100%' }}><span>Province edge</span></span>
            </div>
          </div>
        </div>

        <p className="cmd-reach-foot">
          Reach is measured from the fire, not the municipal hall — a fire near a boundary is often closer to the
          neighbour&rsquo;s station than to its own. A 2nd alarm calls the <b>{SECOND_ALARM_MUNICIPALITIES}</b> nearest
          municipalities, a 3rd everything within <b>{RADIUS_KM} km</b>, a 4th all <b>{municipalities}</b>. Fixed
          province-wide so every municipality is served by the same rule.
        </p>
      </section>

      <section className="cmd-strip" aria-label="Status">
        <div className="cmd-alerts">
          <h2>Notifications{unread > 0 ? ` · ${counter.format(unread)} unread` : ''}</h2>

          {loading && !feed ? (
            <div aria-hidden="true">{[0, 1, 2].map((row) => <div className="cmd-skel" key={row} />)}</div>
          ) : alerts.length > 0 ? (
            alerts.map((item) => (
              <div className="cmd-alert" key={item.id}>
                <span className="cmd-alert-name">
                  {!item.readAt && <i className="cmd-dot" aria-hidden="true" />}
                  <span>{item.title}</span>
                  {item.repeats > 1 && <b className="cmd-xn">×{item.repeats}</b>}
                </span>
                <span className="cmd-alert-time">{timeFormat.format(new Date(item.createdAt))}</span>
              </div>
            ))
          ) : (
            <p className="cmd-quiet">Nothing new.</p>
          )}

          <div className="cmd-links">
            <button type="button" className="cmd-link" onClick={markAllRead} disabled={marking || unread === 0}>
              <i className={`fa-solid ${marking ? 'fa-circle-notch fa-spin' : 'fa-check-double'}`} aria-hidden="true" />
              {marking ? 'Marking' : 'Mark all read'}
            </button>
            <Link href="/provincial-bfp/notifications" className="cmd-link">
              Open all <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div>
          <h2>Province{counts ? ` · ${timeFormat.format(new Date(counts.updatedAt))}` : ''}</h2>

          {loading && !counts ? (
            <div aria-hidden="true">{[0, 1].map((row) => <div className="cmd-skel" key={row} />)}</div>
          ) : counts ? (
            <dl className="cmd-tally">
              <div><dt>Municipalities</dt><dd>{counter.format(counts.totalMunicipalities)}</dd></div>
              <div><dt>Stations</dt><dd>{counter.format(counts.totalStations)}</dd></div>
              <div><dt>Personnel</dt><dd>{counter.format(counts.totalPersonnel)}</dd></div>
              <div><dt>Residents</dt><dd>{counter.format(counts.totalResidents)}</dd></div>
              <div>
                <dt>Awaiting review</dt>
                <dd className={counts.pendingApplications > 0 ? 'due' : undefined}>
                  {counter.format(counts.pendingApplications)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="cmd-quiet">Province totals unavailable.</p>
          )}

          <div className="cmd-links">
            <Link href="/provincial-bfp/resident-applications" className="cmd-link">
              Review applications <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
