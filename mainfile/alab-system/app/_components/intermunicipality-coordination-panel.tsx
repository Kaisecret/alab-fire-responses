"use client";

import React, { useState } from "react";
import type { AssistanceRequestSummary, NearbyObserver } from "../../lib/intermunicipality/types";

interface Props {
  incidentId: string;
  accessScope: "ORIGIN" | "OBSERVER";
  observers: NearbyObserver[];
  assistanceRequests: AssistanceRequestSummary[];
  onChanged: () => Promise<void> | void;
}

export function IntermunicipalityCoordinationPanel({
  incidentId,
  accessScope,
  observers = [],
  assistanceRequests = [],
  onChanged,
}: Props): React.ReactElement {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Request Backup Form State (ORIGIN)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
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
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to acknowledge alert");
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
      setShowRequestModal(false);
      setRequestNote("");
      await onChanged();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send backup request");
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
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to cancel request");
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
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Inter-Municipality Live Incident Coordination"
      className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Inter-Municipality Live Coordination
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  isOrigin
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                    : "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40"
                }`}
              >
                {isOrigin ? "Origin Commander" : "Nearby Observer"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                setShowRequestModal(true);
              }}
              disabled={observers.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Request Backup
            </button>
          </div>
        )}
      </div>

      {/* Live Feedback Region */}
      <div aria-live="polite" className="mt-3">
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
            {successMessage}
          </div>
        )}
      </div>

      {/* Origin View: List Observers and Ongoing Requests */}
      {isOrigin && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {observers.map((observer) => {
              const km = (observer.distanceMeters / 1000).toFixed(1);
              return (
                <div
                  key={observer.observerId}
                  className="relative rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-slate-200 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {observer.municipalityName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {observer.stationName} · {km} km away
                      </p>
                    </div>
                    <div>
                      {observer.monitoringState === "BACKUP_REQUESTED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Backup requested
                        </span>
                      ) : observer.monitoringState === "SEEN" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                          <svg className="h-3 w-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Seen
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Waiting
                        </span>
                      )}
                    </div>
                  </div>

                  {observer.acknowledgedAt && (
                    <div className="mt-3 border-t border-slate-200/60 pt-2 text-2xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Acknowledged by{" "}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {observer.acknowledgedByDisplayName || "Municipal Officer"}
                      </span>{" "}
                      at {new Date(observer.acknowledgedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Assistance Requests Activity Table */}
          {assistanceRequests.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850/50">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Assistance Requests & Status
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {assistanceRequests.map((req) => (
                  <div key={req.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-900 dark:text-white">
                          To: {req.recipientMunicipalityName}
                        </span>
                        <span
                          className={`text-2xs font-semibold px-2 py-0.5 rounded-md ${
                            req.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : req.status === "PARTIALLY_ACCEPTED"
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                              : req.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : req.status === "CANCELLED"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : req.status === "COMPLETED"
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Requested: {req.requestedFiretrucks} firetruck(s), {req.requestedPersonnel} personnel
                        {(req.offeredFiretrucks !== null || req.offeredPersonnel !== null) && (
                          <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
                            · Offered: {req.offeredFiretrucks ?? 0} firetruck(s), {req.offeredPersonnel ?? 0} personnel
                          </span>
                        )}
                      </p>
                      {req.responseNote && (
                        <p className="text-xs italic text-slate-600 dark:text-slate-300 mt-1">
                          "{req.responseNote}"
                        </p>
                      )}
                    </div>
                    {req.status === "REQUESTED" && (
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={submitting}
                        className="self-start sm:self-center text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Observer View: Acknowledgment and Backup Response */}
      {!isOrigin && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Monitoring Alert Status
                </span>
                {myObserver?.acknowledgedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                    <svg className="h-3 w-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Seen {new Date(myObserver.acknowledgedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Waiting
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                Acknowledge Alert
              </button>
            )}
          </div>

          {/* Observer Backup Request Section */}
          {observerPendingRequest ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900/60 dark:bg-orange-950/30">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Backup Requested by Incident Commander
                    </h4>
                    <span className="text-2xs font-semibold text-orange-600 dark:text-orange-400">
                      ACTION REQUIRED
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    The originating municipality requests:{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {observerPendingRequest.requestedFiretrucks} Firetruck(s)
                    </span>{" "}
                    and{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {observerPendingRequest.requestedPersonnel} Personnel
                    </span>
                    .
                  </p>
                  {observerPendingRequest.requestNote && (
                    <p className="text-xs italic text-slate-600 dark:text-slate-400 mt-1">
                      Note: "{observerPendingRequest.requestNote}"
                    </p>
                  )}

                  {respondingToRequestId !== observerPendingRequest.id ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingToRequestId(observerPendingRequest.id);
                          setResponseAction("ACCEPT");
                          setOfferedFiretrucks(observerPendingRequest.requestedFiretrucks);
                          setOfferedPersonnel(observerPendingRequest.requestedPersonnel);
                        }}
                        disabled={submitting}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm"
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
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 shadow-sm"
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
                        className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRespondToRequest} className="mt-4 border-t border-orange-200 pt-3 dark:border-orange-900">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Action:</span>
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-white">
                          {responseAction}
                        </span>
                      </div>

                      {responseAction === "PARTIAL_ACCEPT" && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-2xs font-medium text-slate-600 dark:text-slate-400">
                              Offered Firetrucks (Max {observerPendingRequest.requestedFiretrucks})
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={observerPendingRequest.requestedFiretrucks}
                              value={offeredFiretrucks}
                              onChange={(e) => setOfferedFiretrucks(parseInt(e.target.value, 10) || 0)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-2xs font-medium text-slate-600 dark:text-slate-400">
                              Offered Personnel (Max {observerPendingRequest.requestedPersonnel})
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={observerPendingRequest.requestedPersonnel}
                              value={offeredPersonnel}
                              onChange={(e) => setOfferedPersonnel(parseInt(e.target.value, 10) || 0)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="block text-2xs font-medium text-slate-600 dark:text-slate-400">
                          Response Note (Optional)
                        </label>
                        <input
                          type="text"
                          maxLength={500}
                          placeholder="e.g., En route with 1 pumper engine"
                          value={responseNote}
                          onChange={(e) => setResponseNote(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 shadow-sm disabled:opacity-50"
                        >
                          Submit Response
                        </button>
                        <button
                          type="button"
                          onClick={() => setRespondingToRequestId(null)}
                          disabled={submitting}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-850/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitoring only—no assistance requested.
              </p>
            </div>
          )}

          {/* Past/Accepted Requests for Observer */}
          {assistanceRequests.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800">
              <h4 className="text-2xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Assistance History
              </h4>
              <div className="space-y-2">
                {assistanceRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>
                      Status: <strong className="font-semibold">{req.status}</strong>
                    </span>
                    <span>
                      {req.offeredFiretrucks ?? req.requestedFiretrucks} FT / {req.offeredPersonnel ?? req.requestedPersonnel} Pers
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request Backup Modal (ORIGIN) */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Request Inter-Municipality Backup
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateBackupRequest} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                  Select Observer Municipalities
                </label>
                <div className="space-y-2">
                  {observers.map((obs) => (
                    <label
                      key={obs.municipalityId}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs text-slate-800 dark:border-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
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
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <span className="font-semibold">{obs.municipalityName}</span>
                        <span className="ml-1 text-slate-500 dark:text-slate-400">
                          ({(obs.distanceMeters / 1000).toFixed(1)} km)
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="req-firetrucks" className="block text-xs font-semibold text-slate-900 dark:text-white">
                    Firetrucks Needed
                  </label>
                  <input
                    id="req-firetrucks"
                    type="number"
                    min={0}
                    max={20}
                    value={requestedFiretrucks}
                    onChange={(e) => setRequestedFiretrucks(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="req-personnel" className="block text-xs font-semibold text-slate-900 dark:text-white">
                    Personnel Needed
                  </label>
                  <input
                    id="req-personnel"
                    type="number"
                    min={0}
                    max={100}
                    value={requestedPersonnel}
                    onChange={(e) => setRequestedPersonnel(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="req-note" className="block text-xs font-semibold text-slate-900 dark:text-white">
                  Operational Note (Optional)
                </label>
                <textarea
                  id="req-note"
                  rows={2}
                  maxLength={500}
                  placeholder="e.g., Structure fire near commercial district, high wind velocity, additional tankers needed."
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
