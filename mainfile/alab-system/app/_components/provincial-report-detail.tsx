'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useManagementDialog } from './use-management-dialog';
import { PhotoLightbox } from './photo-lightbox';
import { ProvincialIncidentMiniMap, provincialMiniMapStyles } from './provincial-incident-mini-map';
import type { ProvincialReportDetail as ReportDetailType } from '../../lib/provincial-bfp/management/types';
import {
  getFireTypeLabel,
  getStatusLabel,
  formatPhilippineDateTime,
} from '../../lib/municipal-bfp/reports/formatters';

interface ProvincialReportDetailProps {
  reportId: string;
  onClose: () => void;
}

const styles = `
  .pid-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    display: flex;
    justify-content: flex-end;
    z-index: 99999;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    animation: pidFadeIn 0.2s ease-out;
  }

  .pid-drawer {
    width: 100%;
    max-width: 780px;
    height: 100%;
    background: #FFFFFF;
    display: flex;
    flex-direction: column;
    box-shadow: -16px 0 48px -12px rgba(15, 23, 42, 0.28);
    animation: pidSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  /* Header */
  .pid-header {
    padding: 1.25rem 1.75rem;
    background: #FFFFFF;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    flex-shrink: 0;
  }

  .pid-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.72rem;
    font-weight: 800;
    color: #DC2626;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .pid-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-top: 0.3rem;
  }

  .pid-title {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.025em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .pid-copy-btn {
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 0.72rem;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s ease;
  }
  .pid-copy-btn:hover {
    background: #E2E8F0;
    color: #0F172A;
  }

  .pid-badges {
    margin-top: 0.65rem;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pid-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .pid-severity-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .pid-source-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    color: #475569;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .pid-head-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .pid-pdf-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.85rem;
    border: 1px solid #FECACA;
    border-radius: 10px;
    background: #FEF2F2;
    color: #D00F09;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .pid-pdf-btn:hover:not(:disabled) {
    background: #FEE2E2;
    border-color: #FCA5A5;
    transform: translateY(-1px);
  }
  .pid-pdf-btn:disabled { cursor: progress; opacity: 0.75; }

  .pid-pdf-error {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #B91C1C;
    font-size: 0.75rem;
    font-weight: 700;
    max-width: 220px;
  }

  @media (max-width: 640px) {
    .pid-pdf-btn span { display: none; }
    .pid-pdf-error { display: none; }
  }

  .pid-close-btn {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748B;
    cursor: pointer;
    font-size: 0.95rem;
    transition: all 0.18s ease;
    flex-shrink: 0;
  }
  .pid-close-btn:hover {
    background: #FEE2E2;
    border-color: #FECACA;
    color: #DC2626;
    transform: scale(1.05);
  }

  /* Scrollable Body */
  .pid-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 1.75rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: #F8FAFC;
  }

  /* Cards */
  .pid-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
  }

  .pid-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.85rem;
  }

  .pid-card-title {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 800;
    color: #334155;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pid-card-title i {
    color: #DC2626;
    font-size: 0.85rem;
  }

  .pid-count-chip {
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    color: #475569;
    padding: 1px 7px;
    border-radius: 9999px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  /* Key Metrics Grid */
  .pid-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }
  @media (max-width: 640px) {
    .pid-grid {
      grid-template-columns: 1fr;
    }
  }

  .pid-fact {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.8rem 0.95rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .pid-fact-label {
    font-size: 0.68rem;
    font-weight: 800;
    color: #64748B;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 0.35rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .pid-fact-label i {
    color: #DC2626;
    font-size: 0.75rem;
  }
  .pid-fact-value {
    font-size: 0.92rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.35;
  }
  .pid-fact-sub {
    font-size: 0.78rem;
    color: #475569;
    font-weight: 600;
    margin-top: 2px;
  }
  .pid-fact-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.82rem;
    color: #1E293B;
    font-weight: 600;
  }
  .pid-coords-wrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .pid-mini-copy {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 5px;
    padding: 2px 6px;
    font-size: 0.7rem;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    transition: all 0.15s ease;
  }
  .pid-mini-copy:hover {
    background: #F1F5F9;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .pid-delta-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    color: #1D4ED8;
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 800;
    margin-top: 4px;
    width: fit-content;
  }

  /* Reporter Snapshot */
  .pid-reporter-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.85rem 1rem;
  }
  .pid-reporter-info {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
  .pid-reporter-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    color: #2563EB;
    display: grid;
    place-items: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
  .pid-reporter-name {
    font-weight: 800;
    color: #0F172A;
    font-size: 0.95rem;
  }
  .pid-reporter-meta {
    font-size: 0.75rem;
    color: #64748B;
    font-weight: 600;
  }
  .pid-phone-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    padding: 0.5rem 0.9rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 700;
    color: #0F172A;
    text-decoration: none;
    transition: all 0.15s ease;
  }
  .pid-phone-btn:hover {
    background: #EFF6FF;
    border-color: #93C5FD;
    color: #1D4ED8;
  }

  /* Description */
  .pid-description {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-left: 4px solid #DC2626;
    border-radius: 0 10px 10px 0;
    padding: 0.9rem 1.15rem;
    font-size: 0.875rem;
    color: #334155;
    line-height: 1.6;
  }
  .pid-description-empty {
    color: #94A3B8;
    font-style: italic;
  }

  /* Photos */
  .pid-photos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.85rem;
  }
  .pid-photo-card {
    position: relative;
    height: 130px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #E2E8F0;
    background: #0F172A;
    cursor: pointer;
    padding: 0;
    text-align: left;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .pid-photo-card:hover {
    transform: translateY(-2px);
    border-color: #CBD5E1;
    box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.12);
  }
  .pid-photo-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.25s ease;
  }
  .pid-photo-card:hover img {
    transform: scale(1.05);
  }
  .pid-photo-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #F1F5F9;
    color: #64748B;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .pid-photo-fallback i {
    font-size: 1.5rem;
    color: #94A3B8;
  }
  .pid-photo-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(15, 23, 42, 0.75) 0%, transparent 60%);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0.5rem 0.65rem;
    color: #FFFFFF;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .pid-zoom-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.68rem;
  }
  .pid-empty-box {
    padding: 1.75rem 1rem;
    text-align: center;
    background: #F8FAFC;
    border: 1px dashed #CBD5E1;
    border-radius: 10px;
    color: #64748B;
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
  }
  .pid-empty-box i {
    font-size: 1.5rem;
    color: #94A3B8;
  }

  /* Status History Timeline */
  .pid-timeline {
    position: relative;
    padding: 0 0 0 1.75rem;
    margin: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }
  .pid-timeline::before {
    content: '';
    position: absolute;
    top: 0.75rem;
    bottom: 0.75rem;
    left: 0.55rem;
    width: 2px;
    background: #E2E8F0;
  }
  .pid-timeline-item {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .pid-timeline-node {
    position: absolute;
    left: -1.75rem;
    top: 0.15rem;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 0.65rem;
    border: 2px solid #FFFFFF;
    box-shadow: 0 0 0 2px #CBD5E1;
    background: #94A3B8;
    color: #FFFFFF;
    z-index: 2;
  }
  .pid-timeline-node.active {
    background: #DC2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25);
  }
  .pid-timeline-node.completed {
    background: #059669;
    box-shadow: 0 0 0 2px #A7F3D0;
  }
  .pid-timeline-node.warning {
    background: #D97706;
    box-shadow: 0 0 0 2px #FDE68A;
  }
  .pid-timeline-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .pid-timeline-stage {
    font-size: 0.88rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .pid-timeline-time {
    font-size: 0.75rem;
    color: #64748B;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .pid-timeline-notes {
    margin: 0;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.6rem 0.85rem;
    font-size: 0.8125rem;
    color: #334155;
    line-height: 1.45;
  }

  /* Dispatches */
  .pid-dispatches-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .pid-dispatch-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .pid-dispatch-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .pid-unit-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.88rem;
    font-weight: 800;
    color: #0F172A;
  }
  .pid-unit-time {
    font-size: 0.75rem;
    color: #64748B;
    font-weight: 600;
  }
  .pid-station-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #334155;
  }
  .pid-responders-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    align-items: center;
  }
  .pid-responder-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    color: #1E293B;
  }

  @keyframes pidFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pidSlideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
`;

export function ProvincialReportDetail({ reportId, onClose }: ProvincialReportDetailProps) {
  const [report, setReport] = useState<ReportDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number; caption?: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  /** Pulls the official one-incident dossier, the same document a station prints. */
  const handleDownloadPdf = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch('/api/provincial-bfp/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          dataset: 'INCIDENT_DOSSIER',
          format: 'PDF',
          scope: 'ALL_MATCHING',
          reportId,
          filters: { page: 1, pageSize: 25 },
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to generate this incident report.');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      const named = disposition ? /filename="?([^"]+)"?/.exec(disposition)?.[1] : undefined;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = named || 'alab-provincial-incident-report.pdf';
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      link.remove();
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : 'Download failed. Please retry.');
    } finally {
      setDownloading(false);
    }
  }, [downloading, reportId]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/provincial-bfp/incident-reports/${reportId}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
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

    const timer = window.setTimeout(() => {
      setReport(null);
      setLightbox(null);
      void loadReport();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      isMounted = false;
      controller.abort();
    };
  }, [reportId]);

  useManagementDialog(
    true,
    () => {
      if (lightbox) setLightbox(null);
      else onClose();
    },
    false,
  );

  const handleCopy = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="pid-status-pill" style={{ background: '#DC2626', color: '#FFFFFF' }}>
            <i className="fa-solid fa-fire" />
            CONFIRMED
          </span>
        );
      case 'RESPONDING':
        return (
          <span className="pid-status-pill" style={{ background: '#EA580C', color: '#FFFFFF' }}>
            <i className="fa-solid fa-truck-fast" />
            RESPONDING
          </span>
        );
      case 'FIRETRUCK_DISPATCHED':
      case 'DISPATCHED':
        return (
          <span className="pid-status-pill" style={{ background: '#D97706', color: '#FFFFFF' }}>
            <i className="fa-solid fa-truck-fire" />
            DISPATCHED
          </span>
        );
      case 'RESPONDER_ARRIVED':
        return (
          <span className="pid-status-pill" style={{ background: '#4F46E5', color: '#FFFFFF' }}>
            <i className="fa-solid fa-location-crosshairs" />
            ON SCENE
          </span>
        );
      case 'UNDER_CONTROL':
        return (
          <span className="pid-status-pill" style={{ background: '#0F766E', color: '#FFFFFF' }}>
            <i className="fa-solid fa-shield-halved" />
            UNDER CONTROL
          </span>
        );
      case 'RESOLVED':
      case 'CLOSED':
        return (
          <span className="pid-status-pill" style={{ background: '#059669', color: '#FFFFFF' }}>
            <i className="fa-solid fa-circle-check" />
            RESOLVED / CLOSED
          </span>
        );
      case 'SUBMITTED':
      case 'UNDER_VERIFICATION':
      case 'PENDING_VERIFICATION':
        return (
          <span className="pid-status-pill" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
            <i className="fa-solid fa-clipboard-question" />
            UNDER VERIFICATION
          </span>
        );
      case 'FALSE_REPORT':
      case 'REJECTED':
      case 'DUPLICATE':
        return (
          <span className="pid-status-pill" style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>
            <i className="fa-solid fa-ban" />
            {status}
          </span>
        );
      default:
        return (
          <span className="pid-status-pill" style={{ background: '#E2E8F0', color: '#475569' }}>
            {status}
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="pid-severity-pill" style={{ background: '#7F1D1D', color: '#FECACA' }}>
            <i className="fa-solid fa-triangle-exclamation" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="pid-severity-pill" style={{ background: '#991B1B', color: '#FEE2E2' }}>
            <i className="fa-solid fa-circle-exclamation" /> HIGH
          </span>
        );
      case 'MODERATE':
        return (
          <span className="pid-severity-pill" style={{ background: '#D97706', color: '#FEF3C7' }}>
            <i className="fa-solid fa-triangle-exclamation" /> MODERATE
          </span>
        );
      case 'LOW':
        return (
          <span className="pid-severity-pill" style={{ background: '#047857', color: '#D1FAE5' }}>
            <i className="fa-solid fa-shield" /> LOW
          </span>
        );
      default:
        return <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Not available</span>;
    }
  };

  const getResponseDelta = (submittedAt: string, responseStartedAt: string | null) => {
    if (!responseStartedAt) return null;
    const start = new Date(submittedAt).getTime();
    const resp = new Date(responseStartedAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(resp) || resp < start) return null;
    const diffSec = Math.round((resp - start) / 1000);
    if (diffSec < 60) return `${diffSec}s response latency`;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs}s response latency`;
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'SUBMITTED':
        return 'fa-solid fa-file-arrow-up';
      case 'UNDER_VERIFICATION':
      case 'PENDING_VERIFICATION':
        return 'fa-solid fa-clipboard-question';
      case 'CONFIRMED':
      case 'VERIFIED':
        return 'fa-solid fa-fire';
      case 'RESPONDING':
        return 'fa-solid fa-truck-fast';
      case 'FIRETRUCK_DISPATCHED':
      case 'DISPATCHED':
        return 'fa-solid fa-truck-fire';
      case 'RESPONDER_ARRIVED':
        return 'fa-solid fa-location-crosshairs';
      case 'UNDER_CONTROL':
        return 'fa-solid fa-shield-halved';
      case 'RESOLVED':
      case 'CLOSED':
        return 'fa-solid fa-circle-check';
      case 'FALSE_REPORT':
      case 'REJECTED':
        return 'fa-solid fa-ban';
      default:
        return 'fa-solid fa-circle-dot';
    }
  };

  const getStageNodeClass = (stage: string, isLatest: boolean) => {
    if (isLatest) return 'pid-timeline-node active';
    switch (stage) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'pid-timeline-node completed';
      case 'UNDER_VERIFICATION':
      case 'PENDING_VERIFICATION':
        return 'pid-timeline-node warning';
      default:
        return 'pid-timeline-node completed';
    }
  };

  return (
    <>
      <style>{styles}{provincialMiniMapStyles}</style>
      <div
        data-management-dialog
        className="pid-backdrop"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="pid-drawer" role="dialog" aria-modal="true" aria-label="Provincial Incident Dossier">
          {/* Header */}
          <div className="pid-header">
            <div>
              <div className="pid-kicker">
                <i className="fa-solid fa-shield-halved" />
                <span>PROVINCIAL INCIDENT DOSSIER</span>
              </div>
              <div className="pid-title-wrap">
                <h2 className="pid-title">{report ? report.referenceNumber : 'Loading Report…'}</h2>
                {report && (
                  <button
                    type="button"
                    className="pid-copy-btn"
                    onClick={() => handleCopy(report.referenceNumber, 'ref')}
                    title="Copy incident reference code"
                  >
                    <i className={`fa-solid ${copiedField === 'ref' ? 'fa-check' : 'fa-copy'}`} />
                    <span>{copiedField === 'ref' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              {report && (
                <div className="pid-badges">
                  {getStatusBadge(report.status)}
                  {getSeverityBadge(report.severity)}
                  <span className="pid-source-pill">{report.fireType === 'VEHICLE' || report.fireType === 'OTHER'
                    ? 'Rule-based' : report.severityScore == null ? 'Score unavailable' : `${report.severityScore}/100`}</span>
                  <span className="pid-source-pill">
                    <i
                      className={
                        report.reportSource === 'ALAB_APP'
                          ? 'fa-solid fa-mobile-screen-button'
                          : 'fa-solid fa-phone-volume'
                      }
                    />
                    <span>{report.reportSource === 'ALAB_APP' ? 'ALAB Resident Mobile' : 'Direct Phone Dispatch'}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="pid-head-actions">
              {downloadError && (
                <span role="status" className="pid-pdf-error">
                  <i className="fa-solid fa-circle-exclamation" />
                  {downloadError}
                </span>
              )}
              {report && (
                <button
                  type="button"
                  className="pid-pdf-btn"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  title="Download the official incident dossier"
                >
                  <i className={`fa-solid ${downloading ? 'fa-circle-notch fa-spin' : 'fa-file-pdf'}`} />
                  <span>{downloading ? 'Preparing…' : 'Download PDF'}</span>
                </button>
              )}
              <button
                type="button"
                className="pid-close-btn"
                aria-label="Close report"
                onClick={onClose}
                title="Close (Esc)"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="pid-body">
            {loading ? (
              <div className="pid-empty-box" style={{ padding: '3.5rem' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#DC2626' }} />
                <strong>Loading full incident report dossier…</strong>
                <span>Retrieving dispatch status and logs from Antique command network.</span>
              </div>
            ) : error ? (
              <div style={{ padding: '1.25rem', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 10 }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Unable to load incident dossier</strong>
                <span>{error}</span>
              </div>
            ) : report ? (
              <>
                {/* Tactical Parameters Bento */}
                <div className="pid-grid">
                  <div className="pid-fact">
                    <div className="pid-fact-label">
                      <i className="fa-solid fa-location-dot" />
                      <span>Municipality</span>
                    </div>
                    <div>
                      <div className="pid-fact-value">{report.municipalityName}</div>
                      <div className="pid-fact-sub">Brgy. {report.barangay}</div>
                    </div>
                  </div>

                  <div className="pid-fact">
                    <div className="pid-fact-label">
                      <i className="fa-solid fa-fire" />
                      <span>Classification</span>
                    </div>
                    <div>
                      <div className="pid-fact-value">{getFireTypeLabel(report.fireType)}</div>
                      <div className="pid-fact-sub">BFP Antique Jurisdiction</div>
                    </div>
                  </div>

                  <div className="pid-fact">
                    <div className="pid-fact-label">
                      <i className="fa-solid fa-crosshairs" />
                      <span>Coordinates</span>
                    </div>
                    <div>
                      <div className="pid-coords-wrap">
                        <span className="pid-fact-mono">
                          {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                        </span>
                        <button
                          type="button"
                          className="pid-mini-copy"
                          onClick={() => handleCopy(`${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`, 'coords')}
                          title="Copy GPS coordinates"
                        >
                          <i className={`fa-solid ${copiedField === 'coords' ? 'fa-check' : 'fa-copy'}`} />
                          {copiedField === 'coords' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="pid-fact-sub">WGS84 Datum</div>
                    </div>
                  </div>

                  <div className="pid-fact">
                    <div className="pid-fact-label">
                      <i className="fa-regular fa-clock" />
                      <span>Submitted Time</span>
                    </div>
                    <div>
                      <div className="pid-fact-value" style={{ fontSize: '0.84rem' }}>
                        {formatPhilippineDateTime(report.submittedAt)}
                      </div>
                      <div className="pid-fact-sub">Caller initial report</div>
                    </div>
                  </div>

                  <div className="pid-fact">
                    <div className="pid-fact-label">
                      <i className="fa-solid fa-truck-fast" />
                      <span>Response Start</span>
                    </div>
                    <div>
                      <div className="pid-fact-value" style={{ fontSize: '0.84rem' }}>
                        {report.responseStartedAt ? formatPhilippineDateTime(report.responseStartedAt) : 'Pending response'}
                      </div>
                      {getResponseDelta(report.submittedAt, report.responseStartedAt) && (
                        <div className="pid-delta-badge">
                          <i className="fa-solid fa-bolt" />
                          <span>{getResponseDelta(report.submittedAt, report.responseStartedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pid-fact">
                    <div className="pid-fact-label">
                      <i className="fa-solid fa-flag-checkered" />
                      <span>Resolution Status</span>
                    </div>
                    <div>
                      <div className="pid-fact-value" style={{ fontSize: '0.84rem' }}>
                        {report.resolvedAt ? formatPhilippineDateTime(report.resolvedAt) : 'Ongoing incident'}
                      </div>
                      <div className="pid-fact-sub">
                        {report.resolvedAt ? 'Incident formally concluded' : 'Active tactical operation'}
                      </div>
                    </div>
                  </div>
                </div>

                {report.severityFactors && report.severityFactors.length > 0 && (
                  <section className="pid-card" aria-label="Level of Danger factors">
                    <div className="pid-card-header"><h3 className="pid-card-title">Why this Level of Danger</h3></div>
                    <ul>{report.severityFactors.map((factor, index) => <li key={`${index}-${factor}`}>{factor}</li>)}</ul>
                  </section>
                )}

                {/* Ground Reconnaissance Mini-Map */}
                {typeof report.latitude === 'number' &&
                  typeof report.longitude === 'number' &&
                  report.latitude !== 0 &&
                  report.longitude !== 0 && (
                    <div className="pid-card">
                      <div className="pid-card-header">
                        <h3 className="pid-card-title">
                          <img
                            src="/images/fire logo.webp"
                            alt="Fire Logo"
                            style={{ width: 20, height: 20, objectFit: 'contain' }}
                          />
                          <span>Tactical Ground Reconnaissance Map</span>
                        </h3>
                        <span className="pid-count-chip">120m Safety Perimeter</span>
                      </div>
                      <ProvincialIncidentMiniMap
                        latitude={report.latitude}
                        longitude={report.longitude}
                        label={`${report.referenceNumber} · ${report.municipalityName}`}
                        landmark={report.barangay ? `Brgy. ${report.barangay}` : undefined}
                      />
                    </div>
                  )}

                {/* Reporter Information Snapshot */}
                <div className="pid-card">
                  <div className="pid-card-header">
                    <h3 className="pid-card-title">
                      <i className="fa-solid fa-user-shield" />
                      <span>Reporter Information Snapshot</span>
                    </h3>
                  </div>
                  <div className="pid-reporter-box">
                    <div className="pid-reporter-info">
                      <div className="pid-reporter-avatar">
                        <i className="fa-solid fa-user" />
                      </div>
                      <div>
                        <div className="pid-reporter-name">
                          {report.reporterNameSnapshot || 'Anonymous Citizen Reporter'}
                        </div>
                        <div className="pid-reporter-meta">
                          {report.reportSource === 'ALAB_APP'
                            ? 'Verified ALAB Resident Mobile Account'
                            : 'Direct Telephone Emergency Dispatch'}
                        </div>
                      </div>
                    </div>
                    {report.reporterPhoneSnapshot ? (
                      <a
                        href={`tel:${report.reporterPhoneSnapshot}`}
                        className="pid-phone-btn"
                        title="Call Citizen Reporter"
                      >
                        <i className="fa-solid fa-phone" style={{ color: '#0284C7' }} />
                        <span>{report.reporterPhoneSnapshot}</span>
                      </a>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>No direct contact number</span>
                    )}
                  </div>
                </div>

                {/* Incident Description & Context */}
                <div className="pid-card">
                  <div className="pid-card-header">
                    <h3 className="pid-card-title">
                      <i className="fa-solid fa-align-left" />
                      <span>Incident Description & Context</span>
                    </h3>
                  </div>
                  <div className="pid-description">
                    {report.description ? (
                      report.description
                    ) : (
                      <span className="pid-description-empty">No descriptive narrative provided by the reporter.</span>
                    )}
                  </div>
                </div>

                {/* Incident Scene Photos */}
                <div className="pid-card">
                  <div className="pid-card-header">
                    <h3 className="pid-card-title">
                      <i className="fa-solid fa-camera" />
                      <span>Incident Scene Photos</span>
                    </h3>
                    <span className="pid-count-chip">Photos ({report.photos.length})</span>
                  </div>
                  {report.photos.length === 0 ? (
                    <div className="pid-empty-box">
                      <i className="fa-solid fa-images" />
                      <span>No scene photos attached to this incident report.</span>
                    </div>
                  ) : (
                    <div className="pid-photos-grid">
                      {report.photos.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          className="pid-photo-card"
                          onClick={() =>
                            setLightbox({
                              photos: report.photos,
                              index: i,
                              caption: `Incident Scene Photo ${i + 1} of ${report.photos.length} · ${report.referenceNumber}`,
                            })
                          }
                          aria-label={`View photo ${i + 1} full size`}
                        >
                          <img
                            src={url}
                            alt={`Scene ${i + 1}`}
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                              const parent = (e.currentTarget as HTMLElement).parentElement;
                              if (parent) {
                                const fallback = parent.querySelector('.pid-photo-fallback') as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="pid-photo-fallback" style={{ display: 'none' }}>
                            <i className="fa-solid fa-image" />
                            <span>Photo {i + 1}</span>
                          </div>
                          <div className="pid-photo-overlay">
                            <span>Photo {i + 1}</span>
                            <span className="pid-zoom-badge">
                              <i className="fa-solid fa-magnifying-glass-plus" /> Expand
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status History Timeline */}
                <section className="pid-card" aria-label="Report status history">
                  <div className="pid-card-header">
                    <h3 className="pid-card-title">
                      <i className="fa-solid fa-timeline" />
                      <span>Status history</span>
                    </h3>
                    {report.timeline && (
                      <span className="pid-count-chip">{report.timeline.length} milestones</span>
                    )}
                  </div>

                  {report.timeline && report.timeline.length > 0 ? (
                    <ol className="pid-timeline">
                      {report.timeline.map((event, index) => {
                        const isLatest = index === (report.timeline?.length ?? 1) - 1;
                        return (
                          <li key={`${event.timestamp}-${index}`} className="pid-timeline-item">
                            <span className={getStageNodeClass(event.stage, isLatest)}>
                              <i className={getStageIcon(event.stage)} />
                            </span>
                            <div className="pid-timeline-head">
                              <div className="pid-timeline-stage">
                                <span>{getStatusLabel(event.stage)}</span>
                                {event.actor && (
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      color: '#64748B',
                                      background: '#F1F5F9',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                    }}
                                  >
                                    by {event.actor}
                                  </span>
                                )}
                              </div>
                              <span className="pid-timeline-time">
                                {formatPhilippineDateTime(event.timestamp)}
                              </span>
                            </div>
                            {event.notes && (
                              <p className="pid-timeline-notes">{event.notes}</p>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <div className="pid-empty-box">
                      <i className="fa-solid fa-clock-rotate-left" />
                      <span>No status history recorded yet.</span>
                    </div>
                  )}
                </section>

                {/* Dispatches Section */}
                <div className="pid-card">
                  <div className="pid-card-header">
                    <h3 className="pid-card-title">
                      <i className="fa-solid fa-truck-droplet" />
                      <span>Municipal Dispatches & Responding Units</span>
                    </h3>
                    <span className="pid-count-chip">Dispatches ({report.dispatches.length})</span>
                  </div>

                  {report.dispatches.length === 0 ? (
                    <div className="pid-empty-box">
                      <i className="fa-solid fa-truck-droplet" />
                      <span>No station dispatches initiated for this incident yet.</span>
                    </div>
                  ) : (
                    <div className="pid-dispatches-list">
                      {report.dispatches.map((d) => (
                        <div key={d.id} className="pid-dispatch-card">
                          <div className="pid-dispatch-header">
                            <div className="pid-unit-title">
                              <i className="fa-solid fa-fire-extinguisher" style={{ color: '#DC2626' }} />
                              <span>Dispatch Unit #{d.id.slice(0, 8)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="pid-unit-time">
                                <i className="fa-regular fa-clock" style={{ marginRight: 4 }} />
                                {formatPhilippineDateTime(d.dispatchedAt)}
                              </span>
                              <span
                                className="pid-status-pill"
                                style={{
                                  background: d.status === 'COMPLETED' ? '#D1FAE5' : '#FEF3C7',
                                  color: d.status === 'COMPLETED' ? '#065F46' : '#92400E',
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                }}
                              >
                                {getStatusLabel(d.status)}
                              </span>
                            </div>
                          </div>

                          {/* Stations involved */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>
                              Stations:
                            </span>
                            {(d.stations || []).length > 0 ? (
                              (d.stations || []).map((s) => (
                                <span key={s.stationId} className="pid-station-tag">
                                  <i className="fa-solid fa-building-shield" style={{ color: '#DC2626' }} />
                                  <span>{s.stationName}</span>
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>None assigned</span>
                            )}
                          </div>

                          {/* Responders involved */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>
                              Responders ({(d.recipients || []).length}):
                            </span>
                            {(d.recipients || []).length > 0 ? (
                              <div className="pid-responders-list">
                                {(d.recipients || []).map((r) => (
                                  <span key={r.userId} className="pid-responder-chip">
                                    <i className="fa-solid fa-user-tag" style={{ color: '#64748B' }} />
                                    <strong>{r.name}</strong>
                                    <span style={{ color: '#64748B', fontSize: '0.7rem' }}>
                                      ({getStatusLabel(r.status)})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>None</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mutual Aid Assistance if present */}
                {report.assistance && report.assistance.length > 0 && (
                  <div className="pid-card">
                    <div className="pid-card-header">
                      <h3 className="pid-card-title">
                        <i className="fa-solid fa-handshake-angle" />
                        <span>Mutual Aid Assistance Requests</span>
                      </h3>
                      <span className="pid-count-chip">{report.assistance.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {report.assistance.map((ast) => (
                        <div
                          key={ast.id}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 8,
                            padding: '0.75rem 0.9rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#0F172A', fontSize: '0.85rem' }}>
                              {ast.requesterMunicipality} ➔ {ast.recipientMunicipality}
                            </strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              Requested: {formatPhilippineDateTime(ast.requestedAt)}
                            </div>
                          </div>
                          <span
                            className="pid-status-pill"
                            style={{
                              background: ast.status === 'ACCEPTED' ? '#D1FAE5' : '#FEF3C7',
                              color: ast.status === 'ACCEPTED' ? '#065F46' : '#92400E',
                              fontSize: '0.72rem',
                            }}
                          >
                            {ast.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Full-screen Photo Lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onIndexChange={(idx) => setLightbox((curr) => (curr ? { ...curr, index: idx } : null))}
          onClose={() => setLightbox(null)}
          caption={lightbox.caption}
        />
      )}
    </>
  );
}
