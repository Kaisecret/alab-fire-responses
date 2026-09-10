'use client';

import React, { useState, useCallback } from 'react';
import { ProvincialManagementToolbar, ProvincialMunicipalityFilter } from '../../_components/provincial-management-toolbar';
import type { ProvincialReportSummary } from '../../../lib/provincial-bfp/management/types';

export default function ProvincialReportsPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [municipalityFilter, setMunicipalityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [fireTypeFilter, setFireTypeFilter] = useState('');

  const [summary, setSummary] = useState<ProvincialReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (municipalityFilter) params.set('municipalityId', municipalityFilter);
      if (sourceFilter) params.set('reportSource', sourceFilter);
      if (fireTypeFilter) params.set('fireType', fireTypeFilter);

      const res = await fetch(`/api/provincial-bfp/report-summaries?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate report summary');
      }
      const data = await res.json();
      setSummary(data.summary);
      setAppliedFilters(Object.fromEntries(params));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating provincial summary');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, municipalityFilter, sourceFilter, fireTypeFilter]);

  const handlePrint = () => {
    window.print();
  };

  // Calculate confirmed incidents vs administrative outcomes
  const confirmedCount = summary
    ? Object.entries(summary.byStatus).reduce((acc, [st, cnt]) => {
        const num = typeof cnt === 'number' ? cnt : 0;
        if (['CONFIRMED', 'VERIFIED', 'RESPONDING', 'FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL', 'RESOLVED', 'CLOSED'].includes(st)) return acc + num;
        return acc;
      }, 0)
    : 0;

  const adminOutcomeCount = summary
    ? Object.entries(summary.byStatus).reduce((acc, [st, cnt]) => {
        const num = typeof cnt === 'number' ? cnt : 0;
        if (st === 'FALSE_REPORT' || st === 'DUPLICATE' || st === 'REJECTED') return acc + num;
        return acc;
      }, 0)
    : 0;

  return (
    <div style={{ padding: '1.5rem 1.75rem 3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'inherit' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#E23632' }}>✦</span> Official Provincial Reports & Incident Summaries
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748B' }}>
            Generate, filter, and print official aggregated emergency fire summaries for Antique Province.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handlePrint}
            disabled={!summary}
            style={{
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: summary ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            ⎙ Print Summary
          </button>
        </div>
      </div>

      <div className="no-print"><ProvincialMunicipalityFilter value={municipalityFilter} onChange={setMunicipalityFilter} /></div>
      {/* Filter / Generator Form */}
      <div
        className="no-print"
        style={{
          background: '#FFFFFF',
          padding: '1.25rem',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Coverage From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Coverage To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Intake Source</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
          >
            <option value="">All Sources</option>
            <option value="ALAB_APP">ALAB Resident Mobile</option>
            <option value="PHONE_CALL">Direct Phone Call</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Fire Type</label>
          <select
            value={fireTypeFilter}
            onChange={(e) => setFireTypeFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
          >
            <option value="">All Fire Types</option>
            <option value="HOUSE_BUILDING">House / Building</option>
            <option value="GRASS">Grass Fire</option>
            <option value="FOREST">Forest Fire</option>
            <option value="VEHICLE">Vehicle Fire</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <button
          onClick={fetchSummary}
          disabled={loading}
          style={{
            background: '#E23632',
            color: '#FFFFFF',
            border: 'none',
            padding: '9px 16px',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 1px 3px rgba(226, 54, 50, 0.3)',
          }}
        >
          {loading ? 'Generating…' : 'Generate Provincial Summary'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, fontSize: '0.875rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {summary && <ProvincialManagementToolbar exportOnly dataset="REPORT_SUMMARY" filters={appliedFilters} onFilterChange={() => {}} />}
      {/* Generated Report View */}
      {summary ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Printable Report Title Header */}
          <div style={{ padding: '1.5rem', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0', borderLeft: '5px solid #E23632' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              BUREAU OF FIRE PROTECTION · REGION VI · PROVINCE OF ANTIQUE
            </div>
            <h2 style={{ margin: '6px 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
              Official Consolidated Provincial Incident Report
            </h2>
            <div style={{ fontSize: '0.875rem', color: '#475569' }}>
              Reporting Period: <strong>{summary.dateBoundaries.from ? new Date(summary.dateBoundaries.from).toLocaleDateString() : 'All Time'}</strong> to{' '}
              <strong>{summary.dateBoundaries.to ? new Date(summary.dateBoundaries.to).toLocaleDateString() : 'Present'}</strong> (Asia/Manila Timezone)
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Reports Intake</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{summary.totalReports}</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>All reports logged across Antique</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Confirmed Fire Incidents</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>{confirmedCount}</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Confirmed active & resolved fires</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>Administrative Outcomes</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#D97706', marginTop: 4 }}>{adminOutcomeCount}</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>False alarms, duplicates, & rejected</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>Avg Response Speed</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1E40AF', marginTop: 4 }}>
                {summary.timingMetrics.avgResponseMinutes !== null
                  ? `${summary.timingMetrics.avgResponseMinutes} min`
                  : 'Not available'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Intake to responder acknowledgement</div>
            </div>
          </div>

          {/* Breakdown Section: Fire Types & Sources */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {/* By Fire Type */}
            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                Classification Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(summary.byFireType).map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #F1F5F9', paddingBottom: 4 }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>{type}</span>
                    <strong style={{ color: '#0F172A' }}>{String(count)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* By Source */}
            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                Intake Source Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #F1F5F9', paddingBottom: 4 }}>
                  <span style={{ color: '#475569', fontWeight: 500 }}>ALAB Resident Mobile App</span>
                  <strong style={{ color: '#0F172A' }}>{summary.bySource.ALAB_APP || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderBottom: '1px solid #F1F5F9', paddingBottom: 4 }}>
                  <span style={{ color: '#475569', fontWeight: 500 }}>Station Emergency Phone Calls</span>
                  <strong style={{ color: '#0F172A' }}>{summary.bySource.PHONE_CALL || 0}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Municipality Breakdown Matrix */}
          <div style={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                Antique Municipal Breakdown Matrix
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                Comprehensive incident totals across all 18 Antique municipalities for this period.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 16px' }}>Municipality</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Total Intake</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Confirmed Fires</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>False / Duplicate</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(summary.byMunicipality) ? summary.byMunicipality : []).map((m) => (
                    <tr key={m.municipalityId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0F172A' }}>{m.municipalityName}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: m.total > 0 ? '#0F172A' : '#94A3B8' }}>
                        {m.total}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: m.confirmed > 0 ? '#059669' : '#94A3B8' }}>
                        {m.confirmed}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: m.falseReport > 0 ? '#D97706' : '#94A3B8' }}>
                        {m.falseReport}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: m.resolved > 0 ? '#2563EB' : '#94A3B8' }}>
                        {m.resolved}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #FFFFFF !important;
            color: #000000 !important;
          }
        }
      `}</style>
    </div>
  );
}
