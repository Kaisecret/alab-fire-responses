'use client';

import { municipalTabFetch as fetch } from "../../lib/auth/municipal-tab-fetch";

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMunicipalIncidentFeed } from './use-municipal-incident-feed';
import { MunicipalStatCards } from './municipal-stat-cards';
import { getFireTypeLabel } from '../../lib/municipal-bfp/reports/formatters';
import { formatHotline, hotlineForMunicipality, hotlineHref, PROVINCIAL_FIRE_MARSHAL } from '../../lib/bfp-hotlines';

/*
 * Municipal BFP dashboard: what needs the station now, at a glance. Every
 * number comes from the live incident feed or /api/municipal-bfp/dashboard;
 * nothing here is made up (no invented phone numbers or truck counts).
 */

interface DashboardStats {
  activeIncidents: number;
  pendingVerifications: number;
  pendingReportsCount: number;
  pendingApplicationsCount: number;
  availableFiretrucks: number;
  totalFiretrucks?: number;
  respondersOnDuty: number;
  assistanceRequests: number;
}

interface PendingResidentApp {
  id: string;
  reference: string;
  status: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  barangay: string;
}

interface StationItem {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  status: string;
  assignedPersonnelCount: number;
}

/** Another municipality's station, nearest first, with its open reports. */
interface NearbyStation {
  id: string;
  municipalityName: string;
  stationName: string;
  distanceKm: number | null;
  activeIncidents: number;
}

interface DashboardPayload {
  municipality?: string;
  stats?: DashboardStats;
  pendingVerifications?: {
    reports: unknown[];
    residentApplications: PendingResidentApp[];
    totalPending: number;
  };
  stations?: StationItem[];
  nearbyStations?: NearbyStation[];
  error?: string;
}

/** Reports that still need the station to verify them. */
const AWAITING_VERIFICATION = new Set(['SUBMITTED', 'PENDING_VERIFICATION', 'UNDER_VERIFICATION']);

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'New',
  PENDING_VERIFICATION: 'To verify',
  UNDER_VERIFICATION: 'To verify',
  VERIFIED: 'Verified',
  CONFIRMED: 'Verified',
  RESPONDING: 'Responding',
  FIRETRUCK_DISPATCHED: 'Dispatched',
  RESPONDER_ARRIVED: 'On scene',
  UNDER_CONTROL: 'Under control',
  NEEDS_MORE_INFO: 'Needs info',
};

const STATUS_TONES: Record<string, string> = {
  SUBMITTED: 'amber',
  PENDING_VERIFICATION: 'amber',
  UNDER_VERIFICATION: 'amber',
  VERIFIED: 'blue',
  CONFIRMED: 'blue',
  RESPONDING: 'red',
  FIRETRUCK_DISPATCHED: 'red',
  RESPONDER_ARRIVED: 'red',
  UNDER_CONTROL: 'green',
};

const TYPE_ICONS: Record<string, string> = {
  HOUSE_BUILDING: 'fa-house-fire',
  GRASS: 'fa-seedling',
  FOREST: 'fa-tree',
  VEHICLE: 'fa-car-burst',
  OTHER: 'fa-dumpster-fire',
};

const dashboardStyles = `
  .mbfp-dash {
    --dash-red: #E23632;
    --dash-red-soft: #FFF1F2;
    --dash-ink: #0F172A;
    --dash-body: #334155;
    --dash-muted: #64748B;
    --dash-line: #E2E8F0;
    --dash-tile: #F8FAFC;
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    color: var(--dash-ink);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .mbfp-dash-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
  .mbfp-dash-title-wrap { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }
  .mbfp-dash-fire-icon { width: 2.4rem; height: 2.4rem; display: grid; place-items: center; border-radius: 12px; background: var(--dash-red); color: #fff; font-size: 1.05rem; box-shadow: 0 8px 18px -10px rgba(226, 54, 50, 0.8); }
  .mbfp-dash-heading { margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; }
  .mbfp-top-ctrls { display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-status-badge { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.4rem 0.75rem; border-radius: 999px; background: #fff; border: 1px solid var(--dash-line); color: var(--dash-body); font-size: 0.75rem; font-weight: 700; }
  .mbfp-live-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #10B981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18); }
  .mbfp-icon-btn { width: 2.25rem; height: 2.25rem; display: grid; place-items: center; border: 1px solid var(--dash-line); border-radius: 10px; background: #fff; color: var(--dash-body); cursor: pointer; transition: border-color 0.18s ease, color 0.18s ease; }
  .mbfp-icon-btn:hover { border-color: #FCA5A5; color: var(--dash-red); }
  .mbfp-icon-btn:disabled { cursor: progress; opacity: 0.7; }
  .mbfp-spin-icon { animation: mbfpSpin 0.9s linear infinite; }


  .mbfp-columns { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
  .mbfp-col { display: grid; gap: 1rem; min-width: 0; }
  .mbfp-card { min-width: 0; border: 1px solid var(--dash-line); border-radius: 16px; background: #fff; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03); overflow: hidden; }
  .mbfp-card-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.9rem 1.1rem; border-bottom: 1px solid #EEF2F7; }
  .mbfp-card-title { display: flex; align-items: center; gap: 0.55rem; margin: 0; font-size: 0.95rem; font-weight: 800; letter-spacing: -0.01em; }
  .mbfp-card-title i { width: 1.9rem; height: 1.9rem; display: grid; place-items: center; border-radius: 9px; font-size: 0.82rem; }
  .mbfp-count { padding: 0.15rem 0.55rem; border-radius: 999px; background: #F1F5F9; color: var(--dash-body); font-size: 0.72rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .mbfp-card-link { display: inline-flex; align-items: center; gap: 0.35rem; color: #2563EB; font-size: 0.78rem; font-weight: 750; text-decoration: none; white-space: nowrap; }
  .mbfp-card-link:hover { text-decoration: underline; text-underline-offset: 3px; }
  .mbfp-card-body { display: grid; }

  /* Incident rows */
  .mbfp-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 0.85rem; padding: 0.75rem 1.1rem; border-top: 1px solid #F1F5F9; color: inherit; text-decoration: none; transition: background 0.15s ease; }
  .mbfp-row:first-child { border-top: 0; }
  a.mbfp-row:hover { background: #F8FAFC; }
  .mbfp-type-icon { width: 2.35rem; height: 2.35rem; display: grid; place-items: center; border-radius: 11px; background: var(--dash-red-soft); color: var(--dash-red); font-size: 0.95rem; }
  .mbfp-type-icon.CRITICAL { background: #7F1D1D; color: #FECACA; }
  .mbfp-type-icon.HIGH { background: #991B1B; color: #FEE2E2; }
  .mbfp-type-icon.MODERATE { background: #FEF3C7; color: #B45309; }
  .mbfp-type-icon.LOW { background: #D1FAE5; color: #047857; }
  .mbfp-type-icon.kyc { background: #FFFBEB; color: #D97706; }
  .mbfp-row-main { display: grid; gap: 0.15rem; min-width: 0; }
  .mbfp-row-title { font-size: 0.88rem; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mbfp-row-sub { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; color: var(--dash-muted); font-size: 0.74rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .mbfp-row-sub .mbfp-ref { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.7rem; color: var(--dash-body); }
  .mbfp-row-end { display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; white-space: nowrap; }
  .mbfp-chip::before { content: ""; width: 0.4rem; height: 0.4rem; border-radius: 50%; background: currentColor; }
  .mbfp-chip.amber { background: #FFFBEB; color: #B45309; }
  .mbfp-chip.blue { background: #EFF6FF; color: #1D4ED8; }
  .mbfp-chip.red { background: #FEF2F2; color: #B91C1C; }
  .mbfp-chip.green { background: #ECFDF5; color: #047857; }
  .mbfp-chip.gray { background: #F1F5F9; color: #475569; }
  /* Wide screens: one aligned line per item, no empty middle. */
  .mbfp-row.is-table { grid-template-columns: auto minmax(0, 1.25fr) minmax(0, 1fr) 4.75rem 7.25rem; padding: 0.6rem 1.1rem; }
  .mbfp-row.is-table .mbfp-type-icon { width: 2.1rem; height: 2.1rem; border-radius: 10px; font-size: 0.85rem; }
  .mbfp-cell { min-width: 0; color: var(--dash-body); font-size: 0.8rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mbfp-cell.time { color: var(--dash-muted); font-variant-numeric: tabular-nums; }
  .mbfp-cell.end { display: flex; justify-content: flex-end; }
  .mbfp-level { display: inline-block; margin-left: 0.35rem; padding: 0.1rem 0.45rem; border-radius: 6px; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.02em; vertical-align: 1px; }
  .mbfp-level.CRITICAL { background: #7F1D1D; color: #FECACA; }
  .mbfp-level.HIGH { background: #991B1B; color: #FEE2E2; }
  .mbfp-level.MODERATE { background: #FEF3C7; color: #92400E; }
  .mbfp-level.LOW { background: #D1FAE5; color: #065F46; }
  .mbfp-row-sub.is-compact { display: none; }
  .mbfp-row-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.75rem; border-radius: 9px; background: var(--dash-ink); color: #fff; font-size: 0.75rem; font-weight: 800; text-decoration: none; white-space: nowrap; }
  .mbfp-row-btn:hover { background: #1E293B; }
  .mbfp-call { flex: 0 0 auto; width: 2.1rem; height: 2.1rem; display: grid; place-items: center; border-radius: 50%; background: #FEF2F2; color: #DC2626; font-size: 0.8rem; text-decoration: none; transition: background 0.15s ease; }
  .mbfp-call:hover { background: #FEE2E2; }
  .mbfp-row.is-hq { background: #FFF7F7; }
  .mbfp-empty { display: grid; justify-items: center; gap: 0.35rem; padding: 1.6rem 1rem; color: var(--dash-muted); font-size: 0.8rem; text-align: center; }
  .mbfp-empty i { width: 2.4rem; height: 2.4rem; display: grid; place-items: center; border-radius: 50%; background: #ECFDF5; color: #059669; font-size: 1rem; }
  .mbfp-empty strong { color: var(--dash-ink); font-size: 0.88rem; }

  /* Quick actions */
  .mbfp-quick-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; padding: 0.9rem 1.1rem 1.1rem; }
  .mbfp-qa { position: relative; display: flex; align-items: center; gap: 0.65rem; padding: 0.75rem; border: 1px solid var(--dash-line); border-radius: 12px; background: var(--dash-tile); color: var(--dash-ink); font-size: 0.82rem; font-weight: 800; text-decoration: none; transition: border-color 0.18s ease, transform 0.18s ease; }
  .mbfp-qa:hover { border-color: #CBD5E1; transform: translateY(-1px); }
  .mbfp-qa i { width: 2rem; height: 2rem; display: grid; place-items: center; border-radius: 9px; font-size: 0.85rem; }
  .mbfp-qa .amber { background: #FEF3C7; color: #B45309; }
  .mbfp-qa .blue { background: #DBEAFE; color: #1D4ED8; }
  .mbfp-qa .red { background: #FEE2E2; color: #B91C1C; }
  .mbfp-qa .green { background: #D1FAE5; color: #047857; }
  .mbfp-qa-badge { margin-left: auto; min-width: 1.4rem; padding: 0.1rem 0.4rem; border-radius: 999px; background: #D97706; color: #fff; font-size: 0.7rem; font-weight: 800; text-align: center; }
  .mbfp-qa.wide { grid-column: 1 / -1; border-color: #FECACA; background: var(--dash-red-soft); color: #991B1B; }
  .mbfp-qa.wide > .fa-arrow-right { width: auto; height: auto; margin-left: auto; background: none; color: var(--dash-red); }

  /* Skeletons */
  .mbfp-skel { display: block; border-radius: 8px; background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%); background-size: 200% 100%; animation: mbfpShimmer 1.4s ease-in-out infinite; }

  @keyframes mbfpSpin { to { transform: rotate(360deg); } }
  @keyframes mbfpShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { .mbfp-skel, .mbfp-spin-icon { animation: none; } }

  @media (max-width: 1100px) {
    .mbfp-columns { grid-template-columns: 1fr; }
  }

  @media (max-width: 768px) {
    .mbfp-dash { padding: 0.85rem; gap: 0.85rem; }
    .mbfp-quick-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0.75rem 0.85rem 0.9rem; }
    .mbfp-qa { padding: 0.65rem; font-size: 0.78rem; }
    .mbfp-card-body { overflow-x: auto; }
    .mbfp-row { padding: 0.7rem 0.85rem; gap: 0.65rem; }
    .mbfp-row.is-table { grid-template-columns: auto minmax(0, 1fr) auto; padding: 0.65rem 0.85rem; }
    .mbfp-row.is-table .mbfp-cell.type, .mbfp-row.is-table .mbfp-cell.time { display: none; }
    .mbfp-row-sub.is-compact { display: flex; }
    .mbfp-nearby-row .mbfp-row-end { gap: 0.35rem; }
  }

  @media (max-width: 360px) {
    .mbfp-quick-actions { grid-template-columns: 1fr; }
  }
`;

interface DashboardCacheRecord {
  data: DashboardPayload;
  timestamp: number;
}

const DASHBOARD_CACHE_KEY = 'alab_municipal_dashboard_cache';
let memoryDashboardCache: DashboardCacheRecord | null = null;

function getCachedDashboard(): DashboardPayload | null {
  if (memoryDashboardCache) {
    return memoryDashboardCache.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardCacheRecord;
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          memoryDashboardCache = parsed;
          return parsed.data;
        }
      }
    } catch {}
  }
  return null;
}

function setCachedDashboard(data: DashboardPayload) {
  const cacheObj: DashboardCacheRecord = { data, timestamp: Date.now() };
  memoryDashboardCache = cacheObj;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cacheObj));
    } catch {}
  }
}

function formatTime(dateStr: string) {
  try {
    return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div className="mbfp-row" key={index} aria-hidden="true">
          <span className="mbfp-skel" style={{ width: '2.35rem', height: '2.35rem', borderRadius: 11 }} />
          <span style={{ display: 'grid', gap: 6 }}>
            <span className="mbfp-skel" style={{ width: '45%', height: 12 }} />
            <span className="mbfp-skel" style={{ width: '70%', height: 10 }} />
          </span>
          <span className="mbfp-skel" style={{ width: 70, height: 22, borderRadius: 999 }} />
        </div>
      ))}
    </>
  );
}

export function MunicipalBfpDashboard() {
  const {
    incidents,
    loading: incidentsLoading,
    checking: incidentsChecking,
    lastCheckedAt,
    refresh: refreshIncidents,
  } = useMunicipalIncidentFeed();

  const initialCache = useRef<DashboardPayload | null>(null);
  if (initialCache.current === null) {
    initialCache.current = getCachedDashboard();
  }

  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(initialCache.current);
  const [dashLoading, setDashLoading] = useState(!initialCache.current);
  const [dashChecking, setDashChecking] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const fetchDashboard = useCallback(async (isManual = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (isManual) setDashChecking(true);

    try {
      const res = await fetch('/api/municipal-bfp/dashboard', { cache: 'no-store' });
      const payload: DashboardPayload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to fetch dashboard data');

      if (mounted.current) {
        setDashboardData(payload);
        setCachedDashboard(payload);
      }
    } catch (err) {
      console.error('Municipal dashboard fetch error:', err);
    } finally {
      if (mounted.current) {
        setDashLoading(false);
        setDashChecking(false);
      }
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void fetchDashboard();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchDashboard();
      }
    }, 5000);

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [fetchDashboard]);

  const handleRefreshAll = () => {
    void refreshIncidents(true);
    void fetchDashboard(true);
  };

  const isChecking = incidentsChecking || dashChecking;
  const liveStatus = isChecking
    ? 'Live · checking...'
    : lastCheckedAt
      ? 'Live · checked just now'
      : 'Live · connecting...';

  // The station's own reports; nearby fires are summarised per station below.
  const ownIncidents = incidents.filter((incident) => incident.accessScope !== 'OBSERVER');
  const recentIncidents = ownIncidents;
  const pendingIncidents = ownIncidents.filter((incident) => AWAITING_VERIFICATION.has(incident.status));
  const pendingResidentApps = dashboardData?.pendingVerifications?.residentApplications ?? [];
  const totalPending = pendingIncidents.length + pendingResidentApps.length;

  const stats = dashboardData?.stats;
  const stations = dashboardData?.stations ?? [];
  const nearbyStations = dashboardData?.nearbyStations ?? [];
  const municipality = dashboardData?.municipality || 'Municipal';
  const queueLoading = incidentsLoading && incidents.length === 0;

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="mbfp-dash">
        <div className="mbfp-dash-header">
          <div className="mbfp-dash-title-wrap">
            <span className="mbfp-dash-fire-icon" aria-hidden="true">
              <i className="fa-solid fa-fire-flame-curved" />
            </span>
            <h1 className="mbfp-dash-heading">{municipality} Fire Command</h1>
          </div>
          <div className="mbfp-top-ctrls">
            <span className="mbfp-status-badge" role="status">
              <span className="mbfp-live-dot" aria-hidden="true" />
              {liveStatus}
            </span>
            <button type="button" className="mbfp-icon-btn" onClick={handleRefreshAll} disabled={isChecking} aria-label="Refresh" title="Refresh">
              <i className={`fa-solid fa-arrows-rotate ${isChecking ? 'mbfp-spin-icon' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        <MunicipalStatCards
          label="Station summary"
          items={[
            { key: "active", icon: "fa-fire-flame-curved", tone: "red", value: ownIncidents.length, label: "Active fires", href: "/municipal-bfp/active-incidents", loading: queueLoading },
            { key: "verify", icon: "fa-clipboard-check", tone: "amber", value: totalPending, label: "To verify", href: "/municipal-bfp/verification-queue", loading: queueLoading || dashLoading },
            { key: "trucks", icon: "fa-truck-moving", tone: "blue", value: stats?.availableFiretrucks ?? 0, suffix: stats?.totalFiretrucks ? `/ ${stats.totalFiretrucks}` : undefined, label: "Trucks ready", href: "/municipal-bfp/firetrucks", loading: dashLoading },
            { key: "responders", icon: "fa-users-gear", tone: "emerald", value: stats?.respondersOnDuty ?? 0, label: "Responders", href: "/municipal-bfp/stations", loading: dashLoading },
          ]}
        />

        <div className="mbfp-columns">
          <div className="mbfp-col">
            <section className="mbfp-card" aria-labelledby="mbfp-incidents-title">
              <div className="mbfp-card-header">
                <h2 className="mbfp-card-title" id="mbfp-incidents-title">
                  <i className="fa-solid fa-fire" style={{ background: '#FFF1F2', color: '#E23632' }} aria-hidden="true" />
                  Incidents
                  <span className="mbfp-count">{recentIncidents.length}</span>
                </h2>
                <Link href="/municipal-bfp/active-incidents" className="mbfp-card-link">View all <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <div className="mbfp-card-body">
                {queueLoading ? (
                  <SkeletonRows count={4} />
                ) : recentIncidents.length === 0 ? (
                  <div className="mbfp-empty">
                    <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                    <strong>All clear</strong>
                    <span>No active fires in {municipality}.</span>
                  </div>
                ) : (
                  recentIncidents.slice(0, 5).map((inc) => (
                    <Link key={inc.id} href={`/municipal-bfp/active-incidents?incident=${encodeURIComponent(inc.id)}`} className="mbfp-row is-table">
                      <span className={`mbfp-type-icon ${inc.calculatedSeverity ?? ''}`} title={inc.calculatedSeverity ?? undefined} aria-hidden="true">
                        <i className={`fa-solid ${TYPE_ICONS[inc.fireType] ?? 'fa-fire'}`} />
                      </span>
                      <span className="mbfp-row-main">
                        <span className="mbfp-row-title">{inc.barangay || 'Barangay not identified'}</span>
                        <span className="mbfp-row-sub"><span className="mbfp-ref">{inc.referenceNumber}</span></span>
                        <span className="mbfp-row-sub is-compact">
                          <span>{getFireTypeLabel(inc.fireType)}</span>
                          {inc.calculatedSeverity && <span>· {inc.calculatedSeverity}</span>}
                          <span>· {formatTime(inc.submittedAt)}</span>
                        </span>
                      </span>
                      <span className="mbfp-cell type">
                        {getFireTypeLabel(inc.fireType)}
                        {inc.calculatedSeverity && <span className={`mbfp-level ${inc.calculatedSeverity}`}>{inc.calculatedSeverity}</span>}
                      </span>
                      <span className="mbfp-cell time">{formatTime(inc.submittedAt)}</span>
                      <span className="mbfp-cell end">
                        <span className={`mbfp-chip ${STATUS_TONES[inc.status] ?? 'gray'}`}>{STATUS_LABELS[inc.status] ?? inc.status.replaceAll('_', ' ').toLowerCase()}</span>
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="mbfp-card" aria-labelledby="mbfp-verify-title">
              <div className="mbfp-card-header">
                <h2 className="mbfp-card-title" id="mbfp-verify-title">
                  <i className="fa-solid fa-clipboard-check" style={{ background: '#FFFBEB', color: '#D97706' }} aria-hidden="true" />
                  To verify
                  <span className="mbfp-count">{totalPending}</span>
                </h2>
                <Link href="/municipal-bfp/verification-queue" className="mbfp-card-link">Open queue <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <div className="mbfp-card-body">
                {queueLoading || dashLoading ? (
                  <SkeletonRows count={2} />
                ) : totalPending === 0 ? (
                  <div className="mbfp-empty">
                    <i className="fa-solid fa-check" aria-hidden="true" />
                    <strong>Nothing to verify</strong>
                  </div>
                ) : (
                  <>
                    {pendingIncidents.slice(0, 3).map((rep) => (
                      <div className="mbfp-row is-table" key={`report-${rep.id}`}>
                        <span className={`mbfp-type-icon ${rep.calculatedSeverity ?? ''}`} aria-hidden="true">
                          <i className={`fa-solid ${TYPE_ICONS[rep.fireType] ?? 'fa-fire'}`} />
                        </span>
                        <span className="mbfp-row-main">
                          <span className="mbfp-row-title">{rep.barangay || 'Barangay not identified'}</span>
                          <span className="mbfp-row-sub"><span className="mbfp-ref">{rep.referenceNumber}</span></span>
                          <span className="mbfp-row-sub is-compact"><span>{getFireTypeLabel(rep.fireType)}</span><span>· {formatTime(rep.submittedAt)}</span></span>
                        </span>
                        <span className="mbfp-cell type">
                          {getFireTypeLabel(rep.fireType)}
                          {rep.calculatedSeverity && <span className={`mbfp-level ${rep.calculatedSeverity}`}>{rep.calculatedSeverity}</span>}
                        </span>
                        <span className="mbfp-cell time">{formatTime(rep.submittedAt)}</span>
                        <span className="mbfp-cell end">
                          <Link href="/municipal-bfp/verification-queue" className="mbfp-row-btn">
                            <i className="fa-solid fa-check" aria-hidden="true" /> Verify
                          </Link>
                        </span>
                      </div>
                    ))}
                    {pendingResidentApps.slice(0, 3).map((app) => (
                      <div className="mbfp-row is-table" key={`app-${app.id}`}>
                        <span className="mbfp-type-icon kyc" aria-hidden="true"><i className="fa-solid fa-id-card" /></span>
                        <span className="mbfp-row-main">
                          <span className="mbfp-row-title">{app.firstName} {app.lastName}</span>
                          <span className="mbfp-row-sub"><span className="mbfp-ref">{app.reference}</span></span>
                          <span className="mbfp-row-sub is-compact"><span>Resident ID · {app.barangay}</span><span>· {formatTime(app.submittedAt)}</span></span>
                        </span>
                        <span className="mbfp-cell type">Resident ID · {app.barangay}</span>
                        <span className="mbfp-cell time">{formatTime(app.submittedAt)}</span>
                        <span className="mbfp-cell end">
                          <Link href="/municipal-bfp/verification-queue" className="mbfp-row-btn">
                            <i className="fa-solid fa-user-shield" aria-hidden="true" /> Review
                          </Link>
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>
          </div>

          <div className="mbfp-col">
            <section className="mbfp-card" aria-labelledby="mbfp-actions-title">
              <div className="mbfp-card-header">
                <h2 className="mbfp-card-title" id="mbfp-actions-title">
                  <i className="fa-solid fa-bolt" style={{ background: '#EFF6FF', color: '#2563EB' }} aria-hidden="true" />
                  Quick actions
                </h2>
              </div>
              <div className="mbfp-quick-actions">
                <Link href="/municipal-bfp/verification-queue" className="mbfp-qa">
                  <i className="fa-solid fa-clipboard-check amber" aria-hidden="true" />
                  Verify
                  {totalPending > 0 && <span className="mbfp-qa-badge">{totalPending}</span>}
                </Link>
                <Link href="/municipal-bfp/gis-map" className="mbfp-qa">
                  <i className="fa-solid fa-map-location-dot blue" aria-hidden="true" />
                  GIS map
                </Link>
                <Link href="/municipal-bfp/firetrucks" className="mbfp-qa">
                  <i className="fa-solid fa-truck-moving red" aria-hidden="true" />
                  Firetrucks
                </Link>
                <Link href="/municipal-bfp/water-sources" className="mbfp-qa">
                  <i className="fa-solid fa-droplet green" aria-hidden="true" />
                  Water sources
                </Link>
                <Link href="/municipal-bfp/incident-reports" className="mbfp-qa wide">
                  <i className="fa-solid fa-phone-volume red" aria-hidden="true" />
                  Log phone report
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            </section>

            <section className="mbfp-card" aria-labelledby="mbfp-stations-title">
              <div className="mbfp-card-header">
                <h2 className="mbfp-card-title" id="mbfp-stations-title">
                  <i className="fa-solid fa-building-shield" style={{ background: '#ECFDF5', color: '#059669' }} aria-hidden="true" />
                  Stations
                </h2>
                <Link href="/municipal-bfp/stations" className="mbfp-card-link">Manage <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <div className="mbfp-card-body">
                {dashLoading ? (
                  <SkeletonRows count={2} />
                ) : stations.length === 0 ? (
                  <div className="mbfp-empty">
                    <strong>No station yet</strong>
                    <Link href="/municipal-bfp/stations" className="mbfp-card-link">Add station</Link>
                  </div>
                ) : (
                  stations.map((st) => (
                    <div className="mbfp-row" key={st.id}>
                      <span className="mbfp-type-icon" style={{ background: '#EFF6FF', color: '#2563EB' }} aria-hidden="true"><i className="fa-solid fa-fire-extinguisher" /></span>
                      <span className="mbfp-row-main">
                        <span className="mbfp-row-title">{st.stationName}</span>
                        <span className="mbfp-row-sub"><i className="fa-solid fa-user-shield" aria-hidden="true" /> {st.assignedPersonnelCount} responder{st.assignedPersonnelCount === 1 ? '' : 's'}</span>
                      </span>
                      <span className="mbfp-row-end">
                        <span className={`mbfp-chip ${st.assignedPersonnelCount > 0 ? 'green' : 'gray'}`}>{st.assignedPersonnelCount > 0 ? 'Ready' : 'No crew'}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="mbfp-card" aria-labelledby="mbfp-nearby-title">
              <div className="mbfp-card-header">
                <h2 className="mbfp-card-title" id="mbfp-nearby-title">
                  <i className="fa-solid fa-tower-broadcast" style={{ background: '#F5F3FF', color: '#7C3AED' }} aria-hidden="true" />
                  Nearby stations
                </h2>
                <Link href="/municipal-bfp/active-incidents" className="mbfp-card-link">Nearby fires <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <div className="mbfp-card-body">
                {dashLoading ? (
                  <SkeletonRows count={3} />
                ) : nearbyStations.length === 0 ? (
                  <div className="mbfp-empty">
                    <strong>No nearby stations</strong>
                    <span>Set your station&apos;s location to see the closest ones.</span>
                  </div>
                ) : (
                  nearbyStations.map((station) => (
                    <div className="mbfp-row mbfp-nearby-row" key={station.id}>
                      <span className="mbfp-type-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }} aria-hidden="true"><i className="fa-solid fa-fire-extinguisher" /></span>
                      <span className="mbfp-row-main">
                        <span className="mbfp-row-title">{station.stationName}</span>
                        <span className="mbfp-row-sub">
                          <span>{station.municipalityName}</span>
                          {station.distanceKm != null && <span>· {station.distanceKm} km</span>}
                        </span>
                      </span>
                      <span className="mbfp-row-end">
                        <span className={`mbfp-chip ${station.activeIncidents > 0 ? 'red' : 'gray'}`}>
                          {station.activeIncidents > 0 ? `${station.activeIncidents} active` : 'Quiet'}
                        </span>
                        {(() => {
                          const hotline = hotlineForMunicipality(station.municipalityName);
                          return hotline ? (
                            <a href={hotlineHref(hotline.phone)} className="mbfp-call" aria-label={`Call ${hotline.name}, ${formatHotline(hotline.phone)}`} title={formatHotline(hotline.phone)}>
                              <i className="fa-solid fa-phone" aria-hidden="true" />
                            </a>
                          ) : null;
                        })()}
                      </span>
                    </div>
                  ))
                )}
                <div className="mbfp-row is-hq">
                  <span className="mbfp-type-icon" aria-hidden="true"><i className="fa-solid fa-building-flag" /></span>
                  <span className="mbfp-row-main">
                    <span className="mbfp-row-title">Provincial Fire Marshal</span>
                    <span className="mbfp-row-sub">{formatHotline(PROVINCIAL_FIRE_MARSHAL.phone)}</span>
                  </span>
                  <span className="mbfp-row-end">
                    <a href={hotlineHref(PROVINCIAL_FIRE_MARSHAL.phone)} className="mbfp-call" aria-label={`Call the ${PROVINCIAL_FIRE_MARSHAL.name}`}>
                      <i className="fa-solid fa-phone" aria-hidden="true" />
                    </a>
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
