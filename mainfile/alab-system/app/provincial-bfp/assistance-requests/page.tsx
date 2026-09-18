'use client';

import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProvincialAssistanceFeed } from '../../_components/use-provincial-assistance-feed';
import { BfpDataLoader } from '../../_components/bfp-data-loader';
import { ProvincialAlarmPanel } from '../../_components/provincial-alarm-panel';

const pageStyles = `
  .pbfp-aid-page {
    padding: 12px 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #F8FAFC;
    min-height: 100%;
    color: #0F172A;
  }

  /* Header Hub */
  .pbfp-aid-header-hub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding-bottom: 0.25rem;
  }

  .pbfp-aid-header-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .pbfp-aid-icon-badge {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #DC2626;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 1.15rem;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
    flex-shrink: 0;
  }

  .pbfp-aid-header-title-box h1 {
    font-size: 1.3rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pbfp-live-check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 750;
    color: #065F46;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
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
    font-size: 0.78rem;
    color: #64748B;
    margin: 0.15rem 0 0;
    font-weight: 500;
  }

  .pbfp-aid-header-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-aid-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.48rem 0.9rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #334155;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    transition: all 0.15s ease;
  }

  .pbfp-aid-refresh-btn:hover {
    background: #F8FAFC;
    border-color: #94A3B8;
    color: #0F172A;
  }

  .pbfp-btn-gis {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.48rem 1rem;
    background: #0F172A;
    color: #FFFFFF;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.78rem;
    text-decoration: none;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
    transition: all 0.18s ease;
  }

  .pbfp-btn-gis:hover {
    background: #1E293B;
    transform: translateY(-1px);
  }

  /* 4 Compact Tactical Summary Cards */
  .pbfp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
  }

  @media (max-width: 1024px) {
    .pbfp-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .pbfp-kpi-grid { grid-template-columns: 1fr; }
  }

  .pbfp-kpi-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 0.95rem 1.15rem;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .pbfp-kpi-card:hover {
    transform: translateY(-2px);
    border-color: #CBD5E1;
    box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.08);
  }

  .pbfp-kpi-badge {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .pbfp-kpi-badge.blue { background: #EFF6FF; border: 1px solid #DBEAFE; color: #2563EB; }
  .pbfp-kpi-badge.amber { background: #FFF7ED; border: 1px solid #FED7AA; color: #C2410C; }
  .pbfp-kpi-badge.emerald { background: #ECFDF5; border: 1px solid #D1FAE5; color: #059669; }
  .pbfp-kpi-badge.slate { background: #F1F5F9; border: 1px solid #E2E8F0; color: #475569; }

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
    font-size: 1.45rem;
    font-weight: 850;
    color: #0F172A;
    line-height: 1.15;
    margin: 0.1rem 0;
  }

  .pbfp-kpi-sub {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 550;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Escalation Section */
  .pbfp-escalation-section {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .pbfp-escalation-head {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-escalation-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 8px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    font-size: 0.85rem;
  }

  .pbfp-escalation-head h2 {
    margin: 0;
    font-size: 0.98rem;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.01em;
  }

  .pbfp-escalation-head p {
    margin: 2px 0 0;
    font-size: 0.76rem;
    color: #64748B;
    font-weight: 500;
  }

  /* Unified Coordination Panel */
  .pbfp-aid-panel {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .pbfp-aid-toolbar {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    flex-wrap: wrap;
    background: #FAFCFE;
  }

  .pbfp-tab-pills {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .pbfp-tab-pill {
    padding: 0.38rem 0.8rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 700;
    background: #F1F5F9;
    color: #475569;
    border: 1px solid #E2E8F0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    transition: all 0.15s ease;
  }

  .pbfp-tab-pill:hover {
    color: #0F172A;
    border-color: #CBD5E1;
  }

  .pbfp-tab-pill.active {
    background: #DC2626;
    color: #FFFFFF;
    border-color: #DC2626;
    box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);
  }

  .pbfp-tab-count {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.08);
    font-size: 0.68rem;
    font-weight: 800;
  }

  .pbfp-tab-pill.active .pbfp-tab-count {
    background: rgba(255, 255, 255, 0.25);
    color: #FFFFFF;
  }

  .pbfp-toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-search-box {
    position: relative;
    width: 250px;
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
    padding: 0.45rem 0.85rem 0.45rem 2.1rem;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.78rem;
    font-family: inherit;
    outline: none;
    background: #FFFFFF;
    color: #0F172A;
    box-sizing: border-box;
    transition: all 0.15s ease;
  }

  .pbfp-search-input:focus {
    border-color: #DC2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
  }

  .pbfp-view-toggle {
    display: flex;
    align-items: center;
    background: #F1F5F9;
    border-radius: 8px;
    padding: 2px;
    border: 1px solid #E2E8F0;
  }

  .pbfp-view-btn {
    padding: 0.4rem 0.65rem;
    border: none;
    background: transparent;
    color: #64748B;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.76rem;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pbfp-view-btn.active {
    background: #FFFFFF;
    color: #0F172A;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    font-weight: 700;
  }

  /* Table View */
  .pbfp-aid-table-wrap {
    overflow-x: auto;
  }

  .pbfp-aid-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    text-align: left;
  }

  .pbfp-aid-table th {
    padding: 0.85rem 1.15rem;
    background: #F8FAFC;
    color: #475569;
    font-weight: 800;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #E2E8F0;
    white-space: nowrap;
  }

  .pbfp-aid-table td {
    padding: 0.95rem 1.15rem;
    border-bottom: 1px solid #F1F5F9;
    vertical-align: middle;
  }

  .pbfp-aid-table tr {
    transition: background 0.14s ease;
  }

  .pbfp-aid-table tr:hover td {
    background: #F8FAFC;
  }

  .pbfp-aid-table tr.highlighted td {
    background: #EFF6FF;
  }

  .pbfp-ref-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 800;
    color: #0F172A;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-flow-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8rem;
    font-weight: 750;
    color: #0F172A;
  }

  .pbfp-muni-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    font-size: 0.78rem;
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

  .pbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    white-space: nowrap;
    text-transform: uppercase;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .pbfp-status-pill.requested { background: rgba(255, 247, 237, 0.9); color: #C2410C; border: 1px solid rgba(254, 215, 170, 0.9); }
  .pbfp-status-pill.accepted { background: rgba(236, 253, 245, 0.9); color: #065F46; border: 1px solid rgba(167, 243, 207, 0.9); }
  .pbfp-status-pill.partially_accepted { background: rgba(239, 246, 255, 0.9); color: #1E40AF; border: 1px solid rgba(191, 219, 254, 0.9); }
  .pbfp-status-pill.rejected { background: rgba(254, 242, 242, 0.9); color: #991B1B; border: 1px solid rgba(254, 202, 202, 0.9); }
  .pbfp-status-pill.cancelled { background: rgba(241, 245, 249, 0.9); color: #475569; border: 1px solid rgba(203, 213, 225, 0.9); }
  .pbfp-status-pill.completed { background: rgba(243, 244, 246, 0.9); color: #374151; border: 1px solid rgba(209, 213, 219, 0.9); }

  .pbfp-btn-inspect {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.32rem 0.65rem;
    background: rgba(241, 245, 249, 0.85);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(203, 213, 225, 0.9);
    border-radius: 6px;
    color: #334155;
    font-size: 0.72rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pbfp-btn-inspect:hover {
    background: #0F172A;
    color: #FFFFFF;
    border-color: #0F172A;
  }

  /* Compact Cards Grid View */
  .pbfp-aid-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 0.75rem;
    padding: 0.85rem;
  }

  .pbfp-aid-grid-card {
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 14px;
    padding: 0.85rem 1.05rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.65rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.95);
    transition: all 0.16s ease;
  }

  .pbfp-aid-grid-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 1);
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  }

  .pbfp-aid-grid-card.highlighted {
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  /* Res items */
  .pbfp-res-items {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .pbfp-res-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.18rem 0.45rem;
    border-radius: 5px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    font-size: 0.72rem;
    font-weight: 700;
    color: #334155;
  }

  /* Empty State */
  .pbfp-aid-empty {
    padding: 3rem 1.5rem;
    text-align: center;
    color: #64748B;
  }

  .pbfp-aid-empty-icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #F1F5F9;
    color: #94A3B8;
    font-size: 1.25rem;
    margin: 0 auto 0.75rem;
  }

  .pbfp-aid-empty h3 {
    font-size: 0.98rem;
    font-weight: 800;
    color: #1E293B;
    margin: 0 0 0.3rem;
  }

  .pbfp-aid-empty p {
    font-size: 0.8rem;
    margin: 0;
    max-width: 460px;
    margin: 0 auto;
  }

  /* Table Footer */
  .pbfp-table-footer {
    padding: 0.75rem 1.15rem;
    background: #FAFCFE;
    border-top: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #64748B;
    font-weight: 600;
  }

  /* Inspection Modal */
  .pbfp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 1.25rem;
  }

  .pbfp-modal-panel {
    background: #FFFFFF;
    border-radius: 16px;
    width: 100%;
    max-width: 620px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.3);
    border: 1px solid #E2E8F0;
    display: flex;
    flex-direction: column;
  }

  .pbfp-modal-header {
    padding: 1.1rem 1.4rem;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background: #FAFCFE;
  }

  .pbfp-modal-title {
    font-size: 1.05rem;
    font-weight: 850;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pbfp-modal-body {
    padding: 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-size: 0.82rem;
  }

  .pbfp-modal-section {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .pbfp-modal-sec-title {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748B;
  }

  .pbfp-modal-footer {
    padding: 0.95rem 1.4rem;
    border-top: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.65rem;
    background: #FAFCFE;
  }

  .pbfp-btn-close {
    padding: 0.45rem 0.95rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #334155;
    cursor: pointer;
  }
  .pbfp-btn-close:hover {
    background: #F1F5F9;
    color: #0F172A;
  }

  .pbfp-btn-link-incident {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    background: #DC2626;
    color: #FFFFFF;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 750;
    text-decoration: none;
    transition: background 0.15s ease;
  }
  .pbfp-btn-link-incident:hover {
    background: #B91C1C;
  }
`;

function AssistanceRequestsContent() {
  const searchParams = useSearchParams();
  const highlightedRequestId = searchParams?.get('request') || null;

  const [filterMode, setFilterMode] = useState<'ACTIVE' | 'ALL' | 'REQUESTED' | 'DISPATCHED'>('ACTIVE');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectItem, setInspectItem] = useState<any | null>(null);

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

  const cardRefs = useRef<Record<string, HTMLTableRowElement | HTMLDivElement | null>>({});

  // Auto scroll to highlighted request if present
  useEffect(() => {
    if (highlightedRequestId && cardRefs.current[highlightedRequestId]) {
      cardRefs.current[highlightedRequestId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      const found = requests.find((r) => r.id === highlightedRequestId);
      if (found) setInspectItem(found);
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

  // Filter by query and tab
  const filteredRequests = useMemo(() => {
    let result = requests;
    if (filterMode === 'REQUESTED') {
      result = result.filter((r) => r.status === 'REQUESTED');
    } else if (filterMode === 'DISPATCHED') {
      result = result.filter((r) => r.status === 'ACCEPTED' || r.status === 'PARTIALLY_ACCEPTED');
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();
    return result.filter((r) =>
      r.requesterMunicipalityName.toLowerCase().includes(q) ||
      r.recipientMunicipalityName.toLowerCase().includes(q) ||
      r.referenceNumber.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      (r.requestNote && r.requestNote.toLowerCase().includes(q)) ||
      (r.responseNote && r.responseNote.toLowerCase().includes(q))
    );
  }, [requests, filterMode, searchQuery]);

  return (
    <>
      <style>{pageStyles}</style>
      <div className="pbfp-aid-page">
        {/* Header Hub */}
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
            <Link href="/provincial-bfp/gis-map" className="pbfp-btn-gis" title="View Antique GIS Map">
              <i className="fa-solid fa-map-location-dot" />
              GIS Map
            </Link>
          </div>
        </div>

        {/* 4 Tactical KPI Cards */}
        <div className="pbfp-kpi-grid">
          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-badge blue">
              <i className="fa-solid fa-layer-group" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Total Calls In Feed</span>
              <span className="pbfp-kpi-val">{metrics.total}</span>
              <span className="pbfp-kpi-sub">Cross-jurisdiction logs</span>
            </div>
          </div>

          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-badge amber">
              <i className="fa-solid fa-hourglass-half" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Awaiting Response</span>
              <span className="pbfp-kpi-val">{metrics.requested}</span>
              <span className="pbfp-kpi-sub">Station decisions pending</span>
            </div>
          </div>

          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-badge emerald">
              <i className="fa-solid fa-truck-fast" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Units Dispatched</span>
              <span className="pbfp-kpi-val">{metrics.coordinated}</span>
              <span className="pbfp-kpi-sub">Active apparatus en route</span>
            </div>
          </div>

          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-badge slate">
              <i className="fa-solid fa-circle-check" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Concluded / Returned</span>
              <span className="pbfp-kpi-val">{metrics.completed}</span>
              <span className="pbfp-kpi-sub">Demobilized & closed</span>
            </div>
          </div>
        </div>

        {/*
          Escalations the province has to answer, above the feed of what has
          already been asked. It carries its own heading: mounting it bare and
          ahead of the page title meant the title was pushed off the screen the
          moment a request arrived.
        */}
        <section className="pbfp-escalation-section" aria-labelledby="pbfp-escalation-heading">
          <div className="pbfp-escalation-head">
            <div className="pbfp-escalation-icon" aria-hidden="true">
              <i className="fa-solid fa-tower-broadcast" />
            </div>
            <div>
              <h2 id="pbfp-escalation-heading">Escalated to the province</h2>
            </div>
          </div>
          <ProvincialAlarmPanel />
        </section>

        {/* Mutual Aid Coordination Panel */}
        <div className="pbfp-aid-panel">
          <div className="pbfp-aid-toolbar">
            <div className="pbfp-tab-pills">
              <button
                type="button"
                className={`pbfp-tab-pill ${filterMode === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setFilterMode('ACTIVE')}
              >
                <i className="fa-solid fa-fire-burner" />
                Active Mutual Aid
                <span className="pbfp-tab-count">
                  {requests.filter((r) => r.status === 'REQUESTED' || r.status === 'ACCEPTED' || r.status === 'PARTIALLY_ACCEPTED').length}
                </span>
              </button>

              <button
                type="button"
                className={`pbfp-tab-pill ${filterMode === 'REQUESTED' ? 'active' : ''}`}
                onClick={() => setFilterMode('REQUESTED')}
              >
                <i className="fa-solid fa-hourglass-half" />
                Awaiting Response
                <span className="pbfp-tab-count">{metrics.requested}</span>
              </button>

              <button
                type="button"
                className={`pbfp-tab-pill ${filterMode === 'DISPATCHED' ? 'active' : ''}`}
                onClick={() => setFilterMode('DISPATCHED')}
              >
                <i className="fa-solid fa-truck-fast" />
                Dispatched
                <span className="pbfp-tab-count">{metrics.coordinated}</span>
              </button>

              <button
                type="button"
                className={`pbfp-tab-pill ${filterMode === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterMode('ALL')}
              >
                <i className="fa-solid fa-clock-rotate-left" />
                Full History
                <span className="pbfp-tab-count">{requests.length}</span>
              </button>
            </div>

            <div className="pbfp-toolbar-right">
              <div className="pbfp-search-box">
                <i className="fa-solid fa-magnifying-glass" />
                <input
                  type="text"
                  className="pbfp-search-input"
                  placeholder="Search municipality, ref, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="pbfp-view-toggle">
                <button
                  type="button"
                  className={`pbfp-view-btn ${viewMode === 'TABLE' ? 'active' : ''}`}
                  onClick={() => setViewMode('TABLE')}
                  title="Tactical Table View"
                >
                  <i className="fa-solid fa-table-list" />
                </button>
                <button
                  type="button"
                  className={`pbfp-view-btn ${viewMode === 'GRID' ? 'active' : ''}`}
                  onClick={() => setViewMode('GRID')}
                  title="Compact Cards View"
                >
                  <i className="fa-solid fa-table-cells-large" />
                </button>
              </div>
            </div>
          </div>

          {/* Feed Content */}
          {loading && requests.length === 0 ? (
            <BfpDataLoader theme="provincial" title="Synchronizing live mutual aid feed..." />
          ) : error ? (
            <div style={{ padding: '1.25rem', background: '#FEF2F2', borderBottom: '1px solid #FECACA', color: '#991B1B', fontSize: '0.84rem' }}>
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
          ) : viewMode === 'TABLE' ? (
            <div className="pbfp-aid-table-wrap">
              <table className="pbfp-aid-table">
                <thead>
                  <tr>
                    <th>Reference / Time</th>
                    <th>Jurisdiction Flow</th>
                    <th>Requested Aid</th>
                    <th>Dispatched Aid</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const isTarget = highlightedRequestId === req.id;
                    const statusClass = req.status.toLowerCase();

                    return (
                      <tr
                        key={req.id}
                        ref={(el) => {
                          cardRefs.current[req.id] = el;
                        }}
                        className={isTarget ? 'highlighted' : ''}
                      >
                        <td>
                          <div className="pbfp-ref-code">
                            <i className="fa-solid fa-fire" style={{ color: '#DC2626', fontSize: '0.75rem' }} />
                            {req.referenceNumber}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(req.requestedAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td>
                          <div className="pbfp-flow-badge">
                            <span className="pbfp-muni-pill requester">
                              <i className="fa-solid fa-location-dot" />
                              {req.requesterMunicipalityName}
                            </span>
                            <i className="fa-solid fa-arrow-right-long" style={{ color: '#94A3B8', fontSize: '0.75rem' }} />
                            <span className="pbfp-muni-pill recipient">
                              <i className="fa-solid fa-shield-halved" />
                              {req.recipientMunicipalityName}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="pbfp-res-items">
                            <span className="pbfp-res-item">
                              <i className="fa-solid fa-truck-droplet" style={{ color: '#DC2626' }} />
                              {req.requestedFiretrucks} Truck{req.requestedFiretrucks > 1 ? 's' : ''}
                            </span>
                            <span className="pbfp-res-item">
                              <i className="fa-solid fa-user-group" style={{ color: '#2563EB' }} />
                              {req.requestedPersonnel} Crew
                            </span>
                          </div>
                        </td>

                        <td>
                          {req.offeredFiretrucks != null || req.offeredPersonnel != null ? (
                            <div className="pbfp-res-items">
                              <span className="pbfp-res-item">
                                <i className="fa-solid fa-truck-droplet" style={{ color: '#059669' }} />
                                {req.offeredFiretrucks ?? 0} Dispatched
                              </span>
                              <span className="pbfp-res-item">
                                <i className="fa-solid fa-user-group" style={{ color: '#059669' }} />
                                {req.offeredPersonnel ?? 0} Crew
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontStyle: 'italic' }}>
                              {req.status === 'REQUESTED' ? 'Awaiting allocation' : 'None allocated'}
                            </span>
                          )}
                        </td>

                        <td>
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
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="pbfp-btn-inspect"
                              onClick={() => setInspectItem(req)}
                              title="Inspect full details"
                            >
                              <i className="fa-solid fa-eye" />
                              Details
                            </button>
                            <Link
                              href={`/provincial-bfp/incidents?incident=${encodeURIComponent(req.fireReportId)}`}
                              className="pbfp-btn-inspect"
                              title="View Incident Oversight"
                            >
                              <i className="fa-solid fa-fire" />
                              Incident
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="pbfp-table-footer">
                <span>
                  Showing <strong>{filteredRequests.length}</strong> of <strong>{requests.length}</strong> records
                </span>
                <span>
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.35rem', color: '#DC2626' }} />
                  Provincial Tactical Oversight Active
                </span>
              </div>
            </div>
          ) : (
            <div className="pbfp-aid-grid">
              {filteredRequests.map((req) => {
                const isTarget = highlightedRequestId === req.id;
                const statusClass = req.status.toLowerCase();

                return (
                  <div
                    key={req.id}
                    ref={(el) => {
                      cardRefs.current[req.id] = el;
                    }}
                    className={`pbfp-aid-grid-card ${isTarget ? 'highlighted' : ''}`}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem' }}>
                        <span className="pbfp-ref-code">
                          <i className="fa-solid fa-fire" style={{ color: '#DC2626', fontSize: '0.75rem' }} />
                          {req.referenceNumber}
                        </span>
                        <span className={`pbfp-status-pill ${statusClass}`}>
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="pbfp-flow-badge" style={{ marginBottom: '0.65rem' }}>
                        <span className="pbfp-muni-pill requester">
                          {req.requesterMunicipalityName}
                        </span>
                        <i className="fa-solid fa-arrow-right-long" style={{ color: '#94A3B8', fontSize: '0.75rem' }} />
                        <span className="pbfp-muni-pill recipient">
                          {req.recipientMunicipalityName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#F8FAFC', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '0.55rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                          Requested vs Dispatched
                        </div>
                        <div className="pbfp-res-items">
                          <span className="pbfp-res-item">
                            <i className="fa-solid fa-truck-droplet" style={{ color: '#DC2626' }} />
                            Req: {req.requestedFiretrucks}T / {req.requestedPersonnel}P
                          </span>
                          {req.offeredFiretrucks != null ? (
                            <span className="pbfp-res-item" style={{ borderColor: '#A7F3D0', background: '#ECFDF5', color: '#065F46' }}>
                              <i className="fa-solid fa-truck-fast" />
                              Out: {req.offeredFiretrucks}T / {req.offeredPersonnel}P
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Awaiting unit assign</span>
                          )}
                        </div>
                      </div>

                      {req.requestNote && (
                        <div style={{ fontSize: '0.74rem', color: '#475569', lineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontStyle: 'italic' }}>
                          &ldquo;{req.requestNote}&rdquo;
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                        <i className="fa-regular fa-clock" style={{ marginRight: '0.25rem' }} />
                        {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        className="pbfp-btn-inspect"
                        onClick={() => setInspectItem(req)}
                      >
                        <i className="fa-solid fa-expand" />
                        Inspect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Inspection Modal */}
        {inspectItem && (
          <div className="pbfp-modal-overlay" onClick={() => setInspectItem(null)}>
            <div className="pbfp-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="pbfp-modal-header">
                <div className="pbfp-modal-title">
                  <i className="fa-solid fa-handshake-angle" style={{ color: '#DC2626' }} />
                  Mutual Aid Oversight Dossier
                </div>
                <button
                  type="button"
                  className="pbfp-btn-close"
                  onClick={() => setInspectItem(null)}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div className="pbfp-modal-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800 }}>
                      Operational Reference
                    </span>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', color: '#0F172A' }}>
                      #{inspectItem.referenceNumber}
                    </div>
                  </div>
                  <span className={`pbfp-status-pill ${inspectItem.status.toLowerCase()}`}>
                    {inspectItem.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="pbfp-modal-section">
                  <span className="pbfp-modal-sec-title">Deployment Direction</span>
                  <div className="pbfp-flow-badge" style={{ fontSize: '0.9rem' }}>
                    <span className="pbfp-muni-pill requester">
                      <i className="fa-solid fa-location-dot" />
                      {inspectItem.requesterMunicipalityName}
                    </span>
                    <i className="fa-solid fa-arrow-right-long" style={{ color: '#94A3B8' }} />
                    <span className="pbfp-muni-pill recipient">
                      <i className="fa-solid fa-shield-halved" />
                      {inspectItem.recipientMunicipalityName}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="pbfp-modal-section">
                    <span className="pbfp-modal-sec-title">Requested Resources</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
                      <span className="pbfp-res-item">
                        <i className="fa-solid fa-truck-droplet" style={{ color: '#DC2626' }} />
                        {inspectItem.requestedFiretrucks} Firetruck{inspectItem.requestedFiretrucks > 1 ? 's' : ''}
                      </span>
                      <span className="pbfp-res-item">
                        <i className="fa-solid fa-user-group" style={{ color: '#2563EB' }} />
                        {inspectItem.requestedPersonnel} Personnel / Crew
                      </span>
                    </div>
                  </div>

                  <div className="pbfp-modal-section">
                    <span className="pbfp-modal-sec-title">Offered / Dispatched</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
                      {inspectItem.offeredFiretrucks != null ? (
                        <>
                          <span className="pbfp-res-item" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
                            <i className="fa-solid fa-truck-fast" />
                            {inspectItem.offeredFiretrucks} Firetruck{inspectItem.offeredFiretrucks > 1 ? 's' : ''}
                          </span>
                          <span className="pbfp-res-item" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
                            <i className="fa-solid fa-users" />
                            {inspectItem.offeredPersonnel} Personnel
                          </span>
                        </>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.78rem', fontStyle: 'italic' }}>
                          Awaiting response from station
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {inspectItem.requestNote && (
                  <div className="pbfp-modal-section">
                    <span className="pbfp-modal-sec-title">Origin Request Field Note</span>
                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.5 }}>{inspectItem.requestNote}</p>
                  </div>
                )}

                {inspectItem.responseNote && (
                  <div className="pbfp-modal-section" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
                    <span className="pbfp-modal-sec-title" style={{ color: '#1E40AF' }}>
                      Station Dispatch Response {inspectItem.responderName ? `(by ${inspectItem.responderName})` : ''}
                    </span>
                    <p style={{ margin: 0, color: '#1E3A8A', lineHeight: 1.5 }}>{inspectItem.responseNote}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748B', paddingTop: '0.35rem' }}>
                  <span>
                    <i className="fa-regular fa-clock" style={{ marginRight: '0.25rem' }} />
                    Requested: {new Date(inspectItem.requestedAt).toLocaleString()}
                  </span>
                  {inspectItem.respondedAt && (
                    <span>
                      <i className="fa-solid fa-check-double" style={{ marginRight: '0.25rem' }} />
                      Responded: {new Date(inspectItem.respondedAt).toLocaleString()}
                    </span>
                  )}
                  {inspectItem.completedAt && (
                    <span>
                      <i className="fa-solid fa-flag-checkered" style={{ marginRight: '0.25rem' }} />
                      Concluded: {new Date(inspectItem.completedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="pbfp-modal-footer">
                <button
                  type="button"
                  className="pbfp-btn-close"
                  onClick={() => setInspectItem(null)}
                >
                  Close
                </button>
                <Link
                  href={`/provincial-bfp/incidents?incident=${encodeURIComponent(inspectItem.fireReportId)}`}
                  className="pbfp-btn-link-incident"
                >
                  <i className="fa-solid fa-fire" />
                  View Incident Command Oversight
                </Link>
              </div>
            </div>
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
