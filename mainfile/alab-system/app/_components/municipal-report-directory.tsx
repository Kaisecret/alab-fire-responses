"use client";

import { municipalTabFetch } from "../../lib/auth/municipal-tab-fetch";

import React, { useState, useEffect } from "react";
import type {
  MunicipalReportFilters,
  MunicipalReportPeriod,
  MunicipalReportRow,
  MunicipalReportSummary,
} from "../../lib/municipal-bfp/reports/types";
import {
  formatMinutes,
  formatPhilippineDateTime,
  getFireTypeLabel,
  getStatusLabel,
  getSeverityLabel,
} from "../../lib/municipal-bfp/reports/formatters";
import { BfpDataLoader } from "./bfp-data-loader";
import { MunicipalReportDetail } from "./municipal-report-detail";
import { MunicipalReportExportDialog } from "./municipal-report-export-dialog";

export function MunicipalReportDirectory() {
  const [reports, setReports] = useState<MunicipalReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<MunicipalReportSummary | null>(null);
  const [municipalityName, setMunicipalityName] = useState<string>("Municipality");
  const [barangays, setBarangays] = useState<{ id: string; name: string }[]>([]);

  // Filter states initialized from URL parameters
  const [page, setPage] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return Math.max(1, Number(params.get("page")) || 1);
    }
    return 1;
  });
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(() => {
    if (typeof window !== "undefined") {
      const size = Number(new URLSearchParams(window.location.search).get("pageSize"));
      if (size === 25 || size === 50 || size === 100) return size;
    }
    return 25;
  });
  const [period, setPeriod] = useState<MunicipalReportPeriod>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("period");
      if (p) return p as MunicipalReportPeriod;
    }
    return "THIS_MONTH";
  });
  const [from, setFrom] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("from") || "";
    }
    return "";
  });
  const [to, setTo] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("to") || "";
    }
    return "";
  });
  const [barangayId, setBarangayId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("barangayId") || "";
    }
    return "";
  });
  const [status, setStatus] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("status") || "";
    }
    return "";
  });
  const [fireType, setFireType] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("fireType") || "";
    }
    return "";
  });
  const [severity, setSeverity] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("severity") || "";
    }
    return "";
  });
  const [reportSource, setReportSource] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("reportSource") || "";
    }
    return "";
  });
  const [search, setSearch] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("search") || "";
    }
    return "";
  });
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("report");
    }
    return null;
  });
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportSelected, setExportSelected] = useState(false);
  const [revision, setRevision] = useState(0);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Fetch municipal barangays list
  useEffect(() => {
    municipalTabFetch("/api/municipal-bfp/barangays")
      .then((res) => res.json())
      .then((data) => {
        if (data.barangays) setBarangays(data.barangays);
        if (data.municipality) setMunicipalityName(data.municipality);
      })
      .catch((err) => console.warn("Could not load municipal barangays", err));
  }, []);

  // Synchronize URL query params
  useEffect(() => {
    const url = new URL(window.location.href);

    if (page > 1) url.searchParams.set("page", String(page));
    else url.searchParams.delete("page");

    if (pageSize !== 25) url.searchParams.set("pageSize", String(pageSize));
    else url.searchParams.delete("pageSize");

    if (period !== "THIS_MONTH") url.searchParams.set("period", period);
    else url.searchParams.delete("period");

    if (from) url.searchParams.set("from", from);
    else url.searchParams.delete("from");

    if (to) url.searchParams.set("to", to);
    else url.searchParams.delete("to");

    if (barangayId) url.searchParams.set("barangayId", barangayId);
    else url.searchParams.delete("barangayId");

    if (status) url.searchParams.set("status", status);
    else url.searchParams.delete("status");

    if (fireType) url.searchParams.set("fireType", fireType);
    else url.searchParams.delete("fireType");

    if (severity) url.searchParams.set("severity", severity);
    else url.searchParams.delete("severity");

    if (reportSource) url.searchParams.set("reportSource", reportSource);
    else url.searchParams.delete("reportSource");

    if (search) url.searchParams.set("search", search);
    else url.searchParams.delete("search");

    if (selectedReportId) url.searchParams.set("report", selectedReportId);
    else url.searchParams.delete("report");

    window.history.replaceState(window.history.state, "", url);
  }, [page, pageSize, period, from, to, barangayId, status, fireType, severity, reportSource, search, selectedReportId]);

  // Debounced data loading
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (period) params.set("period", period);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (barangayId) params.set("barangayId", barangayId);
      if (status) params.set("status", status);
      if (fireType) params.set("fireType", fireType);
      if (severity) params.set("severity", severity);
      if (reportSource) params.set("reportSource", reportSource);
      if (search) params.set("search", search);
      params.set("summary", "true");

      try {
        const res = await municipalTabFetch(`/api/municipal-bfp/reports?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (controller.signal.aborted) return;
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { setReports([]); setSummary(null); setTotal(0); setSelectedIds([]); }
          throw new Error(body.error || "Failed to load municipal reports.");
        }

        if (controller.signal.aborted) return;
        setReports(body.items || []);
        setSelectedIds([]);
        setTotal(body.total || 0);
        setSummary(body.summary || null);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load municipal reports.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [page, pageSize, period, from, to, barangayId, status, fireType, severity, reportSource, search, revision]);

  const handleSelectAllPage = (checked: boolean) => {
    if (checked) {
      setSelectedIds(reports.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const isPageSelected =
    reports.length > 0 && reports.every((r) => selectedIds.includes(r.id));
  const isSomePageSelected =
    reports.some((r) => selectedIds.includes(r.id)) && !isPageSelected;

  const handleClearFilters = () => {
    setPeriod("THIS_MONTH");
    setFrom("");
    setTo("");
    setBarangayId("");
    setStatus("");
    setFireType("");
    setSeverity("");
    setReportSource("");
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters =
    period !== "THIS_MONTH" ||
    Boolean(from) ||
    Boolean(to) ||
    Boolean(barangayId) ||
    Boolean(status) ||
    Boolean(fireType) ||
    Boolean(severity) ||
    Boolean(reportSource) ||
    Boolean(search);

  const getStatusBadge = (rowStatus: string) => {
    let bg = "#F1F5F9";
    let color = "#475569";

    switch (rowStatus) {
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
          padding: "3px 8px",
          borderRadius: 4,
          fontSize: "0.72rem",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {getStatusLabel(rowStatus)}
      </span>
    );
  };

  const getSeverityBadge = (rowSeverity: string) => {
    let bg = "#F1F5F9";
    let color = "#475569";

    switch (rowSeverity) {
      case "CRITICAL":
        bg = "#FEE2E2";
        color = "#991B1B";
        break;
      case "HIGH":
        bg = "#FFEDD5";
        color = "#C2410C";
        break;
      case "MODERATE":
        bg = "#FEF3C7";
        color = "#B45309";
        break;
      case "LOW":
        bg = "#DCFCE7";
        color = "#15803D";
        break;
    }

    return (
      <span
        style={{
          background: bg,
          color,
          padding: "2px 7px",
          borderRadius: 4,
          fontSize: "0.72rem",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {getSeverityLabel(rowSeverity)}
      </span>
    );
  };

  const currentFilters: MunicipalReportFilters = {
    page,
    pageSize,
    period,
    from: from || undefined,
    to: to || undefined,
    barangayId: barangayId || undefined,
    status: status || undefined,
    fireType: fireType || undefined,
    severity: severity || undefined,
    reportSource: (reportSource as "ALAB_APP" | "PHONE_CALL") || undefined,
    search: search || undefined,
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /** Requests a generated PDF and hands it to the browser as a file download. */
  const downloadPdf = async (
    dataset: "MUNICIPAL_SUMMARY" | "INCIDENT_REGISTER" | "BARANGAY_BREAKDOWN",
    scope: "ALL_MATCHING" | "SELECTED" | "CURRENT_PAGE" = "ALL_MATCHING",
  ) => {
    if (pdfBusy) return;
    setPdfBusy(dataset);
    setPdfError(null);

    try {
      const res = await municipalTabFetch("/api/municipal-bfp/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          scope,
          format: "PDF",
          selectedIds: scope === "SELECTED" ? selectedIds : undefined,
          filters: currentFilters,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to generate this report.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] || "alab-municipal-report.pdf";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      document.body.removeChild(link);
    } catch (cause) {
      setPdfError(cause instanceof Error ? cause.message : "Download failed. Please retry.");
    } finally {
      setPdfBusy(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontFamily: "inherit" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.45rem",
              fontWeight: 800,
              color: "#0F172A",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            <i className="fa-solid fa-file-lines" style={{ color: "#D00F09" }} />
            Incident Reports
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748B" }}>
            Review municipal incidents and export records or summaries.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => downloadPdf("MUNICIPAL_SUMMARY")}
            disabled={pdfBusy !== null}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.48rem 1rem",
              borderRadius: 6,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: pdfBusy ? "progress" : "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <i
              className={`fa-solid ${pdfBusy === "MUNICIPAL_SUMMARY" ? "fa-circle-notch fa-spin" : "fa-download"}`}
              style={{ color: "#475569" }}
            />
            {pdfBusy === "MUNICIPAL_SUMMARY" ? "Preparing..." : "Download summary"}
          </button>

          {pdfError && (
            <span
              role="status"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#B91C1C",
              }}
            >
              <i className="fa-solid fa-circle-exclamation" />
              {pdfError}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExportDialogOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.48rem 1.2rem",
              borderRadius: 6,
              border: "none",
              background: "linear-gradient(135deg, #D00F09, #DC2626)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(208, 15, 9, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <i className="fa-solid fa-file-export" /> Export data
          </button>
        </div>
      </div>

      {/* 4 Summary Cards Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.9rem",
        }}
      >
        {/* Total Reports */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderTop: "3px solid #64748B",
            borderRadius: 10,
            padding: "1.1rem 1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "#64748B", letterSpacing: "0.04em" }}>
                Total Reports
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0F172A", marginTop: 4, letterSpacing: "-0.02em" }}>
                {summary ? summary.totalReports : total}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "#F1F5F9",
                color: "#475569",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
              }}
            >
              <i className="fa-solid fa-folder-open" />
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 4 }}>
            Intake during selected period
          </div>
        </div>

        {/* Confirmed Incidents */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #FED7AA",
            borderTop: "3px solid #DC2626",
            borderRadius: 10,
            padding: "1.1rem 1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "#DC2626", letterSpacing: "0.04em" }}>
                Confirmed Incidents
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#DC2626", marginTop: 4, letterSpacing: "-0.02em" }}>
                {summary ? summary.confirmedIncidents : "-"}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "#FEF2F2",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
              }}
            >
              <i className="fa-solid fa-fire-flame-curved" />
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 4 }}>
            Verified structural/fire events
          </div>
        </div>

        {/* Resolved Incidents */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #BBF7D0",
            borderTop: "3px solid #059669",
            borderRadius: 10,
            padding: "1.1rem 1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "#059669", letterSpacing: "0.04em" }}>
                Resolved Incidents
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#059669", marginTop: 4, letterSpacing: "-0.02em" }}>
                {summary ? summary.resolvedIncidents : "-"}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "#F0FDF4",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
              }}
            >
              <i className="fa-solid fa-circle-check" />
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 4 }}>
            Under control, resolved or closed
          </div>
        </div>

        {/* Avg Time to Arrival */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #BFDBFE",
            borderTop: "3px solid #2563EB",
            borderRadius: 10,
            padding: "1.1rem 1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "#2563EB", letterSpacing: "0.04em" }}>
                Avg Time to Arrival
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0F172A", marginTop: 4, letterSpacing: "-0.02em" }}>
                {summary?.timingMetrics.avgArrivalMinutes !== null && summary?.timingMetrics.avgArrivalMinutes !== undefined
                  ? formatMinutes(summary.timingMetrics.avgArrivalMinutes)
                  : "Not recorded"}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
              }}
            >
              <i className="fa-solid fa-stopwatch" />
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 4 }}>
            {summary && summary.totalReports > 0
              ? `${summary.timingMetrics.arrivalRecordsCount} of ${summary.totalReports} incidents have arrival records`
              : "No timing records in period"}
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {/* Top row: Period Buttons & Search */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {/* Period buttons */}
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {[
              { id: "THIS_MONTH" as const, label: "This Month" },
              { id: "THIS_WEEK" as const, label: "This Week" },
              { id: "LAST_MONTH" as const, label: "Last Month" },
              { id: "THIS_YEAR" as const, label: "This Year" },
              { id: "ALL" as const, label: "All Dates" },
              { id: "CUSTOM" as const, label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id);
                  setPage(1);
                }}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: 20,
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  border: `1px solid ${period === p.id ? "#D00F09" : "#E2E8F0"}`,
                  background: period === p.id ? "#D00F09" : "#FFFFFF",
                  color: period === p.id ? "#FFFFFF" : "#475569",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", minWidth: 220, flex: 1, maxWidth: 320 }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94A3B8",
                fontSize: "0.8rem",
              }}
            />
            <input
              type="text"
              placeholder="Search reference, barangay..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.45rem 1.8rem 0.45rem 2rem",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                fontSize: "0.82rem",
                outline: "none",
                background: "#F8FAFC",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  padding: 2,
                  fontSize: "0.85rem",
                }}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Custom date range picker when CUSTOM is chosen */}
        {period === "CUSTOM" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              background: "#F8FAFC",
              padding: "0.6rem 0.8rem",
              borderRadius: 6,
              border: "1px solid #E2E8F0",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569" }}>
              Date Range:
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "0.35rem 0.6rem",
                borderRadius: 4,
                border: "1px solid #CBD5E1",
                fontSize: "0.78rem",
                background: "#FFFFFF",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "0.35rem 0.6rem",
                borderRadius: 4,
                border: "1px solid #CBD5E1",
                fontSize: "0.78rem",
                background: "#FFFFFF",
              }}
            />
          </div>
        )}

        {/* Dropdown Filters row */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Barangay filter */}
          <select
            value={barangayId}
            onChange={(e) => {
              setBarangayId(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: 6,
              border: "1px solid #CBD5E1",
              fontSize: "0.8rem",
              color: "#334155",
              background: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            <option value="">All Barangays</option>
            {barangays.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: 6,
              border: "1px solid #CBD5E1",
              fontSize: "0.8rem",
              color: "#334155",
              background: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="RESPONDING">Responding</option>
            <option value="FIRETRUCK_DISPATCHED">Dispatched</option>
            <option value="RESPONDER_ARRIVED">Arrived On Scene</option>
            <option value="UNDER_CONTROL">Under Control</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="UNDER_VERIFICATION">Under Verification</option>
            <option value="FALSE_REPORT">False Report</option>
            <option value="DUPLICATE">Duplicate</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* More filters button */}
          <button
            type="button"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            style={{
              padding: "0.45rem 0.8rem",
              borderRadius: 6,
              border: "1px solid #CBD5E1",
              background: showMoreFilters ? "#F1F5F9" : "#FFFFFF",
              color: "#475569",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <i className="fa-solid fa-sliders" /> More filters
            {(fireType || severity || reportSource) && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#D00F09",
                }}
              />
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                padding: "0.45rem 0.8rem",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "#DC2626",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <i className="fa-solid fa-rotate-left" /> Clear filters
            </button>
          )}
        </div>

        {/* Extended filters (Fire type, Severity, Source) */}
        {showMoreFilters && (
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              flexWrap: "wrap",
              paddingTop: "0.6rem",
              borderTop: "1px dashed #E2E8F0",
            }}
          >
            <select
              value={fireType}
              onChange={(e) => {
                setFireType(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "0.4rem 0.7rem",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                fontSize: "0.78rem",
                color: "#334155",
                background: "#FFFFFF",
              }}
            >
              <option value="">All Fire Types</option>
              <option value="HOUSE_BUILDING">Structure Fire</option>
              <option value="GRASS">Grass Fire</option>
              <option value="FOREST">Forest Fire</option>
              <option value="VEHICLE">Vehicle Fire</option>
              <option value="OTHER">Other Fire</option>
            </select>

            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "0.4rem 0.7rem",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                fontSize: "0.78rem",
                color: "#334155",
                background: "#FFFFFF",
              }}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical Severity</option>
              <option value="HIGH">High Severity</option>
              <option value="MODERATE">Moderate Severity</option>
              <option value="LOW">Low Severity</option>
              <option value="UNKNOWN">Unknown Severity</option>
            </select>

            <select
              value={reportSource}
              onChange={(e) => {
                setReportSource(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "0.4rem 0.7rem",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                fontSize: "0.78rem",
                color: "#334155",
                background: "#FFFFFF",
              }}
            >
              <option value="">All Report Sources</option>
              <option value="ALAB_APP">ALAB Resident App</option>
              <option value="PHONE_CALL">Emergency Phone Call</option>
            </select>
          </div>
        )}
      </div>

      {/* Batch Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, #FFF5F5, #FEF2F2)",
            border: "1px solid #FECACA",
            borderRadius: 8,
            padding: "0.65rem 1.1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.6rem",
            boxShadow: "0 2px 5px rgba(220, 38, 38, 0.06)",
          }}
        >
          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#991B1B", display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#DC2626",
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
              }}
            >
              {selectedIds.length}
            </span>
            <span>{selectedIds.length} report{selectedIds.length > 1 ? "s" : ""} selected on this page</span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => downloadPdf("INCIDENT_REGISTER", "SELECTED")}
              disabled={pdfBusy !== null}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "linear-gradient(135deg, #D00F09, #DC2626)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 5,
                padding: "5px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: pdfBusy ? "progress" : "pointer",
                boxShadow: "0 1px 3px rgba(208, 15, 9, 0.25)",
              }}
            >
              <i className={`fa-solid ${pdfBusy === "INCIDENT_REGISTER" ? "fa-circle-notch fa-spin" : "fa-file-pdf"}`} />
              {pdfBusy === "INCIDENT_REGISTER" ? "Preparing..." : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={() => { setExportSelected(true); setIsExportDialogOpen(true); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "#FFFFFF",
                color: "#991B1B",
                border: "1px solid #FECACA",
                borderRadius: 5,
                padding: "5px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <i className="fa-solid fa-file-export" /> Export selected records
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{
                background: "transparent",
                color: "#64748B",
                border: "1px solid #CBD5E1",
                borderRadius: 5,
                padding: "5px 9px",
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: "1rem",
            borderRadius: 8,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontSize: "0.85rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRevision((v) => v + 1)}
            style={{
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

      {/* Data Table */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 10,
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ padding: "0.8rem 1rem", width: 40, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomePageSelected;
                    }}
                    onChange={(e) => handleSelectAllPage(e.target.checked)}
                    aria-label="Select this page"
                  />
                </th>
                <th style={{ padding: "0.8rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Reference
                </th>
                <th style={{ padding: "0.8rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Barangay
                </th>
                <th style={{ padding: "0.8rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Fire Type
                </th>
                <th style={{ padding: "0.8rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Severity
                </th>
                <th style={{ padding: "0.8rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Reported At (PHT)
                </th>
                <th style={{ padding: "0.8rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Status
                </th>
                <th style={{ padding: "0.8rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ padding: "1.5rem", textAlign: "center", color: "#64748B" }}>
                    <BfpDataLoader size="sm" minHeight="150px" title="Loading incident records…" />
                  </td>
                </tr>
              )}

              {!loading && reports.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center" }}>
                    <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: "2rem", color: "#94A3B8", marginBottom: "0.75rem", display: "block" }} />
                    <p style={{ margin: "0 0 0.4rem", fontWeight: 700, color: "#1E293B", fontSize: "0.95rem" }}>
                      No reports match these filters
                    </p>
                    <p style={{ margin: "0 0 1rem", color: "#64748B", fontSize: "0.82rem" }}>
                      Try adjusting your date range or clearing specific filter criteria.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        style={{
                          padding: "0.4rem 0.9rem",
                          borderRadius: 6,
                          border: "1px solid #CBD5E1",
                          background: "#FFFFFF",
                          color: "#334155",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {!loading &&
                reports.map((r) => {
                  const isSelected = selectedIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      onClick={(e) => {
                        // If target is checkbox or button, don't open row
                        if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "BUTTON") return;
                        setSelectedReportId(r.id);
                      }}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        background: isSelected ? "#FEF2F2" : "#FFFFFF",
                        cursor: "pointer",
                        transition: "background-color 0.1s ease",
                      }}
                    >
                      <td
                        style={{ padding: "0.75rem 1rem", textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(r.id)}
                          aria-label={`Select ${r.referenceNumber}`}
                        />
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#0F172A", fontSize: "0.84rem" }}>
                          {r.referenceNumber}
                        </div>
                        {r.reporterName && (
                          <div style={{ fontSize: "0.71rem", color: "#64748B", fontWeight: 500, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                            <i className="fa-regular fa-user" style={{ fontSize: "0.68rem", color: "#94A3B8" }} />
                            <span>{r.reporterName}</span>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem" }}>
                        <div style={{ color: "#1E293B", fontWeight: 600 }}>{r.barangay}</div>
                        {r.nearestLandmark && (
                          <div style={{ fontSize: "0.71rem", color: "#991B1B", fontWeight: 500, marginTop: 1 }}>
                            Near {r.nearestLandmark}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#475569" }}>
                        {getFireTypeLabel(r.fireType)}
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        {getSeverityBadge(r.severity)}
                      </td>

                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatPhilippineDateTime(r.submittedAt)}
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        {getStatusBadge(r.status)}
                      </td>

                      <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedReportId(r.id)}
                          style={{
                            background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            color: "#D00F09",
                            fontWeight: 700,
                            fontSize: "0.78rem",
                            borderRadius: 5,
                            padding: "3px 8px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            transition: "all 0.15s ease",
                          }}
                        >
                          View <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.68rem" }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!loading && total > 0 && (
          <div
            style={{
              padding: "0.75rem 1.25rem",
              borderTop: "1px solid #E2E8F0",
              background: "#FAFAFA",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              fontSize: "0.8rem",
              color: "#64748B",
            }}
          >
            <div>
              Showing {Math.min(total, (page - 1) * pageSize + 1)} to {Math.min(total, page * pageSize)} of{" "}
              <strong style={{ color: "#0F172A" }}>{total}</strong> records
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) as 25 | 50 | 100);
                    setPage(1);
                  }}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: 4,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    fontSize: "0.78rem",
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: 4,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: page <= 1 ? "#94A3B8" : "#334155",
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                    fontSize: "0.78rem",
                  }}
                >
                  Previous
                </button>

                <span style={{ padding: "0.3rem 0.6rem", fontWeight: 700, color: "#0F172A" }}>
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: 4,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: page >= totalPages ? "#94A3B8" : "#334155",
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                    fontSize: "0.78rem",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedReportId && (
        <MunicipalReportDetail
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      )}

      {/* Export Dialog Modal */}
      {isExportDialogOpen && (
        <MunicipalReportExportDialog
          isOpen={isExportDialogOpen}
          initialScope={exportSelected ? "SELECTED" : "ALL_MATCHING"}
          onClose={() => { setIsExportDialogOpen(false); setExportSelected(false); }}
          filters={currentFilters}
          totalMatching={total}
          currentPageCount={reports.length}
          selectedIds={selectedIds}
          sampleRows={reports}
          municipalityName={municipalityName}
        />
      )}
    </div>
  );
}
