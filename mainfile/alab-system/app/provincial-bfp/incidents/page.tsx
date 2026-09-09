'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProvincialIncidentFeed } from '../../_components/use-provincial-incident-feed';
import { BfpDataLoader } from '../../_components/bfp-data-loader';
import type { ProvincialIncidentDetail } from '../../../lib/intermunicipality/provincial';

const pageStyles = `
  .pbfp-incidents-page {
    padding: 10px 1.5rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #EEF5FD;
    min-height: 100%;
    color: #0F172A;
  }

  /* Header */
  .pbfp-header-hub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .pbfp-header-left {
    display: flex;
    align-items: center;
    gap: 0.9rem;
  }

  .pbfp-header-icon-badge {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 1.25rem;
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3);
    flex-shrink: 0;
  }

  .pbfp-header-title-box h1 {
    font-size: 1.35rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .pbfp-live-check {
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748B;
  }

  .pbfp-header-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.95rem;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    color: #334155;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .pbfp-btn-refresh:hover {
    background: #F8FAFC;
    border-color: #CBD5E1;
    color: #0F172A;
  }

  .pbfp-btn-gis {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1.05rem;
    background: #0F172A;
    color: #FFFFFF;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.82rem;
    text-decoration: none;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
    transition: all 0.18s ease;
  }

  .pbfp-btn-gis:hover {
    background: #1E293B;
    transform: translateY(-1px);
  }

  /* 4 Tactical KPI Cards */
  .pbfp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .pbfp-kpi-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.9rem 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    transition: transform 0.18s, box-shadow 0.18s;
  }

  .pbfp-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  }

  .pbfp-kpi-badge {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
  }

  .pbfp-kpi-badge.red { background: #FFF1F2; border: 1px solid #FFE4E6; color: #DC2626; }
  .pbfp-kpi-badge.blue { background: #EFF6FF; border: 1px solid #DBEAFE; color: #2563EB; }
  .pbfp-kpi-badge.purple { background: #F5F3FF; border: 1px solid #DDD6FE; color: #7C3AED; }
  .pbfp-kpi-badge.emerald { background: #ECFDF5; border: 1px solid #D1FAE5; color: #059669; }

  .pbfp-kpi-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .pbfp-kpi-lbl {
    font-size: 0.68rem;
    font-weight: 800;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pbfp-kpi-val {
    font-size: 1.4rem;
    font-weight: 850;
    color: #0F172A;
    line-height: 1.15;
    margin: 0.1rem 0;
  }

  .pbfp-kpi-sub {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Table Card */
  .pbfp-table-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
  }

  .pbfp-toolbar {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    flex-wrap: wrap;
  }

  .pbfp-tab-pills {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .pbfp-tab-pill {
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 700;
    background: #F1F5F9;
    color: #475569;
    border: 1px solid #E2E8F0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    transition: all 0.15s ease;
  }

  .pbfp-tab-pill.active {
    background: #DC2626;
    color: #FFFFFF;
    border-color: #DC2626;
  }

  .pbfp-tab-count {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.12);
    font-size: 0.7rem;
    font-weight: 800;
  }

  .pbfp-tab-pill.active .pbfp-tab-count {
    background: rgba(255, 255, 255, 0.25);
  }

  .pbfp-search-box {
    position: relative;
    width: 280px;
    max-width: 100%;
  }

  .pbfp-search-box i {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94A3B8;
    font-size: 0.8rem;
  }

  .pbfp-search-input {
    width: 100%;
    padding: 0.48rem 0.85rem 0.48rem 2.1rem;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.8rem;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }

  .pbfp-search-input:focus {
    border-color: #DC2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
  }

  .pbfp-table-responsive {
    overflow-x: auto;
  }

  .pbfp-roster-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    text-align: left;
  }

  .pbfp-roster-table th {
    padding: 0.75rem 1rem;
    background: #F8FAFC;
    color: #475569;
    font-weight: 800;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #E2E8F0;
    white-space: nowrap;
  }

  .pbfp-roster-table td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #F1F5F9;
    vertical-align: middle;
  }

  .pbfp-roster-table tr:hover td {
    background: #F8FAFC;
  }

  .pbfp-ref-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-pulse-beacon {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .pbfp-pulse-beacon.active {
    background: #DC2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
    animation: pbfpBeaconBreathe 1.5s infinite;
  }

  .pbfp-pulse-beacon.resolved {
    background: #059669;
  }

  .pbfp-degraded-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.68rem;
    font-weight: 800;
    color: #D97706;
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
    margin-top: 0.2rem;
  }

  .pbfp-loc-box {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .pbfp-loc-muni {
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-loc-detail {
    font-size: 0.74rem;
    color: #64748B;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .pbfp-class-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 700;
    color: #DC2626;
  }

  .pbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .pbfp-status-pill.responding { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
  .pbfp-status-pill.dispatched { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
  .pbfp-status-pill.verified { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
  .pbfp-status-pill.pending { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
  .pbfp-status-pill.resolved { background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; }

  .pbfp-observers-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: #4F46E5;
    background: #EEF2FF;
    border: 1px solid #C7D2FE;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
  }

  .pbfp-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.85rem;
    background: #DC2626;
    color: #FFFFFF;
    border: none;
    border-radius: 8px;
    font-size: 0.76rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }

  .pbfp-action-btn:hover {
    background: #B91C1C;
  }

  .pbfp-table-footer {
    padding: 0.75rem 1rem;
    background: #FFFFFF;
    border-top: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 600;
  }

  /* Modal */
  .pbfp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 1.25rem;
  }

  .pbfp-modal-card {
    background: #FFFFFF;
    border-radius: 20px;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
    border: 1px solid #E2E8F0;
    max-width: 680px;
    width: 100%;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .pbfp-modal-header {
    padding: 1.15rem 1.35rem;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pbfp-modal-title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .pbfp-modal-title h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 850;
    color: #0F172A;
  }

  .pbfp-modal-close {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #64748B;
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .pbfp-modal-body {
    padding: 1.25rem 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    overflow-y: auto;
  }

  .pbfp-modal-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .pbfp-modal-field {
    background: #F8FAFC;
    padding: 0.7rem 0.85rem;
    border-radius: 10px;
    border: 1px solid #E2E8F0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .pbfp-modal-field label {
    font-size: 0.68rem;
    font-weight: 800;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pbfp-modal-field p {
    font-size: 0.84rem;
    font-weight: 700;
    color: #0F172A;
    margin: 0;
  }

  .pbfp-modal-section-title {
    font-size: 0.82rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0.35rem 0 0.2rem;
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .pbfp-observer-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.75rem 0.95rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .pbfp-observer-state-pill {
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 800;
  }

  .pbfp-observer-state-pill.waiting { background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; }
  .pbfp-observer-state-pill.seen { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
  .pbfp-observer-state-pill.requested { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }

  .pbfp-modal-footer {
    padding: 0.85rem 1.35rem;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
  }

  @keyframes pbfpBeaconBreathe {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }

  @media (max-width: 1024px) {
    .pbfp-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .pbfp-kpi-grid { grid-template-columns: 1fr; }
    .pbfp-modal-grid { grid-template-columns: 1fr; }
  }
`;

function ProvincialIncidentsContent() {
  const searchParams = useSearchParams();
  const deepLinkedIncidentId = searchParams.get("incident");

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(() => deepLinkedIncidentId);
  const [prevDeepLinkId, setPrevDeepLinkId] = useState<string | null>(deepLinkedIncidentId);

  if (deepLinkedIncidentId !== prevDeepLinkId) {
    setPrevDeepLinkId(deepLinkedIncidentId);
    setSelectedIncidentId(deepLinkedIncidentId);
  }

  const [incidentDetail, setIncidentDetail] = useState<ProvincialIncidentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const { incidents, loading, checking, error, lastCheckedAt, refresh } = useProvincialIncidentFeed({
    includeHistory: filter === 'ALL' || filter === 'RESOLVED',
  });

  const handleCloseModal = () => {
    setSelectedIncidentId(null);
    setIncidentDetail(null);
  };

  useEffect(() => {
    if (!selectedIncidentId) {
      return;
    }
    let cancelled = false;
    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await fetch(`/api/provincial-bfp/incidents/${encodeURIComponent(selectedIncidentId!)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load incident detail');
        }
        const data = await res.json();
        if (!cancelled) setIncidentDetail(data.incident);
      } catch (e) {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : 'Unable to load incident detail.');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedIncidentId]);

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      const isResolved = ['RESOLVED', 'CLOSED', 'REJECTED', 'FALSE_REPORT', 'DUPLICATE'].includes(inc.status);
      const matchesTab =
        filter === 'ALL' ||
        (filter === 'RESOLVED' ? isResolved : !isResolved);

      const matchesQuery =
        searchQuery.trim() === '' ||
        inc.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.originMunicipality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Boolean(inc.barangay) && inc.barangay!.toLowerCase().includes(searchQuery.toLowerCase())) ||
        inc.fireType.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesQuery;
    });
  }, [incidents, filter, searchQuery]);

  const activeCount = useMemo(
    () => incidents.filter((i) => !['RESOLVED', 'CLOSED', 'REJECTED', 'FALSE_REPORT', 'DUPLICATE'].includes(i.status)).length,
    [incidents],
  );
  const respondingCount = useMemo(() => incidents.filter((i) => i.status === 'RESPONDING').length, [incidents]);
  const assistanceCount = useMemo(() => incidents.filter((i) => i.openAssistanceCount > 0).length, [incidents]);
  const monitoredCount = useMemo(() => incidents.filter((i) => i.observers.length > 0).length, [incidents]);

  return (
    <>
      <style>{pageStyles}</style>
      <div className="pbfp-incidents-page">
        {/* Header */}
        <div className="pbfp-header-hub">
          <div className="pbfp-header-left">
            <div className="pbfp-header-icon-badge">
              <i className="fa-solid fa-fire" />
            </div>
            <div className="pbfp-header-title-box">
              <h1>Province-Wide Incident Command Roster</h1>
              <span className="pbfp-live-check">
                {checking ? 'Live · syncing…' : lastCheckedAt ? `Live · checked ${lastCheckedAt.toLocaleTimeString()}` : 'Live Telemetry'}
              </span>
            </div>
          </div>
          <div className="pbfp-header-actions">
            <button type="button" className="pbfp-btn-refresh" onClick={() => void refresh(true)} disabled={checking}>
              <i className={`fa-solid fa-arrows-rotate ${checking ? 'fa-spin' : ''}`} />
              <span>{checking ? 'Checking…' : 'Live Refresh'}</span>
            </button>
            <Link href="/provincial-bfp/gis-map" className="pbfp-btn-gis">
              <i className="fa-solid fa-map-location-dot" /> Open GIS View
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '0.65rem 1rem', color: '#991B1B', fontSize: '0.8rem', fontWeight: 600 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.4rem' }} /> {error}
          </div>
        )}

        {/* 4 Tactical KPI Stat Cards */}
        <div className="pbfp-kpi-grid">
          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-badge red">
              <i className="fa-solid fa-fire-flame-curved" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Active Incidents</span>
              <span className="pbfp-kpi-val">{loading ? '--' : activeCount}</span>
              <span className="pbfp-kpi-sub">Ongoing operations</span>
            </div>
          </div>

          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-badge blue">
              <i className="fa-solid fa-truck-fast" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Responding Now</span>
              <span className="pbfp-kpi-val">{loading ? '--' : respondingCount}</span>
              <span className="pbfp-kpi-sub">BFP Station Units on-scene</span>
            </div>
          </div>

          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-badge purple">
              <i className="fa-solid fa-handshake-angle" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Mutual Aid Requested</span>
              <span className="pbfp-kpi-val">{loading ? '--' : assistanceCount}</span>
              <span className="pbfp-kpi-sub">Inter-municipality backup</span>
            </div>
          </div>

          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-badge emerald">
              <i className="fa-solid fa-satellite-dish" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Under Observation</span>
              <span className="pbfp-kpi-val">{loading ? '--' : monitoredCount}</span>
              <span className="pbfp-kpi-sub">Nearest stations tracking</span>
            </div>
          </div>
        </div>

        {/* Main Incident Command Table Card */}
        <div className="pbfp-table-card">
          <div className="pbfp-toolbar">
            <div className="pbfp-tab-pills">
              <button
                type="button"
                className={`pbfp-tab-pill ${filter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setFilter('ACTIVE')}
              >
                <span>Active Incidents</span>
                <span className="pbfp-tab-count">{activeCount}</span>
              </button>
              <button
                type="button"
                className={`pbfp-tab-pill ${filter === 'RESOLVED' ? 'active' : ''}`}
                onClick={() => setFilter('RESOLVED')}
              >
                <span>Resolved</span>
              </button>
              <button
                type="button"
                className={`pbfp-tab-pill ${filter === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilter('ALL')}
              >
                <span>All Province Incidents</span>
                <span className="pbfp-tab-count">{incidents.length}</span>
              </button>
            </div>

            <div className="pbfp-search-box">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                className="pbfp-search-input"
                placeholder="Search municipality, code, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="pbfp-table-responsive">
            <table className="pbfp-roster-table">
              <thead>
                <tr>
                  <th>Incident Reference</th>
                  <th>Origin Municipality</th>
                  <th>Classification</th>
                  <th>Live Status</th>
                  <th>Station Units</th>
                  <th>Nearby Observers</th>
                  <th>Reported Time</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && incidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <BfpDataLoader theme="provincial" size="sm" title="Loading provincial incident feed..." />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
                      <i className="fa-solid fa-shield-halved" style={{ fontSize: '2rem', color: '#CBD5E1', marginBottom: '0.5rem', display: 'block' }} />
                      <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.92rem' }}>No matching incidents found</strong>
                      <span style={{ fontSize: '0.78rem' }}>No provincial operations matching your filter or search terms.</span>
                    </td>
                  </tr>
                ) : (
                  filtered.map((inc) => {
                    const isResponding = inc.status === 'RESPONDING';
                    const isResolved = ['RESOLVED', 'CLOSED'].includes(inc.status);
                    const statusClass = isResponding ? 'responding' : isResolved ? 'resolved' : 'pending';

                    return (
                      <tr key={inc.id}>
                        {/* Ref */}
                        <td>
                          <div className="pbfp-ref-badge">
                            <span className={`pbfp-pulse-beacon ${isResolved ? 'resolved' : 'active'}`} />
                            <span>{inc.referenceNumber}</span>
                          </div>
                          {inc.nearbySelectionDegraded && (
                            <div className="pbfp-degraded-tag">
                              <i className="fa-solid fa-triangle-exclamation" /> Degraded selection
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td>
                          <div className="pbfp-loc-box">
                            <div className="pbfp-loc-muni">{inc.originMunicipality}</div>
                            <div className="pbfp-loc-detail">
                              <i className="fa-solid fa-location-dot" />
                              <span>{inc.barangay || 'Jurisdiction wide'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Fire Type */}
                        <td>
                          <span className="pbfp-class-tag">
                            <i className="fa-solid fa-fire" />
                            <span>{inc.fireType.replaceAll('_', ' ')}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`pbfp-status-pill ${statusClass}`}>
                            <span>{inc.status.replaceAll('_', ' ')}</span>
                          </span>
                        </td>

                        {/* Stations */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#334155' }}>
                            <i className="fa-solid fa-building-shield" style={{ color: '#64748B' }} />
                            <span>{inc.assignedStationCount} assigned</span>
                          </div>
                          {inc.openAssistanceCount > 0 && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#D97706', display: 'block', marginTop: '0.15rem' }}>
                              <i className="fa-solid fa-handshake-angle" /> {inc.openAssistanceCount} mutual aid open
                            </span>
                          )}
                        </td>

                        {/* Observers */}
                        <td>
                          {inc.observers.length > 0 ? (
                            <span className="pbfp-observers-badge">
                              <i className="fa-solid fa-satellite-dish" />
                              <span>{inc.observers.length} station{inc.observers.length === 1 ? '' : 's'} tracking</span>
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>No observers</span>
                          )}
                        </td>

                        {/* Time */}
                        <td>
                          <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                            {new Date(inc.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                            {new Date(inc.submittedAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="pbfp-action-btn"
                            onClick={() => setSelectedIncidentId(inc.id)}
                          >
                            <i className="fa-solid fa-eye" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pbfp-table-footer">
            <span>
              Showing <strong>{filtered.length}</strong> of <strong>{incidents.length}</strong> total province incidents
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="pbfp-pulse-beacon active" /> Live Provincial Operations Feed
            </span>
          </div>
        </div>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncidentId && (
        <div className="pbfp-modal-overlay" onClick={handleCloseModal}>
          <div className="pbfp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pbfp-modal-header">
              <div className="pbfp-modal-title">
                <span className="pbfp-status-pill responding">PROVINCIAL OVERSIGHT</span>
                <h3>{incidentDetail?.referenceNumber || selectedIncidentId}</h3>
              </div>
              <button
                type="button"
                className="pbfp-modal-close"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="pbfp-modal-body">
              {detailLoading ? (
                <BfpDataLoader theme="provincial" size="sm" title="Loading incident oversight detail..." />
              ) : detailError ? (
                <div style={{ color: '#B91C1C', padding: '1rem', background: '#FEF2F2', borderRadius: '8px' }}>
                  {detailError}
                </div>
              ) : incidentDetail ? (
                <>
                  {incidentDetail.nearbySelectionDegraded && (
                    <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '10px', padding: '0.65rem 0.95rem', color: '#92400E', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ color: '#D97706', fontSize: '0.95rem' }} />
                      <span>Degraded Selection: Fewer than 2 adjacent municipalities with active stations were reachable.</span>
                    </div>
                  )}

                  <div className="pbfp-modal-grid">
                    <div className="pbfp-modal-field">
                      <label>Origin Municipality</label>
                      <p>{incidentDetail.originMunicipality}</p>
                    </div>
                    <div className="pbfp-modal-field">
                      <label>Barangay & Location</label>
                      <p>{incidentDetail.barangay || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="pbfp-modal-grid">
                    <div className="pbfp-modal-field">
                      <label>Classification & Severity</label>
                      <p>{incidentDetail.fireType.replaceAll('_', ' ')} · {incidentDetail.calculatedSeverity || 'MODERATE'}</p>
                    </div>
                    <div className="pbfp-modal-field">
                      <label>Reported Timestamp</label>
                      <p>{new Date(incidentDetail.submittedAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="pbfp-modal-grid">
                    <div className="pbfp-modal-field">
                      <label>GPS Coordinates</label>
                      <p>{incidentDetail.latitude.toFixed(6)}, {incidentDetail.longitude.toFixed(6)}</p>
                    </div>
                    <div className="pbfp-modal-field">
                      <label>Nearest Landmark</label>
                      <p>{incidentDetail.landmark || 'None provided'}</p>
                    </div>
                  </div>

                  <div className="pbfp-modal-grid">
                    <div className="pbfp-modal-field">
                      <label>Assigned Station Units</label>
                      <p>{incidentDetail.assignedStationCount} Station{incidentDetail.assignedStationCount === 1 ? '' : 's'}</p>
                    </div>
                    <div className="pbfp-modal-field">
                      <label>Active Responders Dispatched</label>
                      <p>{incidentDetail.assignedRecipientCount} Personnel</p>
                    </div>
                  </div>

                  {/* Observers Situational Awareness */}
                  <h4 className="pbfp-modal-section-title">
                    <i className="fa-solid fa-satellite-dish" style={{ color: '#4F46E5' }} />
                    <span>Nearby Station Observers ({incidentDetail.observers.length})</span>
                  </h4>
                  {incidentDetail.observers.length === 0 ? (
                    <p style={{ color: '#64748B', fontSize: '0.78rem', margin: 0 }}>No observer stations currently attached.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.45rem' }}>
                      {incidentDetail.observers.map((obs) => {
                        const stateClass = obs.monitoringState === 'BACKUP_REQUESTED' ? 'requested' : obs.monitoringState === 'SEEN' ? 'seen' : 'waiting';
                        const km = (obs.distanceMeters / 1000).toFixed(1);

                        return (
                          <div key={obs.observerId} className="pbfp-observer-card">
                            <div>
                              <strong style={{ fontSize: '0.84rem', color: '#0F172A', display: 'block' }}>
                                {obs.stationName} ({obs.municipalityName})
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {km} km away · {obs.status === 'ACTIVE' ? 'Active observation' : 'Access ended'}
                              </span>
                              {obs.acknowledgedAt && (
                                <div style={{ fontSize: '0.7rem', color: '#2563EB', marginTop: '0.15rem', fontWeight: 600 }}>
                                  <i className="fa-solid fa-circle-check" /> Seen by {obs.acknowledgedByDisplayName || 'Municipal Admin'} at {new Date(obs.acknowledgedAt).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                            <span className={`pbfp-observer-state-pill ${stateClass}`}>
                              {obs.monitoringState === 'BACKUP_REQUESTED' ? 'Backup requested' : obs.monitoringState === 'SEEN' ? 'Seen' : 'Waiting'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Assistance Requests */}
                  {incidentDetail.assistanceRequests.length > 0 && (
                    <>
                      <h4 className="pbfp-modal-section-title">
                        <i className="fa-solid fa-handshake-angle" style={{ color: '#DC2626' }} />
                        <span>Mutual Aid Requests ({incidentDetail.assistanceRequests.length})</span>
                      </h4>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {incidentDetail.assistanceRequests.map((req) => (
                          <div key={req.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.75rem 0.95rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                              <strong style={{ fontSize: '0.82rem', color: '#0F172A' }}>
                                To {req.recipientMunicipalityName}
                              </strong>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: req.status === 'ACCEPTED' ? '#059669' : req.status === 'REJECTED' ? '#DC2626' : '#D97706' }}>
                                {req.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                              Requested: {req.requestedFiretrucks} Engine(s), {req.requestedPersonnel} Personnel
                            </div>
                            {(req.offeredFiretrucks != null || req.offeredPersonnel != null) && (
                              <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
                                Offered: {req.offeredFiretrucks ?? 0} Engine(s), {req.offeredPersonnel ?? 0} Personnel
                              </div>
                            )}
                            {req.responseNote && (
                              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '0.2rem 0 0', fontStyle: 'italic' }}>
                                &ldquo;{req.responseNote}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>

            <div className="pbfp-modal-footer">
              <button
                type="button"
                className="pbfp-modal-close"
                style={{ width: 'auto', padding: '0.45rem 1rem', height: 'auto', fontWeight: 700, fontSize: '0.8rem' }}
                onClick={handleCloseModal}
              >
                Close
              </button>
              <Link
                href="/provincial-bfp/gis-map"
                className="pbfp-btn-gis"
                style={{ textDecoration: 'none' }}
              >
                <i className="fa-solid fa-map-location-dot" /> Track in GIS
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ProvinceIncidentsPage() {
  return (
    <Suspense fallback={<BfpDataLoader title="Loading provincial incidents..." theme="provincial" />}>
      <ProvincialIncidentsContent />
    </Suspense>
  );
}
