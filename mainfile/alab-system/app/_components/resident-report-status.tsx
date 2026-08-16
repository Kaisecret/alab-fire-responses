"use client";

import { useEffect, useState } from "react";
import { reportFireStyles } from "../_content/resident-report-fire-content";
import { fireReportStatusLabels, type FireReportStatus } from "../../lib/fire-reports/types";

type Report = {
  reference_number: string; status: FireReportStatus; description: string; nearest_landmark: string | null;
  municipality: string; barangay: string; submitted_at: string;
  history: Array<{ next_status: FireReportStatus; resident_message: string | null; created_at: string }>;
  photos: Array<{ url: string | null }>;
};

const statusStyles = `${reportFireStyles}
  .report-status-page .report-form-shell { max-width: 52rem; }
  .report-status-page .status-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; margin: 1rem 0; }
  .report-status-page .status-meta > div, .report-status-page .status-history { padding: .9rem; border: 1px solid var(--report-line); border-radius: .9rem; background: #fff; }
  .report-status-page .status-meta strong { display: block; margin-bottom: .2rem; color: var(--report-muted); font-size: .68rem; letter-spacing: .06em; text-transform: uppercase; }
  .resident-photo-button { width: 100%; margin: 1rem 0; border: 1px solid #E83B32; border-radius: .8rem; background: #FFF8F7; color: #B91E16; padding: .8rem 1rem; font: inherit; font-weight: 800; cursor: pointer; }
  .resident-photo-button:hover { background: #FFF0EE; }
  .resident-photo-backdrop { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 1rem; background: rgba(21,20,23,.72); }
  .resident-photo-dialog { position: relative; width: min(100%, 48rem); max-height: min(90dvh, 52rem); padding: .75rem; border: 1px solid rgba(255,255,255,.5); border-radius: 1.1rem; background: #fff; box-shadow: 0 24px 72px rgba(0,0,0,.4); }
  .resident-photo-dialog-image { display: block; width: 100%; max-height: calc(min(90dvh, 52rem) - 4rem); border-radius: .75rem; object-fit: contain; background: #171717; }
  .resident-photo-close { position: absolute; right: 1.15rem; top: 1.15rem; width: 2.4rem; height: 2.4rem; border: 0; border-radius: 50%; background: rgba(0,0,0,.68); color: #fff; font-size: 1.35rem; line-height: 1; cursor: pointer; }
  .report-status-page .status-history h2 { margin: 0 0 .7rem; font-size: 1rem; }
  .report-status-page .status-history ol { display: grid; gap: .65rem; margin: 0; padding-left: 1.25rem; }
  .report-status-page .status-history li { color: var(--report-muted); font-size: .84rem; line-height: 1.45; }
  .report-status-page .status-history b { color: var(--report-ink); }
  @media (max-width: 540px) { .report-status-page .status-meta { grid-template-columns: 1fr; } }
`;

export function ResidentReportStatus({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/resident/fire-reports/${reportId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) setReport(data.report);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Unable to load report."); }
    };
    void load();
    const timer = window.setInterval(load, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [reportId]);

  if (error) return <StatusShell><p className="report-submit-error" role="alert">{error}</p></StatusShell>;
  if (!report) return <StatusShell><header className="report-form-heading"><span className="report-eyebrow">ALAB EMERGENCY RESPONSE</span><h1>Loading your fire report…</h1></header></StatusShell>;

  const label = fireReportStatusLabels[report.status];
  const photoUrl = report.photos[0]?.url;
  return <StatusShell>
    <header className="report-form-heading"><span className="report-eyebrow">ALAB EMERGENCY RESPONSE</span><h1>{label}</h1><p>Keep this page open. Your incident status refreshes automatically.</p></header>
    <div className="emergency-banner"><span className="warning-banner-icon" aria-hidden>🚒</span><div><h2>{report.status === "RESPONDING" ? "BFP is responding to your fire report." : label}</h2><p>Your report updates automatically while it is active.</p></div></div>
    <div className="status-meta"><div><strong>Reference</strong>{report.reference_number}</div><div><strong>Location</strong>{report.barangay}, {report.municipality}</div><div><strong>Landmark</strong>{report.nearest_landmark || "Not provided"}</div><div><strong>Reported</strong>{new Date(report.submitted_at).toLocaleString()}</div></div>
    {report.description && <div className="status-meta"><div><strong>Description</strong>{report.description}</div></div>}
    {photoUrl && <button type="button" className="resident-photo-button" onClick={() => setIsPhotoDialogOpen(true)} aria-haspopup="dialog">View incident photo</button>}
    {isPhotoDialogOpen && photoUrl && <div className="resident-photo-backdrop" role="presentation" onMouseDown={() => setIsPhotoDialogOpen(false)}><div className="resident-photo-dialog" role="dialog" aria-modal="true" aria-label="Submitted incident photo" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="resident-photo-close" onClick={() => setIsPhotoDialogOpen(false)} aria-label="Close photo">×</button><img className="resident-photo-dialog-image" src={photoUrl} alt="Submitted fire incident" /></div></div>}
    <section className="status-history"><h2>Report updates</h2><ol>{report.history.map((item, index) => <li key={`${item.created_at}-${index}`}><b>{fireReportStatusLabels[item.next_status]}</b> — {item.resident_message || "Status updated"}</li>)}</ol></section>
  </StatusShell>;
}

function StatusShell({ children }: { children: React.ReactNode }) { return <><style>{statusStyles}</style><main className="report-page-root report-status-page"><section className="report-form-shell">{children}</section></main></>; }
