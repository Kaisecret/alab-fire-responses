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
  initialFormat?: "PDF" | "CSV" | "XLSX";
}

const styles = `
  .mbfp-xd-backdrop {
    position: fixed;
    inset: 0;
    margin: 0;
    width: 100%;
    height: 100dvh;
    max-width: none;
    max-height: none;
    border: 0;
    box-sizing: border-box;
    padding: 1rem;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .mbfp-xd-shell {
    background: #FFFFFF;
    border-radius: 14px;
    width: 100%;
    max-width: 620px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.32);
    overflow: hidden;
  }

  /* ========== HEADER ========== */
  .mbfp-xd-header {
    padding: 1.15rem 1.4rem;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    background: #FFFFFF;
  }

  .mbfp-xd-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: -0.01em;
  }

  .mbfp-xd-title i { color: #D00F09; }

  .mbfp-xd-subtitle {
    margin: 3px 0 0;
    font-size: 0.78rem;
    color: #64748B;
  }

  .mbfp-xd-close {
    background: transparent;
    border: none;
    cursor: pointer;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 8px;
    color: #64748B;
    font-size: 1.05rem;
    line-height: 1;
    transition: background 0.15s, color 0.15s;
  }

  .mbfp-xd-close:hover:not(:disabled) { background: #F1F5F9; color: #0F172A; }
  .mbfp-xd-close:disabled { cursor: not-allowed; opacity: 0.5; }

  /* ========== BODY ========== */
  .mbfp-xd-body {
    padding: 1.25rem 1.4rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
  }

  .mbfp-xd-field-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    color: #64748B;
    margin-bottom: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ========== ALERTS ========== */
  .mbfp-xd-alert {
    padding: 0.8rem 0.9rem;
    border-radius: 10px;
    font-size: 0.8rem;
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    line-height: 1.45;
  }

  .mbfp-xd-alert i { margin-top: 2px; flex-shrink: 0; }
  .mbfp-xd-alert-text { flex: 1; }

  .mbfp-xd-alert.error {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
  }

  .mbfp-xd-alert.warn {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    color: #92400E;
  }

  .mbfp-xd-retry {
    background: #FFFFFF;
    color: #B91C1C;
    border: 1px solid #FCA5A5;
    border-radius: 6px;
    padding: 4px 11px;
    font-size: 0.73rem;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .mbfp-xd-retry:hover { background: #FEF2F2; }

  /* ========== FORMAT CARDS ========== */
  .mbfp-xd-format-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .mbfp-xd-format {
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.85rem;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
    transition: border-color 0.16s, background 0.16s, box-shadow 0.16s;
  }

  .mbfp-xd-format:hover { border-color: #CBD5E1; background: #F8FAFC; }

  .mbfp-xd-format.selected {
    border-color: #D00F09;
    background: #FEF2F2;
    box-shadow: 0 2px 8px rgba(208, 15, 9, 0.1);
  }

  .mbfp-xd-format-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: #F1F5F9;
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
    transition: background 0.16s, color 0.16s;
  }

  .mbfp-xd-format.selected .mbfp-xd-format-icon { background: #FEE2E2; color: #D00F09; }

  .mbfp-xd-format-name {
    font-size: 0.83rem;
    font-weight: 700;
    color: #1E293B;
  }

  .mbfp-xd-format.selected .mbfp-xd-format-name { color: #991B1B; }

  .mbfp-xd-format-desc {
    font-size: 0.7rem;
    color: #64748B;
    margin-top: 3px;
    line-height: 1.4;
  }

  /* ========== DATASET LIST ========== */
  .mbfp-xd-dataset-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .mbfp-xd-dataset {
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.7rem 0.85rem;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    transition: border-color 0.16s, background 0.16s;
  }

  .mbfp-xd-dataset:hover { border-color: #CBD5E1; background: #F8FAFC; }
  .mbfp-xd-dataset.selected { border-color: #D00F09; background: #FEF2F2; }

  .mbfp-xd-radio {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid #CBD5E1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.16s;
  }

  .mbfp-xd-dataset.selected .mbfp-xd-radio { border-color: #D00F09; }

  .mbfp-xd-radio span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #D00F09;
  }

  .mbfp-xd-dataset-name {
    font-size: 0.82rem;
    font-weight: 700;
    color: #1E293B;
  }

  .mbfp-xd-dataset.selected .mbfp-xd-dataset-name { color: #991B1B; }

  .mbfp-xd-dataset-desc {
    font-size: 0.7rem;
    color: #64748B;
    margin-top: 2px;
    line-height: 1.4;
  }

  /* ========== SCOPE PILLS ========== */
  .mbfp-xd-scope-row {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .mbfp-xd-scope {
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #334155;
    cursor: pointer;
    transition: border-color 0.16s, background 0.16s, color 0.16s;
  }

  .mbfp-xd-scope:hover:not(:disabled) { border-color: #94A3B8; background: #F8FAFC; }

  .mbfp-xd-scope.selected {
    border-color: #D00F09;
    background: #FEF2F2;
    color: #991B1B;
  }

  .mbfp-xd-scope:disabled {
    color: #94A3B8;
    background: #F8FAFC;
    cursor: not-allowed;
  }

  .mbfp-xd-note {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    font-size: 0.78rem;
    color: #475569;
    line-height: 1.45;
  }

  .mbfp-xd-note i { margin-right: 6px; color: #94A3B8; }

  /* ========== SUMMARY PANEL ========== */
  .mbfp-xd-summary {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    overflow: hidden;
  }

  .mbfp-xd-summary-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mbfp-xd-summary-cell {
    padding: 0.7rem 0.9rem;
    border-bottom: 1px solid #E2E8F0;
  }

  .mbfp-xd-summary-cell:nth-child(odd) { border-right: 1px solid #E2E8F0; }

  .mbfp-xd-summary-key {
    display: block;
    color: #64748B;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }

  .mbfp-xd-summary-val {
    font-weight: 700;
    color: #0F172A;
    margin-top: 3px;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mbfp-xd-summary-val.empty { color: #DC2626; }
  .mbfp-xd-summary-val.secure { color: #059669; }

  .mbfp-xd-filename {
    padding: 0.6rem 0.9rem;
    font-size: 0.72rem;
    color: #64748B;
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .mbfp-xd-filename code {
    color: #334155;
    font-size: 0.72rem;
    word-break: break-all;
  }

  /* ========== PREVIEW ========== */
  .mbfp-xd-preview-toggle {
    background: transparent;
    border: none;
    color: #D00F09;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0;
  }

  .mbfp-xd-preview-wrap {
    margin-top: 0.6rem;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    overflow-x: auto;
    max-height: 170px;
    background: #FFFFFF;
  }

  .mbfp-xd-preview-table {
    width: 100%;
    font-size: 0.72rem;
    border-collapse: collapse;
    min-width: 420px;
  }

  .mbfp-xd-preview-table th {
    padding: 7px 10px;
    text-align: left;
    background: #F8FAFC;
    color: #475569;
    font-weight: 700;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .mbfp-xd-preview-table td {
    padding: 7px 10px;
    border-top: 1px solid #F1F5F9;
    color: #334155;
    white-space: nowrap;
  }

  .mbfp-xd-preview-ref { font-family: monospace; font-weight: 700; }

  /* ========== FOOTER ========== */
  .mbfp-xd-footer {
    padding: 0.9rem 1.4rem;
    border-top: 1px solid #E2E8F0;
    background: #F8FAFC;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.6rem;
  }

  .mbfp-xd-cancel {
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #475569;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .mbfp-xd-cancel:hover:not(:disabled) { background: #F1F5F9; border-color: #94A3B8; }
  .mbfp-xd-cancel:disabled { cursor: not-allowed; opacity: 0.6; }

  .mbfp-xd-submit {
    padding: 0.58rem 1.3rem;
    border-radius: 8px;
    border: none;
    background: linear-gradient(135deg, #D00F09, #EF4444);
    color: #FFFFFF;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 2px 8px rgba(208, 15, 9, 0.3);
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .mbfp-xd-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(208, 15, 9, 0.38);
  }

  .mbfp-xd-submit:disabled {
    background: #CBD5E1;
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }

  .mbfp-xd-submit.busy { opacity: 0.85; cursor: progress; }

  .mbfp-xd-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #FFFFFF;
    border-top-color: transparent;
    border-radius: 50%;
    animation: mbfpXdSpin 0.9s linear infinite;
  }

  @keyframes mbfpXdSpin { to { transform: rotate(360deg); } }

  /* ========== RESPONSIVE ========== */
  @media (max-width: 560px) {
    .mbfp-xd-backdrop { padding: 0; }
    .mbfp-xd-shell { max-height: 100dvh; border-radius: 0; }
    .mbfp-xd-format-grid { grid-template-columns: 1fr; }
    .mbfp-xd-summary-grid { grid-template-columns: 1fr; }
    .mbfp-xd-summary-cell:nth-child(odd) { border-right: none; }
    .mbfp-xd-footer { flex-direction: column-reverse; align-items: stretch; }
    .mbfp-xd-cancel, .mbfp-xd-submit { justify-content: center; }
  }
`;

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
  initialFormat = "PDF",
}: MunicipalReportExportDialogProps) {
  const [format, setFormat] = useState<"PDF" | "CSV" | "XLSX">(initialFormat);
  const [dataset, setDataset] = useState<MunicipalExportDataset>("INCIDENT_REGISTER");
  const [scope, setScope] = useState<MunicipalExportScope>(initialScope);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormat(initialFormat);
      setScope(initialScope);
    }
  }, [isOpen, initialFormat, initialScope]);

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

    const ext = format === "PDF" ? "pdf" : format === "XLSX" ? "xlsx" : "csv";
    return `alab-${muniSlug}-${datasetSlug}-${datesSlug}-PHT.${ext}`;
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
    setErrorMessage(null);
    setExporting(true);

    try {
      const payload = {
        dataset,
        scope,
        format,
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

  const formatOptions = [
    {
      id: "PDF" as const,
      icon: "fa-solid fa-file-pdf",
      name: "PDF Document (.pdf)",
      desc: "Official full-color BFP report with reporter data, badges & signatures",
    },
    {
      id: "XLSX" as const,
      icon: "fa-solid fa-file-excel",
      name: "Excel Workbook (.xlsx)",
      desc: "Formatted sheet with colour-coded danger level and status, ready to read",
    },
    {
      id: "CSV" as const,
      icon: "fa-solid fa-file-csv",
      name: "CSV Spreadsheet (.csv)",
      desc: "Raw data table (RFC 4180) for Excel, Sheets, or data archiving",
    },
  ];

  const datasetOptions = [
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
  ];

  const scopeOptions = [
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
  ];

  return createPortal(
    <dialog
      onCancel={event => { event.preventDefault(); if (!exporting) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      ref={dialogRef}
      className="mbfp-xd-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !exporting) onClose();
      }}
    >
      <style>{styles}</style>
      <div className="mbfp-xd-shell">
        {/* Header */}
        <div className="mbfp-xd-header">
          <div>
            <h2 id="export-dialog-title" className="mbfp-xd-title">
              <i className="fa-solid fa-file-export" />
              Export Incident Data
            </h2>
            <p className="mbfp-xd-subtitle">
              Authorized BFP records for {municipalityName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            aria-label="Close dialog"
            className="mbfp-xd-close"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="mbfp-xd-body">
          {errorMessage && (
            <div className="mbfp-xd-alert error">
              <i className="fa-solid fa-circle-exclamation" />
              <span className="mbfp-xd-alert-text">{errorMessage}</span>
              <button type="button" onClick={handleDownload} className="mbfp-xd-retry">
                Retry
              </button>
            </div>
          )}

          {/* Export Format selection */}
          <div>
            <label className="mbfp-xd-field-label">Select Export Format</label>
            <div className="mbfp-xd-format-grid">
              {formatOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={format === option.id}
                  onClick={() => setFormat(option.id)}
                  className={`mbfp-xd-format${format === option.id ? " selected" : ""}`}
                >
                  <span className="mbfp-xd-format-icon">
                    <i className={option.icon} />
                  </span>
                  <span>
                    <span className="mbfp-xd-format-name">{option.name}</span>
                    <span className="mbfp-xd-format-desc">{option.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Dataset selection */}
          <div>
            <label className="mbfp-xd-field-label">Choose Dataset</label>
            <div className="mbfp-xd-dataset-list">
              {datasetOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={dataset === item.id}
                  onClick={() => handleSelectDataset(item.id)}
                  className={`mbfp-xd-dataset${dataset === item.id ? " selected" : ""}`}
                >
                  <span className="mbfp-xd-radio">{dataset === item.id && <span />}</span>
                  <span>
                    <span className="mbfp-xd-dataset-name">{item.title}</span>
                    <span className="mbfp-xd-dataset-desc">{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Scope selection */}
          <div>
            <label className="mbfp-xd-field-label">Export Scope</label>

            {dataset !== "INCIDENT_REGISTER" ? (
              <div className="mbfp-xd-note">
                <i className="fa-solid fa-circle-info" />
                Aggregate summaries include all matching records across the selected period.
              </div>
            ) : (
              <div className="mbfp-xd-scope-row">
                {scopeOptions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={s.disabled}
                    aria-pressed={scope === s.id}
                    onClick={() => setScope(s.id)}
                    className={`mbfp-xd-scope${scope === s.id ? " selected" : ""}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Specifications & Active filters summary */}
          <div className="mbfp-xd-summary">
            <div className="mbfp-xd-summary-grid">
              <div className="mbfp-xd-summary-cell">
                <span className="mbfp-xd-summary-key">Target Format</span>
                <div className="mbfp-xd-summary-val">
                  {format === "PDF" ? (
                    <>
                      <i className="fa-solid fa-file-pdf" style={{ color: "#DC2626" }} />
                      <span>PDF Document</span>
                    </>
                  ) : format === "XLSX" ? (
                    <>
                      <i className="fa-solid fa-file-excel" style={{ color: "#047857" }} />
                      <span>Excel Workbook (.xlsx)</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-file-csv" style={{ color: "#059669" }} />
                      <span>CSV (RFC 4180)</span>
                    </>
                  )}
                </div>
              </div>
              <div className="mbfp-xd-summary-cell">
                <span className="mbfp-xd-summary-key">Reporting Period</span>
                <div className="mbfp-xd-summary-val">{dateRangeLabel}</div>
              </div>
              <div className="mbfp-xd-summary-cell">
                <span className="mbfp-xd-summary-key">Record Count</span>
                <div className={`mbfp-xd-summary-val${effectiveCount === 0 ? " empty" : ""}`}>
                  {effectiveCount} matching records
                </div>
              </div>
              <div className="mbfp-xd-summary-cell">
                <span className="mbfp-xd-summary-key">Security &amp; Privacy</span>
                <div className="mbfp-xd-summary-val secure">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Audited &bull; PII-Protected</span>
                </div>
              </div>
            </div>

            <div className="mbfp-xd-filename">
              <strong>Filename:</strong> <code>{getProposedFileName()}</code>
            </div>
          </div>

          {/* Sample Data Preview Toggle */}
          {dataset === "INCIDENT_REGISTER" && sampleRows.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                aria-expanded={showPreview}
                className="mbfp-xd-preview-toggle"
              >
                <i className={`fa-solid fa-chevron-${showPreview ? "up" : "down"}`} />
                {showPreview ? "Hide data preview" : "Show sample row preview"}
              </button>

              {showPreview && (
                <div className="mbfp-xd-preview-wrap">
                  <table className="mbfp-xd-preview-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Barangay</th>
                        <th>Status</th>
                        <th>Reported At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 3).map((r) => (
                        <tr key={r.id}>
                          <td className="mbfp-xd-preview-ref">{r.referenceNumber}</td>
                          <td>{r.barangay}</td>
                          <td>{r.status}</td>
                          <td>{formatPhilippineDateTime(r.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {isRegisterEmpty && (
            <div className="mbfp-xd-alert warn">
              <i className="fa-solid fa-triangle-exclamation" />
              <span className="mbfp-xd-alert-text">
                No reports match the current filter criteria. Narrow or change your filters to export records.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mbfp-xd-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="mbfp-xd-cancel"
          >
            Cancel
          </button>

          <button
            type="button"
            ref={downloadButtonRef}
            onClick={handleDownload}
            disabled={exporting || isRegisterEmpty}
            className={`mbfp-xd-submit${exporting ? " busy" : ""}`}
          >
            {exporting ? (
              <>
                <span className="mbfp-xd-spinner" />
                Preparing export...
              </>
            ) : format === "PDF" ? (
              <>
                <i className="fa-solid fa-file-pdf" /> Download PDF
              </>
            ) : format === "XLSX" ? (
              <>
                <i className="fa-solid fa-file-excel" /> Download Excel
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
