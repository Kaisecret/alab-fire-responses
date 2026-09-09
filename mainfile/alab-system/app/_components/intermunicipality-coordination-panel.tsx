"use client";

import { municipalTabFetch as fetch } from "../../lib/auth/municipal-tab-fetch";

import React, { useState } from "react";
import type { AssistanceRequestSummary, NearbyObserver } from "../../lib/intermunicipality/types";

interface Props {
  incidentId: string;
  accessScope: "ORIGIN" | "OBSERVER";
  observers: NearbyObserver[];
  assistanceRequests: AssistanceRequestSummary[];
  onChanged: () => Promise<void> | void;
  showRequestModal?: boolean;
  onCloseRequestModal?: () => void;
}

export function IntermunicipalityCoordinationPanel({
  incidentId,
  accessScope,
  observers = [],
  assistanceRequests = [],
  onChanged,
  showRequestModal: externalShowRequestModal,
  onCloseRequestModal,
}: Props): React.ReactElement | null {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Request Backup Form State (ORIGIN)
  const [internalShowRequestModal, setInternalShowRequestModal] = useState(false);
  const isRequestModalOpen =
    externalShowRequestModal !== undefined
      ? externalShowRequestModal
      : internalShowRequestModal;

  const closeRequestModal = () => {
    if (onCloseRequestModal) {
      onCloseRequestModal();
    }
    setInternalShowRequestModal(false);
  };
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [requestedFiretrucks, setRequestedFiretrucks] = useState(1);
  const [requestedPersonnel, setRequestedPersonnel] = useState(4);
  const [requestNote, setRequestNote] = useState("");

  React.useEffect(() => {
    if (observers.length > 0 && selectedRecipientIds.length === 0) {
      setSelectedRecipientIds(observers.map((o) => o.municipalityId));
    }
  }, [observers, selectedRecipientIds.length]);

  // Response Form State (OBSERVER)
  const [respondingToRequestId, setRespondingToRequestId] = useState<string | null>(null);
  const [responseAction, setResponseAction] = useState<"ACCEPT" | "PARTIAL_ACCEPT" | "REJECT">("ACCEPT");
  const [offeredFiretrucks, setOfferedFiretrucks] = useState(1);
  const [offeredPersonnel, setOfferedPersonnel] = useState(4);
  const [responseNote, setResponseNote] = useState("");

  const isOrigin = accessScope === "ORIGIN";
  const myObserver = observers[0]; // For observer, only 1 is scoped

  // Find active assistance request for observer
  const observerPendingRequest = !isOrigin
    ? assistanceRequests.find((r) => r.status === "REQUESTED")
    : null;

  async function handleAcknowledgeAlert() {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(
        `/api/municipal-bfp/incidents/${encodeURIComponent(incidentId)}/observer-acknowledgment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to acknowledge alert");
      }
      setSuccessMessage("Alert acknowledged. Seen status updated.");
      await onChanged();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to acknowledge alert");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateBackupRequest(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRecipientIds.length === 0) {
      setErrorMessage("Please select at least one municipality to request backup from.");
      return;
    }
    if (requestedFiretrucks <= 0 && requestedPersonnel <= 0) {
      setErrorMessage("Please specify at least 1 firetruck or 1 personnel.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(
        `/api/municipal-bfp/incidents/${encodeURIComponent(incidentId)}/assistance-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientMunicipalityIds: selectedRecipientIds,
            requestedFiretrucks,
            requestedPersonnel,
            requestNote: requestNote.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create backup request");
      }

      setSuccessMessage("Backup request sent successfully to selected observers.");
      closeRequestModal();
      setRequestNote("");
      await onChanged();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to send backup request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRequest(requestId: string) {
    if (!confirm("Are you sure you want to cancel this backup request?")) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(
        `/api/municipal-bfp/assistance-requests/${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "CANCEL" }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to cancel assistance request");
      }
      setSuccessMessage("Assistance request cancelled.");
      await onChanged();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to cancel request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRespondToRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!respondingToRequestId) return;

    const action = responseAction;
    let ft = 0;
    let pers = 0;

    if (action === "ACCEPT") {
      const targetReq = assistanceRequests.find((r) => r.id === respondingToRequestId);
      ft = targetReq?.requestedFiretrucks ?? 0;
      pers = targetReq?.requestedPersonnel ?? 0;
    } else if (action === "PARTIAL_ACCEPT") {
      ft = offeredFiretrucks;
      pers = offeredPersonnel;
      if (ft <= 0 && pers <= 0) {
        setErrorMessage("Partial acceptance must offer at least 1 firetruck or 1 personnel.");
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(
        `/api/municipal-bfp/assistance-requests/${encodeURIComponent(respondingToRequestId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            offeredFiretrucks: ft,
            offeredPersonnel: pers,
            responseNote: responseNote.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to respond to assistance request");
      }

      setSuccessMessage(
        action === "REJECT"
          ? "Backup request declined."
          : `Backup request responded (${action === "ACCEPT" ? "Accepted" : "Partially Accepted"}).`,
      );
      setRespondingToRequestId(null);
      setResponseNote("");
      await onChanged();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  }

  // When origin has no observers linked yet and no active assistance requests:
  // Remove the big standby coordination card from the page as requested by the user.
  // If the request modal is opened via the header action button, render the modal.
  if (isOrigin && observers.length === 0 && assistanceRequests.length === 0 && !isRequestModalOpen) {
    return null;
  }

  return (
    <section aria-label="Inter-Municipality Live Incident Coordination" className="mbfp-coord-panel">
      <style>{`
        .mbfp-coord-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 1.15rem 1.4rem;
          margin-bottom: 12px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
          font-family: inherit;
          box-sizing: border-box;
          color: #0F172A;
        }
        .mbfp-coord-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid #F1F5F9;
          flex-wrap: wrap;
        }
        .mbfp-coord-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .mbfp-coord-icon-pill {
          width: 40px;
          height: 40px;
          min-width: 40px;
          max-width: 40px;
          min-height: 40px;
          max-height: 40px;
          border-radius: 11px;
          background: #FFF7ED;
          border: 1px solid #FFEDD5;
          color: #EA580C;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }
        .mbfp-coord-title-text h3 {
          margin: 0;
          font-size: 1.02rem;
          font-weight: 850;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .mbfp-coord-scope-tag {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .mbfp-coord-scope-tag.origin {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #A7F3D0;
        }
        .mbfp-coord-scope-tag.observer {
          background: #F0F9FF;
          color: #0369A1;
          border: 1px solid #BAE6FD;
        }
        .mbfp-coord-title-text p {
          margin: 0.2rem 0 0 0;
          font-size: 0.78rem;
          color: #64748B;
          font-weight: 500;
        }
        .mbfp-coord-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.15rem;
          border-radius: 9px;
          font-size: 0.82rem;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: inherit;
          border: none;
          white-space: nowrap;
        }
        .mbfp-coord-btn.primary {
          background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(234, 88, 12, 0.25);
        }
        .mbfp-coord-btn.primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);
        }
        .mbfp-coord-btn.primary:disabled {
          background: #F1F5F9;
          color: #94A3B8;
          border: 1px solid #E2E8F0;
          box-shadow: none;
          cursor: not-allowed;
        }
        .mbfp-coord-feedback {
          margin-top: 0.75rem;
          padding: 0.65rem 1rem;
          border-radius: 9px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .mbfp-coord-feedback.error {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #991B1B;
        }
        .mbfp-coord-feedback.success {
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          color: #047857;
        }
        .mbfp-coord-standby-banner {
          margin-top: 0.85rem;
          background: #F8FAFC;
          border: 1.5px dashed #CBD5E1;
          border-radius: 12px;
          padding: 0.95rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .mbfp-coord-standby-icon {
          width: 36px;
          height: 36px;
          min-width: 36px;
          border-radius: 9px;
          background: #E2E8F0;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .mbfp-coord-standby-title {
          font-size: 0.84rem;
          font-weight: 750;
          color: #1E293B;
        }
        .mbfp-coord-standby-desc {
          font-size: 0.77rem;
          color: #64748B;
          margin-top: 0.15rem;
          line-height: 1.4;
        }
        .mbfp-coord-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
          margin-top: 0.85rem;
        }
        .mbfp-coord-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 0.95rem 1.1rem;
          transition: all 0.2s ease;
        }
        .mbfp-coord-card:hover {
          background: #FFFFFF;
          border-color: #CBD5E1;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .mbfp-coord-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .mbfp-coord-muni-name {
          font-size: 0.9rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }
        .mbfp-coord-muni-sub {
          font-size: 0.76rem;
          color: #64748B;
          margin: 0.2rem 0 0 0;
          font-weight: 500;
        }
        .mbfp-coord-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.24rem 0.65rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .mbfp-coord-status-badge.waiting {
          background: #FFFBEB;
          color: #B45309;
          border: 1px solid #FDE68A;
        }
        .mbfp-coord-status-badge.seen {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #BFDBFE;
        }
        .mbfp-coord-status-badge.backup-requested {
          background: #EEF2FF;
          color: #4338CA;
          border: 1px solid #C7D2FE;
        }
        .mbfp-coord-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: mbfpCoordPulse 1.8s infinite;
        }
        @keyframes mbfpCoordPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
        .mbfp-coord-ack-meta {
          margin-top: 0.75rem;
          padding-top: 0.5rem;
          border-top: 1px solid #E2E8F0;
          font-size: 0.72rem;
          color: #64748B;
        }
        .mbfp-coord-table-wrap {
          margin-top: 1rem;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 0.85rem 1.1rem;
        }
        .mbfp-coord-table-title {
          font-size: 0.72rem;
          font-weight: 850;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.65rem;
        }
        .mbfp-coord-req-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0;
          border-bottom: 1px solid #EEF2F6;
          gap: 0.85rem;
          flex-wrap: wrap;
        }
        .mbfp-coord-req-row:last-child {
          border-bottom: none;
        }
        .mbfp-coord-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .mbfp-coord-modal-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 1.5rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
          box-sizing: border-box;
        }
        .mbfp-coord-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid #F1F5F9;
        }
        .mbfp-coord-modal-header h3 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 850;
          color: #0F172A;
        }
        .mbfp-coord-modal-close {
          background: transparent;
          border: none;
          color: #64748B;
          cursor: pointer;
          font-size: 1.15rem;
          padding: 0.35rem;
        }
        .mbfp-coord-modal-body {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .mbfp-coord-modal-input {
          width: 100%;
          padding: 0.6rem 0.85rem;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 0.85rem;
          box-sizing: border-box;
          font-family: inherit;
        }
        .mbfp-coord-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.65rem;
          margin-top: 1.25rem;
        }
      `}</style>

      {/* Header */}
      <div className="mbfp-coord-header">
        <div className="mbfp-coord-title-wrap">
          <div className="mbfp-coord-icon-pill">
            <i className="fa-solid fa-tower-broadcast" />
          </div>
          <div className="mbfp-coord-title-text">
            <h3>
              <span>Inter-Municipality Live Coordination</span>
              <span className={`mbfp-coord-scope-tag ${isOrigin ? "origin" : "observer"}`}>
                {isOrigin ? "Origin Commander" : "Nearby Observer"}
              </span>
            </h3>
            <p>
              {isOrigin
                ? "Automatic GPS proximity monitoring with neighboring BFP stations"
                : "Live situational awareness. Observers cannot dispatch without accepted backup request."}
            </p>
          </div>
        </div>

        {isOrigin && (
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedRecipientIds(observers.map((o) => o.municipalityId));
                setInternalShowRequestModal(true);
              }}
              disabled={observers.length === 0 || submitting}
              className="mbfp-coord-btn primary"
              title={observers.length === 0 ? "Dispatch active response first to request mutual aid" : "Request mutual aid assistance"}
            >
              <i className="fa-solid fa-plus" />
              <span>Request Backup</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Feedback Message */}
      {errorMessage && (
        <div className="mbfp-coord-feedback error">
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mbfp-coord-feedback success">
          <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />
          {successMessage}
        </div>
      )}

      {/* Origin View: List Observers and Ongoing Requests */}
      {isOrigin && (
        <>
          {observers.length === 0 ? (
            <div className="mbfp-coord-standby-banner">
              <div className="mbfp-coord-standby-icon">
                <i className="fa-solid fa-satellite-dish" />
              </div>
              <div>
                <div className="mbfp-coord-standby-title">
                  Proximity Monitoring On Standby
                </div>
                <div className="mbfp-coord-standby-desc">
                  When responder units are dispatched to this incident, ALAB will automatically calculate Haversine distance and link the 2 closest neighboring municipal BFP stations for live mutual-aid monitoring.
                </div>
              </div>
            </div>
          ) : (
            <div className="mbfp-coord-grid">
              {observers.map((observer) => {
                const km = (observer.distanceMeters / 1000).toFixed(1);
                return (
                  <div key={observer.observerId} className="mbfp-coord-card">
                    <div className="mbfp-coord-card-top">
                      <div>
                        <h4 className="mbfp-coord-muni-name">{observer.municipalityName}</h4>
                        <p className="mbfp-coord-muni-sub">
                          {observer.stationName} · {km} km away
                        </p>
                      </div>
                      <div>
                        {observer.monitoringState === "BACKUP_REQUESTED" ? (
                          <span className="mbfp-coord-status-badge backup-requested">
                            <span className="mbfp-coord-pulse-dot" />
                            <span>Backup requested</span>
                          </span>
                        ) : observer.monitoringState === "SEEN" ? (
                          <span className="mbfp-coord-status-badge seen">
                            <i className="fa-solid fa-check" />
                            <span>Seen</span>
                          </span>
                        ) : (
                          <span className="mbfp-coord-status-badge waiting">
                            <span className="mbfp-coord-pulse-dot" />
                            <span>Waiting</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {observer.acknowledgedAt && (
                      <div className="mbfp-coord-ack-meta">
                        <i className="fa-regular fa-clock" style={{ marginRight: 4 }} />
                        Acknowledged by <strong>{observer.acknowledgedByDisplayName || "Municipal Officer"}</strong> at {new Date(observer.acknowledgedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Assistance Requests Activity Table */}
          {assistanceRequests.length > 0 && (
            <div className="mbfp-coord-table-wrap">
              <div className="mbfp-coord-table-title">
                <i className="fa-solid fa-handshake-angle" style={{ marginRight: 5 }} />
                Assistance Requests &amp; Status
              </div>
              <div>
                {assistanceRequests.map((req) => (
                  <div key={req.id} className="mbfp-coord-req-row">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 750 }}>
                          To: {req.recipientMunicipalityName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "0.15rem 0.5rem",
                            borderRadius: 6,
                            background:
                              req.status === "ACCEPTED"
                                ? "#ECFDF5"
                                : req.status === "PARTIALLY_ACCEPTED"
                                ? "#F0F9FF"
                                : req.status === "REJECTED"
                                ? "#FEF2F2"
                                : req.status === "CANCELLED"
                                ? "#F1F5F9"
                                : "#FFFBEB",
                            color:
                              req.status === "ACCEPTED"
                                ? "#047857"
                                : req.status === "PARTIALLY_ACCEPTED"
                                ? "#0369A1"
                                : req.status === "REJECTED"
                                ? "#991B1B"
                                : req.status === "CANCELLED"
                                ? "#64748B"
                                : "#B45309",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#64748B", marginTop: 2 }}>
                        Requested: {req.requestedFiretrucks} firetruck(s), {req.requestedPersonnel} personnel
                        {(req.offeredFiretrucks !== null || req.offeredPersonnel !== null) && (
                          <strong style={{ color: "#0F172A", marginLeft: 6 }}>
                            · Offered: {req.offeredFiretrucks ?? 0} firetruck(s), {req.offeredPersonnel ?? 0} personnel
                          </strong>
                        )}
                      </div>
                      {req.responseNote && (
                        <div style={{ fontSize: "0.74rem", fontStyle: "italic", color: "#475569", marginTop: 3 }}>
                          &ldquo;{req.responseNote}&rdquo;
                        </div>
                      )}
                    </div>
                    {req.status === "REQUESTED" && (
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={submitting}
                        style={{
                          background: "#FEF2F2",
                          border: "1px solid #FECACA",
                          color: "#BE123C",
                          borderRadius: 6,
                          padding: "0.3rem 0.75rem",
                          fontSize: "0.76rem",
                          fontWeight: 750,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Observer View: Acknowledgment and Backup Response */}
      {!isOrigin && (
        <div style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="mbfp-coord-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Monitoring Alert Status</span>
                {myObserver?.acknowledgedAt ? (
                  <span className="mbfp-coord-status-badge seen">
                    <i className="fa-solid fa-check" />
                    <span>Seen {new Date(myObserver.acknowledgedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                ) : (
                  <span className="mbfp-coord-status-badge waiting">
                    <span className="mbfp-coord-pulse-dot" />
                    <span>Waiting</span>
                  </span>
                )}
              </div>
              <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.78rem", color: "#64748B" }}>
                {myObserver?.acknowledgedAt
                  ? `Alert acknowledged by ${myObserver.acknowledgedByDisplayName || "Officer"}. Situational awareness active.`
                  : "Acknowledge this incident to confirm your station has seen the active dispatch."}
              </p>
            </div>

            {!myObserver?.acknowledgedAt && (
              <button
                type="button"
                onClick={handleAcknowledgeAlert}
                disabled={submitting}
                className="mbfp-coord-btn primary"
              >
                <i className="fa-solid fa-check-double" />
                <span>Acknowledge Alert</span>
              </button>
            )}
          </div>

          {/* Observer Backup Request Section */}
          {observerPendingRequest ? (
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "1.1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: "#EA580C", fontSize: "1.1rem" }} />
                  <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 850, color: "#9A3412" }}>
                    Backup Requested by Incident Commander
                  </h4>
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#EA580C", letterSpacing: "0.04em" }}>
                  ACTION REQUIRED
                </span>
              </div>

              <p style={{ fontSize: "0.8rem", color: "#475569", margin: "0.5rem 0" }}>
                The originating municipality requests:{" "}
                <strong style={{ color: "#0F172A" }}>{observerPendingRequest.requestedFiretrucks} Firetruck(s)</strong> and{" "}
                <strong style={{ color: "#0F172A" }}>{observerPendingRequest.requestedPersonnel} Personnel</strong>.
              </p>
              {observerPendingRequest.requestNote && (
                <p style={{ fontSize: "0.76rem", fontStyle: "italic", color: "#64748B", margin: "0.25rem 0" }}>
                  Note: &ldquo;{observerPendingRequest.requestNote}&rdquo;
                </p>
              )}

              {respondingToRequestId !== observerPendingRequest.id ? (
                <div style={{ display: "flex", gap: 8, marginTop: "0.85rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRespondingToRequestId(observerPendingRequest.id);
                      setResponseAction("ACCEPT");
                      setOfferedFiretrucks(observerPendingRequest.requestedFiretrucks);
                      setOfferedPersonnel(observerPendingRequest.requestedPersonnel);
                    }}
                    disabled={submitting}
                    style={{
                      background: "#059669",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "0.45rem 1rem",
                      borderRadius: 8,
                      fontSize: "0.78rem",
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRespondingToRequestId(observerPendingRequest.id);
                      setResponseAction("PARTIAL_ACCEPT");
                      setOfferedFiretrucks(Math.max(0, observerPendingRequest.requestedFiretrucks - 1));
                      setOfferedPersonnel(Math.max(1, observerPendingRequest.requestedPersonnel - 1));
                    }}
                    disabled={submitting}
                    style={{
                      background: "#0284C7",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "0.45rem 1rem",
                      borderRadius: 8,
                      fontSize: "0.78rem",
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    Partially Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRespondingToRequestId(observerPendingRequest.id);
                      setResponseAction("REJECT");
                      setOfferedFiretrucks(0);
                      setOfferedPersonnel(0);
                    }}
                    disabled={submitting}
                    style={{
                      background: "#F1F5F9",
                      color: "#475569",
                      border: "1px solid #CBD5E1",
                      padding: "0.45rem 1rem",
                      borderRadius: 8,
                      fontSize: "0.78rem",
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRespondToRequest} style={{ marginTop: "0.85rem", borderTop: "1px solid #FED7AA", paddingTop: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Action:</span>
                    <span style={{ background: "#E2E8F0", padding: "0.2rem 0.5rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 800 }}>
                      {responseAction}
                    </span>
                  </div>

                  {responseAction === "PARTIAL_ACCEPT" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "0.75rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginBottom: 3 }}>
                          Offered Firetrucks (Max {observerPendingRequest.requestedFiretrucks})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={observerPendingRequest.requestedFiretrucks}
                          value={offeredFiretrucks}
                          onChange={(e) => setOfferedFiretrucks(parseInt(e.target.value, 10) || 0)}
                          className="mbfp-coord-modal-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginBottom: 3 }}>
                          Offered Personnel (Max {observerPendingRequest.requestedPersonnel})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={observerPendingRequest.requestedPersonnel}
                          value={offeredPersonnel}
                          onChange={(e) => setOfferedPersonnel(parseInt(e.target.value, 10) || 0)}
                          className="mbfp-coord-modal-input"
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginBottom: 3 }}>
                      Response Note (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      placeholder="e.g., En route with 1 pumper engine"
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      className="mbfp-coord-modal-input"
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="mbfp-coord-btn primary"
                    >
                      <span>Submit Response</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRespondingToRequestId(null)}
                      disabled={submitting}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        color: "#475569",
                        borderRadius: 8,
                        padding: "0.45rem 1rem",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748B" }}>
                Monitoring only—no assistance requested.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Request Backup Modal (ORIGIN) */}
      {isRequestModalOpen && (
        <div className="mbfp-coord-modal-backdrop">
          <div className="mbfp-coord-modal-card">
            <div className="mbfp-coord-modal-header">
              <h3>Request Inter-Municipality Backup</h3>
              <button
                type="button"
                onClick={closeRequestModal}
                className="mbfp-coord-modal-close"
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateBackupRequest} className="mbfp-coord-modal-body">
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>
                  Select Observer Municipalities
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {observers.length === 0 ? (
                    <div style={{ padding: "0.9rem 1.1rem", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, fontSize: "0.82rem", color: "#92400E" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                        <i className="fa-solid fa-satellite-dish" />
                        <span>Nearby Proximity Stations Standby</span>
                      </div>
                      <span>Automated proximity linkage is established as soon as responding units are dispatched. Dispatch responders first to link neighboring municipal stations for mutual aid.</span>
                    </div>
                  ) : (
                    observers.map((obs) => (
                      <label
                        key={obs.municipalityId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "0.65rem 0.85rem",
                          borderRadius: 10,
                          border: "1px solid #E2E8F0",
                          background: selectedRecipientIds.includes(obs.municipalityId) ? "#FFF7ED" : "#FFFFFF",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipientIds.includes(obs.municipalityId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecipientIds([...selectedRecipientIds, obs.municipalityId]);
                            } else {
                              setSelectedRecipientIds(selectedRecipientIds.filter((id) => id !== obs.municipalityId));
                            }
                          }}
                          style={{ width: 16, height: 16, accentColor: "#EA580C" }}
                        />
                        <div style={{ flex: 1 }}>
                          <strong>{obs.municipalityName}</strong>
                          <span style={{ color: "#64748B", marginLeft: 6 }}>({(obs.distanceMeters / 1000).toFixed(1)} km away)</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label htmlFor="req-firetrucks" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#334155", marginBottom: 4 }}>
                    Firetrucks Needed
                  </label>
                  <input
                    id="req-firetrucks"
                    type="number"
                    min={0}
                    max={20}
                    value={requestedFiretrucks}
                    onChange={(e) => setRequestedFiretrucks(parseInt(e.target.value, 10) || 0)}
                    className="mbfp-coord-modal-input"
                  />
                </div>
                <div>
                  <label htmlFor="req-personnel" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#334155", marginBottom: 4 }}>
                    Personnel Needed
                  </label>
                  <input
                    id="req-personnel"
                    type="number"
                    min={0}
                    max={100}
                    value={requestedPersonnel}
                    onChange={(e) => setRequestedPersonnel(parseInt(e.target.value, 10) || 0)}
                    className="mbfp-coord-modal-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="req-note" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#334155", marginBottom: 4 }}>
                  Operational Note (Optional)
                </label>
                <textarea
                  id="req-note"
                  rows={2}
                  maxLength={500}
                  placeholder="e.g., Structural conflagration, high wind velocity, additional tankers needed."
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  className="mbfp-coord-modal-input"
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="mbfp-coord-modal-actions">
                <button
                  type="button"
                  onClick={closeRequestModal}
                  disabled={submitting}
                  style={{
                    background: "#F1F5F9",
                    border: "1px solid #CBD5E1",
                    color: "#475569",
                    borderRadius: 8,
                    padding: "0.55rem 1.15rem",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mbfp-coord-btn primary"
                >
                  <span>{submitting ? "Sending..." : "Send Request"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
