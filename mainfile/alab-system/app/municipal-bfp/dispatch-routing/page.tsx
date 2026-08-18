'use client';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1.5rem; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-page-header p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }
  .mbfp-dr-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px; }
  .mbfp-dr-card { background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; overflow: hidden; }
  .mbfp-dr-card-header { padding: 0.8rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: 0.88rem; font-weight: 700; color: #1f2937; display: flex; align-items: center; gap: 0.4rem; }
  .mbfp-dr-card-header i { color: #D00F09; }
  .mbfp-dr-unit { display: flex; align-items: center; gap: 0.7rem; padding: 0.75rem 1rem; border-bottom: 1px solid #fafafa; transition: background 0.15s; cursor: pointer; }
  .mbfp-dr-unit:hover { background: #fef2f2; }
  .mbfp-dr-unit-icon { width: 2.2rem; height: 2.2rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; background: #fee2e2; color: #D00F09; }
  .mbfp-dr-unit-name { font-size: 0.82rem; font-weight: 700; color: #1f2937; }
  .mbfp-dr-unit-sub { font-size: 0.68rem; color: #6b7280; }
  .mbfp-dr-unit-status { margin-left: auto; font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 1rem; }
  .mbfp-dr-unit-status.available { background: #f0fdf4; color: #16a34a; }
  .mbfp-dr-unit-status.dispatched { background: #eff6ff; color: #2563eb; }
  .mbfp-dr-unit-status.maintenance { background: #f3f4f6; color: #6b7280; }
  .mbfp-dr-map { height: 350px; background: radial-gradient(circle at 40% 50%, #e8f5e9 0%, transparent 50%), radial-gradient(circle at 60% 40%, #e3f2fd 0%, transparent 40%), linear-gradient(135deg, #f1f8e9 0%, #e0f2f1 50%, #e8eaf6 100%); position: relative; display: flex; align-items: center; justify-content: center; }
  .mbfp-dr-map-overlay { text-align: center; color: #6b7280; }
  .mbfp-dr-map-overlay i { font-size: 2.5rem; color: #D00F09; margin-bottom: 0.5rem; display: block; }
  .mbfp-dr-map-overlay p { font-size: 0.85rem; font-weight: 600; }
  .mbfp-dr-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.2rem; border-radius: 0.5rem; font-size: 0.82rem; font-weight: 700; border: none; cursor: pointer; margin: 1rem; background: linear-gradient(135deg, #D00F09, #EF5350); color: white; transition: all 0.2s; box-shadow: 0 2px 8px rgba(211,47,47,0.3); }
  .mbfp-dr-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(211,47,47,0.4); }
`;

export default function DispatchRoutingPage() {
  const units = [
    { name: 'Engine 1', station: 'Poblacion Fire Station', status: 'available', statusLabel: 'Available', crew: '4 crew' },
    { name: 'Engine 2', station: 'Poblacion Fire Station', status: 'dispatched', statusLabel: 'Dispatched', crew: '4 crew' },
    { name: 'Rescue 1', station: 'Poblacion Fire Station', status: 'dispatched', statusLabel: 'On Route', crew: '3 crew' },
    { name: 'Tanker 1', station: 'Poblacion Fire Station', status: 'maintenance', statusLabel: 'Maintenance', crew: '—' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-page-header">
          <h1><i className="fa-solid fa-route" /> Dispatch & Routing</h1>
          <p>Dispatch available units to incidents and manage optimal routing.</p>
        </div>
        <div className="mbfp-dr-grid">
          <div>
            <div className="mbfp-dr-card">
              <div className="mbfp-dr-card-header"><i className="fa-solid fa-truck-moving" /> Available Units</div>
              {units.map((u) => (
                <div className="mbfp-dr-unit" key={u.name}>
                  <div className="mbfp-dr-unit-icon"><i className="fa-solid fa-truck-moving" /></div>
                  <div>
                    <div className="mbfp-dr-unit-name">{u.name}</div>
                    <div className="mbfp-dr-unit-sub">{u.station} · {u.crew}</div>
                  </div>
                  <span className={`mbfp-dr-unit-status ${u.status}`}>{u.statusLabel}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mbfp-dr-card">
            <div className="mbfp-dr-card-header"><i className="fa-solid fa-map-location-dot" /> Route Map</div>
            <div className="mbfp-dr-map">
              <div className="mbfp-dr-map-overlay">
                <i className="fa-solid fa-route" />
                <p>Select a unit and incident to generate route</p>
              </div>
            </div>
            <button className="mbfp-dr-btn"><i className="fa-solid fa-paper-plane" /> Dispatch Selected Unit</button>
          </div>
        </div>
      </div>
    </>
  );
}
