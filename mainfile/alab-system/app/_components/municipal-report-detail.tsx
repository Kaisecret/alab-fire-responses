"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import type {
  MunicipalReportDetail as MunicipalReportDetailType,
  MunicipalDispatchRecord,
  MunicipalDispatchRecipient,
  MunicipalTimelineEvent,
} from "../../lib/municipal-bfp/reports/types";
import {
  formatPhilippineDateTime,
  formatMinutes,
  getFireTypeLabel,
  getStatusLabel,
  getSeverityLabel,
} from "../../lib/municipal-bfp/reports/formatters";

interface MunicipalReportDetailProps {
  reportId: string;
  onClose: () => void;
}

export function MunicipalReportDetail({ reportId, onClose }: MunicipalReportDetailProps) {
  const [report, setReport] = useState<MunicipalReportDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/municipal-bfp/reports/${encodeURIComponent(reportId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load report details.");
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setReport(data.report);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load report details.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reportId, retryCount]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryCount((c) => c + 1);
  }, []);

  // Keyboard navigation: Escape key closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activePhoto) {
          setActivePhoto(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, activePhoto]);

  const getStatusBadge = (status: string) => {
    let bg = "#F1F5F9";
    let color = "#475569";

    switch (status) {
      case "CONFIRMED":
      case "VERIFIED":
        bg = "#DC2626";
        color = "#FFFFFF";
        break;
      case "RESPONDING":
      case "FIRETRUCK_DISPATCHED":
        bg = "#EA580C";
        color = "#FFFFFF";
        break;
      case "RESPONDER_ARRIVED":
      case "UNDER_CONTROL":
        bg = "#2563EB";
        color = "#FFFFFF";
        break;
      case "RESOLVED":
      case "CLOSED":
        bg = "#059669";
        color = "#FFFFFF";
        break;
      case "SUBMITTED":
      case "PENDING_VERIFICATION":
      case "UNDER_VERIFICATION":
        bg = "#FEF3C7";
        color = "#92400E";
        break;
      case "FALSE_REPORT":
      case "DUPLICATE":
      case "REJECTED":
        bg = "#F3F4F6";
        color = "#6B7280";
        break;
    }

    return (
      <span
        style={{
          background: bg,
          color,
          padding: "3px 9px",
          borderRadius: 6,
          fontSize: "0.75rem",
          fontWeight: 700,
          display: "inline-block",
          letterSpacing: "0.02em",
        }}
      >
        {getStatusLabel(status)}
      </span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    let bg = "#F1F5F9";
    let color = "#475569";
    let border = "1px solid #E2E8F0";

    switch (severity) {
      case "CRITICAL":
        bg = "#FEF2F2";
        color = "#991B1B";
        border = "1px solid #F87171";
        break;
      case "HIGH":
        bg = "#FFF7ED";
        color = "#C2410C";
        border = "1px solid #FB923C";
        break;
      case "MODERATE":
        bg = "#FFFBEB";
        color = "#B45309";
        border = "1px solid #FCD34D";
        break;
      case "LOW":
        bg = "#F0FDF4";
        color = "#15803D";
        border = "1px solid #86EFAC";
        break;
    }

    return (
      <span
        style={{
          background: bg,
          color,
          border,
          padding: "3px 8px",
          borderRadius: 6,
          fontSize: "0.75rem",
          fontWeight: 700,
        }}
      >
        {getSeverityLabel(severity)} Severity
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-detail-title"
      ref={dialogRef}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          width: "100%",
          maxWidth: 780,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            background: "#FAFAFA",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <h2
                id="report-detail-title"
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "#0F172A",
                  fontFamily: "monospace",
                }}
              >
                {report ? report.referenceNumber : "Loading..."}
              </h2>
              {report && (
                <>
                  {getStatusBadge(report.status)}
                  {getSeverityBadge(report.severity)}
                  <span
                    style={{
                      background: "#F1F5F9",
                      color: "#334155",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {getFireTypeLabel(report.fireType)}
                  </span>
                  <span
                    style={{
                      background: "#EFF6FF",
                      color: "#1D4ED8",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {report.reportSource === "ALAB_APP" ? "Resident App" : "Phone Call"}
                  </span>
                </>
              )}
            </div>
            {report && (
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748B" }}>
                {report.barangay}, {report.municipalityName} &bull; Reported {formatPhilippineDateTime(report.submittedAt)}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0.4rem",
              borderRadius: "50%",
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            &times;
          </button>
        </div>

        {/* Body content */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {loading && (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: "3px solid #E2E8F0",
                  borderTopColor: "#D00F09",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 0.75rem",
                }}
              />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>Loading incident details...</p>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "1rem",
                borderRadius: 8,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                fontSize: "0.875rem",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
              <button
                onClick={handleRetry}
                style={{
                  marginTop: "0.5rem",
                  background: "#DC2626",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {report && !loading && (
            <>
              {/* Response Timing Benchmarks Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "0.75rem 1rem" }}>
                  <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700, color: "#64748B" }}>
                    Response Started
                  </span>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                    {formatMinutes(report.timeToResponseMinutes)}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 2 }}>
                    {report.responseStartedAt ? formatPhilippineDateTime(report.responseStartedAt) : "Not recorded"}
                  </div>
                </div>

                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "0.75rem 1rem" }}>
                  <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700, color: "#64748B" }}>
                    Recorded Arrival
                  </span>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                    {formatMinutes(report.timeToArrivalMinutes)}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 2 }}>
                    {report.recordedArrivalAt ? formatPhilippineDateTime(report.recordedArrivalAt) : "Not recorded"}
                  </div>
                </div>

                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "0.75rem 1rem" }}>
                  <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700, color: "#64748B" }}>
                    Resolution Time
                  </span>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                    {formatMinutes(report.timeToResolutionMinutes)}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 2 }}>
                    {report.resolvedAt ? formatPhilippineDateTime(report.resolvedAt) : "In progress"}
                  </div>
                </div>
              </div>

              {/* Location & Details Card */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "1rem" }}>
                <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.85rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Incident Location & Overview
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", fontSize: "0.85rem" }}>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "0.75rem" }}>Barangay & Address:</span>
                    <div style={{ fontWeight: 600, color: "#0F172A" }}>
                      {report.barangay}
                      {report.addressLabel && report.addressLabel !== report.barangay ? ` (${report.addressLabel})` : ""}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "#64748B", fontSize: "0.75rem" }}>Coordinates:</span>
                    <div style={{ fontWeight: 600, color: "#0F172A", fontFamily: "monospace" }}>
                      {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "#64748B", fontSize: "0.75rem" }}>Dispatch Summary:</span>
                    <div style={{ fontWeight: 600, color: "#0F172A" }}>
                      {report.latestDispatchSummary || "No active dispatch record"}
                    </div>
                  </div>
                </div>

                {report.description && (
                  <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #F1F5F9" }}>
                    <span style={{ color: "#64748B", fontSize: "0.75rem" }}>Description / Notes:</span>
                    <p style={{ margin: "4px 0 0", color: "#334155", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                      {report.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Dispatches & Responders */}
              {report.dispatches && report.dispatches.length > 0 && (
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "1rem" }}>
                  <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.85rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Assigned Fire Stations & Responders
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {report.dispatches.map((d: MunicipalDispatchRecord) => (
                      <div key={d.id} style={{ background: "#F8FAFC", borderRadius: 6, padding: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0F172A" }}>
                            {d.stationName}
                          </span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>
                            Dispatched: {formatPhilippineDateTime(d.dispatchedAt)}
                          </span>
                        </div>

                        {d.recipients && d.recipients.length > 0 && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <div style={{ fontSize: "0.75rem", color: "#64748B", marginBottom: 4 }}>
                              Assigned Responders ({d.recipients.length}):
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                              {d.recipients.map((r: MunicipalDispatchRecipient) => (
                                <span
                                  key={r.userId}
                                  style={{
                                    background: "#FFFFFF",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: 4,
                                    padding: "2px 6px",
                                    fontSize: "0.72rem",
                                    color: "#334155",
                                    fontWeight: 500,
                                  }}
                                >
                                  {r.name} &bull; <span style={{ color: r.onSceneAt ? "#059669" : "#D97706" }}>{r.onSceneAt ? "On Scene" : r.status}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Operational Timeline */}
              {report.timeline && report.timeline.length > 0 && (
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "1rem" }}>
                  <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Operational Timeline
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {report.timeline.map((event: MunicipalTimelineEvent, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.75rem",
                          fontSize: "0.82rem",
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: idx === report.timeline.length - 1 ? "#DC2626" : "#94A3B8",
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700, color: "#0F172A" }}>
                              {getStatusLabel(event.stage)}
                            </span>
                            <span style={{ color: "#64748B", fontSize: "0.75rem" }}>
                              {formatPhilippineDateTime(event.timestamp)}
                            </span>
                          </div>
                          {event.notes && (
                            <p style={{ margin: "2px 0 0", color: "#475569", fontSize: "0.78rem" }}>
                              {event.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos Gallery */}
              {report.photos && report.photos.length > 0 && (
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "1rem" }}>
                  <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.85rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Incident Verification Photos ({report.photos.length})
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "0.5rem" }}>
                    {report.photos.map((url: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActivePhoto(url)}
                        style={{
                          background: "none",
                          border: "1px solid #E2E8F0",
                          borderRadius: 6,
                          padding: 0,
                          cursor: "pointer",
                          overflow: "hidden",
                          aspectRatio: "1/1",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Incident Photo ${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #E2E8F0",
            background: "#FAFAFA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {report ? (
            <a
              href={`/municipal-bfp/incident-reports/print?mode=incident&id=${encodeURIComponent(report.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1rem",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#334155",
                fontSize: "0.82rem",
                fontWeight: 600,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <i className="fa-solid fa-print" /> Print Incident Report
            </a>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 6,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Full Photo Lightbox Modal */}
      {activePhoto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "1.5rem",
          }}
          onClick={() => setActivePhoto(null)}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhoto}
              alt="Full size incident photo"
              style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 8, objectFit: "contain" }}
            />
            <button
              onClick={() => setActivePhoto(null)}
              style={{
                position: "absolute",
                top: -12,
                right: -12,
                background: "#DC2626",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                cursor: "pointer",
                fontSize: "1.2rem",
                fontWeight: 800,
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
