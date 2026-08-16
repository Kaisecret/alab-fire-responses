"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fireReportStatusLabels, type FireReportStatus } from "../../../lib/fire-reports/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<Array<{ id:string; reference_number:string; status:FireReportStatus; fire_type:string; submitted_at:string; municipality:string|null; barangay:string|null }>>([]);
  const [error,setError]=useState("");
  useEffect(()=>{fetch("/api/resident/fire-reports").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setReports(d.reports)}).catch(e=>setError(e.message));},[]);
  return <main className="report-form"><section className="report-card"><h1 className="report-title">My fire reports</h1>{error&&<p role="alert">{error}</p>}{reports.length===0?<p className="report-lede">No reports yet. Use Report Fire if you need immediate help.</p>:<div>{reports.map(report=><Link key={report.id} href={`/resident/reports/${report.id}`} style={{display:"block",padding:"1rem",borderBottom:"1px solid #eee",color:"inherit",textDecoration:"none"}}><b>{fireReportStatusLabels[report.status]}</b><br/><span className="muted">{report.reference_number} · {report.barangay}, {report.municipality}</span></Link>)}</div>}</section></main>;
}
