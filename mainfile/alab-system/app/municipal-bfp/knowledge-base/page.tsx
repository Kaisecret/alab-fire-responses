'use client';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1.5rem; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-page-header p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }
  .mbfp-kb-search { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
  .mbfp-kb-search-input { flex: 1; padding: 0.7rem 1rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; font-size: 0.88rem; font-family: inherit; outline: none; transition: border-color 0.2s; }
  .mbfp-kb-search-input:focus { border-color: #D00F09; box-shadow: 0 0 0 3px rgba(211,47,47,0.1); }
  .mbfp-kb-search-btn { padding: 0.7rem 1.2rem; border-radius: 0.5rem; background: #D00F09; color: white; border: none; font-size: 0.88rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; transition: background 0.15s; }
  .mbfp-kb-search-btn:hover { background: #B71C1C; }
  .mbfp-kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
  .mbfp-kb-card { background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; padding: 1.2rem; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
  .mbfp-kb-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
  .mbfp-kb-card-icon { width: 2.8rem; height: 2.8rem; border-radius: 0.6rem; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin-bottom: 0.8rem; }
  .mbfp-kb-card-icon.sop { background: #fee2e2; color: #D00F09; }
  .mbfp-kb-card-icon.manual { background: #eff6ff; color: #2563eb; }
  .mbfp-kb-card-icon.guide { background: #f0fdf4; color: #16a34a; }
  .mbfp-kb-card-icon.training { background: #fff7ed; color: #ea580c; }
  .mbfp-kb-card-icon.policy { background: #f3e8ff; color: #7c3aed; }
  .mbfp-kb-card-title { font-size: 0.95rem; font-weight: 800; color: #1f2937; margin-bottom: 0.3rem; }
  .mbfp-kb-card-desc { font-size: 0.78rem; color: #6b7280; line-height: 1.5; margin-bottom: 0.6rem; }
  .mbfp-kb-card-meta { display: flex; justify-content: space-between; font-size: 0.68rem; color: #9ca3af; font-weight: 600; }
  .mbfp-kb-tag { padding: 0.15rem 0.45rem; background: #f3f4f6; border-radius: 1rem; font-size: 0.62rem; font-weight: 700; color: #6b7280; }
`;

export default function KnowledgeBasePage() {
  const articles = [
    { title: 'Fire Response SOP', desc: 'Standard operating procedures for responding to fire incidents in municipal areas.', icon: 'sop', iconClass: 'fa-solid fa-shield-halved', category: 'SOP', updated: 'Aug 1, 2025', reads: 142 },
    { title: 'Equipment Operation Manual', desc: 'Operating instructions for all fire trucks, pumps, and rescue equipment.', icon: 'manual', iconClass: 'fa-solid fa-book-open', category: 'Manual', updated: 'Jul 25, 2025', reads: 89 },
    { title: 'Water Source Mapping Guide', desc: 'How to map, verify, and maintain water source records in the GIS system.', icon: 'guide', iconClass: 'fa-solid fa-map', category: 'Guide', updated: 'Jul 20, 2025', reads: 67 },
    { title: 'Incident Report Writing', desc: 'Guidelines for writing comprehensive and accurate fire incident reports.', icon: 'training', iconClass: 'fa-solid fa-pen-to-square', category: 'Training', updated: 'Jul 15, 2025', reads: 103 },
    { title: 'Inter-Municipal Assistance Protocol', desc: 'Procedures for requesting and providing mutual aid between municipalities.', icon: 'policy', iconClass: 'fa-solid fa-handshake', category: 'Policy', updated: 'Jul 10, 2025', reads: 56 },
    { title: 'Fire Investigation Procedures', desc: 'Post-incident investigation protocols, evidence collection, and documentation.', icon: 'sop', iconClass: 'fa-solid fa-magnifying-glass', category: 'SOP', updated: 'Jul 5, 2025', reads: 78 },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-page-header">
          <h1><i className="fa-solid fa-book" /> Knowledge Base</h1>
          <p>Access SOPs, manuals, training materials, and reference documentation.</p>
        </div>
        <div className="mbfp-kb-search">
          <input type="text" className="mbfp-kb-search-input" placeholder="Search knowledge base articles..." />
          <button className="mbfp-kb-search-btn"><i className="fa-solid fa-magnifying-glass" /> Search</button>
        </div>
        <div className="mbfp-kb-grid">
          {articles.map((a) => (
            <div className="mbfp-kb-card" key={a.title}>
              <div className={`mbfp-kb-card-icon ${a.icon}`}><i className={a.iconClass} /></div>
              <div className="mbfp-kb-card-title">{a.title}</div>
              <div className="mbfp-kb-card-desc">{a.desc}</div>
              <div className="mbfp-kb-card-meta">
                <span className="mbfp-kb-tag">{a.category}</span>
                <span>Updated {a.updated} · {a.reads} reads</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
