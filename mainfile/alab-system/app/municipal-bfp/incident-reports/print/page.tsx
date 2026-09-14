"use client";

import React, { useEffect, useState } from "react";
import type {
  MunicipalBarangaySummary,
  MunicipalDispatchRecipient,
  MunicipalDispatchRecord,
  MunicipalReportDetail,
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
  const [mode] = useState<"summary" | "incident">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("mode") === "incident" ? "incident" : "summary";
    }
    return "summary";
  });
  const [report, setReport] = useState<MunicipalReportDetail | null>(null);
  const [summary, setSummary] = useState<MunicipalReportSummary | null>(null);
  const [municipalityName, setMunicipalityName] = useState<string>("San Jose de Buenavista");
  const [periodLabel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      const to = params.get("to");
      if (from && to) return `${from} to ${to}`;
      const period = params.get("period") || "THIS_MONTH";
      return period.replace("_", " ");
    }
    return "This Month";
  });
  const [generatedBy, setGeneratedBy] = useState<string>("Municipal Fire Marshal");
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "incident" && !params.get("id")) {
        return false;
      }
    }
    return true;
  });
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "incident" && !params.get("id")) {
        return "Report ID is required for individual incident printout.";
      }
    }
    return null;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") === "incident" ? "incident" : "summary";

    // Fetch active identity for officer title
    fetch("/api/municipal-bfp/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.displayName) {
          setGeneratedBy(`${data.displayName}${data.rankOrPosition ? ` (${data.rankOrPosition})` : ""}`);
        }
        if (data.municipalityName) {
          setMunicipalityName(data.municipalityName);
        }
      })
      .catch(() => {});

    if (m === "incident") {
      const id = params.get("id");
      if (!id) {
        return;
      }

      fetch(`/api/municipal-bfp/reports/${encodeURIComponent(id)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Could not load incident report.");
          return res.json();
        })
        .then((data) => {
          setReport(data.report);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load incident.");
          setLoading(false);
        });
    } else {
      // Summary mode
      const queryParams = new URLSearchParams();
      if (params.get("period")) queryParams.set("period", params.get("period")!);
      if (params.get("from")) queryParams.set("from", params.get("from")!);
      if (params.get("to")) queryParams.set("to", params.get("to")!);
      if (params.get("barangayId")) queryParams.set("barangayId", params.get("barangayId")!);
      queryParams.set("summary", "true");

      fetch(`/api/municipal-bfp/reports?${queryParams}`)
        .then((res) => {
          if (!res.ok) throw new Error("Could not load municipal summary.");
          return res.json();
        })
        .then((data) => {
          setSummary(data.summary);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load summary.");
          setLoading(false);
        });
    }
  }, []);

  return (
    <>
      <style>{`
        @media screen {
          body {
            background-color: #F1F5F9;
          }
          .print-container {
            max-width: 900px;
            margin: 2rem auto;
            background: #FFFFFF;
            padding: 2.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0F172A;
          }
          .print-toolbar {
            max-width: 900px;
            margin: 1rem auto 0;
            display: flex;
            justifyContent: space-between;
            align-items: center;
          }
        }

        @media print {
          body {
            background: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11pt;
            color: #000000 !important;
          }
          .print-toolbar {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0.5in !important;
            box-shadow: none !important;
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
          margin-top: 0.75rem;
          font-size: 0.85rem;
        }
        .print-table th {
          background-color: #F8FAFC;
          color: #334155;
          font-weight: 700;
          text-align: left;
          padding: 6px 10px;
          border: 1px solid #CBD5E1;
          font-size: 0.78rem;
          text-transform: uppercase;
        }
        .print-table td {
          padding: 6px 10px;
          border: 1px solid #CBD5E1;
          color: #1E293B;
        }
      `}</style>

      {/* Screen action toolbar */}
      <div className="print-toolbar">
        <a
          href="/municipal-bfp/incident-reports"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "#475569",
            textDecoration: "none",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          <i className="fa-solid fa-arrow-left" /> Back to Incident Reports
        </a>

        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1.25rem",
            borderRadius: 6,
            border: "none",
            background: "#D00F09",
            color: "#FFFFFF",
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(208, 15, 9, 0.3)",
          }}
        >
          <i className="fa-solid fa-print" /> Print / Save as PDF
        </button>
      </div>

      <div className="print-container">
        {/* Official Header */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "2px solid #0F172A",
            paddingBottom: "1.2rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569" }}>
            Republic of the Philippines &bull; Department of the Interior and Local Government
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#991B1B", margin: "2px 0", letterSpacing: "0.02em" }}>
            BUREAU OF FIRE PROTECTION
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1E293B" }}>
            MUNICIPAL FIRE STATION &bull; {municipalityName.toUpperCase()}, ANTIQUE
          </div>
          <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: 2 }}>
            ALAB Emergency Dispatch & Reporting System
          </div>
        </div>

        {loading && (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
            <p>Loading print layout...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: "1.5rem", background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: 6 }}>
            <strong>Print Error:</strong> {error}
          </div>
        )}

        {/* SUMMARY REPORT PRINT VIEW */}
        {!loading && mode === "summary" && summary && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0F172A" }}>
                  MUNICIPAL INCIDENT SUMMARY & PERFORMANCE REPORT
                </h1>
                <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: 3 }}>
                  Reporting Basis: <strong>Reported during period (submitted_at)</strong> &bull; Period: <strong>{periodLabel}</strong>
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#64748B" }}>
                <div>Generated: <strong>{formatPhilippineDateTime(summary.generatedAt)}</strong></div>
                <div>Prepared by: <strong>{generatedBy}</strong></div>
              </div>
            </div>

            {/* Executive Key Figures */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <div style={{ border: "1px solid #CBD5E1", padding: "0.6rem 0.8rem", borderRadius: 4, background: "#F8FAFC" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#64748B", fontWeight: 700 }}>Total Reports Intake</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0F172A" }}>{summary.totalReports}</div>
              </div>
              <div style={{ border: "1px solid #CBD5E1", padding: "0.6rem 0.8rem", borderRadius: 4, background: "#F8FAFC" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#991B1B", fontWeight: 700 }}>Confirmed Incidents</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#991B1B" }}>{summary.confirmedIncidents}</div>
              </div>
              <div style={{ border: "1px solid #CBD5E1", padding: "0.6rem 0.8rem", borderRadius: 4, background: "#F8FAFC" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#059669", fontWeight: 700 }}>Resolved Incidents</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669" }}>{summary.resolvedIncidents}</div>
              </div>
              <div style={{ border: "1px solid #CBD5E1", padding: "0.6rem 0.8rem", borderRadius: 4, background: "#F8FAFC" }}>
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
                          <td>{getStatusLabel(st)}</td>
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
                          <td>{getSeverityLabel(sev)}</td>
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
                <div style={{ borderBottom: "1px solid #000000", paddingBottom: "2rem", marginBottom: "0.3rem" }} />
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A" }}>{generatedBy}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Authorized Officer Signature</div>
              </div>
            </div>
          </div>
        )}

        {/* INDIVIDUAL INCIDENT PRINT VIEW */}
        {!loading && mode === "incident" && report && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0F172A" }}>
                  OFFICIAL INCIDENT REPORT
                </h1>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "monospace", color: "#D00F09", marginTop: 2 }}>
                  REFERENCE #{report.referenceNumber}
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#64748B" }}>
                <div>Reported: <strong>{formatPhilippineDateTime(report.submittedAt)}</strong></div>
                <div>Station: <strong>{municipalityName} Fire Station</strong></div>
              </div>
            </div>

            {/* Overview Table */}
            <table className="print-table" style={{ marginBottom: "1.25rem" }}>
              <tbody>
                <tr>
                  <th style={{ width: "25%" }}>Location / Barangay</th>
                  <td style={{ width: "25%", fontWeight: 600 }}>{report.barangay}</td>
                  <th style={{ width: "25%" }}>Current Status</th>
                  <td style={{ width: "25%", fontWeight: 700 }}>{getStatusLabel(report.status)}</td>
                </tr>
                <tr>
                  <th>Fire Type</th>
                  <td>{getFireTypeLabel(report.fireType)}</td>
                  <th>Calculated Severity</th>
                  <td style={{ fontWeight: 700 }}>{getSeverityLabel(report.severity)} Severity</td>
                </tr>
                <tr>
                  <th>Coordinates</th>
                  <td style={{ fontFamily: "monospace" }}>{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</td>
                  <th>Report Source</th>
                  <td>{report.reportSource === "ALAB_APP" ? "Resident Emergency App" : "Emergency Phone Call"}</td>
                </tr>
                <tr>
                  <th>Response Start</th>
                  <td>{report.responseStartedAt ? `${formatPhilippineDateTime(report.responseStartedAt)} (${formatMinutes(report.timeToResponseMinutes)})` : "Not recorded"}</td>
                  <th>Recorded Arrival</th>
                  <td>{report.recordedArrivalAt ? `${formatPhilippineDateTime(report.recordedArrivalAt)} (${formatMinutes(report.timeToArrivalMinutes)})` : "Not recorded"}</td>
                </tr>
                <tr>
                  <th>Resolution Timestamp</th>
                  <td colSpan={3}>{report.resolvedAt ? `${formatPhilippineDateTime(report.resolvedAt)} (${formatMinutes(report.timeToResolutionMinutes)})` : "In progress / unresolved"}</td>
                </tr>
              </tbody>
            </table>

            {/* Narrative / Description */}
            <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", margin: "0 0 0.3rem", color: "#1E293B" }}>
              Incident Narrative / Tactical Notes
            </h3>
            <div style={{ border: "1px solid #CBD5E1", padding: "0.75rem", borderRadius: 4, fontSize: "0.85rem", marginBottom: "1.25rem", whiteSpace: "pre-wrap" }}>
              {report.description || "No narrative remarks submitted."}
            </div>

            {/* Responding Stations & Dispatches */}
            {report.dispatches && report.dispatches.length > 0 && (
              <>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", margin: "0 0 0.3rem", color: "#1E293B" }}>
                  Dispatched Fire Stations & Personnel
                </h3>
                <table className="print-table" style={{ marginBottom: "1.25rem" }}>
                  <thead>
                    <tr>
                      <th>Station</th>
                      <th>Dispatch Status</th>
                      <th>Dispatched At</th>
                      <th>Personnel Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.dispatches.map((d: MunicipalDispatchRecord) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 700 }}>{d.stationName}</td>
                        <td>{d.status}</td>
                        <td>{formatPhilippineDateTime(d.dispatchedAt)}</td>
                        <td>
                          {d.recipients.map((r: MunicipalDispatchRecipient) => `${r.name} (${r.onSceneAt ? "On Scene" : r.status})`).join(", ") || "None recorded"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Chronological Operational Timeline */}
            {report.timeline && report.timeline.length > 0 && (
              <>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", margin: "0 0 0.3rem", color: "#1E293B" }}>
                  Operational Activity Timeline
                </h3>
                <table className="print-table" style={{ marginBottom: "1.5rem" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>Timestamp (PHT)</th>
                      <th style={{ width: "25%" }}>Stage / Event</th>
                      <th>Operational Remarks / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.timeline.map((event: MunicipalTimelineEvent, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: "monospace" }}>{formatPhilippineDateTime(event.timestamp)}</td>
                        <td style={{ fontWeight: 700 }}>{getStatusLabel(event.stage)}</td>
                        <td>{event.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Signature Area */}
            <div style={{ marginTop: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748B", maxWidth: 400 }}>
                This operational record was generated from authenticated ALAB database events. Standard export excludes private reporter identifiable data in accordance with Philippine privacy standards.
              </div>

              <div style={{ textAlign: "center", minWidth: 220 }}>
                <div style={{ borderBottom: "1px solid #000000", paddingBottom: "2.5rem", marginBottom: "0.3rem" }} />
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A" }}>{generatedBy}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Duty Officer / Fire Marshal</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
