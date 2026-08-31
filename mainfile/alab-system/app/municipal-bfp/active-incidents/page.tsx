'use client';

import { useMemo, useState } from "react";
import { MunicipalIncidentDetail } from "../../_components/municipal-incident-detail";
import { BfpDataLoader } from "../../_components/bfp-data-loader";
import { useMunicipalIncidentFeed } from "../../_components/use-municipal-incident-feed";

const activeIncidentsStyles = `
  /* ========== ACTIVE INCIDENTS STYLES ========== */
  .mbfp-incidents-shell {
    padding: 10px 1.5rem 2.5rem;
    max-width: 1640px;
    margin: 0 auto;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0F172A;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #EEF5FD;
    min-height: 100%;
  }

  /* Header Section */
  .mbfp-incidents-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0;
    flex-wrap: wrap;
  }

  .mbfp-incidents-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mbfp-live-check {
    color: #64748B;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .mbfp-incidents-h1 {
    font-size: clamp(1.3rem, 2vw, 1.6rem);
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.03em;
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .mbfp-incidents-h1 i {
    color: #DC2626;
  }

  /* Header Action Controls */
  .mbfp-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mbfp-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.95rem;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    color: #334155;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }

  .mbfp-refresh-btn:hover {
    background: #F8FAFC;
    border-color: #CBD5E1;
    color: #0F172A;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
  }

  .mbfp-refresh-btn i.spin {
    animation: mbfpSpin 0.75s linear infinite;
  }

  @keyframes mbfpSpin {
    to { transform: rotate(360deg); }
  }

  /* Quick Metric KPI Cards (Exact Provincial Spacing) */
  .mbfp-quick-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 0;
  }

  .mbfp-qstat-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.85rem 0.95rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-qstat-card:hover {
    border-color: #CBD5E1;
    transform: translateY(-1.5px);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  }

  .mbfp-qstat-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .mbfp-qstat-icon.red { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
  .mbfp-qstat-icon.emerald { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
  .mbfp-qstat-icon.blue { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
  .mbfp-qstat-icon.amber { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }

  .mbfp-qstat-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .mbfp-qstat-val {
    font-size: 1.45rem;
    font-weight: 850;
    color: #0F172A;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .mbfp-qstat-lbl {
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 600;
    margin-top: 0.15rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Filter & Search Bar */
  .mbfp-toolbar {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    margin-bottom: 0;
    flex-wrap: wrap;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
  }

  .mbfp-search-box {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 250px;
    max-width: 420px;
  }

  .mbfp-search-box i {
    position: absolute;
    left: 0.85rem;
    color: #94A3B8;
    font-size: 0.85rem;
    pointer-events: none;
  }

  .mbfp-search-input {
    width: 100%;
    height: 38px;
    padding: 0 0.8rem 0 2.3rem;
    border: 1px solid #E2E8F0;
    border-radius: 9px;
    font-family: inherit;
    font-size: 0.82rem;
    color: #0F172A;
    background: #F8FAFC;
    transition: all 0.2s ease;
  }

  .mbfp-search-input:focus {
    outline: none;
    border-color: #DC2626;
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
  }

  .mbfp-filter-pills {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .mbfp-tab-pill {
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 700;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-tab-pill:hover {
    background: #F1F5F9;
    color: #0F172A;
    border-color: #CBD5E1;
  }

  .mbfp-tab-pill.active {
    background: #0F172A;
    color: #FFFFFF;
    border-color: #0F172A;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
  }

  /* Table Card Container */
  .mbfp-table-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
  }

  .mbfp-table-responsive {
    width: 100%;
    overflow-x: auto;
  }

  .mbfp-incidents-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  .mbfp-incidents-table thead {
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
  }

  .mbfp-incidents-table th {
    padding: 0.75rem 1rem;
    font-size: 0.7rem;
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .mbfp-incidents-table tbody tr {
    border-bottom: 1px solid #F1F5F9;
    transition: background 0.15s ease;
  }

  .mbfp-incidents-table tbody tr:hover {
    background: #FFF9F9;
  }

  .mbfp-incidents-table tbody tr:last-child {
    border-bottom: none;
  }

  .mbfp-incidents-table td {
    padding: 0.85rem 1rem;
    font-size: 0.82rem;
    color: #1E293B;
    vertical-align: middle;
  }

  /* Table Cell Elements */
  .mbfp-ref-code {
    font-weight: 800;
    color: #0F172A;
    font-size: 0.84rem;
    letter-spacing: -0.01em;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-ref-time {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 500;
    margin-top: 0.15rem;
  }

  .mbfp-caller-cell {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .mbfp-caller-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #EEF2F6;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.76rem;
    font-weight: 800;
    flex-shrink: 0;
  }

  .mbfp-caller-name {
    font-weight: 700;
    color: #0F172A;
  }

  .mbfp-loc-cell {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
  }

  .mbfp-loc-brgy {
    font-weight: 700;
    color: #1E293B;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-loc-landmark {
    font-size: 0.73rem;
    color: #64748B;
    font-weight: 500;
  }

  /* Fire Type Badge */
  .mbfp-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.26rem 0.65rem;
    border-radius: 7px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.01em;
    background: #FFF1F2;
    color: #E11D48;
    border: 1px solid #FECDD3;
    white-space: nowrap;
  }

  /* Status Badges */
  .mbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    padding: 0.28rem 0.7rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .mbfp-status-pill.responding {
    background: #ECFDF5;
    color: #059669;
    border: 1px solid #A7F3D0;
  }

  .mbfp-status-pill.dispatched {
    background: #EFF6FF;
    color: #2563EB;
    border: 1px solid #BFDBFE;
  }

  .mbfp-status-pill.verified {
    background: #FFFBEB;
    color: #D97706;
    border: 1px solid #FDE68A;
  }

  .mbfp-status-pill.pending {
    background: #FEF2F2;
    color: #DC2626;
    border: 1px solid #FECACA;
  }

  .mbfp-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .mbfp-status-pill.responding .mbfp-status-dot,
  .mbfp-status-pill.pending .mbfp-status-dot {
    animation: mbfpBeacon 1.5s infinite;
  }

  @keyframes mbfpBeacon {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }

  /* Action Button */
  .mbfp-open-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.55rem 1.15rem;
    background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%);
    border: none;
    border-radius: 8px;
    color: #FFFFFF;
    font-size: 0.82rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 14px rgba(208, 15, 9, 0.28);
    white-space: nowrap;
    text-decoration: none;
  }

  .mbfp-open-btn:hover {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 18px rgba(208, 15, 9, 0.38);
  }

  .mbfp-open-btn:active {
    transform: translateY(0);
  }

  .mbfp-open-btn i {
    font-size: 0.76rem;
    transition: transform 0.18s ease;
  }

  .mbfp-open-btn:hover i {
    transform: translateX(2.5px);
  }

  /* Empty State */
  .mbfp-empty-state {
    padding: 4rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .mbfp-empty-icon-radar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    color: #059669;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    margin-bottom: 0.85rem;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12);
  }

  .mbfp-empty-title {
    font-size: 1.1rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0 0 0.3rem;
  }

  .mbfp-empty-desc {
    font-size: 0.84rem;
    color: #64748B;
    margin: 0;
    max-width: 380px;
  }

  /* Error Alert */
  .mbfp-error-banner {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    color: #991B1B;
    font-size: 0.82rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 8px;
  }

  /* Responsive Adjustments */
  @media (max-width: 1024px) {
    .mbfp-quick-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 768px) {
    .mbfp-incidents-shell {
      padding: 8px 0.85rem 2rem;
    }
    .mbfp-quick-stats {
      grid-template-columns: 1fr;
    }
    .mbfp-toolbar {
      flex-direction: column;
      align-items: stretch;
    }
    .mbfp-search-box {
      max-width: 100%;
    }
  }
`;

export default function ActiveIncidentsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const { incidents, loading, checking, refreshing, error, lastCheckedAt, refresh } = useMunicipalIncidentFeed();
  const liveRefreshLabel = checking
    ? "Live · checking..."
    : lastCheckedAt
      ? "Live · checked just now"
      : "Live · waiting for telemetry";

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.residentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.barangay || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.landmark && item.landmark.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === "ALL") return true;
      if (activeFilter === "RESPONDING") return item.status === "RESPONDING";
      if (activeFilter === "DISPATCHED") return item.status === "DISPATCHED" || item.status === "ASSIGNED";
      if (activeFilter === "VERIFIED") return item.status === "VERIFIED";
      if (activeFilter === "PENDING") return item.status === "PENDING" || item.status === "UNVERIFIED";

      return true;
    });
  }, [incidents, searchQuery, activeFilter]);

  const respondingCount = incidents.filter((i) => i.status === "RESPONDING").length;
  const verifiedCount = incidents.filter((i) => i.status === "VERIFIED" || i.status === "DISPATCHED").length;
  const pendingCount = incidents.filter((i) => i.status === "PENDING" || i.status === "UNVERIFIED").length;

  if (selected) {
    return (
      <MunicipalIncidentDetail
        incidentId={selected}
        onBack={() => setSelected(null)}
        onResponded={() => refresh()}
      />
    );
  }

  return (
    <>
      <style>{activeIncidentsStyles}</style>
      <div className="mbfp-incidents-shell">
        {/* Page Header */}
        <header className="mbfp-incidents-header">
          <div className="mbfp-incidents-title-group">
            <h1 className="mbfp-incidents-h1">
              <i className="fa-solid fa-fire" />
              <span>Active Incidents</span>
            </h1>
            <span className="mbfp-live-check" aria-live="polite">{liveRefreshLabel}</span>
          </div>

          <div className="mbfp-header-actions">
            <button
              className="mbfp-refresh-btn"
              onClick={() => refresh(true)}
              disabled={refreshing}
              aria-label="Refresh incident queue"
            >
              <i className={`fa-solid fa-arrows-rotate ${checking ? "spin" : ""}`} />
              <span>{refreshing ? "Refreshing…" : "Live Refresh"}</span>
            </button>
          </div>
        </header>

        {/* Quick KPI Stats Row */}
        <section className="mbfp-quick-stats" aria-label="Incident Summary Statistics">
          <div className="mbfp-qstat-card">
            <div className="mbfp-qstat-icon red">
              <i className="fa-solid fa-fire-flame-curved" />
            </div>
            <div className="mbfp-qstat-body">
              <span className="mbfp-qstat-val">{incidents.length}</span>
              <span className="mbfp-qstat-lbl">Total Active In Queue</span>
            </div>
          </div>

          <div className="mbfp-qstat-card">
            <div className="mbfp-qstat-icon emerald">
              <i className="fa-solid fa-truck-fast" />
            </div>
            <div className="mbfp-qstat-body">
              <span className="mbfp-qstat-val">{respondingCount}</span>
              <span className="mbfp-qstat-lbl">BFP Responding Now</span>
            </div>
          </div>

          <div className="mbfp-qstat-card">
            <div className="mbfp-qstat-icon blue">
              <i className="fa-solid fa-clipboard-check" />
            </div>
            <div className="mbfp-qstat-body">
              <span className="mbfp-qstat-val">{verifiedCount}</span>
              <span className="mbfp-qstat-lbl">Verified &amp; Dispatched</span>
            </div>
          </div>

          <div className="mbfp-qstat-card">
            <div className="mbfp-qstat-icon amber">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <div className="mbfp-qstat-body">
              <span className="mbfp-qstat-val">{pendingCount}</span>
              <span className="mbfp-qstat-lbl">Pending Verification</span>
            </div>
          </div>
        </section>

        {/* Search & Filter Toolbar */}
        <div className="mbfp-toolbar">
          <div className="mbfp-search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search reference #, resident, barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mbfp-search-input"
              aria-label="Search incidents"
            />
          </div>

          <div className="mbfp-filter-pills" role="tablist">
            <button
              className={`mbfp-tab-pill ${activeFilter === "ALL" ? "active" : ""}`}
              onClick={() => setActiveFilter("ALL")}
            >
              All ({incidents.length})
            </button>
            <button
              className={`mbfp-tab-pill ${activeFilter === "RESPONDING" ? "active" : ""}`}
              onClick={() => setActiveFilter("RESPONDING")}
            >
              Responding ({respondingCount})
            </button>
            <button
              className={`mbfp-tab-pill ${activeFilter === "VERIFIED" ? "active" : ""}`}
              onClick={() => setActiveFilter("VERIFIED")}
            >
              Verified / Dispatched ({verifiedCount})
            </button>
            <button
              className={`mbfp-tab-pill ${activeFilter === "PENDING" ? "active" : ""}`}
              onClick={() => setActiveFilter("PENDING")}
            >
              Pending ({pendingCount})
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mbfp-error-banner" role="alert">
            <i className="fa-solid fa-circle-exclamation" />
            <span>{error}</span>
          </div>
        )}

        {/* Incidents Data Table */}
        <div className="mbfp-table-card">
          <div className="mbfp-table-responsive">
            <table className="mbfp-incidents-table">
              <thead>
                <tr>
                  <th>Report Reference</th>
                  <th>Resident Caller</th>
                  <th>Location &amp; Landmark</th>
                  <th>Fire Classification</th>
                  <th>Live Status</th>
                  <th style={{ textAlign: "right" }}>Command Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "1.5rem 0.5rem" }}>
                      <BfpDataLoader
                        theme="municipal"
                        size="sm"
                        title="Connecting to Live Incident Telemetry…"
                        subtitle="Synchronizing incoming emergency reports and suppression status."
                        minHeight="220px"
                      />
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="mbfp-empty-state">
                        <div className="mbfp-empty-icon-radar">
                          <i className="fa-solid fa-shield-halved" />
                        </div>
                        <h3 className="mbfp-empty-title">No Active Emergency Reports</h3>
                        <p className="mbfp-empty-desc">
                          {searchQuery
                            ? "No incident matching your search terms was found."
                            : "All clear! There are currently no active fire reports in your assigned municipality."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => {
                    const statusClass =
                      inc.status === "RESPONDING"
                        ? "responding"
                        : inc.status === "DISPATCHED" || inc.status === "ASSIGNED"
                        ? "dispatched"
                        : inc.status === "VERIFIED"
                        ? "verified"
                        : "pending";

                    return (
                      <tr key={inc.id}>
                        {/* Reference Code */}
                        <td>
                          <div className="mbfp-ref-code">
                            <i className="fa-solid fa-hashtag" style={{ color: "#94A3B8", fontSize: "0.75rem" }} />
                            <span>{inc.referenceNumber}</span>
                          </div>
                          {inc.reportSource === "PHONE_CALL" && <div className="mbfp-ref-time">From Phone Caller</div>}
                          <div className="mbfp-ref-time">
                            {new Date(inc.submittedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {new Date(inc.submittedAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Resident */}
                        <td>
                          <div className="mbfp-caller-cell">
                            <div className="mbfp-caller-avatar">
                              {inc.residentName ? inc.residentName.charAt(0).toUpperCase() : inc.reportSource === "PHONE_CALL" ? "C" : "R"}
                            </div>
                            <span className="mbfp-caller-name">{inc.residentName || (inc.reportSource === "PHONE_CALL" ? "Anonymous caller" : "Anonymous Resident")}</span>
                          </div>
                        </td>

                        {/* Location */}
                        <td>
                          <div className="mbfp-loc-cell">
                            <span className="mbfp-loc-brgy">
                              <i className="fa-solid fa-location-dot" style={{ color: "#DC2626", fontSize: "0.8rem" }} />
                              {inc.barangay || "Barangay not identified"}
                            </span>
                            <span className="mbfp-loc-landmark">
                              {inc.landmark ? `Near: ${inc.landmark}` : "No landmark specified"}
                            </span>
                          </div>
                        </td>

                        {/* Fire Type */}
                        <td>
                          <span className="mbfp-type-badge">
                            <i className="fa-solid fa-fire" />
                            <span>{inc.fireType.replaceAll("_", " ")}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`mbfp-status-pill ${statusClass}`}>
                            <span className="mbfp-status-dot" />
                            <span>{inc.status.replaceAll("_", " ")}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="mbfp-open-btn"
                            onClick={() => setSelected(inc.id)}
                            aria-label={`Open incident ${inc.referenceNumber}`}
                          >
                            <span>Open Incident</span>
                            <i className="fa-solid fa-arrow-right" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
