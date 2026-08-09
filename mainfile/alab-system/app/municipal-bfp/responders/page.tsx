'use client';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1.5rem; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-page-header p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }
  .mbfp-resp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  .mbfp-resp-stat { background: white; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; text-align: center; }
  .mbfp-resp-stat-value { font-size: 1.8rem; font-weight: 800; color: #1f2937; }
  .mbfp-resp-stat-label { font-size: 0.72rem; color: #6b7280; font-weight: 600; }
  .mbfp-resp-stat-value.on-duty { color: #16a34a; }
  .mbfp-resp-stat-value.off-duty { color: #6b7280; }
  .mbfp-resp-stat-value.on-scene { color: #D00F09; }
  .mbfp-resp-stat-value.total { color: #1565C0; }
  .mbfp-data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; }
  .mbfp-data-table th { text-align: left; padding: 0.8rem 1rem; font-size: 0.72rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .mbfp-data-table td { padding: 0.75rem 1rem; font-size: 0.82rem; color: #374151; border-bottom: 1px solid #f3f4f6; font-weight: 500; }
  .mbfp-data-table tr:hover td { background: #fef2f2; }
  .mbfp-resp-avatar { width: 2rem; height: 2rem; border-radius: 50%; background: linear-gradient(135deg, #D00F09, #EF5350); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.7rem; font-weight: 800; }
  .mbfp-resp-name-cell { display: flex; align-items: center; gap: 0.6rem; }
  .mbfp-resp-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.65rem; font-weight: 700; }
  .mbfp-resp-badge.on-duty { background: #f0fdf4; color: #16a34a; }
  .mbfp-resp-badge.off-duty { background: #f3f4f6; color: #6b7280; }
  .mbfp-resp-badge.on-scene { background: #fef2f2; color: #D00F09; }
  .mbfp-resp-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
`;

export default function RespondersPage() {
  const responders = [
    { name: 'FO3 Ricardo Santos', initials: 'RS', rank: 'Fire Officer III', unit: 'Engine 1', shift: 'Day Shift', status: 'on-duty', statusLabel: 'On Duty', phone: '(036) 555-0101' },
    { name: 'FO2 Ana Reyes', initials: 'AR', rank: 'Fire Officer II', unit: 'Engine 1', shift: 'Day Shift', status: 'on-scene', statusLabel: 'On Scene', phone: '(036) 555-0102' },
    { name: 'FO2 Marco Villanueva', initials: 'MV', rank: 'Fire Officer II', unit: 'Engine 2', shift: 'Day Shift', status: 'on-duty', statusLabel: 'On Duty', phone: '(036) 555-0103' },
    { name: 'FO1 Jose Garcia', initials: 'JG', rank: 'Fire Officer I', unit: 'Rescue 1', shift: 'Day Shift', status: 'on-scene', statusLabel: 'On Scene', phone: '(036) 555-0104' },
    { name: 'FO1 Maria Lopez', initials: 'ML', rank: 'Fire Officer I', unit: 'Engine 2', shift: 'Night Shift', status: 'off-duty', statusLabel: 'Off Duty', phone: '(036) 555-0105' },
    { name: 'SF Juan Cruz', initials: 'JC', rank: 'Senior Fire Officer', unit: 'Command', shift: 'Day Shift', status: 'on-duty', statusLabel: 'On Duty', phone: '(036) 555-0106' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-page-header">
          <h1><i className="fa-solid fa-users" /> Responders</h1>
          <p>View and manage the responder roster, shift assignments, and current deployment status.</p>
        </div>
        <div className="mbfp-resp-stats">
          <div className="mbfp-resp-stat">
            <div className="mbfp-resp-stat-value on-duty">18</div>
            <div className="mbfp-resp-stat-label">On Duty</div>
          </div>
          <div className="mbfp-resp-stat">
            <div className="mbfp-resp-stat-value on-scene">5</div>
            <div className="mbfp-resp-stat-label">On Scene</div>
          </div>
          <div className="mbfp-resp-stat">
            <div className="mbfp-resp-stat-value off-duty">12</div>
            <div className="mbfp-resp-stat-label">Off Duty</div>
          </div>
          <div className="mbfp-resp-stat">
            <div className="mbfp-resp-stat-value total">35</div>
            <div className="mbfp-resp-stat-label">Total Personnel</div>
          </div>
        </div>
        <table className="mbfp-data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rank</th>
              <th>Assigned Unit</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {responders.map((r) => (
              <tr key={r.name}>
                <td>
                  <div className="mbfp-resp-name-cell">
                    <div className="mbfp-resp-avatar">{r.initials}</div>
                    <span style={{ fontWeight: 700 }}>{r.name}</span>
                  </div>
                </td>
                <td>{r.rank}</td>
                <td>{r.unit}</td>
                <td>{r.shift}</td>
                <td><span className={`mbfp-resp-badge ${r.status}`}><span className="mbfp-resp-badge-dot" />{r.statusLabel}</span></td>
                <td style={{ fontSize: '0.78rem' }}>{r.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
