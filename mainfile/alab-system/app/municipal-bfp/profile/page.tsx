'use client';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1.5rem; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-page-header p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }
  .mbfp-profile-grid { display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; }
  .mbfp-profile-sidebar { display: flex; flex-direction: column; gap: 1rem; }
  .mbfp-profile-card { background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; overflow: hidden; }
  .mbfp-profile-cover { height: 80px; background: linear-gradient(135deg, #D00F09 0%, #EF5350 50%, #FF8A65 100%); position: relative; }
  .mbfp-profile-avatar-wrapper { position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%); }
  .mbfp-profile-avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #B71C1C, #D00F09); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .mbfp-profile-info { padding: 2.5rem 1rem 1.2rem; text-align: center; }
  .mbfp-profile-name { font-size: 1.05rem; font-weight: 800; color: #1f2937; }
  .mbfp-profile-role { font-size: 0.78rem; color: #D00F09; font-weight: 700; margin-top: 0.15rem; }
  .mbfp-profile-station { font-size: 0.72rem; color: #6b7280; margin-top: 0.1rem; }
  .mbfp-profile-detail-list { padding: 0.5rem 1rem 1rem; }
  .mbfp-profile-detail { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0; border-bottom: 1px solid #f9fafb; font-size: 0.8rem; }
  .mbfp-profile-detail:last-child { border-bottom: none; }
  .mbfp-profile-detail i { width: 16px; text-align: center; color: #D00F09; font-size: 0.85rem; }
  .mbfp-profile-detail-label { color: #6b7280; font-weight: 600; min-width: 60px; }
  .mbfp-profile-detail-value { color: #1f2937; font-weight: 700; }
  .mbfp-settings-main { display: flex; flex-direction: column; gap: 1rem; }
  .mbfp-settings-section { background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; }
  .mbfp-settings-title { padding: 0.8rem 1.2rem; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; font-weight: 700; color: #1f2937; display: flex; align-items: center; gap: 0.4rem; }
  .mbfp-settings-title i { color: #D00F09; }
  .mbfp-settings-body { padding: 1rem 1.2rem; }
  .mbfp-setting-row { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid #fafafa; }
  .mbfp-setting-row:last-child { border-bottom: none; }
  .mbfp-setting-label { font-size: 0.82rem; font-weight: 600; color: #374151; }
  .mbfp-setting-desc { font-size: 0.7rem; color: #6b7280; margin-top: 0.1rem; }
  .mbfp-toggle { width: 36px; height: 20px; background: #d1d5db; border-radius: 10px; position: relative; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
  .mbfp-toggle.on { background: #D00F09; }
  .mbfp-toggle::after { content: ''; position: absolute; width: 16px; height: 16px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
  .mbfp-toggle.on::after { transform: translateX(16px); }
  @media (max-width: 768px) { .mbfp-profile-grid { grid-template-columns: 1fr; } }
`;

export default function ProfilePage() {
  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-page-header">
          <h1><i className="fa-solid fa-user-gear" /> Profile / Settings</h1>
          <p>Manage your account information and system preferences.</p>
        </div>
        <div className="mbfp-profile-grid">
          <div className="mbfp-profile-sidebar">
            <div className="mbfp-profile-card">
              <div className="mbfp-profile-cover">
                <div className="mbfp-profile-avatar-wrapper">
                  <div className="mbfp-profile-avatar"><i className="fa-solid fa-user-shield" /></div>
                </div>
              </div>
              <div className="mbfp-profile-info">
                <div className="mbfp-profile-name">Station Commander</div>
                <div className="mbfp-profile-role">Municipal BFP</div>
                <div className="mbfp-profile-station">San Jose de Buenavista Fire Station</div>
              </div>
              <div className="mbfp-profile-detail-list">
                <div className="mbfp-profile-detail"><i className="fa-solid fa-id-card" /><span className="mbfp-profile-detail-label">ID</span><span className="mbfp-profile-detail-value">BFP-SJ-CMD-001</span></div>
                <div className="mbfp-profile-detail"><i className="fa-solid fa-phone" /><span className="mbfp-profile-detail-label">Phone</span><span className="mbfp-profile-detail-value">(036) 540-1234</span></div>
                <div className="mbfp-profile-detail"><i className="fa-solid fa-envelope" /><span className="mbfp-profile-detail-label">Email</span><span className="mbfp-profile-detail-value">cmd@sj-bfp.gov.ph</span></div>
                <div className="mbfp-profile-detail"><i className="fa-solid fa-calendar" /><span className="mbfp-profile-detail-label">Since</span><span className="mbfp-profile-detail-value">Jan 2020</span></div>
              </div>
            </div>
          </div>

          <div className="mbfp-settings-main">
            <div className="mbfp-settings-section">
              <div className="mbfp-settings-title"><i className="fa-solid fa-bell" /> Notification Preferences</div>
              <div className="mbfp-settings-body">
                <div className="mbfp-setting-row">
                  <div><div className="mbfp-setting-label">New Fire Reports</div><div className="mbfp-setting-desc">Get notified when new fire reports are submitted</div></div>
                  <div className="mbfp-toggle on" />
                </div>
                <div className="mbfp-setting-row">
                  <div><div className="mbfp-setting-label">Verification Reminders</div><div className="mbfp-setting-desc">Receive reminders for pending verifications</div></div>
                  <div className="mbfp-toggle on" />
                </div>
                <div className="mbfp-setting-row">
                  <div><div className="mbfp-setting-label">Dispatch Alerts</div><div className="mbfp-setting-desc">Alerts when units are dispatched or return</div></div>
                  <div className="mbfp-toggle on" />
                </div>
                <div className="mbfp-setting-row">
                  <div><div className="mbfp-setting-label">System Updates</div><div className="mbfp-setting-desc">Maintenance and system update notifications</div></div>
                  <div className="mbfp-toggle" />
                </div>
              </div>
            </div>

            <div className="mbfp-settings-section">
              <div className="mbfp-settings-title"><i className="fa-solid fa-display" /> Display Settings</div>
              <div className="mbfp-settings-body">
                <div className="mbfp-setting-row">
                  <div><div className="mbfp-setting-label">Auto-refresh Dashboard</div><div className="mbfp-setting-desc">Automatically refresh dashboard data every 30 seconds</div></div>
                  <div className="mbfp-toggle on" />
                </div>
                <div className="mbfp-setting-row">
                  <div><div className="mbfp-setting-label">Sound Alerts</div><div className="mbfp-setting-desc">Play sound for critical incident notifications</div></div>
                  <div className="mbfp-toggle on" />
                </div>
                <div className="mbfp-setting-row">
                  <div><div className="mbfp-setting-label">Map Satellite View</div><div className="mbfp-setting-desc">Default to satellite view in GIS map</div></div>
                  <div className="mbfp-toggle" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
