"use client";

import { useEffect, useState } from "react";
import { reportFireStyles } from "../_content/resident-report-fire-content";
import { fireReportStatusLabels, type FireReportStatus } from "../../lib/fire-reports/types";

type Report = {
  reference_number: string;
  status: FireReportStatus;
  description: string;
  nearest_landmark: string | null;
  municipality: string;
  barangay: string;
  submitted_at: string;
  history: Array<{ next_status: FireReportStatus; resident_message: string | null; created_at: string }>;
  photos: Array<{ url: string | null }>;
};

const statusStyles = `${reportFireStyles}
  .report-status-page .report-form-shell { max-width: 52rem; }
  .report-status-page .status-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; margin: 1rem 0; }
  .report-status-page .status-meta > div, .report-status-page .status-history { padding: .9rem; border: 1px solid var(--report-line); border-radius: .9rem; background: #fff; }
  .report-status-page .status-meta strong { display: block; margin-bottom: .2rem; color: var(--report-muted); font-size: .68rem; letter-spacing: .06em; text-transform: uppercase; }
  .resident-report-photo { display: block; width: 100%; max-height: clamp(12rem, 52vw, 22rem); margin: 1rem 0; border: 1px solid #F1D8D5; border-radius: 1rem; object-fit: cover; background: #FFF8F7; }
  .report-status-page .status-history h2 { margin: 0 0 .7rem; font-size: 1rem; }
  .report-status-page .status-history ol { display: grid; gap: .65rem; margin: 0; padding-left: 1.25rem; }
  .report-status-page .status-history li { color: var(--report-muted); font-size: .84rem; line-height: 1.45; }
  .report-status-page .status-history b { color: var(--report-ink); }
  @media (max-width: 540px) { .report-status-page .status-meta { grid-template-columns: 1fr; } }
`;

export function ResidentReportStatus({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/resident/fire-reports/${reportId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) setReport(data.report);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load report.");
      }
    };
    void load();
    const timer = window.setInterval(load, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [reportId]);

  if (error) return <StatusShell><p className="report-submit-error" role="alert">{error}</p></StatusShell>;
  if (!report) return <StatusShell><header className="report-form-heading"><span className="report-eyebrow">ALAB EMERGENCY RESPONSE</span><h1>Loading your fire report…</h1></header></StatusShell>;

  const label = fireReportStatusLabels[report.status];
  return <StatusShell><header className="report-form-heading"><span className="report-eyebrow">ALAB EMERGENCY RESPONSE</span><h1>{label}</h1><p>Keep this page open. Your incident status refreshes automatically.</p></header><div className="emergency-banner"><span className="warning-banner-icon" aria-hidden>🚒</span><div><h2>{report.status === "RESPONDING" ? "BFP is responding to your fire report." : label}</h2><p>Your report updates automatically while it is active.</p></div></div><div className="status-meta"><div><strong>Reference</strong>{report.reference_number}</div><div><strong>Location</strong>{report.barangay}, {report.municipality}</div><div><strong>Landmark</strong>{report.nearest_landmark || "Not provided"}</div><div><strong>Reported</strong>{new Date(report.submitted_at).toLocaleString()}</div></div>{report.description && <div className="status-meta"><div><strong>Description</strong>{report.description}</div></div>}{report.photos[0]?.url && <img className="resident-report-photo" src={report.photos[0].url} alt="Submitted fire incident" />}<section className="status-history"><h2>Report updates</h2><ol>{report.history.map((item, index) => <li key={`${item.created_at}-${index}`}><b>{fireReportStatusLabels[item.next_status]}</b> — {item.resident_message || "Status updated"}</li>)}</ol></section></StatusShell>;
}

function StatusShell({ children }: { children: React.ReactNode }) {
  return <><style>{statusStyles}</style><main className="report-page-root report-status-page"><section className="report-form-shell">{children}</section></main></>;
}
