"use client";

import { municipalTabFetch } from "../../../../lib/auth/municipal-tab-fetch";

import React, { useEffect, useState } from "react";
import type {
  MunicipalBarangaySummary,
  MunicipalDispatchRecipient,
  MunicipalDispatchRecord,
  MunicipalReportDetail,
  MunicipalReportRow,
  MunicipalReportSummary,
  MunicipalTimelineEvent,
} from "../../../../lib/municipal-bfp/reports/types";
import {
  formatMinutes,
  formatPhilippineDateTime,
  getFireTypeLabel,
  getSeverityLabel,
  getStatusLabel,
} from "../../../../lib/municipal-bfp/reports/formatters";

export default function IncidentReportsPrintPage() {
  const [mode, setMode] = useState<"summary" | "incident" | "register">("summary");
  const [report, setReport] = useState<MunicipalReportDetail | null>(null);
  const [registerItems, setRegisterItems] = useState<MunicipalReportRow[]>([]);
  const [summary, setSummary] = useState<MunicipalReportSummary | null>(null);
  const [municipalityName, setMunicipalityName] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [generatedBy, setGeneratedBy] = useState("");
  const [filterLabel, setFilterLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  /**
   * Downloads the generated PDF for whichever view is on screen. The browser
   * print dialog is never opened; the file comes from the export API.
   */
  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const dataset =
        mode === "incident" ? "INCIDENT_DOSSIER" : mode === "register" ? "INCIDENT_REGISTER" : "MUNICIPAL_SUMMARY";

      const filters: Record<string, string | number> = { page: 1, pageSize: 100 };
      for (const key of ["period", "from", "to", "barangayId", "status", "fireType", "severity", "reportSource", "search"]) {
        const value = params.get(key);
        if (value) filters[key] = value;
      }
      if (!filters.period) filters.period = "ALL";

      const selectedIdsParam = params.get("selectedIds");
      const selectedIds = selectedIdsParam ? selectedIdsParam.split(",").filter(Boolean) : [];

      const res = await municipalTabFetch("/api/municipal-bfp/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          format: "PDF",
          scope: selectedIds.length > 0 ? "SELECTED" : "ALL_MATCHING",
          selectedIds: selectedIds.length > 0 ? selectedIds : undefined,
          reportId: mode === "incident" ? params.get("id") || undefined : undefined,
          filters,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to generate this document.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] || "alab-incident-report.pdf";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      document.body.removeChild(link);
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : "Download failed. Please retry.");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(window.location.search);

    const load = async () => {
      try {
        const identityResponse = await municipalTabFetch("/api/municipal-bfp/me", { signal: controller.signal });
        const identity = (await identityResponse.json()).user;
        if (!identityResponse.ok || !identity?.displayName || !identity.municipalityName ||
            identity.mustChangePassword || identity.email === "preview@municipal-bfp.local") {
          throw new Error("Sign in with an assigned account and update your temporary password before printing.");
        }

        const rawMode = params.get("mode");
        const selectedMode = rawMode === "incident" ? "incident" : (rawMode === "register" ? "register" : "summary");
        const id = params.get("id");
        if (selectedMode === "incident" && !id) throw new Error("Report ID is required for individual incident printout.");

        const query = new URLSearchParams();
        for (const key of ["period", "from", "to", "barangayId", "status", "fireType", "severity", "reportSource", "search"]) {
          if (params.get(key)) query.set(key, params.get(key)!);
        }
        query.set("summary", "true");
        if (selectedMode === "register") {
          query.set("pageSize", "100");
        }

        const response = await municipalTabFetch(
          selectedMode === "incident"
            ? `/api/municipal-bfp/reports/${encodeURIComponent(id!)}`
            : `/api/municipal-bfp/reports?${query}`,
          { signal: controller.signal }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load report.");
        if (controller.signal.aborted) return;

        setMode(selectedMode);
        setMunicipalityName(identity.municipalityName);
        setGeneratedBy(`${identity.displayName}${identity.rankOrPosition ? ` (${identity.rankOrPosition})` : ""}`);
        setReport(data.report ?? null);
        setSummary(data.summary ?? null);

        if (selectedMode === "register") {
          let items: MunicipalReportRow[] = data.items || [];
          const selectedIdsParam = params.get("selectedIds");
          if (selectedIdsParam) {
            const selectedSet = new Set(selectedIdsParam.split(",").filter(Boolean));
            if (selectedSet.size > 0) {
              items = items.filter((it: MunicipalReportRow) => selectedSet.has(it.id));
            }
          }
          setRegisterItems(items);
        }

        const dates = data.summary?.dateBoundaries;
        setPeriodLabel(dates ? `${dates.from ?? "Beginning of records"} to ${dates.to ?? "Latest recorded"}` : (selectedMode === "incident" ? "Individual Incident Record" : "All Available Records"));
        setFilterLabel(
          ["barangayId", "status", "fireType", "severity", "reportSource", "search"]
            .filter((key) => params.get(key))
            .map((key) => `${key}: ${params.get(key)}`)
            .join("; ") || "All records within the reporting period"
        );
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load report.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, []);


  const renderStatusBadge = (statusValue: string) => {
    let bg = "#F1F5F9";
    let color = "#475569";
    let border = "#CBD5E1";

    switch (statusValue) {
      case "CONFIRMED":
      case "VERIFIED":
        bg = "#DC2626";
        color = "#FFFFFF";
        border = "#B91C1C";
        break;
      case "RESPONDING":
      case "FIRETRUCK_DISPATCHED":
        bg = "#EA580C";
        color = "#FFFFFF";
        border = "#C2410C";
        break;
      case "RESPONDER_ARRIVED":
      case "UNDER_CONTROL":
        bg = "#2563EB";
        color = "#FFFFFF";
        border = "#1D4ED8";
        break;
      case "RESOLVED":
      case "CLOSED":
        bg = "#059669";
        color = "#FFFFFF";
        border = "#047857";
        break;
      case "SUBMITTED":
      case "PENDING_VERIFICATION":
      case "UNDER_VERIFICATION":
        bg = "#FEF3C7";
        color = "#92400E";
        border = "#FDE68A";
        break;
      case "FALSE_REPORT":
      case "DUPLICATE":
      case "REJECTED":
        bg = "#F3F4F6";
        color = "#6B7280";
        border = "#E5E7EB";
        break;
    }

    return (
      <span
        style={{
          display: "inline-block",
          background: bg,
          color,
          border: `1px solid ${border}`,
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: "0.72rem",
          fontWeight: 700,
          whiteSpace: "nowrap",
          letterSpacing: "0.02em",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {getStatusLabel(statusValue)}
      </span>
    );
  };

  const renderSeverityBadge = (severityValue: string) => {
    let bg = "#F1F5F9";
    let color = "#475569";
    let border = "#CBD5E1";

    switch (severityValue) {
      case "CRITICAL":
        bg = "#FEE2E2";
        color = "#991B1B";
        border = "#FECACA";
        break;
      case "HIGH":
        bg = "#FFEDD5";
        color = "#C2410C";
        border = "#FED7AA";
        break;
      case "MODERATE":
        bg = "#FEF3C7";
        color = "#B45309";
        border = "#FDE68A";
        break;
      case "LOW":
        bg = "#DCFCE7";
        color = "#15803D";
        border = "#BBF7D0";
        break;
    }

    return (
      <span
        style={{
          display: "inline-block",
          background: bg,
          color,
          border: `1px solid ${border}`,
          padding: "2px 7px",
          borderRadius: 4,
          fontSize: "0.72rem",
          fontWeight: 700,
          whiteSpace: "nowrap",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {getSeverityLabel(severityValue)}
      </span>
    );
  };

  return (
    <>
      <style>{`
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @media screen {
          body {
            background-color: #F1F5F9;
          }
          .print-container {
            max-width: 960px;
            margin: 2rem auto;
            background: #FFFFFF;
            padding: 2.5rem 3rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0F172A;
          }
          .print-toolbar {
            max-width: 960px;
            margin: 1.25rem auto 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        }

        @page {
          size: A4 portrait;
          margin: 12mm 14mm;
        }

        @media print {
          .mbfp-sidebar, .mbfp-header, .mbfp-topbar, .mbfp-sidebar-backdrop, .print-toolbar {
            display: none !important;
          }
          .mbfp-main-area, .mbfp-main-area.collapsed {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .mbfp-content {
            animation: none !important;
            transform: none !important;
          }
          thead {
            display: table-header-group;
          }
          body {
            background: #FFFFFF !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 9.5pt;
            color: #0F172A !important;
          }
          .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .page-break {
            page-break-after: always;
          }
          tr {
            page-break-inside: avoid;
          }
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.6rem;
          font-size: 0.82rem;
        }
        .print-table th {
          background-color: #F8FAFC !important;
          color: #334155;
          font-weight: 700;
          text-align: left;
          padding: 7px 10px;
          border: 1px solid #CBD5E1;
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-table td {
          padding: 6px 10px;
          border: 1px solid #CBD5E1;
          color: #1E293B;
          font-size: 0.8rem;
        }
      `}</style>

      {/* Screen Action Toolbar */}
      <div className="print-toolbar">
        <a
          href="/municipal-bfp/incident-reports"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#475569",
            textDecoration: "none",
            fontSize: "0.85rem",
            fontWeight: 600,
            padding: "0.45rem 0.85rem",
            background: "#FFFFFF",
            borderRadius: 6,
            border: "1px solid #CBD5E1",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <i className="fa-solid fa-arrow-left" /> Back to Incident Reports
        </a>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {downloadError && (
            <span style={{ fontSize: "0.78rem", color: "#B91C1C", fontWeight: 600 }}>{downloadError}</span>
          )}
          <button
            type="button"
            disabled={loading || !!error || downloading}
            onClick={handleDownloadPdf}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 1.4rem",
              borderRadius: 6,
              border: "none",
              background: "linear-gradient(135deg, #D00F09, #DC2626)",
              color: "#FFFFFF",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: downloading ? "progress" : "pointer",
              boxShadow: "0 2px 8px rgba(208, 15, 9, 0.35)",
            }}
          >
            <i className={`fa-solid ${downloading ? "fa-circle-notch fa-spin" : "fa-download"}`} />
            {downloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      <div className="print-container">
        {/* Official BFP Document Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "3px solid #D00F09",
            paddingBottom: "1.1rem",
            marginBottom: "1.25rem",
            gap: "1.5rem",
          }}
        >
          {/* Official ALAB Emblem */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo alab.png"
            alt="ALAB"
            style={{
              width: 54,
              height: 54,
              objectFit: "contain",
              flexShrink: 0,
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
          />

          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", fontWeight: 600 }}>
              Republic of the Philippines &bull; Department of the Interior and Local Government
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#991B1B", margin: "2px 0", letterSpacing: "0.03em" }}>
              BUREAU OF FIRE PROTECTION
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0F172A", letterSpacing: "0.01em" }}>
              MUNICIPAL FIRE STATION &bull; {municipalityName ? municipalityName.toUpperCase() : "MUNICIPAL"}, ANTIQUE
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748B", marginTop: 2, fontWeight: 500 }}>
              ALAB Emergency Dispatch, Telemetry & Citizen Intake System
            </div>
          </div>

          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "#F1F5F9",
              border: "2px solid #CBD5E1",
              color: "#0F172A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-shield-halved" style={{ color: "#D00F09" }} />
          </div>
        </div>

        {loading && (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "1.8rem", color: "#D00F09", marginBottom: "0.5rem" }} />
            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>Loading official print layout...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: "1.5rem", background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: 8 }}>
            <strong>Print Error:</strong> {error}
          </div>
        )}

        {/* 1. INDIVIDUAL INCIDENT PRINT VIEW */}
        {!loading && mode === "incident" && report && (
          <div>
            {/* Title & Reference Banner */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.2rem",
                padding: "0.85rem 1rem",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderLeft: "5px solid #D00F09",
                borderRadius: 6,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <div>
                <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.01em" }}>
                  INCIDENT REPORT & CITIZEN INTAKE DOSSIER
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: 4 }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, fontFamily: "monospace", color: "#D00F09" }}>
                    REFERENCE #{report.referenceNumber}
                  </span>
                  {renderStatusBadge(report.status)}
                  {renderSeverityBadge(report.severity)}
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: "0.76rem", color: "#475569" }}>
                <div>Reported: <strong>{formatPhilippineDateTime(report.submittedAt)}</strong></div>
                <div>Station Jurisdiction: <strong>{municipalityName} Fire Station</strong></div>
              </div>
            </div>

            {/* HIGHLIGHT: WHO REPORTED & INTAKE INFORMATION (User core focus) */}
            <div
              style={{
                marginBottom: "1.25rem",
                border: "1px solid #FECACA",
                borderRadius: 8,
                background: "#FFF8F8",
                padding: "0.9rem 1.1rem",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#991B1B",
                  letterSpacing: "0.04em",
                  marginBottom: "0.6rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <i className="fa-solid fa-user-shield" /> 1. Reporting Citizen & Intake Telemetry
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.65rem 1.5rem", fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "#64748B", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Reporter Full Name
                  </span>
                  <span style={{ fontWeight: 800, color: "#0F172A", fontSize: "0.92rem" }}>
                    {report.reporterName || "Anonymous Resident / App Intake"}
                  </span>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Contact Phone Number
                  </span>
                  <span style={{ fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>
                    {report.reporterPhone || "Direct Mobile App Auth (Protected/On File)"}
                  </span>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Intake Channel & Transmission
                  </span>
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>
                    {report.reportSource === "ALAB_APP"
                      ? "ALAB Resident Emergency Mobile App (Encrypted GPS Stream)"
                      : "Direct Emergency Phone Dispatch Call"}
                  </span>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Barangay & Recorded Jurisdiction
                  </span>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>
                    Brgy. {report.barangay}, {municipalityName}
                  </span>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#64748B", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Nearest Landmark / Fire Access Route
                  </span>
                  <span style={{ fontWeight: 700, color: "#991B1B" }}>
                    {report.nearestLandmark || report.addressLabel || "No specific landmark tag provided during emergency intake"}
                  </span>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#64748B", fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Geolocation Coordinates & Verification Accuracy
                  </span>
                  <span style={{ fontWeight: 600, color: "#334155", fontFamily: "monospace" }}>
                    {report.latitude && report.longitude
                      ? `Latitude: ${Number(report.latitude).toFixed(6)}°, Longitude: ${Number(report.longitude).toFixed(6)}°`
                      : "Coordinates: Recorded via Barangay Geocode Boundary"}
                    {report.locationAccuracyMeters
                      ? ` • GPS Accuracy Radius: ±${report.locationAccuracyMeters} meters`
                      : ""}
                    {report.locationMethod ? ` • Geolocation Method: ${report.locationMethod}` : ""}
                  </span>
                </div>

                {report.description && (
                  <div style={{ gridColumn: "span 2", background: "#FFFFFF", padding: "0.6rem 0.8rem", borderRadius: 4, border: "1px solid #FECACA", marginTop: 2 }}>
                    <span style={{ color: "#991B1B", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, display: "block", marginBottom: 2 }}>
                      Citizen Eyewitness Narrative & Intake Remarks
                    </span>
                    <p style={{ margin: 0, color: "#1E293B", fontSize: "0.83rem", lineHeight: 1.45, fontStyle: "italic" }}>
                      &ldquo;{report.description}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. OPERATIONAL TIMINGS & RESPONSE BENCHMARKS */}
            <h3 style={{ fontSize: "0.82rem", fontWeight: 800, textTransform: "uppercase", margin: "1rem 0 0.4rem", color: "#1E293B" }}>
              2. Operational Response Benchmarks & Incident Milestones
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <div style={{ border: "1px solid #CBD5E1", padding: "0.6rem 0.8rem", borderRadius: 6, background: "#F8FAFC" }}>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#64748B", fontWeight: 700 }}>Alert Received</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                  {report.submittedAt ? formatPhilippineDateTime(report.submittedAt) : "Not recorded"}
                </div>
              </div>
              <div style={{ border: "1px solid #FED7AA", padding: "0.6rem 0.8rem", borderRadius: 6, background: "#FFF7ED" }}>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#C2410C", fontWeight: 700 }}>Response Started</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#C2410C", marginTop: 2 }}>
                  {report.responseStartedAt ? formatPhilippineDateTime(report.responseStartedAt) : "Not recorded"}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#9A3412", marginTop: 2 }}>
                  Elapsed: {formatMinutes(report.timeToResponseMinutes)}
                </div>
              </div>
              <div style={{ border: "1px solid #BFDBFE", padding: "0.6rem 0.8rem", borderRadius: 6, background: "#EFF6FF" }}>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#1D4ED8", fontWeight: 700 }}>Recorded Arrival</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1D4ED8", marginTop: 2 }}>
                  {report.recordedArrivalAt ? formatPhilippineDateTime(report.recordedArrivalAt) : "Not recorded"}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#1E40AF", marginTop: 2 }}>
                  Elapsed: {formatMinutes(report.timeToArrivalMinutes)}
                </div>
              </div>
              <div style={{ border: "1px solid #BBF7D0", padding: "0.6rem 0.8rem", borderRadius: 6, background: "#F0FDF4" }}>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#15803D", fontWeight: 700 }}>Incident Resolved</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#15803D", marginTop: 2 }}>
                  {report.resolvedAt ? formatPhilippineDateTime(report.resolvedAt) : "In Progress"}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#166534", marginTop: 2 }}>
                  Duration: {formatMinutes(report.timeToResolutionMinutes)}
                </div>
              </div>
            </div>

            {/* Dispatched units. Numbered at render time so a hidden block leaves no gap. */}
            {report.dispatches && report.dispatches.length > 0 && (
              <>
                <h3 style={{ fontSize: "0.82rem", fontWeight: 800, textTransform: "uppercase", margin: "1rem 0 0.3rem", color: "#1E293B" }}>
                  3. Dispatched Fire Stations &amp; Personnel
                </h3>
                <table className="print-table" style={{ marginBottom: "1.25rem" }}>
                  <thead>
                    <tr>
                      <th>Station</th>
                      <th>Dispatch Status</th>
                      <th>Dispatched At (PHT)</th>
                      <th>Responding Firefighters / Crew</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.dispatches.map((d: MunicipalDispatchRecord) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 700, color: "#0F172A" }}>{d.stationName}</td>
                        <td>{renderStatusBadge(d.status)}</td>
                        <td style={{ fontFamily: "monospace" }}>{formatPhilippineDateTime(d.dispatchedAt)}</td>
                        <td>
                          {d.recipients && d.recipients.length > 0
                            ? d.recipients.map((r: MunicipalDispatchRecipient) => `${r.name} (${r.onSceneAt ? "On Scene" : r.status})`).join(", ")
                            : "Station Unit Team"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* 4. CHRONOLOGICAL TIMELINE */}
            {report.timeline && report.timeline.length > 0 && (
              <>
                <h3 style={{ fontSize: "0.82rem", fontWeight: 800, textTransform: "uppercase", margin: "1rem 0 0.3rem", color: "#1E293B" }}>
                  {report.dispatches && report.dispatches.length > 0 ? "4" : "3"}. Chronological Operational Timeline
                </h3>
                <table className="print-table" style={{ marginBottom: "1.5rem" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>Timestamp (PHT)</th>
                      <th style={{ width: "30%" }}>Operational Stage</th>
                      <th style={{ width: "40%" }}>Event Notes & Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.timeline.map((event: MunicipalTimelineEvent, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: "monospace" }}>{formatPhilippineDateTime(event.timestamp)}</td>
                        <td>{renderStatusBadge(event.stage)}</td>
                        <td style={{ color: "#334155" }}>
                          Operational transition to {getStatusLabel(event.stage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Signatures & Certification */}
            <div style={{ marginTop: "2.5rem", paddingTop: "1rem", borderTop: "1px solid #CBD5E1", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "0.74rem", color: "#64748B", maxWidth: 420 }}>
                <strong>Certification:</strong> This official report document is generated from cryptographically audited intake records and operational milestones captured by the ALAB Emergency System.
              </div>

              <div style={{ textAlign: "center", minWidth: 230 }}>
                <div style={{ borderBottom: "1.5px solid #000000", paddingBottom: "2.2rem", marginBottom: "0.4rem" }} />
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A" }}>{generatedBy}</div>
                <div style={{ fontSize: "0.72rem", color: "#64748B", textTransform: "uppercase", fontWeight: 600 }}>
                  Duty Officer / Municipal Fire Marshal
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MULTI-INCIDENT REGISTER PRINT VIEW (When exporting multiple / selected records) */}
        {!loading && mode === "register" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "#0F172A" }}>
                  MUNICIPAL INCIDENT REGISTER & DISPATCH AUDIT LOG
                </h1>
                <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: 3 }}>
                  Municipality: <strong>{municipalityName}</strong> &bull; Period: <strong>{periodLabel}</strong>
                  <div>Records Printed: <strong>{registerItems.length} incidents</strong> &bull; Filters: {filterLabel}</div>
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: "0.74rem", color: "#64748B" }}>
                <div>Generated: <strong>{formatPhilippineDateTime(new Date().toISOString())}</strong></div>
                <div>Prepared by: <strong>{generatedBy}</strong></div>
              </div>
            </div>

            {/* Counter Summary Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1.2rem" }}>
              <div style={{ border: "1px solid #CBD5E1", padding: "0.5rem 0.75rem", borderRadius: 4, background: "#F8FAFC" }}>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#64748B", fontWeight: 700 }}>Total Records</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0F172A" }}>{registerItems.length}</div>
              </div>
              <div style={{ border: "1px solid #FECACA", padding: "0.5rem 0.75rem", borderRadius: 4, background: "#FEF2F2" }}>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#991B1B", fontWeight: 700 }}>Confirmed</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#991B1B" }}>
                  {summary ? summary.confirmedIncidents : registerItems.filter(r => ["CONFIRMED", "RESPONDING", "FIRETRUCK_DISPATCHED", "RESOLVED"].includes(r.status)).length}
                </div>
              </div>
              <div style={{ border: "1px solid #BBF7D0", padding: "0.5rem 0.75rem", borderRadius: 4, background: "#F0FDF4" }}>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#15803D", fontWeight: 700 }}>Resolved</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#15803D" }}>
                  {summary ? summary.resolvedIncidents : registerItems.filter(r => ["RESOLVED", "CLOSED"].includes(r.status)).length}
                </div>
              </div>
              <div style={{ border: "1px solid #BFDBFE", padding: "0.5rem 0.75rem", borderRadius: 4, background: "#EFF6FF" }}>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#1D4ED8", fontWeight: 700 }}>Avg Arrival</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1D4ED8" }}>
                  {summary ? formatMinutes(summary.timingMetrics.avgArrivalMinutes) : "Recorded"}
                </div>
              </div>
            </div>

            {/* Comprehensive Incidents Table */}
            <table className="print-table" style={{ marginBottom: "1.5rem" }}>
              <thead>
                <tr>
                  <th style={{ width: "16%" }}>Reference</th>
                  <th style={{ width: "15%" }}>Reported At (PHT)</th>
                  <th style={{ width: "20%" }}>Reporter & Channel</th>
                  <th style={{ width: "18%" }}>Barangay / Landmark</th>
                  <th style={{ width: "13%" }}>Type & Severity</th>
                  <th style={{ width: "18%" }}>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {registerItems.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 800, color: "#0F172A", fontSize: "0.78rem" }}>
                      {r.referenceNumber}
                    </td>
                    <td style={{ fontSize: "0.76rem", whiteSpace: "nowrap" }}>
                      {formatPhilippineDateTime(r.submittedAt)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "0.78rem" }}>
                        {r.reporterName || "Anonymous Resident"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#64748B" }}>
                        {r.reportSource === "ALAB_APP" ? "ALAB Mobile App" : "Emergency Call"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0F172A" }}>{r.barangay}</div>
                      {r.nearestLandmark && (
                        <div style={{ fontSize: "0.68rem", color: "#991B1B", fontWeight: 500 }}>
                          Near {r.nearestLandmark}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{getFireTypeLabel(r.fireType)}</div>
                      <div style={{ marginTop: 2 }}>{renderSeverityBadge(r.severity)}</div>
                    </td>
                    <td>
                      {renderStatusBadge(r.status)}
                      {r.timeToArrivalMinutes !== null && (
                        <div style={{ fontSize: "0.68rem", color: "#64748B", marginTop: 2 }}>
                          Arrival: {formatMinutes(r.timeToArrivalMinutes)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Register Signatures */}
            <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #CBD5E1", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "0.74rem", color: "#64748B", maxWidth: 450 }}>
                <strong>Register Notice:</strong> This document contains authorized BFP incident register data extracted for municipal administrative and response benchmarking purposes.
              </div>

              <div style={{ textAlign: "center", minWidth: 220 }}>
                <div style={{ borderBottom: "1.5px solid #000000", paddingBottom: "2rem", marginBottom: "0.4rem" }} />
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A" }}>{generatedBy}</div>
                <div style={{ fontSize: "0.72rem", color: "#64748B" }}>Authorized Officer Signature</div>
              </div>
            </div>
          </div>
        )}

        {/* 3. SUMMARY REPORT PRINT VIEW */}
        {!loading && mode === "summary" && summary && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0F172A" }}>
                  MUNICIPAL INCIDENT SUMMARY & PERFORMANCE REPORT
                </h1>
                <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: 3 }}>
                  Reporting Basis: <strong>Reported during period (submitted_at)</strong> &bull; Period: <strong>{periodLabel}</strong>
                  <div>Filters: {filterLabel}</div>
                  <div>Current status of reports received during this period; resolved incidents are included in confirmed incidents.</div>
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#64748B" }}>
                <div>Generated: <strong>{formatPhilippineDateTime(summary.generatedAt)}</strong></div>
                <div>Prepared by: <strong>{generatedBy}</strong></div>
              </div>
            </div>

            {/* Executive Key Figures */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <div style={{ border: "1px solid #CBD5E1", padding: "0.6rem 0.8rem", borderRadius: 6, background: "#F8FAFC" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#64748B", fontWeight: 700 }}>Total Reports Intake</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0F172A" }}>{summary.totalReports}</div>
              </div>
              <div style={{ border: "1px solid #FECACA", padding: "0.6rem 0.8rem", borderRadius: 6, background: "#FEF2F2" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#991B1B", fontWeight: 700 }}>Confirmed Incidents</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#991B1B" }}>{summary.confirmedIncidents}</div>
              </div>
              <div style={{ border: "1px solid #BBF7D0", padding: "0.6rem 0.8rem", borderRadius: 6, background: "#F0FDF4" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#059669", fontWeight: 700 }}>Resolved Incidents</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669" }}>{summary.resolvedIncidents}</div>
              </div>
              <div style={{ border: "1px solid #BFDBFE", padding: "0.6rem 0.8rem", borderRadius: 6, background: "#EFF6FF" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#2563EB", fontWeight: 700 }}>Avg Time to Arrival</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0F172A" }}>{formatMinutes(summary.timingMetrics.avgArrivalMinutes)}</div>
              </div>
            </div>

            {/* Operational Timing Benchmarks */}
            <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", margin: "0 0 0.3rem", color: "#1E293B" }}>
              1. Operational Response Benchmarks
            </h3>
            <table className="print-table" style={{ marginBottom: "1.25rem" }}>
              <thead>
                <tr>
                  <th>Benchmark Metric</th>
                  <th>Observed Average</th>
                  <th>Sample Coverage</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700 }}>Time to Response Start</td>
                  <td>{formatMinutes(summary.timingMetrics.avgResponseMinutes)}</td>
                  <td>{summary.timingMetrics.responseRecordsCount} of {summary.totalReports} incidents</td>
                  <td style={{ fontSize: "0.78rem", color: "#64748B" }}>Time from intake alert to first unit dispatch acknowledgement or en route</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>Time to Recorded Arrival</td>
                  <td>{formatMinutes(summary.timingMetrics.avgArrivalMinutes)}</td>
                  <td>{summary.timingMetrics.arrivalRecordsCount} of {summary.totalReports} incidents</td>
                  <td style={{ fontSize: "0.78rem", color: "#64748B" }}>Time from intake alert to earliest verified on-scene timestamp</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>Time to Resolution</td>
                  <td>{formatMinutes(summary.timingMetrics.avgResolutionMinutes)}</td>
                  <td>{summary.timingMetrics.resolutionRecordsCount} of {summary.totalReports} incidents</td>
                  <td style={{ fontSize: "0.78rem", color: "#64748B" }}>Time from intake alert to incident marked resolved or closed</td>
                </tr>
              </tbody>
            </table>

            {/* Status Breakdown & Fire Type Distribution */}
            <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", margin: "0 0 0.3rem", color: "#1E293B" }}>
              2. Incident Classifications & Intake Outcomes
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Status Category</th>
                      <th style={{ textAlign: "right" }}>Count</th>
                      <th style={{ textAlign: "right" }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byStatus).map(([st, cnt]) => {
                      const countNum = Number(cnt);
                      return (
                        <tr key={st}>
                          <td>{renderStatusBadge(st)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{countNum}</td>
                          <td style={{ textAlign: "right", color: "#64748B" }}>
                            {summary.totalReports > 0 ? `${Math.round((countNum / summary.totalReports) * 100)}%` : "0%"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Fire Type</th>
                      <th style={{ textAlign: "right" }}>Count</th>
                      <th>Calculated Severity</th>
                      <th style={{ textAlign: "right" }}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["HOUSE_BUILDING", "GRASS", "FOREST", "VEHICLE", "OTHER"].map((ft, i) => {
                      const sevs = ["CRITICAL", "HIGH", "MODERATE", "LOW", "UNKNOWN"];
                      const sev = sevs[i];
                      return (
                        <tr key={ft}>
                          <td>{getFireTypeLabel(ft)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{summary.byFireType[ft] ?? 0}</td>
                          <td>{renderSeverityBadge(sev)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{summary.bySeverity[sev] ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Barangay Breakdown Table */}
            <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", margin: "0 0 0.3rem", color: "#1E293B" }}>
              3. Barangay Incident Distribution & Response Benchmarks
            </h3>
            <table className="print-table" style={{ marginBottom: "1.5rem" }}>
              <thead>
                <tr>
                  <th>Barangay Name</th>
                  <th style={{ textAlign: "right" }}>Total Intake</th>
                  <th style={{ textAlign: "right" }}>Confirmed</th>
                  <th style={{ textAlign: "right" }}>Resolved</th>
                  <th style={{ textAlign: "right" }}>Admin Outcomes</th>
                  <th style={{ textAlign: "right" }}>Avg Arrival</th>
                  <th style={{ textAlign: "right" }}>Arrival Samples</th>
                </tr>
              </thead>
              <tbody>
                {summary.byBarangay.map((b: MunicipalBarangaySummary) => (
                  <tr key={b.barangayId}>
                    <td style={{ fontWeight: 600 }}>{b.barangayName}</td>
                    <td style={{ textAlign: "right" }}>{b.total}</td>
                    <td style={{ textAlign: "right" }}>{b.confirmed}</td>
                    <td style={{ textAlign: "right" }}>{b.resolved}</td>
                    <td style={{ textAlign: "right" }}>{b.falseReport}</td>
                    <td style={{ textAlign: "right" }}>{formatMinutes(b.avgArrivalMinutes)}</td>
                    <td style={{ textAlign: "right", color: "#64748B" }}>{b.arrivalCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signatures & Verification */}
            <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #CBD5E1", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748B", maxWidth: 450 }}>
                <strong>Data Definitions:</strong> Total intake represents all incident alerts submitted within the designated period. Confirmed incidents include verified, responding, dispatched, on scene, under control, resolved, and closed. Missing durations remain unrecorded and are not substituted with zero.
              </div>

              <div style={{ textAlign: "center", minWidth: 220 }}>
                <div style={{ borderBottom: "1.5px solid #000000", paddingBottom: "2rem", marginBottom: "0.3rem" }} />
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A" }}>{generatedBy}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Authorized Officer Signature</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
