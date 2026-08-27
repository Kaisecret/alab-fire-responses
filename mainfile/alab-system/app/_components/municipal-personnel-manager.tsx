'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Station = {
  id: string;
  stationName: string;
  status: "ACTIVE" | "INACTIVE";
};

type Personnel = {
  userId: string;
  displayName: string;
  email: string;
  rankOrPosition: string | null;
  stationName: string;
  accountStatus: string;
};

export function MunicipalPersonnelManager() {
  const [mounted, setMounted] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Add Personnel Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [rankOrPosition, setRankOrPosition] = useState("");
  const [stationId, setStationId] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Issued Password Modal State
  const [issued, setIssued] = useState("");
  const [issuedCopied, setIssuedCopied] = useState(false);

  // General Notification / Feedback
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [stationsResponse, personnelResponse] = await Promise.all([
        fetch("/api/municipal-bfp/stations", { cache: "no-store" }),
        fetch("/api/municipal-bfp/personnel", { cache: "no-store" }),
      ]);

      const stationResult = (await stationsResponse.json()) as { stations?: Station[] };
      const personnelResult = (await personnelResponse.json()) as {
        personnel?: Personnel[];
        error?: string;
      };

      setStations((stationResult.stations ?? []).filter((station) => station.status === "ACTIVE"));
      setPersonnel(personnelResult.personnel ?? []);

      if (!personnelResponse.ok) {
        setError(personnelResult.error ?? "Unable to load personnel.");
      } else {
        setError("");
      }
    } catch {
      setError("Network error: Unable to load municipal personnel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void load();
  }, []);

  useEffect(() => {
    if (!stationId && stations[0]) {
      setStationId(stations[0].id);
    }
  }, [stations, stationId]);

  const copyEmail = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedEmailId(id);
        setTimeout(() => setCopiedEmailId(null), 2000);
      }).catch(() => { });
    }
  };

  const copyIssuedPassword = (password: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(password).then(() => {
        setIssuedCopied(true);
        setTimeout(() => setIssuedCopied(false), 2200);
      }).catch(() => { });
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setModalError("");

    try {
      const response = await fetch("/api/municipal-bfp/personnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          rankOrPosition: rankOrPosition.trim() || undefined,
          stationId,
          temporaryPassword: temporaryPassword.trim() || undefined,
        }),
      });

      const result = (await response.json()) as { error?: string; temporaryPassword?: string };
      setSaving(false);

      if (!response.ok) {
        setModalError(result.error ?? "Unable to issue account.");
        return;
      }

      setIssued(result.temporaryPassword ?? "");
      setDisplayName("");
      setEmail("");
      setRankOrPosition("");
      setTemporaryPassword("");
      setIsAddModalOpen(false);
      void load();
    } catch {
      setSaving(false);
      setModalError("Network error: Failed to issue account.");
    }
  };

  // Filter personnel based on search query and status filter
  const filteredPersonnel = useMemo(() => {
    return personnel.filter((member) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        member.displayName.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.stationName.toLowerCase().includes(query) ||
        (member.rankOrPosition && member.rankOrPosition.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "ALL" || member.accountStatus.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [personnel, searchQuery, statusFilter]);

  const activeCount = personnel.filter((p) => p.accountStatus.toUpperCase() === "ACTIVE").length;
  const inactiveCount = personnel.filter((p) => p.accountStatus.toUpperCase() !== "ACTIVE").length;

  return (
    <section className="mbfp-personnel-page">
      <style>{pageStyles}</style>

      {/* HEADER SECTION */}
      <div className="mbfp-header-top">
        <div className="mbfp-page-header">
          <h1>
            <i className="fa-solid fa-users" /> BFP Personnel
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
            disabled={stations.length === 0}
            title={stations.length === 0 ? "Create a station first" : "Issue account"}
          >
            <i className="fa-solid fa-user-plus" />
            <span>Issue Account</span>
          </button>
        </div>
      </div>

      {/* ALERT / NOTICE BANNER */}
      {stations.length === 0 && !loading && (
        <div className="mbfp-alert-banner warning" role="alert">
          <div className="mbfp-alert-icon">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <div className="mbfp-alert-text">
            No active stations found. Please create a station first before issuing personnel accounts.
          </div>
        </div>
      )}

      {error && (
        <div className="mbfp-alert-banner" role="alert">
          <div className="mbfp-alert-icon">
            <i className="fa-solid fa-circle-exclamation" />
          </div>
          <div className="mbfp-alert-text">{error}</div>
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
              placeholder="Search personnel, rank, station, or email…"
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
              All ({personnel.length})
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
                <th style={{ width: "34%" }}>Personnel</th>
                <th style={{ width: "28%" }}>Station</th>
                <th style={{ width: "26%" }}>Email</th>
                <th style={{ width: "12%", textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersonnel.map((member) => (
                <tr key={member.userId}>
                  <td>
                    <div className="mbfp-user-cell">
                      <div className="mbfp-user-avatar">
                        <i className="fa-solid fa-user-shield" />
                      </div>
                      <div className="mbfp-user-meta">
                        <span className="mbfp-user-name">{member.displayName}</span>
                        {member.rankOrPosition ? (
                          <span className="mbfp-user-rank">
                            <i className="fa-solid fa-award" /> {member.rankOrPosition}
                          </span>
                        ) : (
                          <span className="mbfp-user-subtext">BFP Responder</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="mbfp-station-chip">
                      <i className="fa-solid fa-building-shield" />
                      <span>{member.stationName}</span>
                    </div>
                  </td>

                  <td>
                    <div className="mbfp-email-wrap">
                      <span className="mbfp-email-text">{member.email}</span>
                      <button
                        type="button"
                        className="mbfp-icon-btn"
                        title="Copy Email"
                        onClick={() => copyEmail(member.email, member.userId)}
                      >
                        <i
                          className={
                            copiedEmailId === member.userId
                              ? "fa-solid fa-check text-success"
                              : "fa-regular fa-copy"
                          }
                        />
                      </button>
                    </div>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <span
                      className={`mbfp-status-pill ${member.accountStatus.toUpperCase() === "ACTIVE" ? "active" : "inactive"
                        }`}
                    >
                      <span className="mbfp-status-pulse" />
                      {member.accountStatus.toUpperCase() === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}

              {/* EMPTY STATE */}
              {filteredPersonnel.length === 0 && !loading && (
                <tr>
                  <td colSpan={4}>
                    <div className="mbfp-empty-state">
                      <div className="mbfp-empty-icon">
                        <i className="fa-solid fa-users" />
                      </div>
                      <h3>
                        {searchQuery || statusFilter !== "ALL"
                          ? "No personnel match your search"
                          : "No personnel accounts issued yet"}
                      </h3>
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
                          disabled={stations.length === 0}
                        >
                          <i className="fa-solid fa-user-plus" />
                          <span>Issue First Account</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* LOADING SKELETON */}
              {loading && personnel.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="mbfp-loading-state">
                      <div className="mbfp-loading-spinner" />
                      <span>Loading personnel…</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          ISSUE PERSONNEL ACCOUNT MODAL (PORTAL TO DOCUMENT.BODY)
          ========================================================================= */}
      {mounted && isAddModalOpen && createPortal(
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
            aria-labelledby="issue-personnel-title"
          >
            <div className="mbfp-modal-header">
              <div className="mbfp-modal-header-text">
                <h2 id="issue-personnel-title">
                  <i className="fa-solid fa-user-plus" /> Issue Account
                </h2>
                <p>Register a municipal responder and designate station assignment.</p>
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

            <form onSubmit={submit}>
              <div className="mbfp-modal-body">
                {modalError && (
                  <div className="mbfp-modal-alert">
                    <i className="fa-solid fa-triangle-exclamation" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="mbfp-form-group">
                  <label htmlFor="modal-personnel-name">
                    Personnel Name <span className="mbfp-required">*</span>
                  </label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-user" />
                    <input
                      id="modal-personnel-name"
                      required
                      type="text"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. FO1 Juan Dela Cruz"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={saving}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="mbfp-form-group">
                  <label htmlFor="modal-personnel-email">
                    Official Email <span className="mbfp-required">*</span>
                  </label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-envelope" />
                    <input
                      id="modal-personnel-email"
                      required
                      type="email"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. jdelacruz@bfp.gov.ph"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="mbfp-form-row">
                  <div className="mbfp-form-group">
                    <label htmlFor="modal-personnel-station">
                      Assigned Station <span className="mbfp-required">*</span>
                    </label>
                    <div className="mbfp-input-icon-wrap">
                      <i className="fa-solid fa-building-shield" />
                      <select
                        id="modal-personnel-station"
                        required
                        className="mbfp-form-select with-icon"
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        disabled={saving}
                      >
                        {stations.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.stationName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mbfp-form-group">
                    <label htmlFor="modal-personnel-rank">Rank or Position</label>
                    <div className="mbfp-input-icon-wrap">
                      <i className="fa-solid fa-award" />
                      <input
                        id="modal-personnel-rank"
                        type="text"
                        className="mbfp-form-input with-icon"
                        placeholder="e.g. FO1 / Nozzleman"
                        value={rankOrPosition}
                        onChange={(e) => setRankOrPosition(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>

                <div className="mbfp-form-group">
                  <label htmlFor="modal-personnel-password">Temporary Password</label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-key" />
                    <input
                      id="modal-personnel-password"
                      type="password"
                      minLength={12}
                      className="mbfp-form-input with-icon"
                      placeholder="Optional (min. 12 characters, or auto-generated)"
                      value={temporaryPassword}
                      onChange={(e) => setTemporaryPassword(e.target.value)}
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
                      <span>Issuing…</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-user-plus" />
                      <span>Issue Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          ISSUED PASSWORD SECURITY MODAL (PORTAL TO DOCUMENT.BODY)
          ========================================================================= */}
      {mounted && issued && createPortal(
        <div className="mbfp-modal-overlay" role="presentation">
          <div
            className="mbfp-modal-content issued-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="issued-dialog-title"
          >
            <div className="mbfp-issued-body">
              <div className="mbfp-issued-icon">
                <i className="fa-solid fa-key" />
              </div>
              <h2 id="issued-dialog-title">Account Issued</h2>
              <p className="mbfp-issued-warning">
                Provide this temporary password securely. It will not be shown again.
              </p>

              <div className="mbfp-password-box">
                <code>{issued}</code>
                <button
                  type="button"
                  className="mbfp-copy-code-btn"
                  onClick={() => copyIssuedPassword(issued)}
                >
                  <i
                    className={
                      issuedCopied ? "fa-solid fa-check text-success" : "fa-regular fa-copy"
                    }
                  />
                  <span>{issuedCopied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <button
                type="button"
                className="mbfp-submit-btn full-width"
                onClick={() => setIssued("")}
              >
                I Recorded It
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

const pageStyles = `
  .mbfp-personnel-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: 1.5rem 2rem 3rem;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0F172A;
  }

  /* Header */
  .mbfp-header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding-bottom: 0.25rem;
  }

  .mbfp-page-header h1 {
    font-size: 1.65rem;
    font-weight: 850;
    letter-spacing: -0.02em;
    color: #0F172A;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .mbfp-page-header h1 i {
    color: #D00F09;
    font-size: 1.5rem;
  }

  .mbfp-header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mbfp-add-btn {
    background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%);
    border: none;
    color: #FFFFFF;
    padding: 0.7rem 1.35rem;
    border-radius: 9px;
    font-weight: 750;
    font-size: 0.88rem;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(208, 15, 9, 0.28);
    transition: all 0.18s ease;
    font-family: inherit;
  }

  .mbfp-add-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(208, 15, 9, 0.38);
  }

  .mbfp-add-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(40%);
  }

  /* Alerts */
  .mbfp-alert-banner {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
    padding: 0.9rem 1.25rem;
    border-radius: 10px;
    font-size: 0.86rem;
    animation: fadeIn 0.2s ease;
  }

  .mbfp-alert-banner.warning {
    background: #FFFBEB;
    border-color: #FDE68A;
    color: #92400E;
  }

  .mbfp-alert-icon {
    font-size: 1.1rem;
    display: flex;
    align-items: center;
  }

  .mbfp-alert-text {
    flex: 1;
    font-weight: 600;
  }

  .mbfp-alert-close {
    background: transparent;
    border: none;
    color: inherit;
    opacity: 0.7;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.2rem;
  }

  .mbfp-alert-close:hover {
    opacity: 1;
  }

  /* Table Card Container */
  .mbfp-table-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04);
    overflow: hidden;
  }

  /* Toolbar */
  .mbfp-table-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.1rem 1.35rem;
    border-bottom: 1px solid #F1F5F9;
    flex-wrap: wrap;
    background: #FAFAFA;
  }

  .mbfp-search-box {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 320px;
    flex: 1;
    max-width: 440px;
  }

  .mbfp-search-box i.fa-magnifying-glass {
    position: absolute;
    left: 0.95rem;
    color: #94A3B8;
    font-size: 0.88rem;
    pointer-events: none;
  }

  .mbfp-search-box input {
    width: 100%;
    padding: 0.65rem 2.2rem 0.65rem 2.45rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.86rem;
    color: #0F172A;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }

  .mbfp-search-box input:focus {
    border-color: #D00F09;
    box-shadow: 0 0 0 3px rgba(208, 15, 9, 0.1);
  }

  .mbfp-search-clear {
    position: absolute;
    right: 0.75rem;
    background: transparent;
    border: none;
    color: #94A3B8;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0.2rem;
  }

  .mbfp-search-clear:hover {
    color: #334155;
  }

  .mbfp-filter-pills {
    display: flex;
    gap: 0.35rem;
    background: #F1F5F9;
    padding: 0.25rem;
    border-radius: 8px;
  }

  .mbfp-pill-btn {
    border: none;
    background: transparent;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    font-size: 0.76rem;
    font-weight: 700;
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .mbfp-pill-btn:hover {
    color: #0F172A;
  }

  .mbfp-pill-btn.active {
    background: #FFFFFF;
    color: #0F172A;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  /* Table */
  .mbfp-table-responsive {
    width: 100%;
    overflow-x: auto;
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
    padding: 0.95rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    vertical-align: middle;
    color: #334155;
    transition: background 0.12s ease;
  }

  .mbfp-data-table tr:hover td {
    background: #FEF9F9;
  }

  /* User Cell */
  .mbfp-user-cell {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .mbfp-user-avatar {
    width: 38px;
    height: 38px;
    border-radius: 9px;
    background: #FFF1F2;
    color: #D00F09;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
  }

  .mbfp-user-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .mbfp-user-name {
    font-weight: 750;
    color: #0F172A;
    font-size: 0.88rem;
  }

  .mbfp-user-rank {
    font-size: 0.74rem;
    color: #475569;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 600;
  }

  .mbfp-user-rank i {
    color: #D00F09;
    font-size: 0.72rem;
  }

  .mbfp-user-subtext {
    font-size: 0.72rem;
    color: #64748B;
  }

  /* Station Chip */
  .mbfp-station-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.75rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 7px;
    font-size: 0.8rem;
    color: #334155;
    font-weight: 600;
  }

  .mbfp-station-chip i {
    color: #D00F09;
    font-size: 0.8rem;
  }

  /* Email Wrap */
  .mbfp-email-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mbfp-email-text {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8rem;
    color: #334155;
    font-weight: 600;
  }

  .mbfp-icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    color: #64748B;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.15s;
  }

  .mbfp-icon-btn:hover {
    color: #0F172A;
    border-color: #CBD5E1;
    background: #F8FAFC;
  }

  /* Status Pills */
  .mbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .mbfp-status-pill.active {
    background: #ECFDF5;
    color: #047857;
    border: 1px solid #A7F3D0;
  }

  .mbfp-status-pill.inactive {
    background: #F1F5F9;
    color: #64748B;
    border: 1px solid #E2E8F0;
  }

  .mbfp-status-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 0 2px rgba(4, 120, 87, 0.2);
  }

  /* Empty State */
  .mbfp-empty-state {
    padding: 3.5rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
  }

  .mbfp-empty-icon {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: #F1F5F9;
    color: #94A3B8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    margin-bottom: 0.4rem;
  }

  .mbfp-empty-state h3 {
    font-size: 1rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
  }

  .mbfp-empty-btn {
    margin-top: 0.5rem;
    background: #F8FAFC;
    border: 1px solid #CBD5E1;
    color: #475569;
    padding: 0.5rem 1rem;
    border-radius: 7px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }

  .mbfp-empty-btn:hover {
    background: #E2E8F0;
    color: #0F172A;
  }

  /* Loading State */
  .mbfp-loading-state {
    padding: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: #64748B;
    font-weight: 600;
  }

  .mbfp-loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #E2E8F0;
    border-top-color: #D00F09;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  /* ================= MODAL DIALOGS ================= */
  .mbfp-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999999 !important;
    padding: 1.5rem;
    box-sizing: border-box;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .mbfp-modal-content {
    background: #FFFFFF;
    width: min(100%, 640px);
    border-radius: 18px;
    box-shadow: 0 32px 80px -12px rgba(15, 23, 42, 0.38);
    overflow: hidden;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid #E2E8F0;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .mbfp-modal-content.issued-modal {
    width: min(100%, 480px);
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
    gap: 1.4rem;
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

  .mbfp-form-input,
  .mbfp-form-select {
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
    background: #FFFFFF;
  }

  .mbfp-form-input.with-icon,
  .mbfp-form-select.with-icon {
    padding-left: 2.85rem;
  }

  .mbfp-form-input:focus,
  .mbfp-form-select:focus {
    border-color: #D00F09;
    box-shadow: 0 0 0 3px rgba(208, 15, 9, 0.12);
  }

  .mbfp-form-row {
    display: flex;
    gap: 1.25rem;
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
    justify-content: center;
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

  .mbfp-submit-btn.full-width {
    width: 100%;
  }

  /* Issued Password Security Box */
  .mbfp-issued-body {
    padding: 2.2rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .mbfp-issued-icon {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: #FFF1F2;
    color: #D00F09;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
  }

  .mbfp-issued-body h2 {
    font-size: 1.35rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0;
  }

  .mbfp-issued-warning {
    font-size: 0.88rem;
    color: #64748B;
    margin: 0;
    line-height: 1.4;
  }

  .mbfp-password-box {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #F8FAFC;
    border: 1.5px dashed #CBD5E1;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    box-sizing: border-box;
    margin: 0.5rem 0;
  }

  .mbfp-password-box code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 1.15rem;
    font-weight: 700;
    color: #0F172A;
    letter-spacing: 0.05em;
  }

  .mbfp-copy-code-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    font-size: 0.8rem;
    font-weight: 700;
    color: #334155;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .mbfp-copy-code-btn:hover {
    background: #F1F5F9;
    color: #0F172A;
  }

  .text-success {
    color: #059669 !important;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .mbfp-form-row {
      flex-direction: column;
      gap: 1.4rem;
    }
    .mbfp-search-box {
      min-width: 100%;
    }
    .mbfp-header-top {
      flex-direction: column;
      align-items: flex-start;
    }
    .mbfp-add-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;
