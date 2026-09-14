"use client";

import { municipalTabFetch } from "../../lib/auth/municipal-tab-fetch";

import { createPortal } from "react-dom";
import { resolvePeriodDates } from "../../lib/municipal-bfp/reports/filters";
import React, { useState, useEffect, useRef } from "react";
import type {
  MunicipalExportDataset,
  MunicipalExportScope,
  MunicipalReportFilters,
  MunicipalReportRow,
} from "../../lib/municipal-bfp/reports/types";
import { formatPhilippineDateTime } from "../../lib/municipal-bfp/reports/formatters";

interface MunicipalReportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filters: MunicipalReportFilters;
  totalMatching: number;
  currentPageCount: number;
  selectedIds: string[];
  sampleRows: MunicipalReportRow[];
  municipalityName: string;
  initialScope?: MunicipalExportScope;
}

export function MunicipalReportExportDialog({
  isOpen,
  onClose,
  filters: inputFilters,
  totalMatching,
  currentPageCount,
  selectedIds,
  sampleRows,
  municipalityName,
  initialScope = "ALL_MATCHING",
}: MunicipalReportExportDialogProps) {
  const [dataset, setDataset] = useState<MunicipalExportDataset>("INCIDENT_REGISTER");
  const [scope, setScope] = useState<MunicipalExportScope>(initialScope);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  const handleSelectDataset = (selected: MunicipalExportDataset) => {
    setDataset(selected);
    if (selected === "MUNICIPAL_SUMMARY" || selected === "BARANGAY_BREAKDOWN") {
      setScope("ALL_MATCHING");
    }
  };

  if (!isOpen || typeof document === "undefined") return null;
  const dates = resolvePeriodDates(inputFilters.period ?? "CUSTOM", inputFilters.from, inputFilters.to);
  const filters = { ...inputFilters, ...dates };
  const previewRows = scope === "SELECTED" ? sampleRows.filter(row => selectedIds.includes(row.id)) : sampleRows;

  const dateRangeLabel =
    filters.from && filters.to
      ? `${filters.from} to ${filters.to}`
      : filters.from
        ? `From ${filters.from}`
        : filters.to
          ? `Until ${filters.to}`
          : "All recorded dates";

  const getProposedFileName = () => {
    const muniSlug = (municipalityName || "municipality")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-");
    const datesSlug =
      filters.from && filters.to
        ? `${filters.from}-to-${filters.to}`
        : filters.from
          ? `from-${filters.from}`
          : filters.to
            ? `to-${filters.to}`
            : "all-dates";

    let datasetSlug = "incident-register";
    if (dataset === "MUNICIPAL_SUMMARY") datasetSlug = "incident-summary";
    if (dataset === "BARANGAY_BREAKDOWN") datasetSlug = "barangay-breakdown";

    return `alab-${muniSlug}-${datasetSlug}-${datesSlug}-PHT.csv`;
  };

  const getEffectiveCount = () => {
    if (dataset !== "INCIDENT_REGISTER") {
      return totalMatching;
    }
    if (scope === "SELECTED") {
      return selectedIds.length;
    }
    if (scope === "CURRENT_PAGE") {
      return currentPageCount;
    }
    return totalMatching;
  };

  const effectiveCount = getEffectiveCount();
  const isRegisterEmpty = dataset === "INCIDENT_REGISTER" && effectiveCount === 0;

  const handleDownload = async () => {
    if (isRegisterEmpty || exporting) return;
    setExporting(true);
    setErrorMessage(null);

    try {
      const payload = {
        dataset,
        scope,
        selectedIds: scope === "SELECTED" ? selectedIds : undefined,
        filters,
      };

      const res = await municipalTabFetch("/api/municipal-bfp/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to generate export file.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let downloadName = getProposedFileName();
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          downloadName = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      document.body.removeChild(a);

      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Export failed. Please retry.");
    } finally {
      setExporting(false);
    }
  };

  return createPortal(
    <dialog
      onCancel={event => { event.preventDefault(); if (!exporting) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      ref={dialogRef}
      style={{
        position: "fixed",
        inset: 0,
        margin: 0, width: "100%", height: "100dvh", maxWidth: "none", maxHeight: "none", border: 0, boxSizing: "border-box",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !exporting) onClose();
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          width: "100%",
          maxWidth: 580,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
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
            alignItems: "center",
            background: "#FAFAFA",
          }}
        >
          <div>
            <h2
              id="export-dialog-title"
              style={{
                margin: 0,
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#0F172A",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <i className="fa-solid fa-file-export" style={{ color: "#D00F09" }} />
              Export Incident Data
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748B" }}>
              Authorized BFP records for {municipalityName}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={exporting}
            aria-label="Close dialog"
            style={{
              background: "transparent",
              border: "none",
              cursor: exporting ? "not-allowed" : "pointer",
              padding: "0.4rem",
              borderRadius: "50%",
              color: "#64748B",
              fontSize: "1.2rem",
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "1.5rem",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {errorMessage && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: 8,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                fontSize: "0.82rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{errorMessage}</span>
              <button
                onClick={handleDownload}
                style={{
                  background: "#DC2626",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Dataset selection */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "0.4rem",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Choose Dataset
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
              {[
                {
                  id: "INCIDENT_REGISTER" as const,
                  title: "Incident Register",
                  desc: "Individual report rows & response timeline",
                },
                {
                  id: "MUNICIPAL_SUMMARY" as const,
                  title: "Municipal Summary",
                  desc: "Intake totals, outcomes & timing averages",
                },
                {
                  id: "BARANGAY_BREAKDOWN" as const,
                  title: "Barangay Breakdown",
                  desc: "All local barangays with timing stats",
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectDataset(item.id)}
                  style={{
                    background: dataset === item.id ? "#FEF2F2" : "#FFFFFF",
                    border: `1.5px solid ${dataset === item.id ? "#D00F09" : "#E2E8F0"}`,
                    borderRadius: 8,
                    padding: "0.75rem",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: dataset === item.id ? "#991B1B" : "#1E293B",
                    }}
                  >
                    {item.title}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#64748B", lineHeight: 1.3 }}>
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Scope selection */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "0.4rem",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Export Scope
            </label>

            {dataset !== "INCIDENT_REGISTER" ? (
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 6,
                  padding: "0.6rem 0.8rem",
                  fontSize: "0.82rem",
                  color: "#475569",
                }}
              >
                <i className="fa-solid fa-info-circle" style={{ marginRight: 6, color: "#64748B" }} />
                Aggregate summaries include all matching records across the selected period.
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[
                  {
                    id: "ALL_MATCHING" as const,
                    label: `All Matching Records (${totalMatching})`,
                    disabled: false,
                  },
                  {
                    id: "SELECTED" as const,
                    label: `Selected Records (${selectedIds.length})`,
                    disabled: selectedIds.length === 0,
                  },
                  {
                    id: "CURRENT_PAGE" as const,
                    label: `Current Page (${currentPageCount})`,
                    disabled: currentPageCount === 0,
                  },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={s.disabled}
                    onClick={() => setScope(s.id)}
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: 6,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      border: `1px solid ${scope === s.id ? "#D00F09" : "#CBD5E1"}`,
                      background: scope === s.id ? "#FEF2F2" : "#FFFFFF",
                      color: s.disabled ? "#94A3B8" : scope === s.id ? "#991B1B" : "#334155",
                      cursor: s.disabled ? "not-allowed" : "pointer",
                      opacity: s.disabled ? 0.6 : 1,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Specifications & Active filters summary */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              padding: "0.9rem 1rem",
              fontSize: "0.82rem",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <div>
                <span style={{ color: "#64748B", fontSize: "0.72rem" }}>Target Format:</span>
                <div style={{ fontWeight: 700, color: "#0F172A", marginTop: 1 }}>
                  CSV (.csv, RFC 4180 compliant)
                </div>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "0.72rem" }}>Reporting Period:</span>
                <div style={{ fontWeight: 700, color: "#0F172A", marginTop: 1 }}>
                  {dateRangeLabel}
                </div>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "0.72rem" }}>Record Count:</span>
                <div
                  style={{
                    fontWeight: 800,
                    color: effectiveCount === 0 ? "#DC2626" : "#0F172A",
                    marginTop: 1,
                  }}
                >
                  {effectiveCount} matching incident records
                </div>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "0.72rem" }}>Security & Privacy:</span>
                <div style={{ fontWeight: 600, color: "#059669", marginTop: 1 }}>
                  Audited &bull; PII-Protected
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "0.75rem",
                paddingTop: "0.6rem",
                borderTop: "1px solid #E2E8F0",
                fontSize: "0.75rem",
                color: "#64748B",
              }}
            >
              <strong>Filename:</strong> <code style={{ color: "#334155" }}>{getProposedFileName()}</code>
            </div>
          </div>

          {/* Sample Data Preview Toggle */}
          {dataset === "INCIDENT_REGISTER" && sampleRows.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#D00F09",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: 0,
                }}
              >
                <i className={`fa-solid fa-chevron-${showPreview ? "up" : "down"}`} />
                {showPreview ? "Hide data preview" : "Show sample row preview"}
              </button>

              {showPreview && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    border: "1px solid #E2E8F0",
                    borderRadius: 6,
                    overflowX: "auto",
                    maxHeight: 160,
                    background: "#FFFFFF",
                  }}
                >
                  <table style={{ width: "100%", fontSize: "0.72rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F1F5F9" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Reference</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Barangay</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Status</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Reported At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 3).map((r) => (
                        <tr key={r.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "6px 8px", fontFamily: "monospace", fontWeight: 700 }}>
                            {r.referenceNumber}
                          </td>
                          <td style={{ padding: "6px 8px" }}>{r.barangay}</td>
                          <td style={{ padding: "6px 8px" }}>{r.status}</td>
                          <td style={{ padding: "6px 8px" }}>{formatPhilippineDateTime(r.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {isRegisterEmpty && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: 6,
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                color: "#92400E",
                fontSize: "0.8rem",
              }}
            >
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
              No reports match the current filter criteria. Narrow or change your filters to export records.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #E2E8F0",
            background: "#FAFAFA",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 6,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#475569",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: exporting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            ref={downloadButtonRef}
            onClick={handleDownload}
            disabled={exporting || isRegisterEmpty}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 6,
              border: "none",
              background: isRegisterEmpty ? "#94A3B8" : "linear-gradient(135deg, #D00F09, #DC2626)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: exporting || isRegisterEmpty ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: isRegisterEmpty ? "none" : "0 2px 6px rgba(208, 15, 9, 0.3)",
              opacity: exporting ? 0.8 : 1,
            }}
          >
            {exporting ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #FFFFFF",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Preparing export...
              </>
            ) : (
              <>
                <i className="fa-solid fa-download" /> Download CSV
              </>
            )}
          </button>
        </div>
      </div>
    </dialog>, document.body,
  );
}
