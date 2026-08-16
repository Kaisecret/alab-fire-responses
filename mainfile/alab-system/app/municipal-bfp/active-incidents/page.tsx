'use client';

import { useEffect, useMemo, useState } from "react";
import { MunicipalIncidentDetail } from "../../_components/municipal-incident-detail";

interface IncidentItem {
  id: string;
  referenceNumber: string;
  residentName: string;
  fireType: string;
  status: string;
  barangay: string;
  landmark: string | null;
  submittedAt: string;
}

const activeIncidentsStyles = `
  /* ========== ACTIVE INCIDENTS STYLES ========== */
  .mbfp-incidents-shell {
    padding: 1.25rem 1.5rem 3rem;
    max-width: 1600px;
    margin: 0 auto;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0F172A;
    box-sizing: border-box;
  }

  /* Header Section */
  .mbfp-incidents-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .mbfp-incidents-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .mbfp-ops-live-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    width: fit-content;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mbfp-live-pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #DC2626;
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6);
    animation: mbfpLiveBeacon 1.8s infinite;
  }

  @keyframes mbfpLiveBeacon {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
    }
    70% {
      transform: scale(1.1);
      box-shadow: 0 0 0 6px rgba(220, 38, 38, 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
    }
  }

  .mbfp-incidents-h1 {
    font-size: clamp(1.4rem, 2.2vw, 1.75rem);
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.03em;
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .mbfp-incidents-h1 i {
    color: #DC2626;
  }

  .mbfp-incidents-desc {
    font-size: 0.88rem;
    color: #64748B;
    margin: 0;
    font-weight: 500;
  }

  /* Header Action Controls */
  .mbfp-header-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .mbfp-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 10px;
    color: #334155;
    font-size: 0.82rem;
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
  }

  .mbfp-refresh-btn i.spin {
    animation: mbfpSpin 0.75s linear infinite;
  }

  @keyframes mbfpSpin {
    to { transform: rotate(360deg); }
  }

  /* Quick Metric KPI Cards */
  .mbfp-quick-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
    margin-bottom: 1.35rem;
  }

  .mbfp-qstat-card {
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.85rem 1.1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    transition: all 0.2s ease;
  }

  .mbfp-qstat-card:hover {
    border-color: #CBD5E1;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  }

  .mbfp-qstat-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
  }

  .mbfp-qstat-icon.red { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
  .mbfp-qstat-icon.amber { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
  .mbfp-qstat-icon.blue { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
  .mbfp-qstat-icon.emerald { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }

  .mbfp-qstat-body {
    display: flex;
    flex-direction: column;
  }

  .mbfp-qstat-val {
    font-size: 1.35rem;
    font-weight: 850;
    color: #0F172A;
    line-height: 1.15;
  }

  .mbfp-qstat-lbl {
    font-size: 0.75rem;
    color: #64748B;
    font-weight: 600;
    margin-top: 0.15rem;
  }

  /* Filter & Search Bar */
  .mbfp-toolbar {
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.85rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.02);
  }

  .mbfp-search-box {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 260px;
    max-width: 420px;
  }

  .mbfp-search-box i {
    position: absolute;
    left: 0.95rem;
    color: #94A3B8;
    font-size: 0.9rem;
  }

  .mbfp-search-input {
    width: 100%;
    height: 40px;
    padding: 0 0.85rem 0 2.4rem;
    border: 1.5px solid #E2E8F0;
    border-radius: 10px;
    font-family: inherit;
    font-size: 0.84rem;
    color: #0F172A;
    background: #F8FAFC;
    transition: all 0.2s ease;
  }

  .mbfp-search-input:focus {
    outline: none;
    border-color: #DC2626;
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }

  .mbfp-filter-pills {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .mbfp-tab-pill {
    padding: 0.42rem 0.95rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    border: 1.5px solid #E2E8F0;
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
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
  }

  /* Table Card Container */
  .mbfp-table-card {
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
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
    border-bottom: 1.5px solid #E2E8F0;
  }

  .mbfp-incidents-table th {
    padding: 0.85rem 1.15rem;
    font-size: 0.72rem;
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
    background: #FFF8F8;
  }

  .mbfp-incidents-table td {
    padding: 1rem 1.15rem;
    font-size: 0.84rem;
    color: #1E293B;
    vertical-align: middle;
  }

  /* Table Cell Elements */
  .mbfp-ref-code {
    font-weight: 800;
    color: #0F172A;
    font-size: 0.85rem;
    letter-spacing: -0.01em;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mbfp-ref-time {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 500;
    margin-top: 0.2rem;
  }

  .mbfp-caller-cell {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .mbfp-caller-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #EEF2F6;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
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
    gap: 0.15rem;
  }

  .mbfp-loc-brgy {
    font-weight: 700;
    color: #1E293B;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-loc-landmark {
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 500;
  }

  /* Fire Type Badge */
  .mbfp-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.7rem;
    border-radius: 8px;
    font-size: 0.74rem;
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
    gap: 0.4rem;
    padding: 0.32rem 0.75rem;
    border-radius: 999px;
    font-size: 0.73rem;
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
    gap: 0.45rem;
    padding: 0.48rem 1rem;
    background: #DC2626;
    border: none;
    border-radius: 10px;
    color: #FFFFFF;
    font-size: 0.78rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
    white-space: nowrap;
  }

  .mbfp-open-btn:hover {
    background: #B91C1C;
    transform: translateY(-1.5px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
  }

  .mbfp-open-btn i {
    font-size: 0.75rem;
    transition: transform 0.15s ease;
  }

  .mbfp-open-btn:hover i {
    transform: translateX(2px);
  }

  /* Empty State */
  .mbfp-empty-state {
    padding: 4.5rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .mbfp-empty-icon-radar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #ECFDF5;
    border: 1.5px solid #A7F3D0;
    color: #059669;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
  }

  .mbfp-empty-title {
    font-size: 1.15rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0 0 0.35rem;
  }

  .mbfp-empty-desc {
    font-size: 0.85rem;
    color: #64748B;
    margin: 0;
    max-width: 380px;
  }

  /* Error Alert */
  .mbfp-error-banner {
    background: #FEF2F2;
    border: 1.5px solid #FECACA;
    border-radius: 12px;
    padding: 0.85rem 1.1rem;
    color: #991B1B;
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 1.25rem;
  }

  /* Responsive Adjustments */
  @media (max-width: 1024px) {
    .mbfp-quick-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 768px) {
    .mbfp-incidents-shell {
      padding: 1rem 0.85rem 2rem;
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
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const loadIncidents = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/municipal-bfp/incidents", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch incidents");
      setIncidents(data.incidents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load active incidents.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    // Live polling interval every 12 seconds
    const timer = setInterval(() => {
      loadIncidents();
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        onResponded={() => loadIncidents()}
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
            <div className="mbfp-ops-live-pill">
              <span className="mbfp-live-pulse-dot" />
              <span>Live Emergency Queue</span>
            </div>
            <h1 className="mbfp-incidents-h1">
              <i className="fa-solid fa-fire" />
              <span>Active Incidents</span>
            </h1>
            <p className="mbfp-incidents-desc">
              Live emergency reports requiring municipal verification, dispatch, and suppression response.
            </p>
          </div>

          <div className="mbfp-header-actions">
            <button
              className="mbfp-refresh-btn"
              onClick={() => loadIncidents(true)}
              disabled={refreshing}
              aria-label="Refresh incident queue"
            >
              <i className={`fa-solid fa-arrows-rotate ${refreshing ? "spin" : ""}`} />
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
                    <td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}>
                      <i className="fa-solid fa-arrows-rotate spin" style={{ fontSize: "1.5rem", color: "#DC2626" }} />
                      <p style={{ marginTop: "0.75rem", fontWeight: 600, color: "#64748B" }}>
                        Connecting to live BFP incident telemetry…
                      </p>
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
                              {inc.residentName ? inc.residentName.charAt(0).toUpperCase() : "R"}
                            </div>
                            <span className="mbfp-caller-name">{inc.residentName || "Anonymous Resident"}</span>
                          </div>
                        </td>

                        {/* Location */}
                        <td>
                          <div className="mbfp-loc-cell">
                            <span className="mbfp-loc-brgy">
                              <i className="fa-solid fa-location-dot" style={{ color: "#DC2626", fontSize: "0.8rem" }} />
                              {inc.barangay}
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
