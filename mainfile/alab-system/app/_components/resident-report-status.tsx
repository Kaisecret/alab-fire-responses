"use client";

import { useEffect, useState } from "react";
import { fireReportStatusLabels, type FireReportStatus } from "../../lib/fire-reports/types";

type Report = { reference_number: string; status: FireReportStatus; fire_type: string; description: string; nearest_landmark: string | null; municipality: string; barangay: string; submitted_at: string; history: Array<{ next_status: FireReportStatus; resident_message: string | null; created_at: string }>; photos: Array<{ url: string | null }> };
export function ResidentReportStatus({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<Report | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; const load = async () => { try { const res=await fetch(`/api/resident/fire-reports/${reportId}`,{cache:"no-store"}); const data=await res.json(); if(!res.ok) throw new Error(data.error); if(active) setReport(data.report); } catch (cause) { if(active) setError(cause instanceof Error?cause.message:"Unable to load report."); } }; load(); const timer=setInterval(load,10000); return()=>{active=false;clearInterval(timer)}; },[reportId]);
  if(error) return <p role="alert">{error}</p>; if(!report) return <p>Loading your fire report…</p>;
  const label=fireReportStatusLabels[report.status]; return <main className="report-form"><section className="report-card"><p className="muted">{report.reference_number}</p><h1 className="report-title">{label}</h1><div className="emergency-banner"><span>🚒</span><div><strong>{report.status === "RESPONDING" ? "BFP is responding to your fire report." : label}</strong><span>Your report updates automatically while it is active.</span></div></div><p><b>Location:</b> {report.barangay}, {report.municipality}</p><p><b>Landmark:</b> {report.nearest_landmark || "Not provided"}</p><p><b>Description:</b> {report.description}</p>{report.photos[0]?.url && <img className="photo-preview" src={report.photos[0].url} alt="Submitted fire incident" />}<h2>Report updates</h2><ol>{report.history.map((item,index)=><li key={`${item.created_at}-${index}`}><b>{fireReportStatusLabels[item.next_status]}</b> — {item.resident_message || "Status updated"}</li>)}</ol></section></main>;
}
