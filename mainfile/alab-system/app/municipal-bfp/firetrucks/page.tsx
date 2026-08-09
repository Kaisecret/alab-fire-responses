'use client';
import React, { useState } from 'react';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  
  .mbfp-header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-page-header p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }
  
  .mbfp-add-btn { background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%); color: white; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(208, 15, 9, 0.2); }
  .mbfp-add-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(208, 15, 9, 0.3); }
  
  .mbfp-ft-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
  .mbfp-ft-card { background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
  .mbfp-ft-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
  .mbfp-ft-card-top { background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%); padding: 1rem; display: flex; align-items: center; gap: 0.8rem; color: white; }
  .mbfp-ft-card-icon { width: 3rem; height: 3rem; background: rgba(255,255,255,0.2); border-radius: 0.6rem; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
  .mbfp-ft-card-name { font-size: 1rem; font-weight: 800; }
  .mbfp-ft-card-plate { font-size: 0.72rem; font-weight: 600; opacity: 0.85; }
  .mbfp-ft-card-body { padding: 1rem; }
  .mbfp-ft-detail { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #f9fafb; font-size: 0.8rem; }
  .mbfp-ft-detail:last-child { border-bottom: none; }
  .mbfp-ft-detail-label { color: #6b7280; font-weight: 600; }
  .mbfp-ft-detail-value { color: #1f2937; font-weight: 700; }
  .mbfp-ft-status { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.68rem; font-weight: 700; }
  .mbfp-ft-status.available { background: #f0fdf4; color: #16a34a; }
  .mbfp-ft-status.dispatched { background: #eff6ff; color: #2563eb; }
  .mbfp-ft-status.maintenance { background: #f3f4f6; color: #6b7280; }
  .mbfp-ft-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  /* MODAL STYLES */
  .mbfp-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.2s ease; }
  .mbfp-modal-content { background: white; width: 90%; max-width: 500px; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid #e5e7eb; }
  .mbfp-modal-header { padding: 1.2rem 1.5rem; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
  .mbfp-modal-header h2 { font-size: 1.2rem; font-weight: 800; color: #1f2937; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-modal-header h2 i { color: #D00F09; }
  .mbfp-modal-close { background: rgba(0,0,0,0.05); border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #6b7280; cursor: pointer; transition: all 0.2s; }
  .mbfp-modal-close:hover { background: rgba(0,0,0,0.1); color: #1f2937; }
  
  .mbfp-modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; }
  .mbfp-form-row { display: flex; gap: 1rem; }
  .mbfp-form-group { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
  .mbfp-form-group label { font-size: 0.8rem; font-weight: 700; color: #4b5563; }
  .mbfp-form-input { padding: 0.7rem 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9rem; color: #1f2937; outline: none; transition: all 0.2s; font-family: inherit; width: 100%; box-sizing: border-box; }
  .mbfp-form-input:focus { border-color: #EF5350; box-shadow: 0 0 0 3px rgba(239, 83, 80, 0.15); }
  
  .mbfp-modal-footer { padding: 1.2rem 1.5rem; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 0.8rem; background: #fafafa; }
  .mbfp-cancel-btn { background: white; border: 1px solid #d1d5db; color: #4b5563; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .mbfp-cancel-btn:hover { background: #f3f4f6; }
  .mbfp-submit-btn { background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%); border: none; color: white; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(208, 15, 9, 0.2); }
  .mbfp-submit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 15px rgba(208, 15, 9, 0.3); }

  .mbfp-file-upload { border: 2px dashed #d1d5db; border-radius: 0.5rem; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s; background: #f9fafb; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .mbfp-file-upload:hover { border-color: #EF5350; background: #fff1f2; }
  .mbfp-file-upload i { font-size: 2rem; color: #9ca3af; transition: color 0.2s; }
  .mbfp-file-upload:hover i { color: #EF5350; }
  .mbfp-file-upload p { margin: 0; font-size: 0.85rem; color: #4b5563; font-weight: 600; }
  .mbfp-file-upload span { font-size: 0.7rem; color: #9ca3af; }
  .mbfp-file-input-hidden { display: none; }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

export default function FiretrucksPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const trucks = [
    { name: 'Engine 1', plate: 'BFP-SJ-001', type: 'Pumper', capacity: '3,000 L', crew: '4 Personnel', station: 'Poblacion', status: 'available', statusLabel: 'Available', lastService: 'Jul 28, 2025' },
    { name: 'Engine 2', plate: 'BFP-SJ-002', type: 'Pumper', capacity: '3,000 L', crew: '4 Personnel', station: 'Poblacion', status: 'dispatched', statusLabel: 'Dispatched', lastService: 'Jul 15, 2025' },
    { name: 'Rescue 1', plate: 'BFP-SJ-R01', type: 'Rescue Vehicle', capacity: '1,000 L', crew: '3 Personnel', station: 'Poblacion', status: 'dispatched', statusLabel: 'On Route', lastService: 'Aug 1, 2025' },
    { name: 'Tanker 1', plate: 'BFP-SJ-T01', type: 'Water Tanker', capacity: '10,000 L', crew: '2 Personnel', station: 'Poblacion', status: 'maintenance', statusLabel: 'Maintenance', lastService: 'Jul 5, 2025' },
    { name: 'Engine 3', plate: 'BFP-SJ-003', type: 'Aerial Ladder', capacity: '2,500 L', crew: '5 Personnel', station: 'San Roque', status: 'available', statusLabel: 'Available', lastService: 'Jul 20, 2025' },
  ];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
    // In a real app, this would append to the trucks list
  };

  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-header-top">
          <div className="mbfp-page-header">
            <h1><i className="fa-solid fa-truck-moving" /> Firetrucks</h1>
            <p>Manage and monitor your fire truck fleet, maintenance schedules, and availability.</p>
          </div>
          <button className="mbfp-add-btn" onClick={() => setIsModalOpen(true)}>
            <i className="fa-solid fa-plus" /> Add Firetruck
          </button>
        </div>
        
        <div className="mbfp-ft-grid">
          {trucks.map((t) => (
            <div className="mbfp-ft-card" key={t.plate}>
              <div className="mbfp-ft-card-top">
                <div className="mbfp-ft-card-icon"><i className="fa-solid fa-truck-moving" /></div>
                <div>
                  <div className="mbfp-ft-card-name">{t.name}</div>
                  <div className="mbfp-ft-card-plate">{t.plate}</div>
                </div>
              </div>
              <div className="mbfp-ft-card-body">
                <div className="mbfp-ft-detail"><span className="mbfp-ft-detail-label">Type</span><span className="mbfp-ft-detail-value">{t.type}</span></div>
                <div className="mbfp-ft-detail"><span className="mbfp-ft-detail-label">Water Capacity</span><span className="mbfp-ft-detail-value">{t.capacity}</span></div>
                <div className="mbfp-ft-detail"><span className="mbfp-ft-detail-label">Crew</span><span className="mbfp-ft-detail-value">{t.crew}</span></div>
                <div className="mbfp-ft-detail"><span className="mbfp-ft-detail-label">Station</span><span className="mbfp-ft-detail-value">{t.station}</span></div>
                <div className="mbfp-ft-detail"><span className="mbfp-ft-detail-label">Last Service</span><span className="mbfp-ft-detail-value">{t.lastService}</span></div>
                <div className="mbfp-ft-detail"><span className="mbfp-ft-detail-label">Status</span><span className={`mbfp-ft-status ${t.status}`}><span className="mbfp-ft-status-dot" />{t.statusLabel}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="mbfp-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="mbfp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mbfp-modal-header">
              <h2><i className="fa-solid fa-truck-medical" /> Add New Firetruck</h2>
              <button className="mbfp-modal-close" onClick={() => setIsModalOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="mbfp-modal-body">
                <label className="mbfp-file-upload">
                  <input type="file" className="mbfp-file-input-hidden" accept="image/*" />
                  <i className="fa-solid fa-cloud-arrow-up" />
                  <p>Upload Firetruck Photo</p>
                  <span>Click or drag image here</span>
                </label>
                
                <div className="mbfp-form-row">
                  <div className="mbfp-form-group">
                    <label>Truck Name</label>
                    <input type="text" className="mbfp-form-input" placeholder="e.g. Engine 4" required />
                  </div>
                  <div className="mbfp-form-group">
                    <label>License Plate</label>
                    <input type="text" className="mbfp-form-input" placeholder="e.g. BFP-SJ-004" required />
                  </div>
                </div>
                
                <div className="mbfp-form-row">
                  <div className="mbfp-form-group">
                    <label>Vehicle Type</label>
                    <select className="mbfp-form-input" required>
                      <option value="">Select Type</option>
                      <option value="Pumper">Pumper</option>
                      <option value="Rescue Vehicle">Rescue Vehicle</option>
                      <option value="Water Tanker">Water Tanker</option>
                      <option value="Aerial Ladder">Aerial Ladder</option>
                    </select>
                  </div>
                  <div className="mbfp-form-group">
                    <label>Water Capacity</label>
                    <input type="text" className="mbfp-form-input" placeholder="e.g. 4,000 L" required />
                  </div>
                </div>

                <div className="mbfp-form-row">
                  <div className="mbfp-form-group">
                    <label>Crew Size</label>
                    <input type="text" className="mbfp-form-input" placeholder="e.g. 4 Personnel" required />
                  </div>
                  <div className="mbfp-form-group">
                    <label>Assigned Station</label>
                    <input type="text" className="mbfp-form-input" placeholder="e.g. Poblacion" required />
                  </div>
                </div>
              </div>
              <div className="mbfp-modal-footer">
                <button type="button" className="mbfp-cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="mbfp-submit-btn">Add Firetruck</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
