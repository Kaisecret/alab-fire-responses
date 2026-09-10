'use client';

import React, { useState, useEffect } from 'react';
import { useManagementDialog } from './use-management-dialog';
import type { ProvincialReportDetail as ReportDetailType } from '../../lib/provincial-bfp/management/types';

interface ProvincialReportDetailProps {
  reportId: string;
  onClose: () => void;
}

export function ProvincialReportDetail({ reportId, onClose }: ProvincialReportDetailProps) {
  const [report, setReport] = useState<ReportDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/provincial-bfp/incident-reports/${reportId}`, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load report detail');
        }
        const data = await res.json();
        if (isMounted) setReport(data.report);
      } catch (err: unknown) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Error fetching report');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    const timer = window.setTimeout(() => { setReport(null); setSelectedPhoto(null); void loadReport(); }, 0);


  return () => {
      window.clearTimeout(timer);
      isMounted = false;
      controller.abort();
    };
  }, [reportId]);

  useManagementDialog(true, () => { if (selectedPhoto) setSelectedPhoto(null); else onClose(); }, false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span style={{ background: '#DC2626', color: '#FFFFFF', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>CONFIRMED</span>;
      case 'CLOSED':
        return <span style={{ background: '#059669', color: '#FFFFFF', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>RESOLVED / CLOSED</span>;
      case 'SUBMITTED':
      case 'UNDER_VERIFICATION':
        return <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>UNDER VERIFICATION</span>;
      case 'FALSE_REPORT':
      case 'REJECTED':
      case 'DUPLICATE':
        return <span style={{ background: '#F1F5F9', color: '#64748B', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>{status}</span>;
      default:
        return <span style={{ background: '#E2E8F0', color: '#475569', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>{status}</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span style={{ background: '#7F1D1D', color: '#FECACA', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}>CRITICAL</span>;
      case 'HIGH':
        return <span style={{ background: '#991B1B', color: '#FEE2E2', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}>HIGH</span>;
      case 'MODERATE':
        return <span style={{ background: '#D97706', color: '#FEF3C7', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}>MODERATE</span>;
      case 'LOW':
        return <span style={{ background: '#047857', color: '#D1FAE5', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>LOW</span>;
      default: return <span style={{ color: '#64748B' }}>Not available</span>;
    }
  };

  return (
    <div data-management-dialog
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 760,
          background: '#FFFFFF',
          height: '100%',
          overflowY: 'auto',
          padding: '2rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E23632', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PROVINCIAL INCIDENT DOSSIER
            </span>
            <h2 style={{ margin: '4px 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
              {report ? report.referenceNumber : 'Loading Report…'}
            </h2>
            {report && (
              <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {getStatusBadge(report.status)}
                {getSeverityBadge(report.severity)}
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                  Source: {report.reportSource === 'ALAB_APP' ? 'ALAB Resident Mobile' : 'Direct Phone Dispatch'}
                </span>
              </div>
            )}
          </div>
          <button
            aria-label="Close report" onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              fontSize: '1.25rem',
              lineHeight: 1,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Loading full incident report dossier…</div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 6 }}>{error}</div>
        ) : report ? (
          <>
            {/* Grid Overview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                background: '#F8FAFC',
                padding: '1.25rem',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                fontSize: '0.875rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>MUNICIPALITY</div>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>{report.municipalityName}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>BARANGAY / LOCATION</div>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>{report.barangay}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>FIRE CLASSIFICATION</div>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>{report.fireType}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>COORDINATES</div>
                <div style={{ fontFamily: 'monospace', color: '#334155' }}>
                  {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>SUBMITTED TIME</div>
                <div style={{ color: '#334155' }}>{new Date(report.submittedAt).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>RESPONSE START TIME</div>
                <div style={{ color: '#334155' }}>
                  {report.responseStartedAt ? new Date(report.responseStartedAt).toLocaleString() : 'Pending response'}
                </div>
              </div>
            </div>

            {/* Reporter Information */}
            <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                Reporter Information Snapshot
              </h3>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Reporter Name: </span>
                  <strong style={{ color: '#1E293B' }}>{report.reporterNameSnapshot}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Contact Number: </span>
                  <strong style={{ color: '#1E293B' }}>{report.reporterPhoneSnapshot}</strong>
                </div>
              </div>
            </div>

            {/* Incident Description */}
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                Incident Description & Context
              </h3>
              <div style={{ padding: '0.875rem 1rem', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                {report.description || 'No descriptive narrative provided.'}
              </div>
            </div>

            {/* Evidence Photos */}
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                Incident Scene Photos ({report.photos.length})
              </h3>
              {report.photos.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem', background: '#F8FAFC', borderRadius: 6 }}>
                  No photos uploaded for this incident report.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  {report.photos.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedPhoto(url)}
                      style={{
                        height: 120,
                        borderRadius: 6,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid #CBD5E1',
                        position: 'relative',
                      }}
                    >
                      <img src={url} alt={`Scene ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <section aria-label="Report status history">
              <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#0F172A' }}>Status history</h3>
              {report.timeline?.length ? <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 10 }}>
                {report.timeline.map((event, index) => <li key={`${event.timestamp}-${index}`} style={{ color: '#475569', fontSize: '0.85rem' }}>
                  <strong>{event.stage.replaceAll('_', ' ')}</strong> ? {new Date(event.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                  {event.notes && <p style={{ margin: '4px 0 0' }}>{event.notes}</p>}
                </li>)}
              </ol> : <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No status history recorded.</p>}
            </section>

            {/* Dispatches Section */}
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                Municipal Dispatches & Responding Units ({report.dispatches.length})
              </h3>
              {report.dispatches.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem', background: '#F8FAFC', borderRadius: 6 }}>
                  No station dispatches initiated for this incident yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {report.dispatches.map((d) => (
                    <div key={d.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div>
                          <strong style={{ color: '#0F172A', fontSize: '0.875rem' }}>Dispatch Unit #{d.id.slice(0, 8)}</strong>
                          <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#64748B' }}>
                            Dispatched: {new Date(d.dispatchedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <span style={{ background: d.status === 'COMPLETED' ? '#D1FAE5' : '#FEF3C7', color: d.status === 'COMPLETED' ? '#065F46' : '#92400E', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                          {d.status}
                        </span>
                      </div>

                      {/* Stations involved */}
                      <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '0.5rem' }}>
                        <strong>Stations: </strong>
                        {(d.stations || []).map((s) => s.stationName).join(', ') || 'None assigned'}
                      </div>

                      {/* Responders involved */}
                      <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        <strong>Responders ({(d.recipients || []).length}): </strong>
                        {(d.recipients || []).map((r) => `${r.name} (${r.status})`).join(' · ') || 'None'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '2rem',
          }}
        >
          <img src={selectedPhoto} alt="Zoomed Scene" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
