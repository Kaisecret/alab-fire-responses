"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { resolvePeriodDates } from "../../lib/municipal-bfp/reports/filters";
import {
  formatPhilippineDateTime,
  getFireTypeLabel,
  getSeverityLabel,
  getStatusLabel,
} from "../../lib/municipal-bfp/reports/formatters";
import type { MunicipalReportPeriod } from "../../lib/municipal-bfp/reports/types";
import type { ProvincialReportRow, ProvincialReportSummary } from "../../lib/provincial-bfp/management/types";
import { BfpDataLoader } from "./bfp-data-loader";
import { ProvincialReportDetail } from "./provincial-report-detail";
import {
  ProvincialReportExportDialog,
  type ProvincialExportFilters,
  type ProvincialExportScope,
} from "./provincial-report-export-dialog";

/** Statuses the province counts as a real fire that was worked. */
const CONFIRMED_STATUSES = [
  "CONFIRMED", "VERIFIED", "RESPONDING", "FIRETRUCK_DISPATCHED",
  "RESPONDER_ARRIVED", "UNDER_CONTROL", "RESOLVED", "CLOSED",
];
const RESOLVED_STATUSES = ["RESOLVED", "CLOSED"];

const PERIODS: { id: MunicipalReportPeriod; label: string }[] = [
  { id: "THIS_MONTH", label: "This Month" },
  { id: "THIS_WEEK", label: "This Week" },
  { id: "LAST_MONTH", label: "Last Month" },
  { id: "THIS_YEAR", label: "This Year" },
  { id: "ALL", label: "All Dates" },
  { id: "CUSTOM", label: "Custom" },
];

const summaryCardStyles = `
  /* Carried over from the municipal report screen so a marshal reads the same
     shapes on both: a tinted card, a white icon tile, and the figure given the
     room to be seen from across a room. */
  .prc-stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 0.75rem;
  }

  .prc-stat-card {
    position: relative;
    border-radius: 12px;
    padding: 0.8rem 0.95rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    overflow: hidden;
    transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s ease, border-color 0.24s ease;
  }
  .prc-stat-card.slate {
    background: linear-gradient(145deg, #F1F5F9 0%, #E2E8F0 100%);
    border: 1.5px solid #CBD5E1;
    box-shadow: 0 4px 16px rgba(71, 85, 105, 0.06);
  }
  .prc-stat-card.red {
    background: linear-gradient(145deg, #FFE8E8 0%, #FFD6D6 100%);
    border: 1.5px solid #FFBEBE;
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.06);
  }
  .prc-stat-card.emerald {
    background: linear-gradient(145deg, #E3F8ED 0%, #CEF2DE 100%);
    border: 1.5px solid #B1ECC8;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.06);
  }

  .prc-stat-card:hover { transform: translateY(-3px); }
  .prc-stat-card.slate:hover { border-color: #94A3B8; box-shadow: 0 10px 22px -4px rgba(71, 85, 105, 0.2); }
  .prc-stat-card.red:hover { border-color: #FFA3A3; box-shadow: 0 10px 22px -4px rgba(226, 54, 50, 0.2); }
  .prc-stat-card.emerald:hover { border-color: #88E4AA; box-shadow: 0 10px 22px -4px rgba(16, 185, 129, 0.2); }

  .prc-stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
  }

  .prc-stat-icon {
    width: 2.35rem;
    height: 2.35rem;
    border-radius: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  .prc-stat-icon.slate { color: #475569; }
  .prc-stat-icon.red { color: #E23632; }
  .prc-stat-icon.emerald { color: #059669; }

  .prc-stat-tag {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .prc-stat-tag.slate { background: #E2E8F0; color: #334155; }
  .prc-stat-tag.red { background: #FDE8E8; color: #991B1B; }
  .prc-stat-tag.emerald { background: #D1FAE5; color: #065F46; }

  .prc-stat-body { display: flex; flex-direction: column; gap: 0.1rem; margin: 0.15rem 0 0.1rem; }
  .prc-stat-value { font-size: 1.85rem; font-weight: 900; color: #0F172A; line-height: 1.05; font-variant-numeric: tabular-nums; }
  .prc-stat-label { font-size: 0.69rem; font-weight: 750; color: #475569; text-transform: uppercase; letter-spacing: 0.03em; }

  @media (prefers-reduced-motion: reduce) {
    .prc-stat-card:hover { transform: none; }
  }
`;

function getStatusBadge(rowStatus: string) {
  let bg = "#F1F5F9";
  let color = "#475569";

  switch (rowStatus) {
    case "CONFIRMED":
    case "VERIFIED":
      bg = "#DC2626"; color = "#FFFFFF"; break;
    case "RESPONDING":
    case "FIRETRUCK_DISPATCHED":
      bg = "#EA580C"; color = "#FFFFFF"; break;
    case "RESPONDER_ARRIVED":
    case "UNDER_CONTROL":
      bg = "#2563EB"; color = "#FFFFFF"; break;
    case "RESOLVED":
    case "CLOSED":
      bg = "#059669"; color = "#FFFFFF"; break;
    case "SUBMITTED":
    case "PENDING_VERIFICATION":
    case "UNDER_VERIFICATION":
      bg = "#FEF3C7"; color = "#92400E"; break;
    case "FALSE_REPORT":
    case "DUPLICATE":
    case "REJECTED":
      bg = "#F3F4F6"; color = "#6B7280"; break;
  }

  return (
    <span style={{ background: bg, color, padding: "3px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {getStatusLabel(rowStatus)}
    </span>
  );
}

function getSeverityBadge(rowSeverity: string) {
  let bg = "#F1F5F9";
  let color = "#475569";

  switch (rowSeverity) {
    case "CRITICAL": bg = "#FEE2E2"; color = "#991B1B"; break;
    case "HIGH": bg = "#FFEDD5"; color = "#C2410C"; break;
    case "MODERATE": bg = "#FEF3C7"; color = "#B45309"; break;
    case "LOW": bg = "#DCFCE7"; color = "#15803D"; break;
  }

  return (
    <span style={{ background: bg, color, padding: "2px 7px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {getSeverityLabel(rowSeverity)}
    </span>
  );
}

const readParam = (key: string, fallback = "") => {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(key) || fallback;
};

export function ProvincialReportConsole() {
  const [reports, setReports] = useState<ProvincialReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ProvincialReportSummary | null>(null);
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);

  const [page, setPage] = useState<number>(() => Math.max(1, Number(readParam("page")) || 1));
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(() => {
    const size = Number(readParam("pageSize"));
    return size === 50 || size === 100 ? size : 25;
  });
  const [period, setPeriod] = useState<MunicipalReportPeriod>(() => (readParam("period") || "THIS_MONTH") as MunicipalReportPeriod);
  const [from, setFrom] = useState(() => readParam("from"));
  const [to, setTo] = useState(() => readParam("to"));
  const [municipalityId, setMunicipalityId] = useState(() => readParam("municipalityId"));
  const [status, setStatus] = useState(() => readParam("status"));
  const [fireType, setFireType] = useState(() => readParam("fireType"));
  const [severity, setSeverity] = useState(() => readParam("severity"));
  const [reportSource, setReportSource] = useState(() => readParam("reportSource"));
  const [search, setSearch] = useState(() => readParam("search"));
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(() => readParam("report") || null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ProvincialExportScope>("ALL_MATCHING");
  const [revision, setRevision] = useState(0);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Period pills are a provincial convenience: the API only speaks from/to,
  // so the chosen period is resolved to Philippine calendar days before it goes.
  const dates = useMemo(
    () => resolvePeriodDates(period, from || undefined, to || undefined),
    [period, from, to],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/provincial-bfp/municipalities?page=1&pageSize=100", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("unavailable"))))
      .then((body) => setMunicipalities(body.items || []))
      .catch(() => { /* The console still works with the municipality filter left on All. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sync = (key: string, value: string | number | null, omitWhen: string | number) => {
      if (value && value !== omitWhen) url.searchParams.set(key, String(value));
      else url.searchParams.delete(key);
    };

    sync("page", page, 1);
    sync("pageSize", pageSize, 25);
    sync("period", period, "THIS_MONTH");
    sync("from", from, "");
    sync("to", to, "");
    sync("municipalityId", municipalityId, "");
    sync("status", status, "");
    sync("fireType", fireType, "");
    sync("severity", severity, "");
    sync("reportSource", reportSource, "");
    sync("search", search, "");
    sync("report", selectedReportId, "");

    window.history.replaceState(window.history.state, "", url);
  }, [page, pageSize, period, from, to, municipalityId, status, fireType, severity, reportSource, search, selectedReportId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      const shared = new URLSearchParams();
      if (dates.from) shared.set("from", dates.from);
      if (dates.to) shared.set("to", dates.to);
      if (municipalityId) shared.set("municipalityId", municipalityId);
      if (status) shared.set("status", status);
      if (fireType) shared.set("fireType", fireType);
      if (severity) shared.set("severity", severity);
      if (reportSource) shared.set("reportSource", reportSource);
      if (search) shared.set("search", search);

      const listParams = new URLSearchParams(shared);
      listParams.set("page", String(page));
      listParams.set("pageSize", String(pageSize));

      try {
        const [listResponse, summaryResponse] = await Promise.all([
          fetch(`/api/provincial-bfp/incident-reports?${listParams}`, { signal: controller.signal, cache: "no-store" }),
          fetch(`/api/provincial-bfp/report-summaries?${shared}`, { signal: controller.signal, cache: "no-store" }),
        ]);

        if (controller.signal.aborted) return;
        const listBody = await listResponse.json().catch(() => ({}));
        if (!listResponse.ok) {
          if (listResponse.status === 401 || listResponse.status === 403) { setReports([]); setTotal(0); setSummary(null); setSelectedIds([]); }
          throw new Error(listBody.error || "Failed to load provincial reports.");
        }

        const summaryBody = summaryResponse.ok ? await summaryResponse.json().catch(() => ({})) : {};

        if (controller.signal.aborted) return;
        const items: ProvincialReportRow[] = listBody.items || [];
        setReports(items);
        setSelectedIds([]);
        setTotal(listBody.total || 0);
        setSummary(summaryBody.summary || null);

        const lastPage = Math.max(1, Math.ceil((listBody.total || 0) / pageSize));
        if (page > lastPage) setPage(lastPage);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Failed to load provincial reports.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [page, pageSize, dates, municipalityId, status, fireType, severity, reportSource, search, revision]);

  const confirmedIncidents = useMemo(
    () => (summary ? CONFIRMED_STATUSES.reduce((sum, key) => sum + (summary.byStatus[key] || 0), 0) : 0),
    [summary],
  );
  const resolvedIncidents = useMemo(
    () => (summary ? RESOLVED_STATUSES.reduce((sum, key) => sum + (summary.byStatus[key] || 0), 0) : 0),
    [summary],
  );

  const handleSelectAllPage = (checked: boolean) => setSelectedIds(checked ? reports.map((row) => row.id) : []);
  const handleToggleSelectRow = (id: string) =>
    setSelectedIds((previous) => (previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]));

  const isPageSelected = reports.length > 0 && reports.every((row) => selectedIds.includes(row.id));
  const isSomePageSelected = reports.some((row) => selectedIds.includes(row.id)) && !isPageSelected;

  const handleClearFilters = () => {
    setPeriod("THIS_MONTH");
    setFrom("");
    setTo("");
    setMunicipalityId("");
    setStatus("");
    setFireType("");
    setSeverity("");
    setReportSource("");
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters =
    period !== "THIS_MONTH" ||
    Boolean(from || to || municipalityId || status || fireType || severity || reportSource || search);

  const scopeName = municipalityId
    ? `${municipalities.find((item) => item.id === municipalityId)?.name ?? "Selected municipality"}, Antique`
    : "Province of Antique";

  const currentFilters: ProvincialExportFilters = useMemo(() => ({
    page,
    pageSize,
    municipalityId: municipalityId || undefined,
    from: dates.from,
    to: dates.to,
    status: status || undefined,
    fireType: fireType || undefined,
    severity: severity || undefined,
    reportSource: reportSource || undefined,
    search: search || undefined,
  }), [page, pageSize, municipalityId, dates, status, fireType, severity, reportSource, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /** Requests a generated PDF and hands it to the browser as a file download. */
  const downloadPdf = useCallback(async (
    dataset: "PROVINCIAL_SUMMARY" | "INCIDENT_REGISTER" | "MUNICIPALITY_BREAKDOWN",
    scope: ProvincialExportScope = "ALL_MATCHING",
    ids: string[] = [],
  ) => {
    if (pdfBusy) return;
    setPdfBusy(dataset);
    setPdfError(null);

    try {
      const response = await fetch("/api/provincial-bfp/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          dataset,
          scope,
          format: "PDF",
          selectedIds: scope === "SELECTED" ? ids : undefined,
          filters: currentFilters,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Unable to generate this report.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const named = disposition ? /filename="?([^"]+)"?/.exec(disposition)?.[1] : undefined;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = named || "alab-provincial-report.pdf";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      link.remove();
    } catch (cause) {
      setPdfError(cause instanceof Error ? cause.message : "Download failed. Please retry.");
    } finally {
      setPdfBusy(null);
    }
  }, [currentFilters, pdfBusy]);

  const headerCell: React.CSSProperties = {
    padding: "0.8rem 1rem",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const selectStyle: React.CSSProperties = {
    padding: "0.45rem 0.75rem",
    borderRadius: 6,
    border: "1px solid #CBD5E1",
    fontSize: "0.8rem",
    color: "#334155",
    background: "#FFFFFF",
    cursor: "pointer",
  };
  const extraSelectStyle: React.CSSProperties = { ...selectStyle, padding: "0.4rem 0.7rem", fontSize: "0.78rem" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontFamily: "inherit" }}>
      <style>{summaryCardStyles}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: "0.5rem", letterSpacing: "-0.02em" }}>
            <i className="fa-solid fa-file-lines" style={{ color: "#D00F09" }} />
            Incident Reports
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748B" }}>
            Review provincial incidents and export records or summaries.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => downloadPdf("PROVINCIAL_SUMMARY")}
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
              className={`fa-solid ${pdfBusy === "PROVINCIAL_SUMMARY" ? "fa-circle-notch fa-spin" : "fa-download"}`}
              style={{ color: "#475569" }}
            />
            {pdfBusy === "PROVINCIAL_SUMMARY" ? "Preparing..." : "Download summary"}
          </button>

          {pdfError && (
            <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 600, color: "#B91C1C" }}>
              <i className="fa-solid fa-circle-exclamation" />
              {pdfError}
            </span>
          )}

          <button
            type="button"
            onClick={() => { setExportScope("ALL_MATCHING"); setIsExportDialogOpen(true); }}
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

      {/* Summary strip, in the same hand as the municipal counters. */}
      <div className="prc-stats-row">
        <div className="prc-stat-card slate">
          <div className="prc-stat-header">
            <div className="prc-stat-icon slate"><i className="fa-solid fa-folder-open" /></div>
            <span className="prc-stat-tag slate"><i className="fa-solid fa-layer-group" />Intake</span>
          </div>
          <div className="prc-stat-body">
            <span className="prc-stat-value">{summary?.totalReports ?? 0}</span>
            <span className="prc-stat-label">Total Reports</span>
          </div>
        </div>

        <div className="prc-stat-card red">
          <div className="prc-stat-header">
            <div className="prc-stat-icon red"><i className="fa-solid fa-fire" /></div>
            <span className="prc-stat-tag red">
              <i className="fa-solid fa-triangle-exclamation" />
              {confirmedIncidents > 0 ? "Confirmed" : "None"}
            </span>
          </div>
          <div className="prc-stat-body">
            <span className="prc-stat-value">{confirmedIncidents}</span>
            <span className="prc-stat-label">Confirmed Incidents</span>
          </div>
        </div>

        <div className="prc-stat-card emerald">
          <div className="prc-stat-header">
            <div className="prc-stat-icon emerald"><i className="fa-solid fa-circle-check" /></div>
            <span className="prc-stat-tag emerald">
              <i className="fa-solid fa-flag-checkered" />
              {resolvedIncidents > 0 ? "Closed" : "Open"}
            </span>
          </div>
          <div className="prc-stat-body">
            <span className="prc-stat-value">{resolvedIncidents}</span>
            <span className="prc-stat-label">Resolved Incidents</span>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {PERIODS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={period === option.id}
                onClick={() => { setPeriod(option.id); setPage(1); }}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: 20,
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  border: `1px solid ${period === option.id ? "#D00F09" : "#E2E8F0"}`,
                  background: period === option.id ? "#D00F09" : "#FFFFFF",
                  color: period === option.id ? "#FFFFFF" : "#475569",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", minWidth: 220, flex: 1, maxWidth: 320 }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: "0.8rem" }}
            />
            <input
              type="text"
              aria-label="Search incident records"
              placeholder="Search reference, barangay..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              style={{
                width: "100%",
                padding: "0.45rem 1.8rem 0.45rem 2rem",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                fontSize: "0.82rem",
                outline: "none",
                background: "#F8FAFC",
                boxSizing: "border-box",
              }}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => { setSearch(""); setPage(1); }}
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
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569" }}>Date Range:</span>
            <input
              type="date"
              aria-label="Coverage from"
              value={from}
              onChange={(event) => { setFrom(event.target.value); setPage(1); }}
              style={{ padding: "0.35rem 0.6rem", borderRadius: 4, border: "1px solid #CBD5E1", fontSize: "0.78rem", background: "#FFFFFF" }}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>to</span>
            <input
              type="date"
              aria-label="Coverage to"
              value={to}
              onChange={(event) => { setTo(event.target.value); setPage(1); }}
              style={{ padding: "0.35rem 0.6rem", borderRadius: 4, border: "1px solid #CBD5E1", fontSize: "0.78rem", background: "#FFFFFF" }}
            />
            {from && to && from > to && (
              <span role="alert" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#B91C1C" }}>
                The first date must come before the second.
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            aria-label="Municipality"
            value={municipalityId}
            onChange={(event) => { setMunicipalityId(event.target.value); setPage(1); }}
            style={selectStyle}
          >
            <option value="">All Municipalities</option>
            {municipalities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>

          <select
            aria-label="Status"
            value={status}
            onChange={(event) => { setStatus(event.target.value); setPage(1); }}
            style={selectStyle}
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

          <button
            type="button"
            aria-expanded={showMoreFilters}
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
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D00F09" }} />
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

        {showMoreFilters && (
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", paddingTop: "0.6rem", borderTop: "1px dashed #E2E8F0" }}>
            <select aria-label="Fire type" value={fireType} onChange={(event) => { setFireType(event.target.value); setPage(1); }} style={extraSelectStyle}>
              <option value="">All Fire Types</option>
              <option value="HOUSE_BUILDING">Structure Fire</option>
              <option value="GRASS">Grass Fire</option>
              <option value="FOREST">Forest Fire</option>
              <option value="VEHICLE">Vehicle Fire</option>
              <option value="OTHER">Other Fire</option>
            </select>

            <select aria-label="Level of danger" value={severity} onChange={(event) => { setSeverity(event.target.value); setPage(1); }} style={extraSelectStyle}>
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical Danger</option>
              <option value="HIGH">High Danger</option>
              <option value="MODERATE">Moderate Danger</option>
              <option value="LOW">Low Danger</option>
              <option value="UNKNOWN">Unknown Danger</option>
            </select>

            <select aria-label="Report source" value={reportSource} onChange={(event) => { setReportSource(event.target.value); setPage(1); }} style={extraSelectStyle}>
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
              onClick={() => downloadPdf("INCIDENT_REGISTER", "SELECTED", selectedIds)}
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
              onClick={() => { setExportScope("SELECTED"); setIsExportDialogOpen(true); }}
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
            gap: "1rem",
          }}
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
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
      <div style={{ background: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ padding: "0.8rem 1rem", width: 40, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isPageSelected}
                    ref={(element) => { if (element) element.indeterminate = isSomePageSelected; }}
                    onChange={(event) => handleSelectAllPage(event.target.checked)}
                    aria-label="Select this page"
                  />
                </th>
                <th style={headerCell}>Reference</th>
                <th style={headerCell}>Municipality</th>
                <th style={headerCell}>Fire Type</th>
                <th style={headerCell}>Level of Danger</th>
                <th style={headerCell}>Reported At (PHT)</th>
                <th style={headerCell}>Status</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Action</th>
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

              {!loading && reports.map((row) => {
                const isSelected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.tagName === "INPUT" || target.tagName === "BUTTON") return;
                      setSelectedReportId(row.id);
                    }}
                    style={{
                      borderBottom: "1px solid #F1F5F9",
                      background: isSelected ? "#FEF2F2" : "#FFFFFF",
                      cursor: "pointer",
                      transition: "background-color 0.1s ease",
                    }}
                  >
                    <td style={{ padding: "0.75rem 1rem", textAlign: "center" }} onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(row.id)}
                        aria-label={`Select ${row.referenceNumber}`}
                      />
                    </td>

                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#0F172A", fontSize: "0.84rem" }}>
                        {row.referenceNumber}
                      </div>
                      <div style={{ fontSize: "0.71rem", color: "#64748B", fontWeight: 500, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                        <i className="fa-regular fa-comment-dots" style={{ fontSize: "0.68rem", color: "#94A3B8" }} />
                        <span>{row.reportSource === "ALAB_APP" ? "ALAB app" : "Phone call"}</span>
                      </div>
                    </td>

                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem" }}>
                      <div style={{ color: "#1E293B", fontWeight: 600 }}>{row.municipalityName}</div>
                      <div style={{ fontSize: "0.71rem", color: "#991B1B", fontWeight: 500, marginTop: 1 }}>{row.barangay}</div>
                    </td>

                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#475569" }}>
                      {getFireTypeLabel(row.fireType)}
                    </td>

                    <td style={{ padding: "0.75rem 1rem" }}>{getSeverityBadge(row.severity)}</td>

                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", whiteSpace: "nowrap" }}>
                      {formatPhilippineDateTime(row.submittedAt)}
                    </td>

                    <td style={{ padding: "0.75rem 1rem" }}>{getStatusBadge(row.status)}</td>

                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedReportId(row.id)}
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
            <div aria-live="polite">
              Showing {Math.min(total, (page - 1) * pageSize + 1)} to {Math.min(total, page * pageSize)} of{" "}
              <strong style={{ color: "#0F172A" }}>{total}</strong> records
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <label htmlFor="prc-page-size">Per page:</label>
                <select
                  id="prc-page-size"
                  value={pageSize}
                  onChange={(event) => { setPageSize(Number(event.target.value) as 25 | 50 | 100); setPage(1); }}
                  style={{ padding: "0.25rem 0.5rem", borderRadius: 4, border: "1px solid #CBD5E1", background: "#FFFFFF", fontSize: "0.78rem" }}
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
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
        <ProvincialReportDetail reportId={selectedReportId} onClose={() => setSelectedReportId(null)} />
      )}

      {/* Export Dialog Modal */}
      {isExportDialogOpen && (
        <ProvincialReportExportDialog
          isOpen={isExportDialogOpen}
          initialScope={exportScope}
          onClose={() => { setIsExportDialogOpen(false); setExportScope("ALL_MATCHING"); }}
          filters={currentFilters}
          totalMatching={total}
          currentPageCount={reports.length}
          selectedIds={selectedIds}
          sampleRows={reports}
          scopeName={scopeName}
        />
      )}
    </div>
  );
}
