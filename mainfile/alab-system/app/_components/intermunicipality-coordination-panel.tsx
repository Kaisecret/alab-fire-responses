"use client";

import { municipalTabFetch as fetch } from "../../lib/auth/municipal-tab-fetch";

import React, { useState } from "react";
import type { AssistanceRequestSummary, AssistanceStatus, NearbyObserver } from "../../lib/intermunicipality/types";

type Tone = "coming" | "partial" | "waiting" | "declined" | "muted" | "seen" | "unseen";
type RowState = { label: string; tone: Tone; icon: string; pulse?: boolean };

/** A request's answer, in the same words the alarm board above uses. */
const REQUEST_STATE: Record<AssistanceStatus, RowState> = {
  REQUESTED: { label: "Waiting on them", tone: "waiting", icon: "fa-hourglass-half", pulse: true },
  ACCEPTED: { label: "Coming", tone: "coming", icon: "fa-check" },
  PARTIALLY_ACCEPTED: { label: "Sending what they can", tone: "partial", icon: "fa-check" },
  REJECTED: { label: "Cannot come", tone: "declined", icon: "fa-xmark" },
  CANCELLED: { label: "Cancelled", tone: "muted", icon: "fa-ban" },
  COMPLETED: { label: "Returned", tone: "muted", icon: "fa-flag-checkered" },
};

/** A neighbour with no request yet is only being kept informed. */
const MONITORING_STATE: Record<NearbyObserver["monitoringState"], RowState> = {
  BACKUP_REQUESTED: { label: "Backup requested", tone: "waiting", icon: "fa-bullhorn", pulse: true },
  SEEN: { label: "Seen", tone: "seen", icon: "fa-eye" },
  WAITING: { label: "Not seen yet", tone: "unseen", icon: "fa-satellite-dish", pulse: true },
};

type NeighbourRow = {
  key: string;
  municipalityName: string;
  observer: NearbyObserver | null;
  request: AssistanceRequestSummary | null;
};

/**
 * One row per neighbouring station, carrying its latest request. Showing the
 * station and its request apart let a station read "Backup requested" after it
 * had already answered "Coming".
 */
function neighbourRows(observers: NearbyObserver[], requests: AssistanceRequestSummary[]): NeighbourRow[] {
  const latest = new Map<string, AssistanceRequestSummary>();
  for (const request of requests) {
    const current = latest.get(request.recipientMunicipalityId);
    if (!current || Date.parse(request.requestedAt) > Date.parse(current.requestedAt)) {
      latest.set(request.recipientMunicipalityId, request);
    }
  }
  const rows: NeighbourRow[] = observers.map((observer) => ({
    key: observer.observerId,
    municipalityName: observer.municipalityName,
    observer,
    request: latest.get(observer.municipalityId) ?? null,
  }));
  const observed = new Set(observers.map((observer) => observer.municipalityId));
  for (const [municipalityId, request] of latest) {
    if (!observed.has(municipalityId)) {
      rows.push({ key: request.id, municipalityName: request.recipientMunicipalityName, observer: null, request });
    }
  }
  return rows;
}

function rowState(row: NeighbourRow): RowState {
  if (row.request) return REQUEST_STATE[row.request.status] ?? REQUEST_STATE.REQUESTED;
  return MONITORING_STATE[row.observer?.monitoringState ?? "WAITING"] ?? MONITORING_STATE.WAITING;
}

function units(firetrucks: number | null, personnel: number | null): string {
  const parts: string[] = [];
  if (firetrucks) parts.push(`${firetrucks} truck${firetrucks === 1 ? "" : "s"}`);
  if (personnel) parts.push(`${personnel} personnel`);
  return parts.join(" + ") || "no units";
}

/** Station names are stored as "<station> · Head: <rank name>". */
function stationParts(stationName: string | null | undefined) {
  const [station = "", head = ""] = (stationName ?? "").split(" · Head: ");
  const name = station.trim();
  // Some stations were typed in capitals; read them like the others.
  const readable = name.length > 3 && name === name.toUpperCase()
    ? name.toLowerCase().replace(/(^|\s)(\S)/g, (_, space: string, letter: string) => space + letter.toUpperCase())
    : name;
  return { station: readable || null, head: head.trim() || null };
}

function clockTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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
  const isRequestModalOpen = Boolean(externalShowRequestModal || internalShowRequestModal);

  const closeRequestModal = () => {
    if (onCloseRequestModal) {
      onCloseRequestModal();
    }
    setInternalShowRequestModal(false);
  };
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>(() => observers
    .filter((observer) => observer.status === "ACTIVE")
    .map((observer) => observer.municipalityId));
  const [requestedFiretrucks, setRequestedFiretrucks] = useState(1);
  const [requestedPersonnel, setRequestedPersonnel] = useState(4);
  const [requestNote, setRequestNote] = useState("");

  // Response Form State (OBSERVER)
  const [respondingToRequestId, setRespondingToRequestId] = useState<string | null>(null);
  const [responseAction, setResponseAction] = useState<"ACCEPT" | "PARTIAL_ACCEPT" | "REJECT">("ACCEPT");
  const [offeredFiretrucks, setOfferedFiretrucks] = useState(1);
  const [offeredPersonnel, setOfferedPersonnel] = useState(4);
  const [responseNote, setResponseNote] = useState("");

  const isOrigin = accessScope === "ORIGIN";
  const neighbours = isOrigin ? neighbourRows(observers, assistanceRequests) : [];
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
        .mbfp-coord-list {
          list-style: none;
          margin: 0.35rem 0 0;
          padding: 0;
        }
        .mbfp-coord-row {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto;
          gap: 0.85rem;
          align-items: start;
          padding: 0.9rem 0.25rem;
          border-top: 1px solid #F1F5F9;
        }
        .mbfp-coord-row:first-child { border-top: none; }
        .mbfp-coord-mark {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          font-size: 0.8rem;
        }
        .mbfp-coord-who { min-width: 0; }
        .mbfp-coord-name-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .mbfp-coord-muni-name {
          font-size: 0.92rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .mbfp-coord-chip {
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: #9A3412;
          background: #FFF7ED;
          border: 1px solid #FED7AA;
          border-radius: 6px;
          padding: 0.1rem 0.4rem;
        }
        .mbfp-coord-station {
          margin: 0.15rem 0 0;
          font-size: 0.78rem;
          font-weight: 600;
          color: #334155;
          overflow-wrap: anywhere;
        }
        .mbfp-coord-station span { color: #64748B; font-weight: 500; }
        .mbfp-coord-facts {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem 0.9rem;
          margin: 0.35rem 0 0;
          font-size: 0.74rem;
          color: #64748B;
        }
        .mbfp-coord-facts span { display: inline-flex; align-items: center; gap: 0.35rem; }
        .mbfp-coord-facts i { font-size: 0.7rem; color: #94A3B8; }
        .mbfp-coord-facts strong { color: #334155; font-weight: 700; }
        .mbfp-coord-ask {
          margin: 0.45rem 0 0;
          font-size: 0.78rem;
          color: #475569;
        }
        .mbfp-coord-ask strong { color: #0F172A; font-weight: 750; }
        .mbfp-coord-note {
          margin: 0.4rem 0 0;
          padding: 0.4rem 0.65rem;
          background: #F8FAFC;
          border: 1px solid #EEF2F6;
          border-radius: 8px;
          font-size: 0.76rem;
          color: #475569;
          font-style: italic;
          max-width: 62ch;
        }
        .mbfp-coord-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.45rem;
        }
        .mbfp-coord-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.28rem 0.7rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          white-space: nowrap;
          border: 1px solid transparent;
        }
        .mbfp-coord-mark.coming { background: #DCFCE7; color: #15803D; }
        .mbfp-coord-pill.coming { background: #ECFDF5; color: #047857; border-color: #A7F3D0; }
        .mbfp-coord-mark.partial { background: #E0F2FE; color: #0369A1; }
        .mbfp-coord-pill.partial { background: #F0F9FF; color: #0369A1; border-color: #BAE6FD; }
        .mbfp-coord-mark.waiting { background: #FEF3C7; color: #B45309; }
        .mbfp-coord-pill.waiting { background: #FFFBEB; color: #B45309; border-color: #FDE68A; }
        .mbfp-coord-mark.declined { background: #FEE2E2; color: #B91C1C; }
        .mbfp-coord-pill.declined { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }
        .mbfp-coord-mark.muted { background: #F1F5F9; color: #64748B; }
        .mbfp-coord-pill.muted { background: #F8FAFC; color: #475569; border-color: #E2E8F0; }
        .mbfp-coord-mark.seen { background: #DBEAFE; color: #1D4ED8; }
        .mbfp-coord-pill.seen { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
        .mbfp-coord-mark.unseen { background: #F1F5F9; color: #475569; }
        .mbfp-coord-pill.unseen { background: #F8FAFC; color: #475569; border-color: #CBD5E1; }
        .mbfp-coord-cancel {
          background: #FFFFFF;
          border: 1px solid #FECACA;
          color: #BE123C;
          border-radius: 8px;
          padding: 0.3rem 0.7rem;
          font-size: 0.74rem;
          font-weight: 750;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease;
        }
        .mbfp-coord-cancel:hover:not(:disabled) { background: #FEF2F2; border-color: #FDA4AF; }
        .mbfp-coord-cancel:disabled { opacity: 0.55; cursor: not-allowed; }
        .mbfp-coord-cancel:focus-visible,
        .mbfp-coord-btn:focus-visible {
          outline: 2px solid #EA580C;
          outline-offset: 2px;
        }
        @media (max-width: 560px) {
          .mbfp-coord-row { grid-template-columns: 34px minmax(0, 1fr); }
          .mbfp-coord-side { grid-column: 2; flex-direction: row; align-items: center; flex-wrap: wrap; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mbfp-coord-pulse-dot { animation: none; }
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

        {/*
          Backup is called for by the responder on scene from the mobile app.
          The municipality's part is to forward that request to the province,
          which it does from the alarm the request raises.
        */}
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
          {neighbours.length === 0 ? (
            <div className="mbfp-coord-standby-banner">
              <div className="mbfp-coord-standby-icon">
                <i className="fa-solid fa-satellite-dish" />
              </div>
              <div>
                <div className="mbfp-coord-standby-title">
                  Proximity Monitoring On Standby
                </div>
                <div className="mbfp-coord-standby-desc">
                  When responder units are dispatched to this incident, ALAB will automatically link 2 neighboring municipal BFP stations for live mutual-aid monitoring: the municipality's paired towns where set (San Jose: Hamtic and Sibalom), otherwise the 2 closest by Haversine distance.
                </div>
              </div>
            </div>
          ) : (
            <ul className="mbfp-coord-list" aria-label="Neighbouring stations and backup requests">
              {neighbours.map((row) => {
                const state = rowState(row);
                const { station, head } = stationParts(row.observer?.stationName);
                const request = row.request;
                const sending = request && (request.status === "ACCEPTED" || request.status === "PARTIALLY_ACCEPTED" || request.status === "COMPLETED")
                  ? units(request.offeredFiretrucks, request.offeredPersonnel)
                  : null;
                return (
                  <li key={row.key} className="mbfp-coord-row">
                    <span className={`mbfp-coord-mark ${state.tone}`} aria-hidden="true">
                      <i className={`fa-solid ${state.icon}`} />
                    </span>
                    <div className="mbfp-coord-who">
                      <div className="mbfp-coord-name-line">
                        <h4 className="mbfp-coord-muni-name">{row.municipalityName}</h4>
                        {request?.isProvincialCommand && <span className="mbfp-coord-chip">Province order</span>}
                      </div>
                      {station && (
                        <p className="mbfp-coord-station">
                          {station}
                          {head && <span> · Head: {head}</span>}
                        </p>
                      )}
                      {(row.observer || request) && (
                        <p className="mbfp-coord-facts">
                          {row.observer && Number.isFinite(row.observer.distanceMeters) && (
                            <span>
                              <i className="fa-solid fa-location-dot" aria-hidden="true" />
                              {(row.observer.distanceMeters / 1000).toFixed(1)} km away
                            </span>
                          )}
                          {row.observer?.acknowledgedAt && (
                            <span>
                              <i className="fa-solid fa-eye" aria-hidden="true" />
                              Seen by <strong>{row.observer.acknowledgedByDisplayName || "Municipal Officer"}</strong> at {clockTime(row.observer.acknowledgedAt)}
                            </span>
                          )}
                          {request && (
                            <span>
                              <i className="fa-solid fa-truck-droplet" aria-hidden="true" />
                              Asked for {units(request.requestedFiretrucks, request.requestedPersonnel)} at {clockTime(request.requestedAt)}
                            </span>
                          )}
                        </p>
                      )}
                      {sending && (
                        <p className="mbfp-coord-ask">
                          Sending <strong>{sending}</strong>
                        </p>
                      )}
                      {request?.responseNote && (
                        <p className="mbfp-coord-note">&ldquo;{request.responseNote}&rdquo;</p>
                      )}
                    </div>
                    <div className="mbfp-coord-side">
                      <span className={`mbfp-coord-pill ${state.tone}`}>
                        {state.pulse
                          ? <span className="mbfp-coord-pulse-dot" aria-hidden="true" />
                          : <i className={`fa-solid ${state.icon}`} aria-hidden="true" />}
                        <span>{state.label}</span>
                      </span>
                      {request?.status === "REQUESTED" && !request.isProvincialCommand && (
                        <button
                          type="button"
                          className="mbfp-coord-cancel"
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={submitting}
                        >
                          Cancel request
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
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
                    {observerPendingRequest.isProvincialCommand
                      ? "Mandatory Provincial Alarm Command"
                      : "Backup Requested by Incident Commander"}
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
              {observerPendingRequest.isProvincialCommand && (
                <p style={{ fontSize: "0.78rem", color: "#9A3412", fontWeight: 750, margin: "0.35rem 0" }}>
                  Full assistance is required. This Provincial command cannot be declined, reduced, or cancelled.
                </p>
              )}
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
                    {observerPendingRequest.isProvincialCommand ? "Acknowledge & Accept Full Command" : "Accept"}
                  </button>
                  {!observerPendingRequest.isProvincialCommand && <button
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
                  </button>}
                  {!observerPendingRequest.isProvincialCommand && <button
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
                  </button>}
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
