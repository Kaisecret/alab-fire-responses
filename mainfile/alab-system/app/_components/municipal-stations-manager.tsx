'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useState } from "react";

type Station = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
};

export function MunicipalStationsManager() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Add Station Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stationName, setStationName] = useState("");
  const [headName, setHeadName] = useState("");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  // Deactivate Confirmation Modal State
  const [stationToDeactivate, setStationToDeactivate] = useState<Station | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // General Notification / Feedback State
  const [error, setError] = useState("");

  // Helper to parse station name and head name
  const parseStationName = (rawName: string) => {
    const match = rawName.match(/^(.*?)\s*(?:·\s*Head:\s*|\(Head:\s*|\s*-\s*Head:\s*)(.*?)\)?$/i);
    if (match) {
      return {
        name: match[1].trim(),
        head: match[2].replace(/\)$/, "").trim(),
      };
    }
    return { name: rawName, head: "" };
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/municipal-bfp/stations", { cache: "no-store" });
      const result = (await response.json()) as { stations?: Station[]; error?: string };
      if (!response.ok) {
        setError(result.error ?? "Unable to load stations.");
      } else {
        setStations(result.stations ?? []);
        setError("");
      }
    } catch {
      setError("Network error: Unable to load municipal stations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submitAdd = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setModalError("");

    const formattedName = headName.trim()
      ? `${stationName.trim()} · Head: ${headName.trim()}`
      : stationName.trim();

    try {
      const response = await fetch("/api/municipal-bfp/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationName: formattedName,
          latitude: 10.7442,
          longitude: 121.9422,
        }),
      });

      const result = (await response.json()) as { error?: string; station?: Station };
      setSaving(false);

      if (!response.ok) {
        setModalError(result.error ?? "Unable to add station.");
        return;
      }

      // Reset form and close modal
      setStationName("");
      setHeadName("");
      setIsAddModalOpen(false);
      void load();
    } catch {
      setSaving(false);
      setModalError("Network error: Failed to submit station.");
    }
  };

  const confirmDeactivate = async () => {
    if (!stationToDeactivate) return;
    setDeactivating(true);
    setError("");

    try {
      const response = await fetch(`/api/municipal-bfp/stations/${stationToDeactivate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      });

      const result = (await response.json()) as { error?: string };
      setDeactivating(false);
      setStationToDeactivate(null);

      if (!response.ok) {
        setError(result.error ?? "Unable to deactivate station.");
        return;
      }

      void load();
    } catch {
      setDeactivating(false);
      setStationToDeactivate(null);
      setError("Network error: Failed to deactivate station.");
    }
  };

  // Filtered stations based on search query and status filter
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      const matchesSearch = station.stationName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || station.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [stations, searchQuery, statusFilter]);

  const activeCount = stations.filter((s) => s.status === "ACTIVE").length;
  const inactiveCount = stations.filter((s) => s.status === "INACTIVE").length;
  const totalCount = stations.length;

  return (
    <section className="mbfp-stations-page">
      <style>{pageStyles}</style>

      {/* HEADER SECTION */}
      <div className="mbfp-header-top">
        <div className="mbfp-page-header">
          <h1>
            <i className="fa-solid fa-building-shield" /> Stations
          </h1>
        </div>

        <div className="mbfp-header-actions">
          <button
            type="button"
            className="mbfp-add-btn"
            onClick={() => {
              setModalError("");
              setIsAddModalOpen(true);
            }}
          >
            <i className="fa-solid fa-plus" />
            <span>Add Station</span>
          </button>
        </div>
      </div>

      {/* ALERT / ERROR BANNER */}
      {error && (
        <div className="mbfp-alert-banner" role="alert">
          <div className="mbfp-alert-icon">
            <i className="fa-solid fa-circle-exclamation" />
          </div>
          <div className="mbfp-alert-text">
            <strong>Action Notice:</strong> {error}
          </div>
          <button
            type="button"
            className="mbfp-alert-close"
            onClick={() => setError("")}
            aria-label="Dismiss alert"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* DATA CARD CONTAINER WITH TOOLBAR & TABLE */}
      <div className="mbfp-table-card">
        {/* TOOLBAR */}
        <div className="mbfp-table-toolbar">
          <div className="mbfp-search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search station name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="mbfp-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          <div className="mbfp-filter-pills">
            <button
              type="button"
              className={`mbfp-pill-btn ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={`mbfp-pill-btn ${statusFilter === "ACTIVE" ? "active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`mbfp-pill-btn ${statusFilter === "INACTIVE" ? "active" : ""}`}
              onClick={() => setStatusFilter("INACTIVE")}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="mbfp-table-responsive">
          <table className="mbfp-data-table">
            <thead>
              <tr>
                <th style={{ width: "58%" }}>Station Name</th>
                <th style={{ width: "22%" }}>Operational Status</th>
                <th style={{ width: "20%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((station) => {
                const { name: displayName, head: displayHead } = parseStationName(station.stationName);
                return (
                  <tr key={station.id}>
                    <td>
                      <div className="mbfp-station-cell">
                        <div className="mbfp-station-badge">
                          <i className="fa-solid fa-building-shield" />
                        </div>
                        <div className="mbfp-station-meta">
                          <span className="mbfp-station-name">{displayName}</span>
                          {displayHead ? (
                            <span className="mbfp-station-head">
                              <i className="fa-solid fa-user-tie" /> Head: <strong>{displayHead}</strong>
                            </span>
                          ) : (
                            <span className="mbfp-station-subtext">Municipal BFP Command Unit</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`mbfp-status-pill ${station.status.toLowerCase()}`}>
                        <span className="mbfp-status-pulse" />
                        {station.status === "ACTIVE" ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      {station.status === "ACTIVE" ? (
                        <button
                          type="button"
                          className="mbfp-deactivate-btn"
                          onClick={() => setStationToDeactivate(station)}
                          title="Deactivate Station"
                        >
                          <i className="fa-solid fa-power-off" />
                          <span>Deactivate</span>
                        </button>
                      ) : (
                        <span className="mbfp-deactivated-label">Decommissioned</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* EMPTY STATE */}
              {filteredStations.length === 0 && !loading && (
                <tr>
                  <td colSpan={3}>
                    <div className="mbfp-empty-state">
                      <div className="mbfp-empty-icon">
                        <i className="fa-solid fa-building-shield" />
                      </div>
                      <h3>
                        {searchQuery || statusFilter !== "ALL"
                          ? "No stations match your criteria"
                          : "No stations registered yet"}
                      </h3>
                      <p>
                        {searchQuery || statusFilter !== "ALL"
                          ? "Try clearing your search query or selecting a different status filter."
                          : "Get started by adding your first fire station."}
                      </p>
                      {searchQuery || statusFilter !== "ALL" ? (
                        <button
                          type="button"
                          className="mbfp-empty-btn"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("ALL");
                          }}
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="mbfp-add-btn"
                          onClick={() => {
                            setModalError("");
                            setIsAddModalOpen(true);
                          }}
                        >
                          <i className="fa-solid fa-plus" />
                          <span>Add Your First Station</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* SKELETON / LOADING STATE */}
              {loading && stations.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="mbfp-loading-state">
                      <div className="mbfp-loading-spinner" />
                      <span>Loading municipal stations…</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          ADD STATION MODAL DIALOG
          ========================================================================= */}
      {isAddModalOpen && (
        <div
          className="mbfp-modal-overlay"
          onClick={() => !saving && setIsAddModalOpen(false)}
          role="presentation"
        >
          <div
            className="mbfp-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-station-title"
          >
            <div className="mbfp-modal-header">
              <div className="mbfp-modal-header-text">
                <h2 id="add-station-title">
                  <i className="fa-solid fa-building-shield" /> Add Station
                </h2>
                <p>Register a fire station and assign its station head.</p>
              </div>
              <button
                type="button"
                className="mbfp-modal-close"
                onClick={() => !saving && setIsAddModalOpen(false)}
                aria-label="Close dialog"
                disabled={saving}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={submitAdd}>
              <div className="mbfp-modal-body">
                {modalError && (
                  <div className="mbfp-modal-alert">
                    <i className="fa-solid fa-triangle-exclamation" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="mbfp-form-group">
                  <label htmlFor="modal-station-name">
                    Station Name <span className="mbfp-required">*</span>
                  </label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-building" />
                    <input
                      id="modal-station-name"
                      required
                      type="text"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. San Jose Fire Station Command"
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                      disabled={saving}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="mbfp-form-group">
                  <label htmlFor="modal-head-name">
                    Head Name
                  </label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-user-shield" />
                    <input
                      id="modal-head-name"
                      type="text"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. SFO4 Roberto Garcia"
                      value={headName}
                      onChange={(e) => setHeadName(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="mbfp-modal-footer">
                <button
                  type="button"
                  className="mbfp-cancel-btn"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="mbfp-submit-btn" disabled={saving}>
                  {saving ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus" />
                      <span>Add Station</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEACTIVATE CONFIRMATION MODAL
          ========================================================================= */}
      {stationToDeactivate && (
        <div
          className="mbfp-modal-overlay"
          onClick={() => !deactivating && setStationToDeactivate(null)}
          role="presentation"
        >
          <div
            className="mbfp-modal-content confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mbfp-confirm-body">
              <div className="mbfp-confirm-icon-wrap">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <h3>Deactivate Station?</h3>
              <p>
                Are you sure you want to deactivate{" "}
                <strong>{stationToDeactivate.stationName}</strong>? Active personnel assigned to
                this station must be reassigned first.
              </p>
            </div>

            <div className="mbfp-modal-footer">
              <button
                type="button"
                className="mbfp-cancel-btn"
                onClick={() => setStationToDeactivate(null)}
                disabled={deactivating}
              >
                Keep Active
              </button>
              <button
                type="button"
                className="mbfp-danger-btn"
                onClick={() => void confirmDeactivate()}
                disabled={deactivating}
              >
                {deactivating ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    <span>Deactivating…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-power-off" />
                    <span>Deactivate Station</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const pageStyles = `
  /* ================= PAGE CONTAINER & RESET ================= */
  .mbfp-stations-page {
    padding: 1.2rem 1.75rem 3rem;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0F172A;
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
  }

  /* ================= HEADER ================= */
  .mbfp-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.2rem;
    flex-wrap: wrap;
  }

  .mbfp-header-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: #D00F09;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.35rem;
  }

  .mbfp-page-header h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .mbfp-page-header h1 i {
    color: #D00F09;
  }

  .mbfp-page-header p {
    font-size: 0.86rem;
    color: #64748B;
    margin: 0.35rem 0 0;
    max-width: 44rem;
    line-height: 1.5;
  }

  .mbfp-header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mbfp-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 700;
    color: #475569;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    cursor: pointer;
    transition: all 0.18s ease;
    font-family: inherit;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }

  .mbfp-refresh-btn:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .mbfp-refresh-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .mbfp-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.6rem 1.25rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    color: #FFFFFF;
    background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%);
    border: none;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 14px rgba(208, 15, 9, 0.28);
    font-family: inherit;
    text-decoration: none;
  }

  .mbfp-add-btn:hover {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 18px rgba(208, 15, 9, 0.38);
  }

  .mbfp-add-btn:active {
    transform: translateY(0);
  }

  /* ================= ALERT BANNER ================= */
  .mbfp-alert-banner {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.9rem 1.2rem;
    border-radius: 10px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
    font-size: 0.85rem;
    animation: fadeIn 0.2s ease;
  }

  .mbfp-alert-icon {
    font-size: 1.1rem;
    color: #DC2626;
  }

  .mbfp-alert-text {
    flex: 1;
    line-height: 1.4;
  }

  .mbfp-alert-close {
    background: transparent;
    border: none;
    color: #991B1B;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.2rem;
    border-radius: 4px;
    transition: background 0.15s;
  }

  .mbfp-alert-close:hover {
    background: rgba(153, 27, 27, 0.1);
  }

  /* ================= STATS OVERVIEW ================= */
  .mbfp-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.9rem;
  }

  .mbfp-stat-card {
    background: #FFFFFF;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    padding: 1rem 1.15rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .mbfp-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  }

  .mbfp-stat-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .mbfp-stat-icon-wrap.primary {
    background: #FFF1F2;
    color: #D00F09;
  }

  .mbfp-stat-icon-wrap.success {
    background: #ECFDF5;
    color: #059669;
  }

  .mbfp-stat-icon-wrap.warning {
    background: #FFFBEB;
    color: #D97706;
  }

  .mbfp-stat-icon-wrap.info {
    background: #EFF6FF;
    color: #2563EB;
  }

  .mbfp-stat-val {
    font-size: 1.55rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.1;
  }

  .mbfp-stat-val.text-success { color: #059669; }
  .mbfp-stat-val.text-warning { color: #D97706; }
  .mbfp-stat-val.text-info { color: #2563EB; }

  .mbfp-stat-label {
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 600;
    margin-top: 0.2rem;
  }

  /* ================= TABLE CARD ================= */
  .mbfp-table-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }

  .mbfp-table-toolbar {
    padding: 0.9rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: #FAFAFA;
    border-bottom: 1px solid #E2E8F0;
    flex-wrap: wrap;
  }

  .mbfp-search-box {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    padding: 0.45rem 0.8rem;
    width: min(100%, 340px);
    transition: border-color 0.15s;
  }

  .mbfp-search-box:focus-within {
    border-color: #D00F09;
    box-shadow: 0 0 0 3px rgba(208, 15, 9, 0.08);
  }

  .mbfp-search-box i {
    color: #94A3B8;
    font-size: 0.82rem;
  }

  .mbfp-search-box input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    font-size: 0.82rem;
    color: #0F172A;
    font-family: inherit;
  }

  .mbfp-search-clear {
    background: transparent;
    border: none;
    color: #94A3B8;
    cursor: pointer;
    padding: 0;
    font-size: 0.75rem;
  }

  .mbfp-search-clear:hover {
    color: #0F172A;
  }

  .mbfp-filter-pills {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mbfp-pill-btn {
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 700;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .mbfp-pill-btn:hover {
    border-color: #CBD5E1;
    color: #0F172A;
  }

  .mbfp-pill-btn.active {
    background: #D00F09;
    border-color: #D00F09;
    color: #FFFFFF;
    box-shadow: 0 2px 6px rgba(208, 15, 9, 0.22);
  }

  /* ================= TABLE ELEMENTS ================= */
  .mbfp-table-responsive {
    overflow-x: auto;
    width: 100%;
  }

  .mbfp-data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
    text-align: left;
  }

  .mbfp-data-table th {
    background: #F8FAFC;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid #E2E8F0;
  }

  .mbfp-data-table td {
    padding: 0.9rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    vertical-align: middle;
    color: #334155;
    transition: background 0.12s ease;
  }

  .mbfp-data-table tr:hover td {
    background: #FEF9F9;
  }

  .mbfp-station-cell {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .mbfp-station-badge {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #FFF1F2;
    color: #D00F09;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .mbfp-station-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .mbfp-station-name {
    font-weight: 700;
    color: #0F172A;
    font-size: 0.88rem;
  }

  .mbfp-station-subtext {
    font-size: 0.72rem;
    color: #64748B;
  }

  .mbfp-station-head {
    font-size: 0.74rem;
    color: #475569;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.15rem;
  }

  .mbfp-station-head i {
    color: #D00F09;
    font-size: 0.72rem;
  }

  /* Status */
  .mbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .mbfp-status-pill.active {
    background: #ECFDF5;
    color: #059669;
  }

  .mbfp-status-pill.inactive {
    background: #F1F5F9;
    color: #64748B;
  }

  .mbfp-status-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .mbfp-status-pill.active .mbfp-status-pulse {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
  }

  /* Actions */
  .mbfp-deactivate-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    background: #FFFFFF;
    border: 1px solid #FECACA;
    color: #DC2626;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .mbfp-deactivate-btn:hover {
    background: #FEF2F2;
    border-color: #DC2626;
    transform: translateY(-1px);
  }

  .mbfp-deactivated-label {
    font-size: 0.72rem;
    color: #94A3B8;
    font-weight: 600;
  }

  /* ================= EMPTY STATE ================= */
  .mbfp-empty-state {
    padding: 3.5rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .mbfp-empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: #FFF1F2;
    color: #D00F09;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 12px rgba(208, 15, 9, 0.15);
  }

  .mbfp-empty-state h3 {
    font-size: 1.15rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0 0 0.4rem;
  }

  .mbfp-empty-state p {
    color: #64748B;
    font-size: 0.85rem;
    max-width: 24rem;
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }

  .mbfp-empty-btn {
    padding: 0.5rem 1.1rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    font-weight: 700;
    font-size: 0.8rem;
    color: #334155;
    cursor: pointer;
  }

  .mbfp-loading-state {
    padding: 3rem 1rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: #64748B;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .mbfp-loading-spinner {
    width: 26px;
    height: 26px;
    border: 3px solid #E2E8F0;
    border-top-color: #D00F09;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* ================= MODAL DIALOGS ================= */
  .mbfp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 1.5rem;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-modal-content {
    background: #FFFFFF;
    width: min(100%, 640px);
    border-radius: 18px;
    box-shadow: 0 32px 80px -12px rgba(15, 23, 42, 0.38);
    overflow: hidden;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid #E2E8F0;
  }

  .mbfp-modal-content.confirm-modal {
    width: min(100%, 450px);
  }

  .mbfp-modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #F1F5F9;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: #FAFAFA;
  }

  .mbfp-modal-header-text h2 {
    font-size: 1.45rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    letter-spacing: -0.01em;
  }

  .mbfp-modal-header-text h2 i {
    color: #D00F09;
    font-size: 1.55rem;
  }

  .mbfp-modal-header-text p {
    font-size: 0.92rem;
    color: #64748B;
    margin: 0.35rem 0 0;
  }

  .mbfp-modal-close {
    background: rgba(0, 0, 0, 0.04);
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s;
  }

  .mbfp-modal-close:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #0F172A;
  }

  .mbfp-modal-body {
    padding: 2rem 2rem 1.6rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .mbfp-modal-alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.15rem;
    border-radius: 10px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #B91C1C;
    font-size: 0.88rem;
    font-weight: 600;
  }

  .mbfp-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .mbfp-form-group label {
    font-size: 0.92rem;
    font-weight: 750;
    color: #334155;
  }

  .mbfp-required {
    color: #D00F09;
  }

  .mbfp-input-icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .mbfp-input-icon-wrap i {
    position: absolute;
    left: 1.1rem;
    color: #94A3B8;
    font-size: 1.05rem;
    pointer-events: none;
  }

  .mbfp-form-input {
    padding: 0.95rem 1.25rem;
    border: 1.5px solid #CBD5E1;
    border-radius: 10px;
    font-size: 1rem;
    color: #0F172A;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
  }

  .mbfp-form-input.with-icon {
    padding-left: 2.85rem;
  }

  .mbfp-form-input:focus {
    border-color: #D00F09;
    box-shadow: 0 0 0 3px rgba(208, 15, 9, 0.12);
  }

  .mbfp-input-hint {
    font-size: 0.7rem;
    color: #94A3B8;
  }

  .mbfp-form-section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.3rem;
    font-size: 0.75rem;
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .mbfp-gps-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    color: #1D4ED8;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .mbfp-gps-btn:hover:not(:disabled) {
    background: #DBEAFE;
    border-color: #93C5FD;
  }

  .mbfp-gps-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .mbfp-form-row {
    display: flex;
    gap: 0.85rem;
  }

  .mbfp-location-preview-note {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    font-size: 0.73rem;
    color: #64748B;
    line-height: 1.4;
  }

  .mbfp-location-preview-note i {
    color: #3B82F6;
    margin-top: 0.1rem;
  }

  .mbfp-modal-footer {
    padding: 1.35rem 2rem;
    border-top: 1px solid #F1F5F9;
    display: flex;
    justify-content: flex-end;
    gap: 0.9rem;
    background: #FAFAFA;
  }

  .mbfp-cancel-btn {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #475569;
    padding: 0.8rem 1.6rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .mbfp-cancel-btn:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
  }

  .mbfp-submit-btn {
    background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%);
    border: none;
    color: #FFFFFF;
    padding: 0.8rem 1.8rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    transition: all 0.18s;
    box-shadow: 0 4px 14px rgba(208, 15, 9, 0.32);
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    font-family: inherit;
  }

  .mbfp-submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(208, 15, 9, 0.4);
  }

  .mbfp-submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Confirm modal */
  .mbfp-confirm-body {
    padding: 1.75rem 1.5rem 1.25rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .mbfp-confirm-icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #FEF2F2;
    color: #DC2626;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15);
  }

  .mbfp-confirm-body h3 {
    font-size: 1.2rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0 0 0.5rem;
  }

  .mbfp-confirm-body p {
    font-size: 0.84rem;
    color: #64748B;
    margin: 0;
    line-height: 1.5;
  }

  .mbfp-danger-btn {
    background: #DC2626;
    color: #FFFFFF;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.82rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-family: inherit;
    box-shadow: 0 4px 10px rgba(220, 38, 38, 0.25);
    transition: all 0.15s;
  }

  .mbfp-danger-btn:hover:not(:disabled) {
    background: #B91C1C;
    transform: translateY(-1px);
  }

  .mbfp-danger-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* ================= ANIMATIONS & RESPONSIVENESS ================= */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1024px) {
    .mbfp-stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .mbfp-stations-page {
      padding: 1rem;
    }

    .mbfp-header-top {
      flex-direction: column;
      align-items: stretch;
    }

    .mbfp-header-actions {
      justify-content: flex-start;
    }

    .mbfp-stats-grid {
      grid-template-columns: 1fr;
    }

    .mbfp-table-toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .mbfp-search-box {
      width: 100%;
    }

    .mbfp-filter-pills {
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }

    .mbfp-form-row {
      flex-direction: column;
      gap: 1.15rem;
    }
  }
`;
