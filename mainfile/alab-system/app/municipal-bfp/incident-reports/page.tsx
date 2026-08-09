'use client';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1.5rem; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-page-header p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }
  .mbfp-ir-actions { display: flex; gap: 0.6rem; margin-bottom: 1.2rem; flex-wrap: wrap; align-items: center; justify-content: space-between; }
  .mbfp-ir-filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .mbfp-filter-btn { padding: 0.45rem 1rem; border-radius: 2rem; font-size: 0.78rem; font-weight: 600; border: 1px solid #e5e7eb; background: white; color: #4b5563; cursor: pointer; transition: all 0.15s; }
  .mbfp-filter-btn:hover, .mbfp-filter-btn.active { background: #D00F09; color: white; border-color: #D00F09; }
  .mbfp-gen-btn { padding: 0.5rem 1.2rem; border-radius: 0.5rem; font-size: 0.82rem; font-weight: 700; border: none; cursor: pointer; background: linear-gradient(135deg, #D00F09, #EF5350); color: white; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s; box-shadow: 0 2px 8px rgba(211,47,47,0.3); }
  .mbfp-gen-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(211,47,47,0.4); }
  .mbfp-data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; }
  .mbfp-data-table th { text-align: left; padding: 0.8rem 1rem; font-size: 0.72rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .mbfp-data-table td { padding: 0.75rem 1rem; font-size: 0.82rem; color: #374151; border-bottom: 1px solid #f3f4f6; font-weight: 500; }
  .mbfp-data-table tr:hover td { background: #fffbeb; }
  .mbfp-severity { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.65rem; font-weight: 700; }
  .mbfp-severity.critical { background: #fef2f2; color: #dc2626; }
  .mbfp-severity.high { background: #fff7ed; color: #ea580c; }
  .mbfp-severity.medium { background: #fffbeb; color: #d97706; }
  .mbfp-severity.low { background: #f0fdf4; color: #16a34a; }
  .mbfp-outcome { font-size: 0.72rem; font-weight: 600; }
  .mbfp-outcome.resolved { color: #16a34a; }
  .mbfp-outcome.contained { color: #2563eb; }
  .mbfp-outcome.false-alarm { color: #6b7280; }
  .mbfp-action-link { color: #D00F09; font-weight: 700; font-size: 0.75rem; text-decoration: none; transition: color 0.15s; }
  .mbfp-action-link:hover { color: #B71C1C; }
`;

export default function IncidentReportsPage() {
  const reports = [
    { id: 'RPT-2025-0087', incident: 'INC-2025-0415', location: 'Poblacion', type: 'Structure Fire', severity: 'critical', severityLabel: 'Critical', date: 'Aug 5, 2025', response: '8 min', outcome: 'resolved', outcomeLabel: 'Resolved', casualties: '0' },
    { id: 'RPT-2025-0086', incident: 'INC-2025-0413', location: 'Sampaguita', type: 'Grass Fire', severity: 'medium', severityLabel: 'Medium', date: 'Aug 4, 2025', response: '12 min', outcome: 'contained', outcomeLabel: 'Contained', casualties: '0' },
    { id: 'RPT-2025-0085', incident: 'INC-2025-0410', location: 'San Roque', type: 'False Alarm', severity: 'low', severityLabel: 'Low', date: 'Aug 3, 2025', response: '5 min', outcome: 'false-alarm', outcomeLabel: 'False Alarm', casualties: '0' },
    { id: 'RPT-2025-0084', incident: 'INC-2025-0408', location: 'Libertad', type: 'Brush Fire', severity: 'high', severityLabel: 'High', date: 'Aug 2, 2025', response: '10 min', outcome: 'resolved', outcomeLabel: 'Resolved', casualties: '0' },
    { id: 'RPT-2025-0083', incident: 'INC-2025-0405', location: 'Atabay', type: 'Structure Fire', severity: 'critical', severityLabel: 'Critical', date: 'Aug 1, 2025', response: '7 min', outcome: 'resolved', outcomeLabel: 'Resolved', casualties: '2 injured' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-page-header">
          <h1><i className="fa-solid fa-file-lines" /> Incident Reports</h1>
          <p>View historical incident reports, outcomes, and generate new reports.</p>
        </div>
        <div className="mbfp-ir-actions">
          <div className="mbfp-ir-filters">
            <button className="mbfp-filter-btn active">All Reports</button>
            <button className="mbfp-filter-btn">This Week</button>
            <button className="mbfp-filter-btn">This Month</button>
            <button className="mbfp-filter-btn">Critical Only</button>
          </div>
          <button className="mbfp-gen-btn"><i className="fa-solid fa-file-circle-plus" /> Generate New Report</button>
        </div>
        <table className="mbfp-data-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Incident</th>
              <th>Location</th>
              <th>Fire Type</th>
              <th>Severity</th>
              <th>Date</th>
              <th>Response Time</th>
              <th>Outcome</th>
              <th>Casualties</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700 }}>{r.id}</td>
                <td>{r.incident}</td>
                <td>{r.location}</td>
                <td>{r.type}</td>
                <td><span className={`mbfp-severity ${r.severity}`}>{r.severityLabel}</span></td>
                <td>{r.date}</td>
                <td>{r.response}</td>
                <td><span className={`mbfp-outcome ${r.outcome}`}>{r.outcomeLabel}</span></td>
                <td>{r.casualties}</td>
                <td><a href="#" className="mbfp-action-link">View <i className="fa-solid fa-arrow-right" /></a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
