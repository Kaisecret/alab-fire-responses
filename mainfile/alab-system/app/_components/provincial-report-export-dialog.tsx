"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatPhilippineDateTime } from "../../lib/municipal-bfp/reports/formatters";
import type { ProvincialReportRow } from "../../lib/provincial-bfp/management/types";

export type ProvincialExportDataset = "INCIDENT_REGISTER" | "PROVINCIAL_SUMMARY" | "MUNICIPALITY_BREAKDOWN";
export type ProvincialExportScope = "ALL_MATCHING" | "SELECTED" | "CURRENT_PAGE";
export type ProvincialExportFormat = "PDF" | "XLSX" | "CSV";

/** The filter values the console currently has applied, already resolved to dates. */
export type ProvincialExportFilters = {
  page: number;
  pageSize: 25 | 50 | 100;
  municipalityId?: string;
  from?: string;
  to?: string;
  status?: string;
  fireType?: string;
  severity?: string;
  reportSource?: string;
  search?: string;
};

interface ProvincialReportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ProvincialExportFilters;
  totalMatching: number;
  currentPageCount: number;
  selectedIds: string[];
  sampleRows: ProvincialReportRow[];
  scopeName: string;
  initialScope?: ProvincialExportScope;
  initialFormat?: ProvincialExportFormat;
}

const styles = `
  .pbfp-xd-backdrop {
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

  .pbfp-xd-shell {
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

  .pbfp-xd-header {
    padding: 1.15rem 1.4rem;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    background: #FFFFFF;
  }

  .pbfp-xd-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: -0.01em;
  }

  .pbfp-xd-title i { color: #D00F09; }

  .pbfp-xd-subtitle {
    margin: 3px 0 0;
    font-size: 0.78rem;
    color: #64748B;
  }

  .pbfp-xd-close {
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

  .pbfp-xd-close:hover:not(:disabled) { background: #F1F5F9; color: #0F172A; }
  .pbfp-xd-close:disabled { cursor: not-allowed; opacity: 0.5; }

  .pbfp-xd-body {
    padding: 1.25rem 1.4rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
  }

  .pbfp-xd-field-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    color: #64748B;
    margin-bottom: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .pbfp-xd-alert {
    padding: 0.8rem 0.9rem;
    border-radius: 10px;
    font-size: 0.8rem;
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    line-height: 1.45;
  }

  .pbfp-xd-alert i { margin-top: 2px; flex-shrink: 0; }
  .pbfp-xd-alert-text { flex: 1; }
  .pbfp-xd-alert.error { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; }
  .pbfp-xd-alert.warn { background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; }

  .pbfp-xd-retry {
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

  .pbfp-xd-retry:hover { background: #FEF2F2; }

  .pbfp-xd-format-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .pbfp-xd-format {
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

  .pbfp-xd-format:hover { border-color: #CBD5E1; background: #F8FAFC; }

  .pbfp-xd-format.selected {
    border-color: #D00F09;
    background: #FEF2F2;
    box-shadow: 0 2px 8px rgba(208, 15, 9, 0.1);
  }

  .pbfp-xd-format-icon {
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

  .pbfp-xd-format.selected .pbfp-xd-format-icon { background: #FEE2E2; color: #D00F09; }

  .pbfp-xd-format-name { font-size: 0.83rem; font-weight: 700; color: #1E293B; }
  .pbfp-xd-format.selected .pbfp-xd-format-name { color: #991B1B; }
  .pbfp-xd-format-desc { font-size: 0.7rem; color: #64748B; margin-top: 3px; line-height: 1.4; }

  .pbfp-xd-dataset-list { display: flex; flex-direction: column; gap: 0.4rem; }

  .pbfp-xd-dataset {
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

  .pbfp-xd-dataset:hover { border-color: #CBD5E1; background: #F8FAFC; }
  .pbfp-xd-dataset.selected { border-color: #D00F09; background: #FEF2F2; }

  .pbfp-xd-radio {
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

  .pbfp-xd-dataset.selected .pbfp-xd-radio { border-color: #D00F09; }
  .pbfp-xd-radio span { width: 8px; height: 8px; border-radius: 50%; background: #D00F09; }
  .pbfp-xd-dataset-name { font-size: 0.82rem; font-weight: 700; color: #1E293B; }
  .pbfp-xd-dataset.selected .pbfp-xd-dataset-name { color: #991B1B; }
  .pbfp-xd-dataset-desc { font-size: 0.7rem; color: #64748B; margin-top: 2px; line-height: 1.4; }

  .pbfp-xd-scope-row { display: flex; gap: 0.45rem; flex-wrap: wrap; }

  .pbfp-xd-scope {
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

  .pbfp-xd-scope:hover:not(:disabled) { border-color: #94A3B8; background: #F8FAFC; }
  .pbfp-xd-scope.selected { border-color: #D00F09; background: #FEF2F2; color: #991B1B; }
  .pbfp-xd-scope:disabled { color: #94A3B8; background: #F8FAFC; cursor: not-allowed; }

  .pbfp-xd-note {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    font-size: 0.78rem;
    color: #475569;
    line-height: 1.45;
  }

  .pbfp-xd-note i { margin-right: 6px; color: #94A3B8; }

  .pbfp-xd-summary {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    overflow: hidden;
  }

  .pbfp-xd-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pbfp-xd-summary-cell { padding: 0.7rem 0.9rem; border-bottom: 1px solid #E2E8F0; }
  .pbfp-xd-summary-cell:nth-child(odd) { border-right: 1px solid #E2E8F0; }

  .pbfp-xd-summary-key {
    display: block;
    color: #64748B;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }

  .pbfp-xd-summary-val {
    font-weight: 700;
    color: #0F172A;
    margin-top: 3px;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .pbfp-xd-summary-val.empty { color: #DC2626; }
  .pbfp-xd-summary-val.secure { color: #059669; }

  .pbfp-xd-filename {
    padding: 0.6rem 0.9rem;
    font-size: 0.72rem;
    color: #64748B;
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .pbfp-xd-filename code { color: #334155; font-size: 0.72rem; word-break: break-all; }

  .pbfp-xd-preview-toggle {
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

  .pbfp-xd-preview-wrap {
    margin-top: 0.6rem;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    overflow-x: auto;
    max-height: 170px;
    background: #FFFFFF;
  }

  .pbfp-xd-preview-table { width: 100%; font-size: 0.72rem; border-collapse: collapse; min-width: 420px; }

  .pbfp-xd-preview-table th {
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

  .pbfp-xd-preview-table td {
    padding: 7px 10px;
    border-top: 1px solid #F1F5F9;
    color: #334155;
    white-space: nowrap;
  }

  .pbfp-xd-preview-ref { font-family: monospace; font-weight: 700; }

  .pbfp-xd-footer {
    padding: 0.9rem 1.4rem;
    border-top: 1px solid #E2E8F0;
    background: #F8FAFC;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.6rem;
  }

  .pbfp-xd-cancel {
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

  .pbfp-xd-cancel:hover:not(:disabled) { background: #F1F5F9; border-color: #94A3B8; }
  .pbfp-xd-cancel:disabled { cursor: not-allowed; opacity: 0.6; }

  .pbfp-xd-submit {
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

  .pbfp-xd-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(208, 15, 9, 0.38);
  }

  .pbfp-xd-submit:disabled { background: #CBD5E1; box-shadow: none; cursor: not-allowed; transform: none; }
  .pbfp-xd-submit.busy { opacity: 0.85; cursor: progress; }

  .pbfp-xd-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #FFFFFF;
    border-top-color: transparent;
    border-radius: 50%;
    animation: pbfpXdSpin 0.9s linear infinite;
  }

  @keyframes pbfpXdSpin { to { transform: rotate(360deg); } }

  @media (max-width: 560px) {
    .pbfp-xd-backdrop { padding: 0; }
    .pbfp-xd-shell { max-height: 100dvh; border-radius: 0; }
    .pbfp-xd-format-grid { grid-template-columns: 1fr; }
    .pbfp-xd-summary-grid { grid-template-columns: 1fr; }
    .pbfp-xd-summary-cell:nth-child(odd) { border-right: none; }
    .pbfp-xd-footer { flex-direction: column-reverse; align-items: stretch; }
    .pbfp-xd-cancel, .pbfp-xd-submit { justify-content: center; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pbfp-xd-submit:hover:not(:disabled) { transform: none; }
    .pbfp-xd-spinner { animation-duration: 2s; }
  }
`;

export function ProvincialReportExportDialog({
  isOpen,
  onClose,
  filters,
  totalMatching,
  currentPageCount,
  selectedIds,
  sampleRows,
  scopeName,
  initialScope = "ALL_MATCHING",
  initialFormat = "PDF",
}: ProvincialReportExportDialogProps) {
  const [format, setFormat] = useState<ProvincialExportFormat>(initialFormat);
  const [dataset, setDataset] = useState<ProvincialExportDataset>("INCIDENT_REGISTER");
  const [scope, setScope] = useState<ProvincialExportScope>(initialScope);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

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

  const handleSelectDataset = (selected: ProvincialExportDataset) => {
    setDataset(selected);
    if (selected !== "INCIDENT_REGISTER") setScope("ALL_MATCHING");
  };

  if (!isOpen || typeof document === "undefined") return null;

  const previewRows = scope === "SELECTED" ? sampleRows.filter((row) => selectedIds.includes(row.id)) : sampleRows;

  const dateRangeLabel =
    filters.from && filters.to
      ? `${filters.from} to ${filters.to}`
      : filters.from
        ? `From ${filters.from}`
        : filters.to
          ? `Until ${filters.to}`
          : "All recorded dates";

  const getProposedFileName = () => {
    const datesSlug =
      filters.from && filters.to
        ? `${filters.from}-to-${filters.to}`
        : filters.from
          ? `from-${filters.from}`
          : filters.to
            ? `to-${filters.to}`
            : "all-dates";

    let datasetSlug = "incident-register";
    if (dataset === "PROVINCIAL_SUMMARY") datasetSlug = "provincial-summary";
    if (dataset === "MUNICIPALITY_BREAKDOWN") datasetSlug = "municipality-breakdown";

    const ext = format === "PDF" ? "pdf" : format === "XLSX" ? "xlsx" : "csv";
    return `antique-${datasetSlug}-${datesSlug}-PHT.${ext}`;
  };

  const effectiveCount =
    dataset !== "INCIDENT_REGISTER"
      ? totalMatching
      : scope === "SELECTED"
        ? selectedIds.length
        : scope === "CURRENT_PAGE"
          ? currentPageCount
          : totalMatching;

  const isRegisterEmpty = dataset === "INCIDENT_REGISTER" && effectiveCount === 0;

  const handleDownload = async () => {
    if (isRegisterEmpty || exporting) return;
    setErrorMessage(null);
    setExporting(true);

    try {
      const response = await fetch("/api/provincial-bfp/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          dataset,
          scope,
          format,
          selectedIds: scope === "SELECTED" ? selectedIds : undefined,
          filters,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Unable to generate export file.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const named = disposition ? /filename="?([^"]+)"?/.exec(disposition)?.[1] : undefined;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = named || getProposedFileName();
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      link.remove();

      onClose();
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Export failed. Please retry.");
    } finally {
      setExporting(false);
    }
  };

  const formatOptions = [
    {
      id: "PDF" as const,
      icon: "fa-solid fa-file-pdf",
      name: "PDF Document (.pdf)",
      desc: "Official full-colour BFP report with letterhead, badges & signatures",
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
      id: "PROVINCIAL_SUMMARY" as const,
      title: "Provincial Summary",
      desc: "Intake totals, outcomes & timing averages",
    },
    {
      id: "MUNICIPALITY_BREAKDOWN" as const,
      title: "Municipality Breakdown",
      desc: "All Antique municipalities with incident totals",
    },
  ];

  const scopeOptions = [
    { id: "ALL_MATCHING" as const, label: `All Matching Records (${totalMatching})`, disabled: false },
    { id: "SELECTED" as const, label: `Selected Records (${selectedIds.length})`, disabled: selectedIds.length === 0 },
    { id: "CURRENT_PAGE" as const, label: `Current Page (${currentPageCount})`, disabled: currentPageCount === 0 },
  ];

  return createPortal(
    <dialog
      onCancel={(event) => { event.preventDefault(); if (!exporting) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="provincial-export-dialog-title"
      ref={dialogRef}
      className="pbfp-xd-backdrop"
      onClick={(event) => { if (event.target === event.currentTarget && !exporting) onClose(); }}
    >
      <style>{styles}</style>
      <div className="pbfp-xd-shell">
        <div className="pbfp-xd-header">
          <div>
            <h2 id="provincial-export-dialog-title" className="pbfp-xd-title">
              <i className="fa-solid fa-file-export" />
              Export Incident Data
            </h2>
            <p className="pbfp-xd-subtitle">Authorized BFP records for {scopeName}</p>
          </div>

          <button type="button" onClick={onClose} disabled={exporting} aria-label="Close dialog" className="pbfp-xd-close">
            &times;
          </button>
        </div>

        <div className="pbfp-xd-body">
          {errorMessage && (
            <div className="pbfp-xd-alert error">
              <i className="fa-solid fa-circle-exclamation" />
              <span className="pbfp-xd-alert-text">{errorMessage}</span>
              <button type="button" onClick={handleDownload} className="pbfp-xd-retry">Retry</button>
            </div>
          )}

          <div>
            <label className="pbfp-xd-field-label">Select Export Format</label>
            <div className="pbfp-xd-format-grid">
              {formatOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={format === option.id}
                  onClick={() => setFormat(option.id)}
                  className={`pbfp-xd-format${format === option.id ? " selected" : ""}`}
                >
                  <span className="pbfp-xd-format-icon"><i className={option.icon} /></span>
                  <span>
                    <span className="pbfp-xd-format-name">{option.name}</span>
                    <span className="pbfp-xd-format-desc">{option.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="pbfp-xd-field-label">Choose Dataset</label>
            <div className="pbfp-xd-dataset-list">
              {datasetOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={dataset === item.id}
                  onClick={() => handleSelectDataset(item.id)}
                  className={`pbfp-xd-dataset${dataset === item.id ? " selected" : ""}`}
                >
                  <span className="pbfp-xd-radio">{dataset === item.id && <span />}</span>
                  <span>
                    <span className="pbfp-xd-dataset-name">{item.title}</span>
                    <span className="pbfp-xd-dataset-desc">{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="pbfp-xd-field-label">Export Scope</label>
            {dataset !== "INCIDENT_REGISTER" ? (
              <div className="pbfp-xd-note">
                <i className="fa-solid fa-circle-info" />
                Aggregate summaries include all matching records across the selected period.
              </div>
            ) : (
              <div className="pbfp-xd-scope-row">
                {scopeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={option.disabled}
                    aria-pressed={scope === option.id}
                    onClick={() => setScope(option.id)}
                    className={`pbfp-xd-scope${scope === option.id ? " selected" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pbfp-xd-summary">
            <div className="pbfp-xd-summary-grid">
              <div className="pbfp-xd-summary-cell">
                <span className="pbfp-xd-summary-key">Target Format</span>
                <div className="pbfp-xd-summary-val">
                  {format === "PDF" ? (
                    <><i className="fa-solid fa-file-pdf" style={{ color: "#DC2626" }} /><span>PDF Document</span></>
                  ) : format === "XLSX" ? (
                    <><i className="fa-solid fa-file-excel" style={{ color: "#047857" }} /><span>Excel Workbook (.xlsx)</span></>
                  ) : (
                    <><i className="fa-solid fa-file-csv" style={{ color: "#059669" }} /><span>CSV (RFC 4180)</span></>
                  )}
                </div>
              </div>
              <div className="pbfp-xd-summary-cell">
                <span className="pbfp-xd-summary-key">Reporting Period</span>
                <div className="pbfp-xd-summary-val">{dateRangeLabel}</div>
              </div>
              <div className="pbfp-xd-summary-cell">
                <span className="pbfp-xd-summary-key">Record Count</span>
                <div className={`pbfp-xd-summary-val${effectiveCount === 0 ? " empty" : ""}`}>
                  {effectiveCount} matching records
                </div>
              </div>
              <div className="pbfp-xd-summary-cell">
                <span className="pbfp-xd-summary-key">Security &amp; Privacy</span>
                <div className="pbfp-xd-summary-val secure">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Audited &bull; PII-Protected</span>
                </div>
              </div>
            </div>

            <div className="pbfp-xd-filename">
              <strong>Filename:</strong> <code>{getProposedFileName()}</code>
            </div>
          </div>

          {dataset === "INCIDENT_REGISTER" && sampleRows.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                aria-expanded={showPreview}
                className="pbfp-xd-preview-toggle"
              >
                <i className={`fa-solid fa-chevron-${showPreview ? "up" : "down"}`} />
                {showPreview ? "Hide data preview" : "Show sample row preview"}
              </button>

              {showPreview && (
                <div className="pbfp-xd-preview-wrap">
                  <table className="pbfp-xd-preview-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Municipality</th>
                        <th>Status</th>
                        <th>Reported At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 3).map((row) => (
                        <tr key={row.id}>
                          <td className="pbfp-xd-preview-ref">{row.referenceNumber}</td>
                          <td>{row.municipalityName}</td>
                          <td>{row.status}</td>
                          <td>{formatPhilippineDateTime(row.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {isRegisterEmpty && (
            <div className="pbfp-xd-alert warn">
              <i className="fa-solid fa-triangle-exclamation" />
              <span className="pbfp-xd-alert-text">
                No reports match the current filter criteria. Narrow or change your filters to export records.
              </span>
            </div>
          )}
        </div>

        <div className="pbfp-xd-footer">
          <button type="button" onClick={onClose} disabled={exporting} className="pbfp-xd-cancel">Cancel</button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={exporting || isRegisterEmpty}
            className={`pbfp-xd-submit${exporting ? " busy" : ""}`}
          >
            {exporting ? (
              <><span className="pbfp-xd-spinner" />Preparing export...</>
            ) : format === "PDF" ? (
              <><i className="fa-solid fa-file-pdf" /> Download PDF</>
            ) : format === "XLSX" ? (
              <><i className="fa-solid fa-file-excel" /> Download Excel</>
            ) : (
              <><i className="fa-solid fa-download" /> Download CSV</>
            )}
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
