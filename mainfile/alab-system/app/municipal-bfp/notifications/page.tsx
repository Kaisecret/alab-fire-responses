'use client';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-mark-all { padding: 0.4rem 0.9rem; border-radius: 0.5rem; font-size: 0.78rem; font-weight: 600; border: 1px solid #e5e7eb; background: white; color: #4b5563; cursor: pointer; transition: all 0.15s; }
  .mbfp-mark-all:hover { background: #f3f4f6; }
  .mbfp-notif-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.2rem; }
  .mbfp-notif-tab { padding: 0.45rem 1rem; border-radius: 2rem; font-size: 0.78rem; font-weight: 600; border: 1px solid #e5e7eb; background: white; color: #4b5563; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 0.3rem; }
  .mbfp-notif-tab:hover, .mbfp-notif-tab.active { background: #D00F09; color: white; border-color: #D00F09; }
  .mbfp-notif-count { background: rgba(255,255,255,0.2); padding: 0.1rem 0.4rem; border-radius: 1rem; font-size: 0.65rem; }
  .mbfp-notif-tab.active .mbfp-notif-count { background: rgba(255,255,255,0.3); }
  .mbfp-notif-tab:not(.active) .mbfp-notif-count { background: #fee2e2; color: #D00F09; }
  .mbfp-notif-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .mbfp-notif-item { background: white; border-radius: 0.75rem; padding: 1rem 1.2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; display: flex; gap: 0.8rem; transition: all 0.15s; cursor: pointer; }
  .mbfp-notif-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
  .mbfp-notif-item.unread { border-left: 3px solid #D00F09; background: #fffbfb; }
  .mbfp-notif-icon { width: 2.5rem; height: 2.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
  .mbfp-notif-icon.fire { background: #fef2f2; color: #D00F09; }
  .mbfp-notif-icon.verif { background: #fff7ed; color: #ea580c; }
  .mbfp-notif-icon.dispatch { background: #eff6ff; color: #2563eb; }
  .mbfp-notif-icon.system { background: #f3f4f6; color: #6b7280; }
  .mbfp-notif-icon.assist { background: #f0fdf4; color: #16a34a; }
  .mbfp-notif-content { flex: 1; min-width: 0; }
  .mbfp-notif-title { font-size: 0.85rem; font-weight: 700; color: #1f2937; margin-bottom: 0.15rem; }
  .mbfp-notif-desc { font-size: 0.78rem; color: #6b7280; line-height: 1.4; }
  .mbfp-notif-time { font-size: 0.68rem; color: #9ca3af; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
`;

export default function NotificationsPage() {
  const notifications = [
    { type: 'fire', icon: 'fa-solid fa-fire', title: 'New Fire Report Submitted', desc: 'A new fire report has been submitted from Sampaguita barangay. Pending verification.', time: '2 min ago', unread: true },
    { type: 'verif', icon: 'fa-solid fa-clipboard-check', title: 'Verification Reminder', desc: 'Report VR-2025-0152 has been pending for 15 minutes. Please review.', time: '15 min ago', unread: true },
    { type: 'dispatch', icon: 'fa-solid fa-truck-moving', title: 'Engine 2 Dispatched', desc: 'Engine 2 has been dispatched to INC-2025-0419 at San Roque. ETA: 6 minutes.', time: '45 min ago', unread: true },
    { type: 'assist', icon: 'fa-solid fa-handshake', title: 'Assistance Request Received', desc: 'Tobias Fornier Municipality is requesting fire suppression assistance.', time: '1 hr ago', unread: true },
    { type: 'fire', icon: 'fa-solid fa-fire', title: 'Incident INC-2025-0417 Contained', desc: 'Electrical fire at Poblacion has been contained. Units returning to station.', time: '2 hrs ago', unread: false },
    { type: 'system', icon: 'fa-solid fa-gear', title: 'System Maintenance Scheduled', desc: 'Scheduled maintenance window: Aug 10, 2025, 2:00 AM - 4:00 AM.', time: '5 hrs ago', unread: false },
    { type: 'dispatch', icon: 'fa-solid fa-route', title: 'Route Optimization Updated', desc: 'ALAB AI has updated optimal routes based on current road conditions.', time: '8 hrs ago', unread: false },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-page-header">
          <h1><i className="fa-solid fa-bell" /> Notifications</h1>
          <button className="mbfp-mark-all"><i className="fa-solid fa-check-double" /> Mark all as read</button>
        </div>
        <div className="mbfp-notif-tabs">
          <button className="mbfp-notif-tab active">All <span className="mbfp-notif-count">7</span></button>
          <button className="mbfp-notif-tab">Unread <span className="mbfp-notif-count">4</span></button>
          <button className="mbfp-notif-tab">Incidents</button>
          <button className="mbfp-notif-tab">System</button>
        </div>
        <div className="mbfp-notif-list">
          {notifications.map((n, i) => (
            <div className={`mbfp-notif-item ${n.unread ? 'unread' : ''}`} key={i}>
              <div className={`mbfp-notif-icon ${n.type}`}><i className={n.icon} /></div>
              <div className="mbfp-notif-content">
                <div className="mbfp-notif-title">{n.title}</div>
                <div className="mbfp-notif-desc">{n.desc}</div>
              </div>
              <span className="mbfp-notif-time">{n.time}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
