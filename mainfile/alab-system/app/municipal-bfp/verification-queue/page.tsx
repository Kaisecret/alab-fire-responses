'use client';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1.5rem; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-page-header p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }
  .mbfp-vq-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
  .mbfp-vq-stat { background: white; border-radius: 0.75rem; padding: 1.2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; display: flex; align-items: center; gap: 0.8rem; }
  .mbfp-vq-stat-icon { width: 2.8rem; height: 2.8rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; color: white; }
  .mbfp-vq-stat-icon.pending { background: linear-gradient(135deg, #E65100, #FF8F00); }
  .mbfp-vq-stat-icon.today { background: linear-gradient(135deg, #1565C0, #42A5F5); }
  .mbfp-vq-stat-icon.avg { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
  .mbfp-vq-stat-value { font-size: 1.5rem; font-weight: 800; color: #1f2937; }
  .mbfp-vq-stat-label { font-size: 0.72rem; color: #6b7280; font-weight: 600; }
  .mbfp-vq-card { background: white; border-radius: 0.75rem; padding: 1.2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; margin-bottom: 8px; transition: box-shadow 0.2s; }
  .mbfp-vq-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  .mbfp-vq-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
  .mbfp-vq-id { font-size: 0.9rem; font-weight: 800; color: #1f2937; }
  .mbfp-vq-time { font-size: 0.72rem; color: #D00F09; font-weight: 700; background: #fef2f2; padding: 0.2rem 0.5rem; border-radius: 1rem; }
  .mbfp-vq-detail { font-size: 0.8rem; color: #4b5563; margin-bottom: 0.2rem; font-weight: 500; }
  .mbfp-vq-detail i { color: #D00F09; margin-right: 0.3rem; width: 14px; text-align: center; }
  .mbfp-vq-actions { display: flex; gap: 0.5rem; margin-top: 0.8rem; }
  .mbfp-vq-btn { padding: 0.45rem 1rem; border-radius: 0.5rem; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 0.3rem; }
  .mbfp-vq-btn.approve { background: #16a34a; color: white; }
  .mbfp-vq-btn.approve:hover { background: #15803d; }
  .mbfp-vq-btn.reject { background: white; color: #dc2626; border: 1px solid #fecaca; }
  .mbfp-vq-btn.reject:hover { background: #fef2f2; }
  .mbfp-vq-btn.view { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .mbfp-vq-btn.view:hover { background: #dbeafe; }
`;

export default function VerificationQueuePage() {
  const reports = [
    { id: 'VR-2025-0152', reporter: 'Juan Dela Cruz', phone: '(036) 555-0123', location: 'Sampaguita, San Jose de Buenavista', type: 'Grass Fire', desc: 'Possible grass fire near vacant lot. Smoke visible from the road.', time: '10:30 AM', priority: 'High' },
    { id: 'VR-2025-0151', reporter: 'Maria Santos', phone: '(036) 555-0456', location: 'San Roque, San Jose de Buenavista', type: 'Unknown', desc: 'Smoke coming from residential area. Multiple residents reporting.', time: '10:12 AM', priority: 'Medium' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-page-header">
          <h1><i className="fa-solid fa-clipboard-check" /> Verification Queue</h1>
          <p>Review and verify pending fire reports submitted by residents.</p>
        </div>

        <div className="mbfp-vq-stats">
          <div className="mbfp-vq-stat">
            <div className="mbfp-vq-stat-icon pending"><i className="fa-solid fa-clock" /></div>
            <div>
              <div className="mbfp-vq-stat-value">2</div>
              <div className="mbfp-vq-stat-label">Pending Verification</div>
            </div>
          </div>
          <div className="mbfp-vq-stat">
            <div className="mbfp-vq-stat-icon today"><i className="fa-solid fa-calendar-check" /></div>
            <div>
              <div className="mbfp-vq-stat-value">7</div>
              <div className="mbfp-vq-stat-label">Verified Today</div>
            </div>
          </div>
          <div className="mbfp-vq-stat">
            <div className="mbfp-vq-stat-icon avg"><i className="fa-solid fa-gauge" /></div>
            <div>
              <div className="mbfp-vq-stat-value">3.2 min</div>
              <div className="mbfp-vq-stat-label">Avg. Verification Time</div>
            </div>
          </div>
        </div>

        {reports.map((r) => (
          <div className="mbfp-vq-card" key={r.id}>
            <div className="mbfp-vq-card-top">
              <span className="mbfp-vq-id">{r.id}</span>
              <span className="mbfp-vq-time">{r.time}</span>
            </div>
            <div className="mbfp-vq-detail"><i className="fa-solid fa-user" /> {r.reporter} · {r.phone}</div>
            <div className="mbfp-vq-detail"><i className="fa-solid fa-location-dot" /> {r.location}</div>
            <div className="mbfp-vq-detail"><i className="fa-solid fa-fire" /> {r.type} — {r.desc}</div>
            <div className="mbfp-vq-actions">
              <button className="mbfp-vq-btn approve"><i className="fa-solid fa-check" /> Verify & Confirm</button>
              <button className="mbfp-vq-btn reject"><i className="fa-solid fa-xmark" /> Reject</button>
              <button className="mbfp-vq-btn view"><i className="fa-solid fa-map" /> View on Map</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
