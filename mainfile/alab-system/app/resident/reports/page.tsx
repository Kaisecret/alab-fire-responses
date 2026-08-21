"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { reportsStyles } from "../../_content/resident-reports-content";
import { fireReportStatusLabels, type FireReportStatus } from "../../../lib/fire-reports/types";

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
`;

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/resident/fire-reports")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load your reports.");
        if (isMounted) setReports(data.reports);
      })
      .catch((cause) => { if (isMounted) setError(cause instanceof Error ? cause.message : "Unable to load your reports."); })
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
    <style>{reportsStyles}{liveReportsStyles}</style>
    <main className="reports-page-root">
      <div className="reports-main-layout">
        <section className="reports-left-col">
          <div className="reports-live-heading">
            <div><h1 className="reports-page-title">My fire reports</h1><p className="reports-page-subtitle">Track every update from your Municipal BFP station.</p></div>
            <span className="reports-count-note">{reports.length} report{reports.length === 1 ? "" : "s"}</span>
          </div>
          {error && <p className="reports-load-error" role="alert">{error}</p>}
          <div className="status-summary-row" aria-label="Report status summary">
            <SummaryCard label="Submitted" count={submittedCount} tone="submitted" onClick={() => setFilter("ACTIVE")} active={filter === "ACTIVE"} />
            <SummaryCard label="Verifying" count={verifyingCount} tone="verifying" onClick={() => setFilter("ACTIVE")} active={filter === "ACTIVE"} />
            <SummaryCard label="Responding" count={respondingCount} tone="responding" onClick={() => setFilter("ACTIVE")} active={filter === "ACTIVE"} />
            <SummaryCard label="Closed" count={closedCount} tone="closed" onClick={() => setFilter("CLOSED")} active={filter === "CLOSED"} />
          </div>
          <div className="reports-controls">
            <div className="reports-search-wrapper"><SearchIcon /><input className="reports-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by reference or location" aria-label="Search fire reports" /></div>
            <div className="reports-filter-tabs" aria-label="Report filters">{(["ALL", "ACTIVE", "CLOSED"] as Filter[]).map((item) => <button key={item} type="button" className={`filter-tab${filter === item ? " active" : ""}`} onClick={() => setFilter(item)}>{item === "ALL" ? "All" : item === "ACTIVE" ? "Active" : "Closed"}</button>)}</div>
          </div>
          {loading ? <p className="reports-loading">Loading your fire reports…</p> : filteredReports.length === 0 ? <EmptyState /> : <>
            <div className="reports-table-card"><table className="reports-table"><thead><tr><th>Reference no.</th><th>Location</th><th>Date reported</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredReports.map((report) => <tr key={report.id}><td><Link className="reports-live-table-link" href={`/resident/reports/${report.id}`}><span className="ref-number">{report.reference_number}</span></Link></td><td><LocationCell report={report} /></td><td className="date-cell">{formatDate(report.submitted_at)}</td><td><StatusBadge status={report.status} /></td><td><Link className="view-details-btn" href={`/resident/reports/${report.id}`}>View details</Link></td></tr>)}</tbody></table><div className="table-footer"><span>Showing {filteredReports.length} of {reports.length} report{reports.length === 1 ? "" : "s"}</span></div></div>
            <div className="mobile-reports-list">{filteredReports.map((report) => <Link key={report.id} href={`/resident/reports/${report.id}`} className={`mobile-report-card${report.status === "RESPONDING" ? " selected" : ""}`}><span className="mobile-report-fire-icon" aria-hidden><FireLogo /></span><span className="mobile-report-info"><span className="mobile-report-ref">{report.reference_number}</span><span className="mobile-report-location"><PinIcon />{formatLocation(report)}</span><span className="mobile-report-date">{formatDate(report.submitted_at)}</span></span><span className="mobile-report-right"><StatusBadge status={report.status} /><span className="mobile-report-chevron">›</span></span></Link>)}</div>
          </>}
        </section>
      </div>
    </main>
  </>;
}

function SummaryCard({ label, count, tone, onClick, active }: { label: string; count: number; tone: string; onClick: () => void; active: boolean }) { return <button type="button" className="status-summary-card" onClick={onClick} aria-pressed={active}><span className={`status-summary-icon ${tone}`}><FireLogo /></span><span className="status-summary-text"><span className="status-summary-label">{label}</span><span className="status-summary-count">{count}</span></span></button>; }
function StatusBadge({ status }: { status: FireReportStatus }) { return <span className={`status-badge ${statusClass(status)}`}>{fireReportStatusLabels[status]}</span>; }
function LocationCell({ report }: { report: Report }) { return <span className="location-cell"><PinIcon /><span className="location-text">{report.barangay || "Barangay not available"}<br />{report.municipality || "Municipality not available"}</span></span>; }
function EmptyState() { return <div className="reports-empty-state"><h2>No fire reports found</h2><p>When you submit an emergency report, its live BFP status will appear here.</p><Link href="/resident/report-fire">Report a fire</Link></div>; }
function isClosed(status: FireReportStatus) { return ["RESOLVED", "CLOSED", "REJECTED", "FALSE_REPORT", "DUPLICATE"].includes(status); }
function statusClass(status: FireReportStatus) { if (["RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED"].includes(status)) return "responding"; if (isClosed(status)) return "closed"; if (["VERIFIED", "CONFIRMED", "UNDER_CONTROL"].includes(status)) return "confirmed"; if (["PENDING_VERIFICATION", "UNDER_VERIFICATION", "NEEDS_MORE_INFO"].includes(status)) return "verifying"; return "submitted"; }
function formatLocation(report: Report) { return [report.barangay, report.municipality].filter(Boolean).join(", ") || "Location not available"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function FireLogo() { return <img className="resident-fire-logo" src="/images/fire logo.webp" alt="" aria-hidden />; }
function PinIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="8" /><path d="m21 21-4.4-4.4" /></svg>; }
