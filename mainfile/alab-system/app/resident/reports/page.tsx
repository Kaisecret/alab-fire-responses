"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { reportsStyles } from "../../_content/resident-reports-content";
import type { FireReportStatus } from "../../../lib/fire-reports/types";
import { useResidentLanguage, getLocalizedStatusLabel, type ResidentLanguage, type TranslationKeys } from "../../_lib/resident-i18n";

import { useResidentText } from "../../_lib/resident-text";
import { RESIDENT_TEXT } from "../../_content/resident-text";
type Report = { id: string; reference_number: string; status: FireReportStatus; fire_type: string; submitted_at: string; municipality: string | null; barangay: string | null; };
type Filter = "ALL" | "ACTIVE" | "CLOSED";

const liveReportsStyles = `
  .reports-page-root { padding-bottom: 7rem; }
  .reports-live-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .reports-live-heading .reports-page-title { margin-bottom: .25rem; }
  .reports-empty-state { border: 1px dashed var(--border-color); border-radius: 1rem; padding: 2.5rem 1.25rem; text-align: center; color: var(--text-muted); background: #fff; }
  .reports-empty-state h2 { color: var(--text-dark); font-size: 1.1rem; margin-bottom: .4rem; }
  .reports-empty-state a { display: inline-flex; margin-top: 1rem; color: #fff; background: var(--primary-red); border-radius: .55rem; padding: .65rem .9rem; text-decoration: none; font-weight: 700; font-size: .85rem; }
  .reports-load-error { margin-bottom: 1rem; color: #b91c1c; background: #fff1f2; border: 1px solid #fecdd3; border-radius: .75rem; padding: .8rem 1rem; font-weight: 600; font-size: .88rem; }
  .reports-loading { padding: 2.2rem 0; color: var(--text-muted); font-weight: 600; }
  .reports-live-table-link { color: inherit; text-decoration: none; }
  .reports-live-table-link:hover .ref-number { color: var(--primary-red); }
  .reports-count-note { font-size: .78rem; color: var(--text-muted); font-weight: 600; white-space: nowrap; }
  .resident-fire-logo { display: block; width: 100%; height: 100%; object-fit: contain; }
  .status-summary-icon .resident-fire-logo { width: 1.18rem; height: 1.18rem; }
  @media (min-width: 951px) {
    .reports-main-layout { max-width: 1200px; margin: 0 auto; grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 950px) {
    .reports-page-root { min-height: calc(100vh - 4.75rem); padding-bottom: 7.5rem; }
    .reports-live-heading { padding: 1.15rem 1rem .25rem; }
    .reports-live-heading { display: none; }
    .reports-count-note { display: none; }
    .reports-empty-state { margin: .5rem 1rem 0; padding: 2rem 1rem; }
    .mobile-report-card { min-height: 5.7rem; }
  }
  /* PC only (1280px and wider). Phones and tablets keep the layouts above. */
  @media (min-width: 1280px) {
    .reports-page-root { background: radial-gradient(1100px 400px at 50% -170px, #FFE4E0 0%, rgba(255, 228, 224, 0) 72%), #F6F6F7; }
    .reports-page-root .reports-main-layout { max-width: 1240px; padding: 2.25rem 2.5rem 3rem; }
    .reports-live-heading { align-items: flex-end; margin-bottom: 1.5rem; }
    .reports-page-root .reports-page-title { font-size: 2.1rem; letter-spacing: -.025em; color: #0F172A; }
    .reports-page-root .reports-page-subtitle { margin-bottom: 0; font-size: 1rem; }
    .reports-count-note { padding: .5rem 1rem; border: 1px solid #ECEEF2; border-radius: 999px; background: #fff; color: #334155; font-size: .84rem; box-shadow: 0 1px 2px rgba(15, 23, 42, .04); }

    .reports-page-root .status-summary-row { gap: 1rem; margin-bottom: 1.5rem; }
    .reports-page-root .status-summary-card { position: relative; overflow: hidden; gap: 1rem; padding: 1.3rem 1.4rem; border: 1px solid #ECEEF2; border-radius: 1.2rem; background: #fff; text-align: left; font-family: inherit; box-shadow: 0 1px 2px rgba(15, 23, 42, .04), 0 8px 22px rgba(15, 23, 42, .04); transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
    .reports-page-root .status-summary-card::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; background: #CBD5E1; }
    .reports-page-root .status-summary-card:has(.submitted)::before { background: #3B82F6; }
    .reports-page-root .status-summary-card:has(.verifying)::before { background: #F59E0B; }
    .reports-page-root .status-summary-card:has(.responding)::before { background: var(--primary-red); }
    .reports-page-root .status-summary-card:has(.closed)::before { background: #16A34A; }
    .reports-page-root .status-summary-card:hover { transform: translateY(-2px); border-color: #E2E8F0; box-shadow: 0 14px 30px rgba(15, 23, 42, .08); }
    .reports-page-root .status-summary-card:focus-visible { outline: 3px solid rgba(212, 20, 11, .3); outline-offset: 2px; }
    .reports-page-root .status-summary-icon { width: 3.3rem; height: 3.3rem; border-radius: 1rem; }
    .reports-page-root .status-summary-icon .resident-fire-logo { width: 1.55rem; height: 1.55rem; }
    .reports-page-root .status-summary-label { color: #475569; font-size: .86rem; font-weight: 700; }
    .reports-page-root .status-summary-count { color: #0F172A; font-size: 2.05rem; letter-spacing: -.02em; line-height: 1.1; }

    .reports-page-root .reports-controls { gap: 1rem; margin-bottom: 1.25rem; padding: .7rem; border: 1px solid #ECEEF2; border-radius: 1.2rem; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, .04); }
    .reports-page-root .reports-search-input { padding: .9rem 1rem .9rem 2.9rem; border-color: transparent; border-radius: .9rem; background: #F4F5F7; font-size: .95rem; }
    .reports-page-root .reports-search-input:focus { border-color: var(--primary-red); background: #fff; box-shadow: 0 0 0 3px rgba(212, 20, 11, .1); }
    .reports-page-root .reports-search-wrapper svg { left: 1rem; }
    .reports-page-root .reports-filter-tabs { gap: .25rem; padding: .3rem; border-radius: .9rem; background: #F1F2F4; }
    .reports-page-root .filter-tab { padding: .65rem 1.35rem; border: 0; border-radius: .7rem; background: transparent; color: #475569; font-size: .88rem; font-weight: 700; }
    .reports-page-root .filter-tab.active + .filter-tab { border-left: 0; }
    .reports-page-root .filter-tab:hover { color: var(--primary-red); }
    .reports-page-root .filter-tab.active { background: #fff; color: var(--primary-red); box-shadow: 0 1px 3px rgba(15, 23, 42, .14); }
    .reports-page-root .filter-tab:focus-visible { outline: 3px solid rgba(212, 20, 11, .3); outline-offset: 1px; }

    .reports-page-root .reports-table-card { border: 1px solid #ECEEF2; border-radius: 1.25rem; box-shadow: 0 1px 2px rgba(15, 23, 42, .04), 0 10px 28px rgba(15, 23, 42, .05); }
    .reports-page-root .reports-table thead th { padding: 1rem 1.5rem; background: #F8F9FB; color: #64748B; font-size: .74rem; letter-spacing: .07em; }
    .reports-page-root .reports-table td { padding: 1.15rem 1.5rem; font-size: .93rem; }
    .reports-page-root .reports-table tbody tr:hover { background: #FFF8F7; }
    .reports-page-root .ref-number { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9rem; font-weight: 750; color: #0F172A; }
    .reports-page-root .location-text { font-size: .9rem; line-height: 1.4; }
    .reports-page-root .date-cell { font-size: .87rem; font-variant-numeric: tabular-nums; }
    .reports-page-root .status-badge { padding: .38rem .85rem; font-size: .78rem; }
    .reports-page-root .view-details-btn { display: inline-flex; align-items: center; min-height: 2.35rem; padding: .45rem 1.1rem; border: 1.5px solid #FCA5A5; border-radius: 999px; background: #fff; color: var(--primary-red); font-size: .84rem; }
    .reports-page-root .view-details-btn:hover { border-color: var(--primary-red); background: var(--primary-red); color: #fff; transform: none; }
    .reports-page-root .view-details-btn:focus-visible { outline: 3px solid rgba(212, 20, 11, .3); outline-offset: 2px; }
    .reports-page-root .table-footer { padding: 1rem 1.5rem; background: #FCFCFD; font-size: .85rem; }
    .reports-empty-state { padding: 4rem 2rem; border-radius: 1.25rem; }
    .reports-loading { padding: 3rem 0; font-size: 1rem; }
  }
`;

export default function ReportsPage() {
  const tx = useResidentText(RESIDENT_TEXT);
  const { lang, t } = useResidentLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/resident/fire-reports", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load your reports.");
        if (isMounted) {
          setReports(data.reports || []);
        }
      })
      .catch((cause) => {
        if (isMounted) {
          setError(cause instanceof Error ? cause.message : "Unable to load your reports.");
        }
      })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const filteredReports = useMemo(() => reports.filter((report) => {
    const matchesQuery = `${report.reference_number} ${report.barangay ?? ""} ${report.municipality ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    if (!matchesQuery) return false;
    if (filter === "ACTIVE") return !isClosed(report.status);
    if (filter === "CLOSED") return isClosed(report.status);
    return true;
  }), [filter, query, reports]);

  const submittedCount = reports.filter((report) => ["SUBMITTED", "PENDING_VERIFICATION"].includes(report.status)).length;
  const verifyingCount = reports.filter((report) => ["UNDER_VERIFICATION", "NEEDS_MORE_INFO", "VERIFIED", "CONFIRMED"].includes(report.status)).length;
  const respondingCount = reports.filter((report) => report.status === "RESPONDING").length;
  const closedCount = reports.filter((report) => isClosed(report.status)).length;

  return <>
    <style>{reportsStyles + liveReportsStyles}</style>
    <main className="reports-page-root">
      <div className="reports-main-layout">
        <section className="reports-left-col">
          <div className="reports-live-heading">
            <div>
              <h1 className="reports-page-title">{t("reportsTitle")}</h1>
              <p className="reports-page-subtitle">{t("reportsSubtitle")}</p>
            </div>
            <span className="reports-count-note">{reports.length} {reports.length === 1 ? t("reportsCountSingular") : t("reportsCountPlural")}</span>
          </div>
          {error && <p className="reports-load-error" role="alert">{tx(error)}</p>}
          <div className="status-summary-row" aria-label={tx("Report status summary")}>
            <SummaryCard label={t("statusSubmitted")} count={submittedCount} tone="submitted" onClick={() => setFilter("ACTIVE")} active={filter === "ACTIVE"} />
            <SummaryCard label={t("statusVerifying")} count={verifyingCount} tone="verifying" onClick={() => setFilter("ACTIVE")} active={filter === "ACTIVE"} />
            <SummaryCard label={t("statusResponding")} count={respondingCount} tone="responding" onClick={() => setFilter("ACTIVE")} active={filter === "ACTIVE"} />
            <SummaryCard label={t("statusResolved")} count={closedCount} tone="closed" onClick={() => setFilter("CLOSED")} active={filter === "CLOSED"} />
          </div>
          <div className="reports-controls">
            <div className="reports-search-wrapper">
              <SearchIcon />
              <input className="reports-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("reportsSearchPlaceholder")} aria-label={tx("Search fire reports")} />
            </div>
            <div className="reports-filter-tabs" aria-label={tx("Report filters")}>
              {(["ALL", "ACTIVE", "CLOSED"] as Filter[]).map((item) => (
                <button key={item} type="button" className={`filter-tab${filter === item ? " active" : ""}`} onClick={() => setFilter(item)}>
                  {item === "ALL" ? t("filterAll") : item === "ACTIVE" ? t("filterActive") : t("filterClosed")}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <p className="reports-loading">{t("reportsLoading")}</p>
          ) : filteredReports.length === 0 ? (
            <EmptyState t={t} />
          ) : <>
            <div className="reports-table-card">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>{t("thReference")}</th>
                    <th>{t("thLocation")}</th>
                    <th>{t("thDateReported")}</th>
                    <th>{t("thStatus")}</th>
                    <th>{t("thAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <Link className="reports-live-table-link" href={`/resident/reports/${report.id}`}>
                          <span className="ref-number">{report.reference_number}</span>
                        </Link>
                      </td>
                      <td><LocationCell report={report} /></td>
                      <td className="date-cell">{formatDate(report.submitted_at)}</td>
                      <td><StatusBadge status={report.status} lang={lang} /></td>
                      <td>
                        <Link className="view-details-btn" href={`/resident/reports/${report.id}`}>
                          {t("btnViewDetails")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-footer">
                <span>{t("reportsShowing")} {filteredReports.length} {t("reportsOf")} {reports.length} {reports.length === 1 ? t("reportsCountSingular") : t("reportsCountPlural")}</span>
              </div>
            </div>
            <div className="mobile-reports-list">
              {filteredReports.map((report) => (
                <Link key={report.id} href={`/resident/reports/${report.id}`} className={`mobile-report-card${report.status === "RESPONDING" ? " selected" : ""}`}>
                  <span className="mobile-report-fire-icon" aria-hidden><FireLogo /></span>
                  <span className="mobile-report-info">
                    <span className="mobile-report-ref">{report.reference_number}</span>
                    <span className="mobile-report-location"><PinIcon />{formatLocation(report)}</span>
                    <span className="mobile-report-date">{formatDate(report.submitted_at)}</span>
                  </span>
                  <span className="mobile-report-right">
                    <StatusBadge status={report.status} lang={lang} />
                    <span className="mobile-report-chevron">›</span>
                  </span>
                </Link>
              ))}
            </div>
          </>}
        </section>
      </div>
    </main>
  </>;
}

function SummaryCard({ label, count, tone, onClick, active }: { label: string; count: number; tone: string; onClick: () => void; active: boolean }) {
  return (
    <button type="button" className="status-summary-card" onClick={onClick} aria-pressed={active}>
      <span className={`status-summary-icon ${tone}`}><FireLogo /></span>
      <span className="status-summary-text">
        <span className="status-summary-label">{label}</span>
        <span className="status-summary-count">{count}</span>
      </span>
    </button>
  );
}

function StatusBadge({ status, lang }: { status: FireReportStatus; lang: ResidentLanguage }) {
  return <span className={`status-badge ${statusClass(status)}`}>{getLocalizedStatusLabel(status, lang)}</span>;
}

function LocationCell({ report }: { report: Report }) {
  const tx = useResidentText(RESIDENT_TEXT);
  return (
    <span className="location-cell">
      <PinIcon />
      <span className="location-text">
        {report.barangay || tx("Barangay not available")}
        <br />
        {report.municipality || tx("Municipality not available")}
      </span>
    </span>
  );
}

function EmptyState({ t }: { t: (key: TranslationKeys) => string }) {
  return (
    <div className="reports-empty-state">
      <h2>{t("reportsEmptyTitle")}</h2>
      <p>{t("reportsEmptyDesc")}</p>
      <Link href="/resident/report-fire">{t("btnFileReport")}</Link>
    </div>
  );
}

function isClosed(status: FireReportStatus) {
  return ["RESOLVED", "CLOSED", "REJECTED", "FALSE_REPORT", "DUPLICATE"].includes(status);
}

function statusClass(status: FireReportStatus) {
  if (["RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED"].includes(status)) return "responding";
  if (isClosed(status)) return "closed";
  if (["VERIFIED", "CONFIRMED", "UNDER_CONTROL"].includes(status)) return "confirmed";
  if (["PENDING_VERIFICATION", "UNDER_VERIFICATION", "NEEDS_MORE_INFO"].includes(status)) return "verifying";
  return "submitted";
}

function formatLocation(report: Report) {
  return [report.barangay, report.municipality].filter(Boolean).join(", ") || "Location not available";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function FireLogo() {
  return <img className="resident-fire-logo" src="/images/fire logo.webp" alt="" aria-hidden />;
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.4-4.4" />
    </svg>
  );
}

