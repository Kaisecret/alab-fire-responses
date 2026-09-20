'use client';

import React, { useCallback, useEffect, useState } from 'react';
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

type NotificationFeed = {
  unreadCount: number;
  notifications: Array<{ id: string; title: string; createdAt: string; readAt: string | null }>;
};

type ProvinceCounts = {
  totalMunicipalities: number;
  totalStations: number;
  totalPersonnel: number;
  totalResidents: number;
  pendingApplications: number;
  updatedAt: string;
};

const ALARM_LEVELS: AlarmLevel[] = [1, 2, 3, 4];

const styles = `
  .pset{--ink:#0F172A;--body:#334155;--muted:#5B7089;--line:#E2E8F0;--red:#D00F09;display:flex;flex-direction:column;gap:1.1rem;font-family:inherit;color:var(--body)}
  .pset ::selection{background:#FEE2E2;color:#7F1D1D}
  .pset :is(button,a,input,select):focus-visible{outline:3px solid rgba(208,15,9,.24);outline-offset:2px}

  .pset-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
  .pset-head h1{margin:0;display:flex;align-items:center;gap:.55rem;color:var(--ink);font-size:1.45rem;font-weight:800;letter-spacing:-.02em}
  .pset-head h1 i{color:var(--red)}
  .pset-head p{margin:4px 0 0;color:var(--muted);font-size:.85rem}

  .pset-btn{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;min-height:38px;padding:.45rem .95rem;border:1px solid #CBD5E1;border-radius:8px;background:#FFF;color:#334155;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer;text-decoration:none;transition:background .15s ease,border-color .15s ease,transform .15s ease}
  .pset-btn:hover:not(:disabled){background:#F8FAFC;border-color:#94A3B8;transform:translateY(-1px)}
  .pset-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
  .pset-btn--primary{border-color:var(--red);background:linear-gradient(135deg,#D00F09,#DC2626);color:#FFF;box-shadow:0 2px 6px rgba(208,15,9,.3)}
  .pset-btn--primary:hover:not(:disabled){background:linear-gradient(135deg,#B91C1C,#C81E1E)}

  .pset-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:1.1rem;align-items:start}
  .pset-col{display:flex;flex-direction:column;gap:1.1rem;min-width:0}

  .pset-card{background:#FFF;border:1px solid var(--line);border-radius:12px;box-shadow:0 2px 8px rgba(15,23,42,.04);overflow:hidden}
  .pset-card-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.9rem 1.15rem;border-bottom:1px solid var(--line);background:#F8FAFC}
  .pset-card-head h2{margin:0;display:flex;align-items:center;gap:.5rem;color:var(--ink);font-size:.82rem;font-weight:800;letter-spacing:.045em;text-transform:uppercase}
  .pset-card-head h2 i{color:var(--red);font-size:.85rem}
  .pset-tag{padding:.2rem .5rem;border-radius:999px;background:#EEF2F7;color:#42566F;font-size:.66rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
  .pset-tag--live{background:#DCFCE7;color:#15803D}
  .pset-tag--fixed{background:#EEF2F7;color:#42566F}

  .pset-rows{display:flex;flex-direction:column}
  .pset-row{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.72rem 1.15rem;border-bottom:1px solid #F1F5F9}
  .pset-row:last-child{border-bottom:0}
  .pset-row dt{color:var(--muted);font-size:.72rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
  .pset-row dd{margin:0;color:var(--ink);font-size:.86rem;font-weight:700;text-align:right;word-break:break-word}

  .pset-actions{display:flex;flex-wrap:wrap;gap:.55rem;padding:.9rem 1.15rem;border-top:1px solid var(--line);background:#FCFDFE}

  .pset-alert{display:flex;align-items:center;gap:.55rem;padding:.7rem 1.15rem;background:#FFFBEB;border-bottom:1px solid #FDE68A;color:#92400E;font-size:.8rem;font-weight:700}
  .pset-alert--error{background:#FEF2F2;border-bottom-color:#FECACA;color:#991B1B;justify-content:space-between}

  .pset-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
  .pset-stat{padding:.95rem 1.15rem;border-right:1px solid #F1F5F9;border-bottom:1px solid #F1F5F9}
  .pset-stat:nth-child(2n){border-right:0}
  .pset-stat-value{color:var(--ink);font-size:1.5rem;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
  .pset-stat-label{margin-top:.15rem;color:var(--muted);font-size:.68rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
  .pset-stat--wide{grid-column:1/-1;border-right:0;border-bottom:0}

  .pset-doctrine{display:flex;flex-direction:column}
  .pset-level{display:grid;grid-template-columns:auto 1fr auto;gap:.3rem .85rem;align-items:center;padding:.8rem 1.15rem;border-bottom:1px solid #F1F5F9}
  .pset-level:last-child{border-bottom:0}
  .pset-level-badge{grid-row:span 2;width:34px;height:34px;display:grid;place-items:center;border-radius:9px;background:#FEF2F2;border:1px solid #FECACA;color:var(--red);font-size:.86rem;font-weight:800;font-variant-numeric:tabular-nums}
  .pset-level-name{color:var(--ink);font-size:.86rem;font-weight:800}
  .pset-level-summary{grid-column:2;color:var(--muted);font-size:.78rem;line-height:1.4}
  .pset-level-who{grid-row:span 2;color:#42566F;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
  .pset-level-who--auto{color:#15803D}

  .pset-note{padding:.75rem 1.15rem;border-top:1px solid var(--line);background:#FCFDFE;color:var(--muted);font-size:.75rem;line-height:1.5}
  .pset-note strong{color:var(--ink);font-variant-numeric:tabular-nums}

  .pset-feed{display:flex;flex-direction:column}
  .pset-feed-item{display:flex;align-items:baseline;justify-content:space-between;gap:.85rem;padding:.7rem 1.15rem;border-bottom:1px solid #F1F5F9}
  .pset-feed-item:last-child{border-bottom:0}
  .pset-feed-title{color:var(--ink);font-size:.81rem;font-weight:700}
  .pset-feed-title.unread::before{content:'';display:inline-block;width:6px;height:6px;margin-right:.45rem;border-radius:50%;background:var(--red);vertical-align:middle}
  .pset-feed-time{color:var(--muted);font-size:.72rem;font-variant-numeric:tabular-nums;white-space:nowrap}

  .pset-empty{padding:1.6rem 1.15rem;text-align:center;color:var(--muted);font-size:.8rem}
  .pset-skeleton{height:12px;margin:.85rem 1.15rem;border-radius:999px;background:linear-gradient(90deg,#EDF2F7 20%,#F8FAFC 50%,#EDF2F7 80%);background-size:220% 100%;animation:psetShimmer 1.35s infinite linear}
  @keyframes psetShimmer{to{background-position:-220% 0}}

  @media(max-width:1080px){.pset-grid{grid-template-columns:1fr}}
  @media(max-width:560px){
    .pset-row,.pset-feed-item{flex-direction:column;align-items:flex-start;gap:.2rem}
    .pset-row dd{text-align:left}
    .pset-stats{grid-template-columns:1fr}
    .pset-stat{border-right:0}
    .pset-level{grid-template-columns:auto 1fr}
    .pset-level-who{grid-row:auto;grid-column:2}
    .pset-actions .pset-btn{flex:1 1 auto}
  }
  @media(prefers-reduced-motion:reduce){.pset *,.pset *::before{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

const timeFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });
const counter = new Intl.NumberFormat('en-PH');

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
          fetch('/api/provincial-bfp/notifications?limit=5', options),
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

  const skeleton = <div aria-hidden="true">{[0, 1, 2].map((row) => <div className="pset-skeleton" key={row} />)}</div>;
  const unread = feed?.unreadCount ?? 0;

  return (
    <div className="pset" style={{ padding: '1.25rem 1.5rem 2.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <style>{styles}</style>

      <header className="pset-head">
        <div>
          <h1><i className="fa-solid fa-sliders" />Settings</h1>
          <p>Antique BFP Provincial Headquarters</p>
        </div>
        <button type="button" className="pset-btn" onClick={() => setRevision((value) => value + 1)} disabled={loading}>
          <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-rotate'}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div className="pset-grid">
        <div className="pset-col">
          <section className="pset-card" aria-label="Account">
            <div className="pset-card-head">
              <h2><i className="fa-solid fa-user-shield" />Account</h2>
              <span className="pset-tag pset-tag--live">Signed in</span>
            </div>

            {identity?.mustChangePassword && (
              <p className="pset-alert">
                <i className="fa-solid fa-triangle-exclamation" />
                Your temporary password is still active. Change it to keep official exports available.
              </p>
            )}

            {error && (
              <div className="pset-alert pset-alert--error" role="alert">
                <span><i className="fa-solid fa-circle-exclamation" /> {error}</span>
                <button type="button" className="pset-btn" onClick={() => setRevision((value) => value + 1)}>Retry</button>
              </div>
            )}

            {loading && !identity ? skeleton : identity ? (
              <dl className="pset-rows">
                <div className="pset-row"><dt>Name</dt><dd>{identity.displayName}</dd></div>
                <div className="pset-row"><dt>Rank</dt><dd>{identity.rankOrPosition}</dd></div>
                <div className="pset-row"><dt>Email</dt><dd>{identity.email}</dd></div>
                <div className="pset-row"><dt>Jurisdiction</dt><dd>Province of {identity.province}</dd></div>
              </dl>
            ) : !error ? (
              <p className="pset-empty">Sign in again to load your account.</p>
            ) : null}

            <div className="pset-actions">
              <Link href="/provincial-bfp/change-password" className="pset-btn pset-btn--primary">
                <i className="fa-solid fa-key" /> Change password
              </Link>
            </div>
          </section>

          <section className="pset-card" aria-label="Alarm doctrine">
            <div className="pset-card-head">
              <h2><i className="fa-solid fa-tower-broadcast" />Alarm doctrine</h2>
              <span className="pset-tag pset-tag--fixed">Standing order</span>
            </div>

            <div className="pset-doctrine">
              {ALARM_LEVELS.map((level) => {
                const definition = ALARM_DOCTRINE[level];
                return (
                  <article className="pset-level" key={level}>
                    <span className="pset-level-badge" aria-hidden="true">{level}</span>
                    <h3 className="pset-level-name">{definition.label}</h3>
                    <span className={`pset-level-who${definition.declarable ? '' : ' pset-level-who--auto'}`}>
                      {definition.declarable ? 'Province declares' : 'Automatic'}
                    </span>
                    <p className="pset-level-summary">{definition.summary}</p>
                  </article>
                );
              })}
            </div>

            <p className="pset-note">
              Reach is measured from the fire, not the municipal hall. A 2nd alarm calls the{' '}
              <strong>{SECOND_ALARM_MUNICIPALITIES}</strong> nearest municipalities; a 3rd reaches{' '}
              <strong>{NEARBY_RADIUS_METERS / 1000} km</strong>. These are fixed province-wide so every municipality is
              served by the same rule.
            </p>
          </section>
        </div>

        <div className="pset-col">
          <section className="pset-card" aria-label="Notifications">
            <div className="pset-card-head">
              <h2><i className="fa-solid fa-bell" />Notifications</h2>
              <span className={`pset-tag${unread > 0 ? '' : ' pset-tag--live'}`} aria-live="polite">
                {unread > 0 ? `${counter.format(unread)} unread` : 'All read'}
              </span>
            </div>

            {loading && !feed ? skeleton : feed && feed.notifications.length > 0 ? (
              <div className="pset-feed">
                {feed.notifications.slice(0, 5).map((item) => (
                  <div className="pset-feed-item" key={item.id}>
                    <span className={`pset-feed-title${item.readAt ? '' : ' unread'}`}>{item.title}</span>
                    <span className="pset-feed-time">{timeFormat.format(new Date(item.createdAt))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pset-empty">No notifications yet.</p>
            )}

            <div className="pset-actions">
              <button type="button" className="pset-btn" onClick={markAllRead} disabled={marking || unread === 0}>
                <i className={`fa-solid ${marking ? 'fa-circle-notch fa-spin' : 'fa-check-double'}`} />
                {marking ? 'Marking…' : 'Mark all read'}
              </button>
              <Link href="/provincial-bfp/notifications" className="pset-btn">
                <i className="fa-solid fa-arrow-right" /> Open all
              </Link>
            </div>
          </section>

          <section className="pset-card" aria-label="Province at a glance">
            <div className="pset-card-head">
              <h2><i className="fa-solid fa-map-location-dot" />Province</h2>
              {counts && <span className="pset-tag">{timeFormat.format(new Date(counts.updatedAt))}</span>}
            </div>

            {loading && !counts ? skeleton : counts ? (
              <div className="pset-stats">
                <div className="pset-stat">
                  <div className="pset-stat-value">{counter.format(counts.totalMunicipalities)}</div>
                  <div className="pset-stat-label">Municipalities</div>
                </div>
                <div className="pset-stat">
                  <div className="pset-stat-value">{counter.format(counts.totalStations)}</div>
                  <div className="pset-stat-label">Stations</div>
                </div>
                <div className="pset-stat">
                  <div className="pset-stat-value">{counter.format(counts.totalPersonnel)}</div>
                  <div className="pset-stat-label">Personnel</div>
                </div>
                <div className="pset-stat">
                  <div className="pset-stat-value">{counter.format(counts.totalResidents)}</div>
                  <div className="pset-stat-label">Residents</div>
                </div>
                <div className="pset-stat pset-stat--wide">
                  <div className="pset-stat-value" style={counts.pendingApplications > 0 ? { color: '#B45309' } : undefined}>
                    {counter.format(counts.pendingApplications)}
                  </div>
                  <div className="pset-stat-label">Applications awaiting review</div>
                </div>
              </div>
            ) : (
              <p className="pset-empty">Province totals unavailable.</p>
            )}

            <div className="pset-actions">
              <Link href="/provincial-bfp/resident-applications" className="pset-btn">
                <i className="fa-solid fa-user-check" /> Review applications
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
