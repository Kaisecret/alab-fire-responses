"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolvePeriodDates } from "../../lib/municipal-bfp/reports/filters";
import {
  formatPhilippineDateTime,
  getFireTypeLabel,
  getSeverityLabel,
  getStatusLabel,
} from "../../lib/municipal-bfp/reports/formatters";
import type { MunicipalReportPeriod } from "../../lib/municipal-bfp/reports/types";
import type { ProvincialReportRow, ProvincialReportSummary } from "../../lib/provincial-bfp/management/types";
import { SkeletonTableRows } from "./skeleton-loader";
import { ProvincialReportDetail } from "./provincial-report-detail";
import {
  ProvincialReportExportDialog,
  type ProvincialExportFilters,
  type ProvincialExportScope,
} from "./provincial-report-export-dialog";
import { StatCards } from "./municipal-stat-cards";
import { ProvincialTableToolbar } from "./provincial-management-toolbar";
import { FireCommandHeader } from "./fire-command-header";

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
  const [pageSize, setPageSize] = useState<7 | 25 | 50 | 100>(() => {
    const size = Number(readParam("pageSize"));
    return size === 25 || size === 50 || size === 100 ? size : 7;
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
  const hasLoaded = useRef(false);
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
    sync("pageSize", pageSize, 7);
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
      setLoading(!hasLoaded.current);
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
        hasLoaded.current = true;
        setReports(items);
        setSelectedIds(previous => previous.filter(id => items.some(item => item.id === id)));
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

  useEffect(() => {
    const refreshVisible = () => { if (document.visibilityState === "visible") setRevision(value => value + 1); };
    const interval = window.setInterval(refreshVisible, 60000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refreshVisible); };
  }, []);

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
      <FireCommandHeader slotId="provincial-fire-command-header" title="Incident Reports" icon="fa-file-shield" />

      {/* Summary strip, in the same hand as the municipal counters. */}
      <StatCards
        label="Report totals"
        items={[
          { key: "total", icon: "fa-folder-open", tone: "slate", badge: "Intake", value: summary?.totalReports ?? 0, label: "Total Reports" },
          { key: "confirmed", icon: "fa-fire", tone: "red", badge: confirmedIncidents > 0 ? "Confirmed" : "None", value: confirmedIncidents, label: "Confirmed Incidents" },
          { key: "resolved", icon: "fa-circle-check", tone: "emerald", badge: resolvedIncidents > 0 ? "Closed" : "Open", value: resolvedIncidents, label: "Resolved Incidents" },
        ]}
      />

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
              <option value="OTHER">Rubbish Fire</option>
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
        <ProvincialTableToolbar title="Incident records">
          <button
            type="button"
            onClick={() => downloadPdf("PROVINCIAL_SUMMARY")}
            disabled={pdfBusy !== null}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              minHeight: 44,
              padding: "0.65rem 1.2rem",
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: "0.85rem",
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
              gap: "0.5rem",
              minHeight: 44,
              padding: "0.65rem 1.2rem",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #D00F09, #DC2626)",
              color: "#FFFFFF",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(208, 15, 9, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <i className="fa-solid fa-file-export" /> Export data
          </button>
        </ProvincialTableToolbar>
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
                <SkeletonTableRows rows={7} columns={8} label="Loading incident records" />
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
                  onChange={(event) => { setPageSize(Number(event.target.value) as 7 | 25 | 50 | 100); setPage(1); }}
                  style={{ padding: "0.25rem 0.5rem", borderRadius: 4, border: "1px solid #CBD5E1", background: "#FFFFFF", fontSize: "0.78rem" }}
                >
                  <option value={7}>7</option>
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
