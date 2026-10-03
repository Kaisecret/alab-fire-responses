'use client';

import React, { Suspense, useMemo } from 'react';
import { useProvincialAssistanceFeed } from '../../_components/use-provincial-assistance-feed';
import { SkeletonPage } from '../../_components/skeleton-loader';
import { ProvincialAlarmPanel } from '../../_components/provincial-alarm-panel';
import { StatCards } from "../../_components/municipal-stat-cards";
import { FireCommandHeader } from '../../_components/fire-command-header';

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

  /* ========== 4 PASTEL KPI METRIC CARDS (DASHBOARD STYLE - COMPACT) ========== */








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
  const {
    requests,
    checking,
    error,
    lastCheckedAt,
  } = useProvincialAssistanceFeed();

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

  return (
    <>
      <style>{pageStyles}</style>
      <div className="pbfp-aid-page">
        <FireCommandHeader slotId="provincial-fire-command-header" title="Inter-Municipality Mutual Aid Coordination" icon="fa-handshake-angle" live checking={checking} lastCheckedAt={lastCheckedAt} error={error} />

        {/* 4 Tactical KPI Cards (Dashboard Style) */}
        <StatCards
          label="Assistance request totals"
          items={[
            { key: "total", icon: "fa-layer-group", tone: "blue", badge: "Total Feed", value: metrics.total, label: "Total Calls In Feed", description: "Cross-jurisdiction logs" },
            { key: "requested", icon: "fa-hourglass-half", tone: "amber", badge: "Pending", value: metrics.requested, label: "Awaiting Response", description: "Station decisions pending" },
            { key: "dispatched", icon: "fa-truck-fast", tone: "emerald", badge: "Active", value: metrics.coordinated, label: "Units Dispatched", description: "Active apparatus en route" },
            { key: "closed", icon: "fa-circle-check", tone: "violet", badge: "Closed", value: metrics.completed, label: "Concluded / Returned", description: "Demobilized & closed" },
          ]}
        />



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
      </div>
    </>
  );
}

export default function AssistanceRequestsPage() {
  return (
    <Suspense fallback={<SkeletonPage label="Loading assistance requests" style={{ padding: '10px 1.5rem 2.5rem' }} />}>
      <AssistanceRequestsContent />
    </Suspense>
  );
}
