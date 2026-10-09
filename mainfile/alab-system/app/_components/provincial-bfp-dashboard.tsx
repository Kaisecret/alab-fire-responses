'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useProvincialIncidentFeed } from './use-provincial-incident-feed';
import { useProvincialAssistanceFeed } from './use-provincial-assistance-feed';
import { ProvincialIncidentAnalytics } from './provincial-incident-analytics';
import { ProvincialDashboardIncidentMap } from './provincial-dashboard-incident-map';
import { FireCommandHeader } from './fire-command-header';
import { StatCards } from "./municipal-stat-cards";
import { SkeletonList } from './skeleton-loader';

type ManagementSummaryData = {
  totalMunicipalities: number;
  totalStations: number;
  totalPersonnel: number;
  totalResidents: number;
  pendingApplications: number;
  totalReports: number;
  activeIncidents: number;
  resolvedIncidents: number;
};

const dashboardStyles = `
  .pbfp-dash-clean {
    padding: 1.25rem 1.75rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: #EEF5FD;
    min-height: 100%;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  /* ========== 4 PASTEL KPI METRIC CARDS ROW ========== */



  /*
   * The same pastel tiles the municipal console uses for its own counters, so
   * an officer moving between the two reads one vocabulary rather than two.
   * The tint carries the category and the white icon tile lifts off it.
   */







  /* Pure White Trend/Status Pill Badge */


  /* The figure leads and the caption follows it, as on the municipal cards:
     the count is what is being read, the words only say what it counts. The
     order is set here so the markup can keep naming the thing before its
     value. */








  /* ========== TWO COLUMN SECTION ========== */
  .pbfp-main-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 600px;
    gap: 1rem;
    align-items: stretch;
  }

  .pbfp-retry {
    padding: 0.4rem 0.75rem;
    margin-left: 0.5rem;
    border: 1px solid #FECACA;
    border-radius: 8px;
    background: #FFFFFF;
    color: #991B1B;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .pbfp-retry:focus-visible { outline: 3px solid #93B4F1; outline-offset: 2px; }

  /* RIGHT CARD: ACTIVE INCIDENTS */
  .pbfp-incidents-card {
    background: #FFFFFF;
    border: 1px solid #DCE4EE;
    border-radius: 18px;
    box-shadow: 0 16px 36px -28px rgba(20, 35, 59, 0.42);
    padding: 1.15rem 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    height: 100%;
    min-width: 0;
    overflow: auto;
    animation: pbfpCardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-incidents-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.2rem;
  }

  .pbfp-incidents-title {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-incidents-title i {
    color: #E23632;
    font-size: 1rem;
  }

  .pbfp-view-all-link {
    font-size: 0.8rem;
    font-weight: 700;
    color: #E23632;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    transition: opacity 0.15s;
  }

  .pbfp-view-all-link:hover {
    opacity: 0.8;
  }

  /* Incidents keep their own height and stack from the top; a short list
     leaves room for the summary rather than stretching one card to fill it. */
  .pbfp-incidents-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .pbfp-incident-box {
    --tone: #D97706;
    --tone-soft: #FFF7ED;
    position: relative;
    flex: none;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.95rem 1.1rem 0.85rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s;
  }

  .pbfp-incident-box::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: var(--tone);
  }

  .pbfp-incident-box.tone-red { --tone: #E23632; --tone-soft: #FEF2F2; }
  .pbfp-incident-box.tone-orange { --tone: #EA580C; --tone-soft: #FFF7ED; }
  .pbfp-incident-box.tone-amber { --tone: #D97706; --tone-soft: #FFFBEB; }
  .pbfp-incident-box.tone-green { --tone: #16A34A; --tone-soft: #F0FDF4; }

  .pbfp-incident-box:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 26px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.06);
    border-color: #CBD5E1;
  }

  .pbfp-incident-box:focus-visible {
    outline: 3px solid #93B4F1;
    outline-offset: 2px;
  }

  .pbfp-incident-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pbfp-incident-icon {
    flex: none;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: var(--tone-soft);
    color: var(--tone);
    font-size: 1rem;
  }

  .pbfp-incident-heading {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 0.12rem;
  }

  .pbfp-incident-name {
    font-size: 0.9rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.3;
  }

  .pbfp-incident-ref {
    font-size: 0.72rem;
    font-weight: 600;
    color: #64748B;
    font-variant-numeric: tabular-nums;
  }

  .pbfp-alarm-pill {
    flex: none;
    color: #FFFFFF;
    font-size: 0.66rem;
    font-weight: 800;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    letter-spacing: 0.04em;
    background: var(--tone);
  }

  .pbfp-incident-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .pbfp-incident-chips span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.28rem 0.6rem;
    border-radius: 999px;
    background: #F1F5F9;
    color: #334155;
    font-size: 0.71rem;
    font-weight: 700;
  }

  .pbfp-incident-chips span i { color: #64748B; font-size: 0.7rem; }
  .pbfp-incident-chips span.aid { background: #EFF6FF; color: #1D4ED8; }
  .pbfp-incident-chips span.aid i { color: #2563EB; }

  .pbfp-clear-panel {
    flex: 1;
    min-height: 140px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.9rem 1rem;
    border-radius: 14px;
    border: 1px dashed #BBF7D0;
    background: linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%);
  }

  .pbfp-clear-head {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .pbfp-clear-icon {
    flex: none;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: #DCFCE7;
    color: #15803D;
  }

  .pbfp-clear-head strong {
    display: block;
    font-size: 0.86rem;
    font-weight: 800;
    color: #14532D;
  }

  .pbfp-clear-head span {
    font-size: 0.72rem;
    font-weight: 600;
    color: #4D7C5F;
  }

  .pbfp-clear-list {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pbfp-clear-list li {
    padding: 0.26rem 0.6rem;
    border-radius: 999px;
    background: #FFFFFF;
    border: 1px solid #D1FAE5;
    color: #166534;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .pbfp-incidents-summary {
    flex: none;
    display: grid;
    gap: 0.45rem;
  }

  .pbfp-summary-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .pbfp-summary-stats div {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    padding: 0.5rem 0.7rem;
    border-radius: 10px;
    background: #F8FAFC;
    border: 1px solid #E8EDF3;
  }

  .pbfp-summary-stats strong {
    font-size: 1.05rem;
    font-weight: 850;
    color: #0F172A;
    font-variant-numeric: tabular-nums;
  }

  .pbfp-summary-stats span {
    font-size: 0.66rem;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pbfp-summary-note {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    font-size: 0.74rem;
    color: #475569;
    font-weight: 600;
  }

  .pbfp-summary-note i { color: #64748B; }
  .pbfp-summary-note a { color: #DC2626; font-weight: 800; text-decoration: none; }
  .pbfp-summary-note a:hover { text-decoration: underline; }

  .pbfp-incident-bottom-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.73rem;
    color: #64748B;
    padding-top: 0.45rem;
    border-top: 1px solid #F8FAFC;
  }

  .pbfp-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-meta-item i {
    color: #94A3B8;
    font-size: 0.75rem;
  }

  .pbfp-meta-item i.fa-location-dot {
    color: #E23632;
  }

  @media (max-width: 1200px) {
    .pbfp-main-grid {
      grid-template-columns: 1fr;
      grid-auto-rows: 560px;
    }
  }

  @media (max-width: 640px) {
    .pbfp-dash-clean {
      padding: 0.9rem;
      gap: 0.9rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pbfp-kpi-box,
    .pbfp-incidents-card { animation: none; }
  }

  @keyframes pbfpCardReveal {
    0% {
      opacity: 0;
      transform: translateY(16px) scale(0.97);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

`;

function FastNumber({ value, duration = 650 }: { value: string | number; duration?: number }) {
  const [display, setDisplay] = useState<string>(() => {
    if (typeof value === 'number') return '0';
    return String(value).replace(/\d+/g, '0');
  });

  useEffect(() => {
    let startTimestamp: number | null = null;
    const strVal = String(value);
    const matches = strVal.match(/\d+/g);
    if (!matches) {
      return;
    }

    const targets = matches.map(Number);
    let frameId: number;

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const progress = Math.min((now - startTimestamp) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      let matchIndex = 0;
      const currentText = strVal.replace(/\d+/g, () => {
        const target = targets[matchIndex];
        const current = Math.round(target * ease);
        matchIndex++;
        return String(current);
      });

      setDisplay(currentText);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplay(strVal);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <span>{String(value).match(/\d+/g) ? display : String(value)}</span>;
}

const FIRE_TYPE_LABELS: Record<string, string> = {
  HOUSE_BUILDING: 'House / building',
  VEHICLE: 'Vehicle',
  GRASS: 'Grass',
  FOREST: 'Forest',
  OTHER: 'Rubbish',
};

const FIRE_TYPE_ICONS: Record<string, string> = {
  HOUSE_BUILDING: 'fa-house-fire',
  VEHICLE: 'fa-car-burst',
  GRASS: 'fa-seedling',
  FOREST: 'fa-tree',
  OTHER: 'fa-dumpster-fire',
};

/** Colour and label for an incident's Level of Danger. */
function dangerTone(level: string | null, status: string): { tone: 'red' | 'orange' | 'amber' | 'green'; label: string } {
  switch (level) {
    case 'CRITICAL':
    case 'ALARM_3':
    case 'ALARM_2':
      return { tone: 'red', label: level.replace(/_/g, ' ') };
    case 'HIGH':
      return { tone: 'orange', label: 'HIGH' };
    case 'MODERATE':
    case 'ALARM_1':
      return { tone: 'amber', label: level.replace(/_/g, ' ') };
    case 'LOW':
      return { tone: 'green', label: 'LOW' };
    default:
      return { tone: 'amber', label: status.replace(/_/g, ' ') };
  }
}

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ProvincialBfpDashboard() {
  const [summary, setSummary] = useState<ManagementSummaryData | null>(null);
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [summaryChecking, setSummaryChecking] = useState(false);

  const {
    incidents,
    loading: incidentFeedLoading,
    error: incidentFeedError,
    checking: incidentFeedChecking,
    lastCheckedAt,
    refresh: refreshIncidents,
  } = useProvincialIncidentFeed();
  const { requests: assistanceRequests } = useProvincialAssistanceFeed({ includeClosed: false });

  const activeIncidentCount = incidents.length;
  const burningTowns = new Set(incidents.map((incident) => incident.originMunicipality));
  const clearMunicipalities = municipalities.map(({ name }) => name).filter((name) => !burningTowns.has(name)).sort();
  const [backupCount, setBackupCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/provincial-bfp/backup-requests", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) {
          setBackupCount(Array.isArray(body.backupRequests) ? body.backupRequests.length : 0);
        }
      } catch {
        // Leave the last known count on screen.
      }
    };
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 10_000);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  const openAssistanceCount = assistanceRequests.filter((request) =>
    ['REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(request.status)
  ).length;

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const controller = new AbortController();
    async function fetchDashboardData() {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      setSummaryChecking(true);
      try {
        const [sumRes, munRes] = await Promise.all([
          fetch('/api/provincial-bfp/management-summary', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/provincial-bfp/municipalities?pageSize=100&page=1', { cache: 'no-store', signal: controller.signal }),
        ]);
        if (!active) return;
        if ([sumRes.status, munRes.status].some(status => status === 401 || status === 403)) {
          setSummary(null);
          setMunicipalities([]);
          setUpdatedAt(null);
          throw new Error('Your provincial session has expired. Please sign in again.');
        }
        if (!sumRes.ok || !munRes.ok) throw new Error('Unable to refresh dashboard totals. Please try again.');
        const [sumData, munData] = await Promise.all([sumRes.json(), munRes.json()]);
        if (active) {
          setSummary(sumData);
          setMunicipalities(munData.items ?? []);
          setUpdatedAt(new Date().toISOString());
          setSummaryError(null);
        }
      } catch (err) {
        if (active && !controller.signal.aborted) setSummaryError(err instanceof Error ? err.message : 'Unable to load dashboard totals.');
      } finally {
        inFlight = false;
        if (active) setSummaryChecking(false);
      }
    }

    fetchDashboardData();
    const timer = setInterval(fetchDashboardData, 30000);
    document.addEventListener('visibilitychange', fetchDashboardData);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', fetchDashboardData);
    };
  }, [refreshKey]);

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="pbfp-dash-clean">
        <FireCommandHeader slotId="provincial-fire-command-header" title="Antique Fire Command" checking={incidentFeedChecking || summaryChecking} lastCheckedAt={lastCheckedAt} error={incidentFeedError || summaryError} live />
        {summaryError && <div role="alert" style={{ padding: '12px 16px', border: '1px solid #FECACA', borderRadius: 10, background: '#FFF1F2', color: '#991B1B' }}>
          {summaryError} {updatedAt && 'Showing the last loaded data. '}
          <button type="button" className="pbfp-retry" onClick={() => setRefreshKey(key => key + 1)}>Retry</button>
        </div>}
        {/* ===== 4 PASTEL STAT CARDS ROW ===== */}
        <StatCards
          label="Provincial KPI Metrics"
          items={[
            { key: "incidents", icon: "fa-fire-flame-curved", tone: "red", badge: "Priority", value: <FastNumber value={activeIncidentCount} />, label: "Active Province Incidents", description: backupCount > 0 ? `${backupCount} backup request${backupCount > 1 ? "s" : ""} awaiting an alarm` : `Live operations · ${openAssistanceCount} aid requests`, href: "/provincial-bfp/incidents", loading: incidentFeedLoading },
            { key: "stations", icon: "fa-building", tone: "amber", badge: `${summary?.totalMunicipalities ?? "—"} LGUs`, value: summary ? <FastNumber value={summary.totalStations} /> : "—", label: "Municipal Fire Stations", description: "Station directory", href: "/provincial-bfp/firetrucks-stations?view=stations", loading: !summary && !summaryError },
            { key: "personnel", icon: "fa-user-shield", tone: "blue", badge: "Officers & Staff", value: summary ? <FastNumber value={summary.totalPersonnel} /> : "—", label: "BFP Personnel Roster", description: "Personnel registry", href: "/provincial-bfp/responders", loading: !summary && !summaryError },
            { key: "residents", icon: "fa-id-card", tone: "violet", badge: `${summary?.pendingApplications ?? "—"} Pending`, value: summary ? <FastNumber value={summary.totalResidents} /> : "—", label: "Resident Applications", description: "Verification queue", href: "/provincial-bfp/resident-applications", loading: !summary && !summaryError },
          ]}
        />

        {/* ===== TWO-COLUMN MAIN SECTION ===== */}
        <div className="pbfp-main-grid">
          <ProvincialDashboardIncidentMap
            incidents={incidents}
            loading={incidentFeedLoading}
            error={incidentFeedError}
          />

          {/* RIGHT: Active Incidents Card */}
          <section className="pbfp-incidents-card">
            <div className="pbfp-incidents-header">
              <div className="pbfp-incidents-title">
                <i className="fa-solid fa-triangle-exclamation" />
                <span>Active Incidents</span>
              </div>
              <Link href="/provincial-bfp/incidents" prefetch={true} className="pbfp-view-all-link">
                View All &rarr;
              </Link>
            </div>

            <div className="pbfp-incidents-list">
              {incidentFeedLoading && incidents.length === 0 ? (
                <div style={{ padding: '0.75rem' }}>
                  <SkeletonList rows={4} label="Loading active incidents" />
                </div>
              ) : incidentFeedError && incidents.length === 0 ? (
                <div role="alert" style={{ padding: '2rem 1rem', color: '#991B1B', fontSize: '0.82rem' }}>
                  Unable to load active incidents. {incidentFeedError}
                  <button type="button" className="pbfp-retry" disabled={incidentFeedChecking} onClick={() => void refreshIncidents()}>Retry</button>
                </div>
              ) : incidents.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem 1.25rem',
                    textAlign: 'center',
                    color: '#64748B',
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    border: '1px dashed #CBD5E1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    flex: 1,
                  }}
                >
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: '1.8rem', color: '#10B981', marginBottom: '0.25rem' }} />
                  <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.92rem' }}>No Active Incidents</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    All municipal jurisdictions in Antique are currently all-clear.
                  </div>
                </div>
              ) : (
                <>
                  {incidents.slice(0, 3).map((inc) => {
                    const danger = dangerTone(inc.calculatedSeverity, inc.status);
                    return (
                      <Link
                        key={inc.id}
                        href={`/provincial-bfp/incidents?incident=${encodeURIComponent(inc.id)}`}
                        className={`pbfp-incident-box tone-${danger.tone}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div className="pbfp-incident-header">
                          <span className="pbfp-incident-icon" aria-hidden="true">
                            <i className={`fa-solid ${FIRE_TYPE_ICONS[inc.fireType] ?? 'fa-fire'}`} />
                          </span>
                          <span className="pbfp-incident-heading">
                            <span className="pbfp-incident-name">
                              {inc.barangay ? `Brgy. ${inc.barangay}, ` : ''}{inc.originMunicipality}
                            </span>
                            <span className="pbfp-incident-ref">
                              #{inc.referenceNumber} · {FIRE_TYPE_LABELS[inc.fireType] ?? 'Fire'}
                            </span>
                          </span>
                          <span className="pbfp-alarm-pill">{danger.label}</span>
                        </div>
                        <div className="pbfp-incident-chips">
                          <span>
                            <i className="fa-solid fa-truck-droplet" aria-hidden="true" />
                            {inc.assignedStationCount} station{inc.assignedStationCount === 1 ? '' : 's'} responding
                          </span>
                          {inc.observers.length > 0 && (
                            <span>
                              <i className="fa-solid fa-eye" aria-hidden="true" />
                              {inc.observers.length} observing
                            </span>
                          )}
                          {inc.openAssistanceCount > 0 && (
                            <span className="aid">
                              <i className="fa-solid fa-handshake-angle" aria-hidden="true" />
                              {inc.openAssistanceCount} mutual aid
                            </span>
                          )}
                        </div>
                        <div className="pbfp-incident-bottom-meta">
                          <span className="pbfp-meta-item">
                            <i className="fa-solid fa-location-dot" /> {inc.originMunicipality} BFP
                          </span>
                          <span className="pbfp-meta-item">
                            <i className="fa-regular fa-clock" /> {formatTimeAgo(inc.submittedAt)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                  {/* A short list leaves room to show which towns are clear. */}
                  {incidents.length < 3 && (
                    <div className="pbfp-clear-panel">
                      <div className="pbfp-clear-head">
                        <span className="pbfp-clear-icon" aria-hidden="true"><i className="fa-solid fa-shield-halved" /></span>
                        <div>
                          <strong>
                            {clearMunicipalities.length > 0
                              ? `All clear in ${clearMunicipalities.length} municipalities`
                              : 'No other active incidents in Antique'}
                          </strong>
                          <span>No active fire reported</span>
                        </div>
                      </div>
                      {clearMunicipalities.length > 0 && (
                        <ul className="pbfp-clear-list">
                          {clearMunicipalities.map((name) => <li key={name}>{name}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {incidents.length > 0 && (
              <div className="pbfp-incidents-summary">
                <div className="pbfp-summary-stats">
                  <div>
                    <strong>{incidents.length}</strong>
                    <span>Active</span>
                  </div>
                  <div>
                    <strong>{incidents.reduce((sum, inc) => sum + inc.assignedStationCount, 0)}</strong>
                    <span>Stations out</span>
                  </div>
                  <div>
                    <strong>{incidents.reduce((sum, inc) => sum + inc.openAssistanceCount, 0)}</strong>
                    <span>Mutual aid</span>
                  </div>
                </div>
                {incidents.length > 3 && (
                  <p className="pbfp-summary-note">
                    <i className="fa-solid fa-list" aria-hidden="true" />
                    Showing the 3 newest of {incidents.length}. <Link href="/provincial-bfp/incidents" prefetch={true}>See all</Link>
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
        <ProvincialIncidentAnalytics municipalities={municipalities.map(({ id, name }) => ({ id, name }))} />
      </div>
    </>
  );
}
