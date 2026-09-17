'use client';

import React, { useEffect, useState } from 'react';
import { ProvincialManagementToolbar, ProvincialMunicipalityFilter } from './provincial-management-toolbar';
import { useProvincialManagementList } from './use-provincial-management-list';
import type { ProvincialReportRow } from '../../lib/provincial-bfp/management/types';
import { getFireTypeLabel, getSeverityLabel, getStatusLabel } from '../../lib/municipal-bfp/reports/formatters';
import { ProvincialReportDetail } from './provincial-report-detail';

interface ProvincialReportDirectoryProps { initialMunicipalityId?: string; }

const directoryStyles = `
  .prd-card{--navy:#10234a;--red:#e23632;--border:#dce6f2;display:flex;flex-direction:column;gap:1rem;font-family:inherit;color:var(--navy)}
  .prd-card ::selection{background:#fee2e2;color:#7f1d1d}.prd-card :is(button,select,input,a):focus-visible{outline:3px solid rgba(226,54,50,.24);outline-offset:2px}
  .prd-command,.prd-filter-console,.prd-records{background:#fff;border:1px solid var(--border);box-shadow:0 8px 24px rgba(38,65,99,.06)}
  .prd-command{min-height:92px;padding:1.15rem 1.3rem;border-radius:15px;display:flex;align-items:center;justify-content:space-between;gap:1rem}
  .prd-heading{display:flex;align-items:center;gap:.95rem;min-width:0}.prd-heading-icon{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;flex:0 0 auto;color:var(--red);background:#fff1f1;border:1px solid #fee2e2;font-size:1.08rem}
  .prd-heading h1{margin:0;color:#081a3a;font-size:clamp(1.25rem,2vw,1.55rem);line-height:1.15;letter-spacing:-.035em;font-weight:800}.prd-heading-meta{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem .65rem;margin:.35rem 0 0;color:#64748b;font-size:.82rem;font-weight:500}.prd-meta-dot{color:#b8c4d2}
  .prd-actions{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap}.prd-actions .no-print{gap:0!important}.prd-actions .no-print button,.prd-refresh{min-height:42px;border-radius:9px!important;padding:.65rem 1rem!important;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;font:inherit;font-size:.82rem!important;font-weight:800!important;cursor:pointer;transition:transform 160ms ease,box-shadow 160ms ease,background 160ms ease,border-color 160ms ease}
  .prd-refresh{color:#1e3a67;background:#fff;border:1px solid #b9cbe1}.prd-actions .no-print button{color:#fff!important;background:var(--red)!important;border:1px solid var(--red)!important;box-shadow:0 6px 14px rgba(226,54,50,.18)!important}.prd-actions button:hover:not(:disabled){transform:translateY(-1px)}.prd-refresh:hover:not(:disabled){background:#f8fbff;border-color:#7898be}.prd-actions .no-print button:hover:not(:disabled){background:#c82e2a!important}.prd-actions button:active:not(:disabled){transform:scale(.98)}.prd-actions button:disabled{cursor:progress;opacity:.62}
  .prd-filter-console{padding:1rem 1.2rem 1.15rem;border-radius:15px}.prd-filter-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-bottom:.85rem;margin-bottom:.85rem;border-bottom:1px solid #edf2f7}.prd-filter-heading strong{font-size:.82rem;color:#20365e}.prd-filter-summary{display:flex;align-items:center;gap:.7rem}.prd-filter-count{display:inline-flex;align-items:center;gap:.4rem;color:#526983;font-size:.76rem;font-weight:700}.prd-clear{border:0;background:transparent;color:#b42320;padding:.25rem;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer}.prd-clear:disabled{color:#a8b4c2;cursor:default}
  .prd-filters{display:grid;grid-template-columns:minmax(190px,1.12fr) repeat(3,minmax(135px,.8fr)) repeat(2,minmax(145px,.92fr)) minmax(240px,1.55fr);gap:.8rem;align-items:end}.prd-field{display:flex;flex-direction:column;gap:.38rem;min-width:0}.prd-field>label,.prd-municipality>label{color:#3e5572!important;font-size:.66rem!important;font-weight:800!important;letter-spacing:.065em;text-transform:uppercase}
  .prd-field :is(select,input),.prd-municipality select{width:100%;min-width:0;min-height:42px;box-sizing:border-box;padding:.62rem .75rem;border:1px solid #c7d5e5!important;border-radius:8px!important;background:#fff;color:#152a4b;font:inherit;font-size:.81rem!important;transition:border-color 150ms ease,box-shadow 150ms ease}.prd-field :is(select,input):hover,.prd-municipality select:hover{border-color:#8da6c2!important}.prd-field :is(select,input):focus,.prd-municipality select:focus{border-color:#587ba7!important;box-shadow:0 0 0 3px rgba(77,119,170,.1)}.prd-municipality label{width:100%}.prd-search-wrap{position:relative}.prd-search-wrap i{position:absolute;left:.78rem;top:50%;transform:translateY(-50%);color:#8293a8;font-size:.78rem;pointer-events:none}.prd-search-wrap input{padding-left:2.15rem}
  .prd-records{border-radius:15px;overflow:hidden}.prd-alert{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 1.15rem;background:#fff4f4;border-bottom:1px solid #fecaca;color:#991b1b;font-size:.82rem}.prd-alert button{border:0;background:transparent;color:inherit;font:inherit;font-weight:800;cursor:pointer}
  .prd-scroll{overflow-x:auto;scrollbar-width:thin;scrollbar-color:#b9c7d8 transparent}.prd-table{width:100%;min-width:1120px;border-collapse:collapse;text-align:left;font-size:.82rem}.prd-table thead{position:sticky;top:0;z-index:1}.prd-table th{padding:.9rem 1rem;background:#f6f9fd;border-bottom:1px solid #ccd9e8;color:#304766;font-size:.65rem;font-weight:800;letter-spacing:.055em;text-transform:uppercase;white-space:nowrap}.prd-row{transition:background-color 140ms ease,box-shadow 140ms ease}.prd-row:hover{background:#f7faff;box-shadow:inset 3px 0 0 var(--red)}.prd-row td{padding:1.05rem 1rem;border-bottom:1px solid #e8eef5;vertical-align:middle}.prd-row:last-child td{border-bottom:0}
  .prd-reference{color:#0b2147;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.77rem;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}.prd-place strong,.prd-fire-type{display:block;color:#102448;font-weight:800}.prd-place span,.prd-not-rated{color:#7689a1;font-size:.73rem}.prd-source{display:inline-flex;padding:.2rem .45rem;border-radius:5px;background:#edf3fa;color:#304c70;font-size:.73rem;font-weight:700}
  .prd-badge{display:inline-flex;align-items:center;border:1px solid;border-radius:999px;padding:.24rem .56rem;font-size:.67rem;font-weight:800;line-height:1.1;white-space:nowrap}.prd-badge--red{background:#e23632;border-color:#c92d29;color:#fff}.prd-badge--orange{background:#f25716;border-color:#d9480f;color:#fff}.prd-badge--blue{background:#2474c8;border-color:#1d63ac;color:#fff}.prd-badge--green{background:#16865a;border-color:#0e7049;color:#fff}.prd-badge--amber{background:#fff3cf;border-color:#f4d469;color:#9a4b04}.prd-badge--slate{background:#edf2f7;border-color:#d7e0ea;color:#455a72}.prd-badge--critical{background:#fee2e2;border-color:#fca5a5;color:#991b1b}.prd-badge--high{background:#fff0df;border-color:#fdba74;color:#b53d0b}.prd-badge--moderate{background:#fff4cf;border-color:#f3d274;color:#a35408}.prd-badge--low{background:#e5f8ed;border-color:#a7e3bf;color:#157146}.prd-fire-type+.prd-badge,.prd-fire-type+.prd-not-rated{margin-top:.32rem}.prd-date{color:#526b8a;font-variant-numeric:tabular-nums;white-space:nowrap}.prd-dispatch{color:#526b8a;font-size:.72rem;line-height:1.4}
  .prd-view{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;min-width:82px;border:1px solid var(--red);border-radius:8px;padding:.56rem .78rem;background:var(--red);color:#fff;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer;transition:background 150ms ease,transform 150ms ease,box-shadow 150ms ease}.prd-view:hover{background:#c92e2a;transform:translateY(-1px);box-shadow:0 5px 12px rgba(226,54,50,.2)}.prd-view:active{transform:scale(.98)}
  .prd-state{padding:3.2rem 1.5rem;text-align:center;color:#60748c}.prd-state-icon{width:44px;height:44px;margin:0 auto .8rem;border-radius:12px;display:grid;place-items:center;background:#eef4fb;color:#426891}.prd-state strong{display:block;margin-bottom:.25rem;color:#243b5d}.prd-skeleton{height:14px;border-radius:999px;background:linear-gradient(90deg,#edf2f7 20%,#f8fafc 50%,#edf2f7 80%);background-size:220% 100%;animation:prd-shimmer 1.35s infinite linear}.prd-skeleton-row{display:grid;grid-template-columns:1.3fr 1.3fr .6fr 1.1fr .9fr 1fr 1.4fr .6fr;gap:1rem;padding:1.35rem 1rem;border-bottom:1px solid #edf2f7}@keyframes prd-shimmer{to{background-position:-220% 0}}
  .prd-mobile-records{display:none}.prd-footer{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.85rem 1rem;border-top:1px solid #e1e9f2;color:#5b7089;font-size:.75rem}.prd-pagination,.prd-page-size{display:flex;align-items:center;gap:.55rem}.prd-footer select,.prd-page-button{min-height:34px;border:1px solid #c8d5e4;border-radius:7px;background:#fff;color:#294466;font:inherit;font-weight:700}.prd-footer select{padding:.35rem .55rem}.prd-page-button{min-width:34px;padding:.35rem .55rem;cursor:pointer}.prd-page-button:disabled{color:#9aa8b8;background:#f4f7fa;cursor:default}
  @media(max-width:1280px){.prd-filters{grid-template-columns:repeat(4,minmax(145px,1fr))}.prd-search{grid-column:span 2}}
  @media (max-width: 900px){.prd-command{align-items:flex-start;flex-direction:column}.prd-actions{width:100%}.prd-actions>*{flex:1 1 auto}.prd-actions .no-print button,.prd-refresh{width:100%}.prd-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.prd-search{grid-column:1/-1}.prd-scroll{display:none}.prd-mobile-records{display:grid}.prd-mobile-record{padding:1rem;border-bottom:1px solid #e4ebf3;display:grid;grid-template-columns:1fr auto;gap:.85rem 1rem}.prd-mobile-record:last-child{border-bottom:0}.prd-mobile-top{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:.7rem}.prd-mobile-data{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem 1rem}.prd-mobile-label{display:block;margin-bottom:.18rem;color:#7c8da1;font-size:.61rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}}
  @media(max-width:600px){.prd-card{gap:.75rem}.prd-command,.prd-filter-console{padding:1rem;border-radius:12px}.prd-heading-icon{width:42px;height:42px}.prd-filter-heading,.prd-footer{align-items:flex-start;flex-direction:column}.prd-filters{grid-template-columns:1fr}.prd-search{grid-column:auto}.prd-mobile-record{grid-template-columns:1fr}.prd-mobile-top{align-items:flex-start}.prd-mobile-data{grid-template-columns:1fr 1fr}.prd-mobile-record .prd-view{width:100%}.prd-pagination{width:100%;justify-content:space-between}}
  @media(prefers-reduced-motion:reduce){.prd-card *,.prd-card *::before,.prd-card *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

const statusTone = (status: string) => {
  if (['CONFIRMED', 'VERIFIED'].includes(status)) return 'red';
  if (status === 'RESPONDING') return 'orange';
  if (['FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL'].includes(status)) return 'blue';
  if (status === 'RESOLVED') return 'green';
  if (['SUBMITTED', 'PENDING_VERIFICATION', 'UNDER_VERIFICATION'].includes(status)) return 'amber';
  return 'slate';
};

const severityTone = (severity: string) => severity === 'CRITICAL' ? 'critical' : severity === 'HIGH' ? 'high' : severity === 'MODERATE' ? 'moderate' : 'low';

const formatDateTime = (value: string) => new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
}).format(new Date(value));

export function ProvincialReportDirectory({ initialMunicipalityId = '' }: ProvincialReportDirectoryProps) {
  const { items: reports, total, updatedAt, page, pageSize, filters, loading, error, setPage, setPageSize, setFilters, setFilter, refresh: fetchReports } = useProvincialManagementList<ProvincialReportRow>({
    endpoint: '/api/provincial-bfp/incident-reports', initialFilters: { municipalityId: initialMunicipalityId },
  });
  const municipalityFilter = filters.municipalityId || '';
  const statusFilter = filters.status || '';
  const sourceFilter = filters.reportSource || '';
  const fireTypeFilter = filters.fireType || '';
  const fromDate = filters.from || '';
  const toDate = filters.to || '';
  const search = filters.search || '';
  const activeFilterCount = [municipalityFilter, statusFilter, sourceFilter, fireTypeFilter, fromDate, toDate, search].filter(Boolean).length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    const restoreReport = () => setSelectedReportId(new URLSearchParams(window.location.search).get('report'));
    restoreReport(); window.addEventListener('popstate', restoreReport);
    return () => window.removeEventListener('popstate', restoreReport);
  }, []);

  const updateFilter = (key: 'municipalityId' | 'status' | 'reportSource' | 'fireType' | 'from' | 'to' | 'search', value: string) => { setFilter(key, value); setPage(1); };
  const clearFilters = () => setFilters({});
  const statusBadge = (status: string) => <span className={`prd-badge prd-badge--${statusTone(status)}`}>{getStatusLabel(status)}</span>;
  const severityBadge = (severity: string) => <span className={`prd-badge prd-badge--${severityTone(severity)}`}>{getSeverityLabel(severity)}</span>;
  const updatedLabel = updatedAt ? formatDateTime(updatedAt) : 'Waiting for first sync';

  const renderMobileRecord = (rep: ProvincialReportRow) => (
    <article className="prd-mobile-record" key={rep.id}>
      <div className="prd-mobile-top"><span className="prd-reference">{rep.referenceNumber}</span>{statusBadge(rep.status)}</div>
      <div className="prd-mobile-data">
        <div><span className="prd-mobile-label">Location</span><div className="prd-place"><strong>{rep.municipalityName}</strong><span>{rep.barangay}</span></div></div>
        <div><span className="prd-mobile-label">Source</span><span className="prd-source">{rep.reportSource === 'ALAB_APP' ? 'App' : 'Phone'}</span></div>
        <div><span className="prd-mobile-label">Incident</span><span className="prd-fire-type">{getFireTypeLabel(rep.fireType)}</span>{rep.severity && rep.severity !== 'UNKNOWN' ? severityBadge(rep.severity) : <span className="prd-not-rated">Not rated</span>}</div>
        <div><span className="prd-mobile-label">Submitted</span><span className="prd-date">{formatDateTime(rep.submittedAt)}</span></div>
        <div style={{ gridColumn: '1 / -1' }}><span className="prd-mobile-label">Dispatch</span><span className="prd-dispatch">{rep.latestDispatchSummary || 'No dispatch active'}</span></div>
      </div>
      <button type="button" className="prd-view" onClick={() => setSelectedReportId(rep.id)}><i className="fa-solid fa-arrow-right" /> View report</button>
    </article>
  );

  return (
    <section className="prd-card" aria-labelledby="provincial-report-title">
      <style>{directoryStyles}</style>
      <header className="prd-command">
        <div className="prd-heading"><div className="prd-heading-icon" aria-hidden="true"><i className="fa-solid fa-file-lines" /></div><div>
          <h1 id="provincial-report-title">All Municipal Fire Reports</h1>
          <p className="prd-heading-meta"><span>{loading && total === 0 ? 'Reading the provincial registry…' : `${total.toLocaleString()} report${total === 1 ? '' : 's'} across Antique Province`}</span><span className="prd-meta-dot" aria-hidden="true">•</span><span>Last updated {updatedLabel}</span></p>
        </div></div>
        <div className="prd-actions">
          <button type="button" className="prd-refresh" onClick={fetchReports} disabled={loading}><i className={`fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}`} aria-hidden="true" />{loading ? 'Refreshing' : 'Refresh'}</button>
          <ProvincialManagementToolbar exportOnly dataset="FIRE_REPORTS" filters={filters} onFilterChange={() => {}} />
        </div>
      </header>

      <section className="prd-filter-console" aria-labelledby="report-filter-title">
        <div className="prd-filter-heading"><strong id="report-filter-title">Filter the provincial registry</strong><div className="prd-filter-summary"><span className="prd-filter-count"><i className="fa-solid fa-filter" aria-hidden="true" /> {activeFilterCount} active</span><button type="button" className="prd-clear" onClick={clearFilters} disabled={activeFilterCount === 0}>Clear filters</button></div></div>
        <div className="prd-filters">
          <div className="prd-field prd-municipality"><ProvincialMunicipalityFilter value={municipalityFilter} onChange={(value) => updateFilter('municipalityId', value)} /></div>
          <div className="prd-field"><label htmlFor="prd-status">Status</label><select id="prd-status" value={statusFilter} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option><option value="SUBMITTED">Submitted</option><option value="CONFIRMED">Confirmed</option><option value="PENDING_VERIFICATION">Pending verification</option><option value="VERIFIED">Verified</option><option value="RESPONDING">Responding</option><option value="FIRETRUCK_DISPATCHED">Firetruck dispatched</option><option value="RESPONDER_ARRIVED">Responder arrived</option><option value="UNDER_CONTROL">Under control</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option><option value="FALSE_REPORT">False report</option><option value="REJECTED">Rejected</option><option value="DUPLICATE">Duplicate</option></select></div>
          <div className="prd-field"><label htmlFor="prd-source">Source</label><select id="prd-source" value={sourceFilter} onChange={(event) => updateFilter('reportSource', event.target.value)}><option value="">All sources</option><option value="ALAB_APP">ALAB mobile app</option><option value="PHONE_CALL">Phone call</option></select></div>
          <div className="prd-field"><label htmlFor="prd-fire-type">Fire type</label><select id="prd-fire-type" value={fireTypeFilter} onChange={(event) => updateFilter('fireType', event.target.value)}><option value="">All types</option><option value="HOUSE_BUILDING">House / Building</option><option value="GRASS">Grass fire</option><option value="FOREST">Forest fire</option><option value="VEHICLE">Vehicle fire</option><option value="OTHER">Other</option></select></div>
          <div className="prd-field"><label htmlFor="prd-from">From date</label><input id="prd-from" type="date" value={fromDate} onChange={(event) => updateFilter('from', event.target.value)} /></div>
          <div className="prd-field"><label htmlFor="prd-to">To date</label><input id="prd-to" type="date" value={toDate} onChange={(event) => updateFilter('to', event.target.value)} /></div>
          <div className="prd-field prd-search"><label htmlFor="prd-search">Search</label><div className="prd-search-wrap"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input id="prd-search" type="search" aria-label="Search fire reports" placeholder="Reference, barangay, municipality…" value={search} onChange={(event) => updateFilter('search', event.target.value)} /></div></div>
        </div>
      </section>

      <section className="prd-records" aria-label="Provincial fire report records" aria-busy={loading}>
        {error && <div className="prd-alert" role="alert"><span><strong>Could not load reports.</strong> {error}</span><button type="button" onClick={fetchReports}>Try again</button></div>}
        {loading && reports.length === 0 ? <div aria-label="Loading reports">{[0,1,2,3,4].map((row)=><div className="prd-skeleton-row" key={row}>{Array.from({length:8},(_,cell)=><span className="prd-skeleton" key={cell}/>)}</div>)}</div> : reports.length === 0 ? <div className="prd-state"><div className="prd-state-icon"><i className="fa-solid fa-file-circle-xmark" aria-hidden="true" /></div><strong>No matching fire reports</strong><span>Change or clear the filters to see more records.</span></div> : <>
          <div className="prd-scroll"><table className="prd-table"><thead><tr><th>Reference</th><th>Municipality / Barangay</th><th>Source</th><th>Type / Danger level</th><th>Status</th><th>Submitted time</th><th>Dispatches</th><th style={{textAlign:'right'}}>Actions</th></tr></thead><tbody>{reports.map((rep)=><tr key={rep.id} className="prd-row">
            <td><span className="prd-reference">{rep.referenceNumber}</span></td><td><div className="prd-place"><strong>{rep.municipalityName}</strong><span>{rep.barangay}</span></div></td><td><span className="prd-source">{rep.reportSource==='ALAB_APP'?'App':'Phone'}</span></td><td><span className="prd-fire-type">{getFireTypeLabel(rep.fireType)}</span>{rep.severity&&rep.severity!=='UNKNOWN'?severityBadge(rep.severity):<span className="prd-not-rated">Not rated</span>}</td><td>{statusBadge(rep.status)}</td><td><span className="prd-date">{formatDateTime(rep.submittedAt)}</span></td><td><span className="prd-dispatch">{rep.latestDispatchSummary||'No dispatch active'}</span></td><td style={{textAlign:'right'}}><button type="button" className="prd-view" onClick={()=>setSelectedReportId(rep.id)}><i className="fa-solid fa-arrow-right" aria-hidden="true" /> View</button></td>
          </tr>)}</tbody></table></div><div className="prd-mobile-records">{reports.map(renderMobileRecord)}</div></>}
        <footer className="prd-footer"><span aria-live="polite">Showing {rangeStart}–{rangeEnd} of {total.toLocaleString()} reports</span><div className="prd-pagination"><label className="prd-page-size">Rows <select aria-label="Rows per page" value={pageSize} onChange={(event)=>setPageSize(Number(event.target.value) as 25|50|100)}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" className="prd-page-button" aria-label="Previous page" disabled={loading||page<=1} onClick={()=>setPage(page-1)}><i className="fa-solid fa-chevron-left" /></button><span>Page {page} of {pages}</span><button type="button" className="prd-page-button" aria-label="Next page" disabled={loading||page>=pages} onClick={()=>setPage(page+1)}><i className="fa-solid fa-chevron-right" /></button></div></footer>
      </section>

      {selectedReportId && <ProvincialReportDetail key={selectedReportId} reportId={selectedReportId} onClose={()=>{setSelectedReportId(null);const url=new URL(window.location.href);url.searchParams.delete('report');window.history.replaceState(window.history.state,'',url);}} />}
    </section>
  );
}
