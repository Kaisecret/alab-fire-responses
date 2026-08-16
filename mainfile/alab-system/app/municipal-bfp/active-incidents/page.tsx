'use client';

import { useEffect, useState } from "react";
import { MunicipalIncidentDetail } from "../../_components/municipal-incident-detail";

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1.5rem; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-page-header p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }
  .mbfp-page-actions { display: flex; gap: 0.6rem; margin-bottom: 1.2rem; }
  .mbfp-filter-btn { padding: 0.45rem 1rem; border-radius: 2rem; font-size: 0.78rem; font-weight: 600; border: 1px solid #e5e7eb; background: white; color: #4b5563; cursor: pointer; transition: all 0.15s; }
  .mbfp-filter-btn:hover, .mbfp-filter-btn.active { background: #D00F09; color: white; border-color: #D00F09; }
  .mbfp-data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; }
  .mbfp-data-table th { text-align: left; padding: 0.8rem 1rem; font-size: 0.72rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .mbfp-data-table td { padding: 0.75rem 1rem; font-size: 0.82rem; color: #374151; border-bottom: 1px solid #f3f4f6; font-weight: 500; }
  .mbfp-data-table tr:hover td { background: #fffbeb; }
  .mbfp-status { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem; border-radius: 2rem; font-size: 0.68rem; font-weight: 700; }
  .mbfp-status.critical { background: #fef2f2; color: #dc2626; }
  .mbfp-status.high { background: #fff7ed; color: #ea580c; }
  .mbfp-status.medium { background: #fffbeb; color: #d97706; }
  .mbfp-status.active { background: #f0fdf4; color: #16a34a; }
  .mbfp-status.dispatched { background: #eff6ff; color: #2563eb; }
  .mbfp-status.responding { background: #fffbeb; color: #b45309; }
  .mbfp-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .mbfp-action-link { color: #D00F09; font-weight: 700; font-size: 0.75rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem; transition: color 0.15s; }
  .mbfp-action-link:hover { color: #B71C1C; }
`;

export default function ActiveIncidentsPage() {
  const [incidents,setIncidents]=useState<Array<{id:string;referenceNumber:string;residentName:string;fireType:string;status:string;barangay:string;landmark:string|null;submittedAt:string}>>([]); const [selected,setSelected]=useState<string|null>(null); const [error,setError]=useState(""); const load=()=>fetch("/api/municipal-bfp/incidents",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setIncidents(d.incidents)}).catch(e=>setError(e.message)); useEffect(()=>{load()},[]); if(selected)return <MunicipalIncidentDetail incidentId={selected} onResponded={load}/>;
  return <><style>{styles}</style><div className="mbfp-page"><div className="mbfp-page-header"><h1><i className="fa-solid fa-fire"/> Active Incidents</h1><p>Live emergency reports in your assigned municipality.</p></div>{error&&<p role="alert">{error}</p>}<table className="mbfp-data-table"><thead><tr><th>Report</th><th>Resident</th><th>Location</th><th>Fire type</th><th>Status</th><th>Action</th></tr></thead><tbody>{incidents.length===0?<tr><td colSpan={6}>No active incidents in your municipality.</td></tr>:incidents.map(inc=><tr key={inc.id}><td>{inc.referenceNumber}</td><td>{inc.residentName}</td><td>{inc.barangay}<br/>{inc.landmark||"No landmark"}</td><td>{inc.fireType.replaceAll("_"," ")}</td><td>{inc.status.replaceAll("_"," ")}</td><td><button className="mbfp-action-link" onClick={()=>setSelected(inc.id)}>Open</button></td></tr>)}</tbody></table></div></>;
}
