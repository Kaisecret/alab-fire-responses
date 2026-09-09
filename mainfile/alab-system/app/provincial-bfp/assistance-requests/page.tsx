'use client';

import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProvincialAssistanceFeed } from '../../_components/use-provincial-assistance-feed';
import { BfpDataLoader } from '../../_components/bfp-data-loader';

const pageStyles = `
  .pbfp-aid-page {
    padding: 10px 1.5rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #EEF5FD;
    min-height: 100%;
    color: #0F172A;
  }

  /* Header */
  .pbfp-aid-header-hub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .pbfp-aid-header-left {
    display: flex;
    align-items: center;
    gap: 0.9rem;
  }

  .pbfp-aid-icon-badge {
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

  .pbfp-aid-header-title-box h1 {
    font-size: 1.35rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .pbfp-live-check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: #059669;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    margin-left: 0.5rem;
    vertical-align: middle;
  }

  .pbfp-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 6px #10B981;
    animation: pbfp-live-pulse 2s infinite ease-in-out;
  }

  @keyframes pbfp-live-pulse {
    0% { transform: scale(0.9); opacity: 0.8; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.8; }
  }

  .pbfp-aid-header-title-box p {
    font-size: 0.82rem;
    color: #64748B;
    margin: 0.2rem 0 0;
    font-weight: 500;
  }

  .pbfp-aid-header-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .pbfp-aid-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #334155;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pbfp-aid-refresh-btn:hover {
    background: #F8FAFC;
    border-color: #94A3B8;
    color: #0F172A;
  }

  /* Metric Cards */
  .pbfp-aid-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .pbfp-aid-metric-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 0.85rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .pbfp-aid-metric-label {
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.2rem;
  }

  .pbfp-aid-metric-num {
    font-size: 1.45rem;
    font-weight: 850;
    line-height: 1;
  }

  .pbfp-aid-metric-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }

  /* Controls & Filter Bar */
  .pbfp-aid-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.6rem 0.85rem;
  }

  .pbfp-aid-tabs {
    display: flex;
    gap: 0.4rem;
  }

  .pbfp-aid-tab-btn {
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    border: 1px solid transparent;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    background: transparent;
    color: #64748B;
    transition: all 0.15s ease;
  }

  .pbfp-aid-tab-btn.active {
    background: #EFF6FF;
    border-color: #BFDBFE;
    color: #1D4ED8;
  }

  .pbfp-aid-search {
    position: relative;
    width: 260px;
  }

  .pbfp-aid-search input {
    width: 100%;
    padding: 0.38rem 0.75rem 0.38rem 2rem;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    font-size: 0.78rem;
    color: #0F172A;
    outline: none;
  }

  .pbfp-aid-search i {
    position: absolute;
    left: 0.65rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.75rem;
    color: #94A3B8;
  }

  /* Request Card */
  .pbfp-aid-feed {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .pbfp-aid-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 1.15rem 1.35rem;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    position: relative;
  }

  .pbfp-aid-card:hover {
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
  }

  .pbfp-aid-card.highlighted {
    border: 2px solid #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    animation: pbfp-card-focus 2s infinite alternate ease-in-out;
  }

  @keyframes pbfp-card-focus {
    0% { border-color: #2563EB; }
    100% { border-color: #3B82F6; }
  }

  .pbfp-aid-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .pbfp-aid-card-flow {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.95rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-muni-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 750;
  }

  .pbfp-muni-pill.requester {
    background: #FEF2F2;
    color: #991B1B;
    border: 1px solid #FECACA;
  }

  .pbfp-muni-pill.recipient {
    background: #EFF6FF;
    color: #1E40AF;
    border: 1px solid #BFDBFE;
  }

  .pbfp-aid-arrow {
    color: #64748B;
    font-size: 0.85rem;
  }

  .pbfp-aid-badges-group {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .pbfp-status-pill {
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .pbfp-status-pill.requested {
    background: #FEF3C7;
    color: #92400E;
    border: 1px solid #FCD34D;
  }

  .pbfp-status-pill.accepted {
    background: #ECFDF5;
    color: #065F46;
    border: 1px solid #A7F3D0;
  }

  .pbfp-status-pill.partially_accepted {
    background: #EFF6FF;
    color: #1E40AF;
    border: 1px solid #BFDBFE;
  }

  .pbfp-status-pill.rejected {
    background: #FEE2E2;
    color: #991B1B;
    border: 1px solid #FCA5A5;
  }

  .pbfp-status-pill.cancelled {
    background: #F1F5F9;
    color: #475569;
    border: 1px solid #CBD5E1;
  }

  .pbfp-status-pill.completed {
    background: #F3F4F6;
    color: #374151;
    border: 1px solid #D1D5DB;
  }

  /* Incident Ref Link Box */
  .pbfp-incident-ref-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    font-weight: 750;
    color: #2563EB;
    text-decoration: none;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    transition: all 0.15s ease;
  }

  .pbfp-incident-ref-link:hover {
    background: #EFF6FF;
    border-color: #BFDBFE;
    color: #1D4ED8;
  }

  /* Resources Breakdown */
  .pbfp-resources-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.75rem 0.9rem;
    font-size: 0.8rem;
  }

  @media (max-width: 640px) {
    .pbfp-resources-grid {
      grid-template-columns: 1fr;
    }
  }

  .pbfp-res-col-title {
    font-size: 0.7rem;
    font-weight: 800;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.35rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-res-items {
    display: flex;
    gap: 0.85rem;
    color: #1E293B;
    font-weight: 700;
  }

  .pbfp-res-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  /* Note Bubbles */
  .pbfp-note-bubble {
    font-size: 0.8rem;
    padding: 0.55rem 0.75rem;
    border-radius: 6px;
    line-height: 1.4;
  }

  .pbfp-note-bubble.request {
    background: #FFFBEB;
    border-left: 3px solid #F59E0B;
    color: #92400E;
  }

  .pbfp-note-bubble.response {
    background: #F0FDF4;
    border-left: 3px solid #10B981;
    color: #065F46;
  }

  .pbfp-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.72rem;
    color: #64748B;
    border-top: 1px solid #F1F5F9;
    padding-top: 0.65rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pbfp-oversight-stamp {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 700;
    color: #475569;
    background: #F1F5F9;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  /* Empty State */
  .pbfp-aid-empty {
    background: #FFFFFF;
    border: 1px dashed #CBD5E1;
    border-radius: 12px;
    padding: 3rem 1.5rem;
    text-align: center;
    color: #64748B;
  }

  .pbfp-aid-empty-icon {
    font-size: 2.2rem;
    color: #94A3B8;
    margin-bottom: 0.75rem;
  }

  .pbfp-aid-empty h3 {
    font-size: 1.05rem;
    font-weight: 800;
    color: #1E293B;
    margin: 0 0 0.35rem;
  }

  .pbfp-aid-empty p {
    font-size: 0.82rem;
    margin: 0;
    max-width: 480px;
    margin: 0 auto;
  }
`;

function AssistanceRequestsContent() {
  const searchParams = useSearchParams();
  const highlightedRequestId = searchParams?.get('request') || null;

  const [filterMode, setFilterMode] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    requests,
    loading,
    error,
    isRefreshing,
    lastUpdated,
    refresh,
  } = useProvincialAssistanceFeed({
    includeClosed: filterMode === 'ALL',
  });

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto scroll to highlighted request if present
  useEffect(() => {
    if (highlightedRequestId && cardRefs.current[highlightedRequestId]) {
      cardRefs.current[highlightedRequestId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedRequestId, requests]);

  // Metrics computation
  const metrics = useMemo(() => {
    const total = requests.length;
    const requested = requests.filter((r) => r.status === 'REQUESTED').length;
    const coordinated = requests.filter((r) =>
      r.status === 'ACCEPTED' || r.status === 'PARTIALLY_ACCEPTED'
    ).length;
    const completed = requests.filter((r) =>
      r.status === 'COMPLETED' || r.status === 'REJECTED' || r.status === 'CANCELLED'
    ).length;

    return { total, requested, coordinated, completed };
  }, [requests]);

  // Filter by query
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase().trim();
    return requests.filter((r) =>
      r.requesterMunicipalityName.toLowerCase().includes(q) ||
      r.recipientMunicipalityName.toLowerCase().includes(q) ||
      r.referenceNumber.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      (r.requestNote && r.requestNote.toLowerCase().includes(q))
    );
  }, [requests, searchQuery]);

  return (
    <>
      <style>{pageStyles}</style>
      <div className="pbfp-aid-page">
        {/* Header */}
        <div className="pbfp-aid-header-hub">
          <div className="pbfp-aid-header-left">
            <div className="pbfp-aid-icon-badge">
              <i className="fa-solid fa-handshake-angle" />
            </div>
            <div className="pbfp-aid-header-title-box">
              <h1>
                Inter-Municipality Mutual Aid Coordination
                <span className="pbfp-live-check">
                  <span className="pbfp-live-dot" />
                  Live (5s)
                </span>
              </h1>
              <p>
                Provincial real-time situational oversight of mutual apparatus dispatch, tanker reinforcements, and resource transfers across Antique.
              </p>
            </div>
          </div>

          <div className="pbfp-aid-header-actions">
            {lastUpdated && (
              <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              className="pbfp-aid-refresh-btn"
              onClick={() => void refresh(true)}
              disabled={isRefreshing}
              title="Refresh requests feed"
            >
              <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? 'fa-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="pbfp-aid-metrics-grid">
          <div className="pbfp-aid-metric-card" style={{ borderLeft: '3px solid #2563EB' }}>
            <div>
              <div className="pbfp-aid-metric-label">Feed Total</div>
              <div className="pbfp-aid-metric-num" style={{ color: '#1E3A8A' }}>
                {metrics.total}
              </div>
            </div>
            <div className="pbfp-aid-metric-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-layer-group" />
            </div>
          </div>

          <div className="pbfp-aid-metric-card" style={{ borderLeft: '3px solid #D97706' }}>
            <div>
              <div className="pbfp-aid-metric-label">Awaiting Decision</div>
              <div className="pbfp-aid-metric-num" style={{ color: '#92400E' }}>
                {metrics.requested}
              </div>
            </div>
            <div className="pbfp-aid-metric-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <i className="fa-solid fa-hourglass-half" />
            </div>
          </div>

          <div className="pbfp-aid-metric-card" style={{ borderLeft: '3px solid #059669' }}>
            <div>
              <div className="pbfp-aid-metric-label">Units Dispatched</div>
              <div className="pbfp-aid-metric-num" style={{ color: '#065F46' }}>
                {metrics.coordinated}
              </div>
            </div>
            <div className="pbfp-aid-metric-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
              <i className="fa-solid fa-truck-fast" />
            </div>
          </div>

          <div className="pbfp-aid-metric-card" style={{ borderLeft: '3px solid #64748B' }}>
            <div>
              <div className="pbfp-aid-metric-label">Concluded / Returned</div>
              <div className="pbfp-aid-metric-num" style={{ color: '#334155' }}>
                {metrics.completed}
              </div>
            </div>
            <div className="pbfp-aid-metric-icon" style={{ background: '#F1F5F9', color: '#64748B' }}>
              <i className="fa-solid fa-circle-check" />
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="pbfp-aid-controls">
          <div className="pbfp-aid-tabs">
            <button
              className={`pbfp-aid-tab-btn ${filterMode === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setFilterMode('ACTIVE')}
            >
              <i className="fa-solid fa-fire-burner" style={{ marginRight: '0.35rem' }} />
              Active Mutual Aid
            </button>
            <button
              className={`pbfp-aid-tab-btn ${filterMode === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterMode('ALL')}
            >
              <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '0.35rem' }} />
              Full History (All Requests)
            </button>
          </div>

          <div className="pbfp-aid-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search municipality, ref, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Feed List */}
        {loading && requests.length === 0 ? (
          <BfpDataLoader theme="provincial" title="Synchronizing live mutual aid feed..." />
        ) : error ? (
          <div style={{ padding: '1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '0.84rem' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.4rem' }} />
            {error}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="pbfp-aid-empty">
            <div className="pbfp-aid-empty-icon">
              <i className="fa-solid fa-handshake" />
            </div>
            <h3>No Mutual Aid Requests Found</h3>
            <p>
              {filterMode === 'ACTIVE'
                ? 'There are currently no active or in-progress mutual aid requests across the province. All municipal jurisdictions are operating under local capacity.'
                : 'No assistance requests matched your current search filters.'}
            </p>
          </div>
        ) : (
          <div className="pbfp-aid-feed">
            {filteredRequests.map((req) => {
              const isTarget = highlightedRequestId === req.id;
              const statusClass = req.status.toLowerCase();

              return (
                <div
                  key={req.id}
                  ref={(el) => {
                    cardRefs.current[req.id] = el;
                  }}
                  className={`pbfp-aid-card ${isTarget ? 'highlighted' : ''}`}
                >
                  <div className="pbfp-aid-card-top">
                    <div className="pbfp-aid-card-flow">
                      <span className="pbfp-muni-pill requester">
                        <i className="fa-solid fa-location-dot" />
                        {req.requesterMunicipalityName}
                      </span>
                      <span className="pbfp-aid-arrow">
                        <i className="fa-solid fa-arrow-right-long" />
                      </span>
                      <span className="pbfp-muni-pill recipient">
                        <i className="fa-solid fa-shield-halved" />
                        {req.recipientMunicipalityName}
                      </span>
                    </div>

                    <div className="pbfp-aid-badges-group">
                      <Link
                        href={`/provincial-bfp/incidents?incident=${encodeURIComponent(req.fireReportId)}`}
                        className="pbfp-incident-ref-link"
                        title="View Incident Oversight"
                      >
                        <i className="fa-solid fa-fire" />
                        Ref #{req.referenceNumber}
                      </Link>
                      <span className={`pbfp-status-pill ${statusClass}`}>
                        <i
                          className={`fa-solid ${
                            req.status === 'REQUESTED'
                              ? 'fa-hourglass-half'
                              : req.status === 'ACCEPTED' || req.status === 'PARTIALLY_ACCEPTED'
                              ? 'fa-truck-fast'
                              : req.status === 'COMPLETED'
                              ? 'fa-circle-check'
                              : req.status === 'REJECTED'
                              ? 'fa-ban'
                              : 'fa-xmark'
                          }`}
                        />
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Resource details */}
                  <div className="pbfp-resources-grid">
                    <div>
                      <div className="pbfp-res-col-title">
                        <i className="fa-solid fa-hand-holding-hand" />
                        Requested Resources
                      </div>
                      <div className="pbfp-res-items">
                        <span className="pbfp-res-item">
                          <i className="fa-solid fa-truck-droplet" style={{ color: '#DC2626' }} />
                          {req.requestedFiretrucks} {req.requestedFiretrucks === 1 ? 'Firetruck' : 'Firetrucks'}
                        </span>
                        <span className="pbfp-res-item">
                          <i className="fa-solid fa-user-group" style={{ color: '#2563EB' }} />
                          {req.requestedPersonnel} Personnel
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="pbfp-res-col-title">
                        <i className="fa-solid fa-truck-ramp-box" />
                        Offered / Dispatched Resources
                      </div>
                      <div className="pbfp-res-items">
                        {req.offeredFiretrucks != null || req.offeredPersonnel != null ? (
                          <>
                            <span className="pbfp-res-item">
                              <i className="fa-solid fa-truck-droplet" style={{ color: '#059669' }} />
                              {req.offeredFiretrucks ?? 0} Firetrucks
                            </span>
                            <span className="pbfp-res-item">
                              <i className="fa-solid fa-user-group" style={{ color: '#059669' }} />
                              {req.offeredPersonnel ?? 0} Personnel
                            </span>
                          </>
                        ) : (
                          <span style={{ color: '#94A3B8', fontWeight: 500 }}>
                            {req.status === 'REQUESTED'
                              ? 'Awaiting response from station'
                              : 'None allocated'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Request note */}
                  {req.requestNote && (
                    <div className="pbfp-note-bubble request">
                      <strong>
                        <i className="fa-solid fa-bullhorn" style={{ marginRight: '0.35rem' }} />
                        Origin Request Note:
                      </strong>{' '}
                      {req.requestNote}
                    </div>
                  )}

                  {/* Response note */}
                  {req.responseNote && (
                    <div className="pbfp-note-bubble response">
                      <strong>
                        <i className="fa-solid fa-reply" style={{ marginRight: '0.35rem' }} />
                        Station Response Note {req.responderName ? `(by ${req.responderName})` : ''}:
                      </strong>{' '}
                      {req.responseNote}
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div className="pbfp-card-footer">
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                      <span>
                        <i className="fa-regular fa-clock" style={{ marginRight: '0.25rem' }} />
                        Requested: {new Date(req.requestedAt).toLocaleString()}
                      </span>
                      {req.respondedAt && (
                        <span>
                          <i className="fa-solid fa-check-double" style={{ marginRight: '0.25rem' }} />
                          Responded: {new Date(req.respondedAt).toLocaleString()}
                        </span>
                      )}
                      {req.completedAt && (
                        <span>
                          <i className="fa-solid fa-flag-checkered" style={{ marginRight: '0.25rem' }} />
                          Concluded: {new Date(req.completedAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <span className="pbfp-oversight-stamp">
                      <i className="fa-solid fa-eye" />
                      Provincial Monitoring Only
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function AssistanceRequestsPage() {
  return (
    <Suspense fallback={<BfpDataLoader theme="provincial" title="Loading assistance requests..." />}>
      <AssistanceRequestsContent />
    </Suspense>
  );
}
