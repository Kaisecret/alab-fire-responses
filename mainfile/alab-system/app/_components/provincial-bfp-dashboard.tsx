'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useProvincialIncidentFeed } from './use-provincial-incident-feed';
import { useProvincialAssistanceFeed } from './use-provincial-assistance-feed';
import { ProvincialIncidentAnalytics } from './provincial-incident-analytics';
import { ProvincialDashboardIncidentMap } from './provincial-dashboard-incident-map';
import { FireCommandHeader } from './fire-command-header';

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
  .pbfp-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    grid-auto-rows: 1fr;
    margin-bottom: 0;
  }

  .pbfp-kpi-box {
    position: relative;
    min-height: 168px;
    border-radius: 14px;
    padding: 1.1rem 1.2rem 1rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    animation: pbfpCardReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-kpi-box:nth-child(1) { animation-delay: 0.05s; }
  .pbfp-kpi-box:nth-child(2) { animation-delay: 0.1s; }
  .pbfp-kpi-box:nth-child(3) { animation-delay: 0.15s; }
  .pbfp-kpi-box:nth-child(4) { animation-delay: 0.2s; }

  /*
   * The same pastel tiles the municipal console uses for its own counters, so
   * an officer moving between the two reads one vocabulary rather than two.
   * The tint carries the category and the white icon tile lifts off it.
   */
  .pbfp-kpi-box.red {
    background: linear-gradient(145deg, #FFE8E8 0%, #FFD6D6 100%);
    border: 1.5px solid #FFBEBE;
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.06);
  }
  .pbfp-kpi-box.amber {
    background: linear-gradient(145deg, #FFF5DE 0%, #FFE8BA 100%);
    border: 1.5px solid #FFDC99;
    box-shadow: 0 4px 16px rgba(217, 119, 6, 0.06);
  }
  .pbfp-kpi-box.blue {
    background: linear-gradient(145deg, #E6EFFF 0%, #D2E3FD 100%);
    border: 1.5px solid #B8D3FD;
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.06);
  }
  .pbfp-kpi-box.purple {
    background: linear-gradient(145deg, #F0E8FF 0%, #E2D3FD 100%);
    border: 1.5px solid #D0BCFD;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.06);
  }

  .pbfp-kpi-box:hover { transform: translateY(-3px); }
  .pbfp-kpi-box.red:hover {
    border-color: #FFA3A3;
    box-shadow: 0 10px 22px -4px rgba(226, 54, 50, 0.2);
  }
  .pbfp-kpi-box.amber:hover {
    border-color: #FFCF70;
    box-shadow: 0 10px 22px -4px rgba(217, 119, 6, 0.2);
  }
  .pbfp-kpi-box.blue:hover {
    border-color: #91B8FA;
    box-shadow: 0 10px 22px -4px rgba(37, 99, 235, 0.2);
  }
  .pbfp-kpi-box.purple:hover {
    border-color: #B79BFB;
    box-shadow: 0 10px 22px -4px rgba(124, 58, 237, 0.2);
  }

  .pbfp-kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    margin-bottom: 0.45rem;
  }

  .pbfp-kpi-badge-icon {
    width: 2.35rem;
    height: 2.35rem;
    border-radius: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.95);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pbfp-kpi-box:hover .pbfp-kpi-badge-icon {
    transform: scale(1.06);
  }

  .pbfp-kpi-badge-icon.red { color: #E23632; }
  .pbfp-kpi-badge-icon.amber { color: #D97706; }
  .pbfp-kpi-badge-icon.blue { color: #2563EB; }
  .pbfp-kpi-badge-icon.purple { color: #7C3AED; }

  .pbfp-kpi-badge-img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  /* Pure White Trend/Status Pill Badge */
  .pbfp-kpi-trend-tag {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .pbfp-kpi-trend-tag.red { color: #991B1B; background: #FDE8E8; }
  .pbfp-kpi-trend-tag.amber { color: #92400E; background: #FEF3C7; }
  .pbfp-kpi-trend-tag.blue { color: #1E40AF; background: #DBEAFE; }
  .pbfp-kpi-trend-tag.purple { color: #5B21B6; background: #EDE9FE; }

  /* The figure leads and the caption follows it, as on the municipal cards:
     the count is what is being read, the words only say what it counts. The
     order is set here so the markup can keep naming the thing before its
     value. */
  .pbfp-kpi-body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    margin: 0.15rem 0 0.1rem;
  }

  .pbfp-kpi-label {
    order: 2;
    font-size: 0.69rem;
    font-weight: 750;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pbfp-kpi-number {
    order: 1;
    font-size: 1.85rem;
    font-weight: 900;
    color: #0F172A;
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .pbfp-kpi-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.55rem;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    font-size: 0.7rem;
    font-weight: 600;
    min-height: 2.1rem;
    gap: 0.5rem;
  }

  .pbfp-kpi-box.red .pbfp-kpi-footer { color: #DC2626; border-top-color: #FED7D7; }
  .pbfp-kpi-box.amber .pbfp-kpi-footer { color: #D97706; border-top-color: #FEEBC8; }
  .pbfp-kpi-box.blue .pbfp-kpi-footer { color: #2563EB; border-top-color: #DCE7FC; }
  .pbfp-kpi-box.purple .pbfp-kpi-footer { color: #7C3AED; border-top-color: #E9D8FD; }

  .pbfp-kpi-footer-subtext {
    font-weight: 600;
    opacity: 0.9;
  }

  .pbfp-kpi-footer i {
    font-size: 0.72rem;
    transition: transform 0.2s ease;
  }

  .pbfp-kpi-box:hover .pbfp-kpi-footer i {
    transform: translateX(3px);
  }

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

  .pbfp-incidents-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    justify-content: space-between;
  }

  .pbfp-incident-box {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1.05rem 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.45rem;
    flex: 1;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s;
  }

  .pbfp-incident-box:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 26px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.06);
    border-color: #CBD5E1;
  }

  .pbfp-incident-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .pbfp-incident-name {
    font-size: 0.88rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-alarm-pill {
    color: #FFFFFF;
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }

  .pbfp-alarm-pill.red {
    background: #E23632;
  }

  .pbfp-alarm-pill.orange {
    background: #D97706;
  }

  .pbfp-incident-desc {
    font-size: 0.78rem;
    color: #475569;
    font-weight: 500;
    line-height: 1.45;
  }

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
    .pbfp-kpi-row {
      grid-template-columns: repeat(2, 1fr);
    }
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
    .pbfp-kpi-row {
      grid-template-columns: 1fr;
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
        <FireCommandHeader slotId="provincial-fire-command-header" title="Antique Fire Command" checking={incidentFeedChecking || summaryChecking} lastCheckedAt={lastCheckedAt} error={incidentFeedError || summaryError} onRefresh={() => {
          void refreshIncidents();
          setRefreshKey(key => key + 1);
        }} />
        {summaryError && <div role="alert" style={{ padding: '12px 16px', border: '1px solid #FECACA', borderRadius: 10, background: '#FFF1F2', color: '#991B1B' }}>
          {summaryError} {updatedAt && 'Showing the last loaded data. '}
          <button type="button" className="pbfp-retry" onClick={() => setRefreshKey(key => key + 1)}>Retry</button>
        </div>}
        {/* ===== 4 PASTEL STAT CARDS ROW ===== */}
        <section className="pbfp-kpi-row" aria-label="Provincial KPI Metrics">
          {/* Card 1: Active Incidents */}
          <Link href="/provincial-bfp/incidents" className="pbfp-kpi-box red">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon red">
                <Image
                  src="/images/fire logo.webp"
                  alt="Fire Icon"
                  className="pbfp-kpi-badge-img"
                  width={20}
                  height={20}
                />
              </div>
              <span className="pbfp-kpi-trend-tag red">
                <i className="fa-solid fa-triangle-exclamation" /> Priority
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Active Province Incidents</span>
              <span className="pbfp-kpi-number">
                {incidentFeedLoading ? '—' : <FastNumber value={activeIncidentCount} />}
              </span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">
                {backupCount > 0
                  ? `${backupCount} backup request${backupCount > 1 ? "s" : ""} awaiting an alarm`
                  : `Live Operations · ${openAssistanceCount} aid requests`}
              </span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          {/* Card 2: Municipal Stations */}
          <Link href="/provincial-bfp/firetrucks-stations?view=stations" className="pbfp-kpi-box amber">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon amber">
                <i className="fa-solid fa-building" />
              </div>
              <span className="pbfp-kpi-trend-tag amber">
                <i className="fa-solid fa-circle-check" /> {summary?.totalMunicipalities ?? '—'} LGUs
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Municipal Fire Stations</span>
              <span className="pbfp-kpi-number">
                {summary ? <FastNumber value={summary.totalStations} /> : '—'}
              </span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Station Directory</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          {/* Card 3: BFP Personnel Roster */}
          <Link href="/provincial-bfp/responders" className="pbfp-kpi-box blue">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon blue">
                <i className="fa-solid fa-user-shield" />
              </div>
              <span className="pbfp-kpi-trend-tag blue">
                <i className="fa-solid fa-shield-halved" /> Officers & Staff
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">BFP Personnel Roster</span>
              <span className="pbfp-kpi-number">
                {summary ? <FastNumber value={summary.totalPersonnel} /> : '—'}
              </span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Personnel Registry</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          {/* Card 4: Resident Applications */}
          <Link href="/provincial-bfp/resident-applications" className="pbfp-kpi-box purple">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon purple">
                <i className="fa-solid fa-id-card" />
              </div>
              <span className="pbfp-kpi-trend-tag purple">
                <i className="fa-solid fa-clock" /> {summary?.pendingApplications ?? '—'} Pending
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Resident Applications</span>
              <span className="pbfp-kpi-number">
                {summary ? <FastNumber value={summary.totalResidents} /> : '—'}
              </span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Verification Queue</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>
        </section>

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
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.4rem', color: '#DC2626' }} />
                  Loading active incidents...
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
                incidents.slice(0, 3).map((inc) => (
                  <Link
                    key={inc.id}
                    href={`/provincial-bfp/incidents?incident=${encodeURIComponent(inc.id)}`}
                    className="pbfp-incident-box"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="pbfp-incident-header">
                      <span className="pbfp-incident-name">
                        {inc.barangay ? `Brgy. ${inc.barangay}, ` : ''}{inc.originMunicipality}
                      </span>
                      <span
                        className={`pbfp-alarm-pill ${
                          inc.calculatedSeverity === 'ALARM_3' || inc.calculatedSeverity === 'ALARM_2' ? 'red' : 'orange'
                        }`}
                      >
                        {inc.calculatedSeverity ? inc.calculatedSeverity.replace(/_/g, ' ') : inc.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="pbfp-incident-desc">
                      Ref #{inc.referenceNumber} • {inc.fireType}
                      {inc.assignedStationCount > 0 && ` • ${inc.assignedStationCount} responding station${inc.assignedStationCount === 1 ? '' : 's'}`}
                      {inc.observers.length > 0 && ` • ${inc.observers.length} observer${inc.observers.length === 1 ? '' : 's'}`}
                      {inc.openAssistanceCount > 0 && ` • ${inc.openAssistanceCount} mutual aid`}
                    </p>
                    <div className="pbfp-incident-bottom-meta">
                      <span className="pbfp-meta-item">
                        <i className="fa-solid fa-location-dot" /> Origin: {inc.originMunicipality} BFP
                      </span>
                      <span className="pbfp-meta-item">
                        <i className="fa-regular fa-clock" /> {formatTimeAgo(inc.submittedAt)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
        <ProvincialIncidentAnalytics municipalities={municipalities.map(({ id, name }) => ({ id, name }))} />
      </div>
    </>
  );
}
