'use client';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1.5rem; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #0097A7; }
  .mbfp-page-header p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }
  .mbfp-ws-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .mbfp-ws-card { background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
  .mbfp-ws-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
  .mbfp-ws-card-top { background: linear-gradient(135deg, #00695C 0%, #26A69A 100%); padding: 0.8rem 1rem; display: flex; align-items: center; gap: 0.7rem; color: white; }
  .mbfp-ws-card-icon { width: 2.5rem; height: 2.5rem; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
  .mbfp-ws-card-name { font-size: 0.9rem; font-weight: 800; }
  .mbfp-ws-card-type { font-size: 0.68rem; font-weight: 600; opacity: 0.85; }
  .mbfp-ws-card-body { padding: 0.8rem 1rem; }
  .mbfp-ws-detail { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #f9fafb; font-size: 0.78rem; }
  .mbfp-ws-detail:last-child { border-bottom: none; }
  .mbfp-ws-detail-label { color: #6b7280; font-weight: 600; }
  .mbfp-ws-detail-value { color: #1f2937; font-weight: 700; }
  .mbfp-ws-status { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.65rem; font-weight: 700; }
  .mbfp-ws-status.active { background: #f0fdf4; color: #16a34a; }
  .mbfp-ws-status.seasonal { background: #fffbeb; color: #d97706; }
  .mbfp-ws-status.dry { background: #fef2f2; color: #dc2626; }
  .mbfp-ws-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
`;

export default function WaterSourcesPage() {
  const sources = [
    { name: 'San Jose Hydrant #01', type: 'Fire Hydrant', barangay: 'Poblacion', pressure: '4.5 bar', capacity: 'Continuous', lastChecked: 'Aug 3, 2025', status: 'active', statusLabel: 'Active' },
    { name: 'San Jose Hydrant #02', type: 'Fire Hydrant', barangay: 'Poblacion', pressure: '4.2 bar', capacity: 'Continuous', lastChecked: 'Aug 2, 2025', status: 'active', statusLabel: 'Active' },
    { name: 'San Jose Hydrant #03', type: 'Fire Hydrant', barangay: 'San Roque', pressure: '3.8 bar', capacity: 'Continuous', lastChecked: 'Aug 1, 2025', status: 'active', statusLabel: 'Active' },
    { name: 'Sibalom River Access', type: 'Natural Source', barangay: 'Libertad', pressure: 'N/A', capacity: 'High', lastChecked: 'Jul 28, 2025', status: 'seasonal', statusLabel: 'Seasonal' },
    { name: 'Barangay Water Tank', type: 'Water Tank', barangay: 'Sampaguita', pressure: '2.5 bar', capacity: '15,000 L', lastChecked: 'Jul 25, 2025', status: 'active', statusLabel: 'Active' },
    { name: 'Old Reservoir', type: 'Reservoir', barangay: 'Atabay', pressure: 'Low', capacity: '5,000 L', lastChecked: 'Jul 10, 2025', status: 'dry', statusLabel: 'Low/Dry' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-page-header">
          <h1><i className="fa-solid fa-droplet" /> Water Sources</h1>
          <p>Monitor and manage water source locations, capacity, and availability for fire suppression.</p>
        </div>
        <div className="mbfp-ws-grid">
          {sources.map((s) => (
            <div className="mbfp-ws-card" key={s.name}>
              <div className="mbfp-ws-card-top">
                <div className="mbfp-ws-card-icon"><i className="fa-solid fa-droplet" /></div>
                <div>
                  <div className="mbfp-ws-card-name">{s.name}</div>
                  <div className="mbfp-ws-card-type">{s.type}</div>
                </div>
              </div>
              <div className="mbfp-ws-card-body">
                <div className="mbfp-ws-detail"><span className="mbfp-ws-detail-label">Barangay</span><span className="mbfp-ws-detail-value">{s.barangay}</span></div>
                <div className="mbfp-ws-detail"><span className="mbfp-ws-detail-label">Pressure</span><span className="mbfp-ws-detail-value">{s.pressure}</span></div>
                <div className="mbfp-ws-detail"><span className="mbfp-ws-detail-label">Capacity</span><span className="mbfp-ws-detail-value">{s.capacity}</span></div>
                <div className="mbfp-ws-detail"><span className="mbfp-ws-detail-label">Last Checked</span><span className="mbfp-ws-detail-value">{s.lastChecked}</span></div>
                <div className="mbfp-ws-detail"><span className="mbfp-ws-detail-label">Status</span><span className={`mbfp-ws-status ${s.status}`}><span className="mbfp-ws-status-dot" />{s.statusLabel}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
