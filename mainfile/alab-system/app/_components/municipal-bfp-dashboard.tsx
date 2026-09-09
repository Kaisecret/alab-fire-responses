'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMunicipalIncidentFeed } from './use-municipal-incident-feed';

// Municipal operations overview backed by the existing dashboard and incident feeds.

interface DashboardStats {
  activeIncidents: number;
  pendingVerifications: number;
  pendingReportsCount: number;
  pendingApplicationsCount: number;
  availableFiretrucks: number;
  respondersOnDuty: number;
  assistanceRequests: number;
}

interface PendingResidentApp {
  id: string;
  reference: string;
  status: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  barangay: string;
}

interface StationItem {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  status: string;
  assignedPersonnelCount: number;
}

interface MutualAidItem {
  id: string;
  municipalityName: string;
  stationName: string;
  phone: string;
}

interface DashboardPayload {
  municipality?: string;
  stats?: DashboardStats;
  pendingVerifications?: {
    reports: unknown[];
    residentApplications: PendingResidentApp[];
    totalPending: number;
  };
  stations?: StationItem[];
  mutualAid?: MutualAidItem[];
  error?: string;
}

const dashboardStyles = `
  /* ========== ROOT & ANIMATIONS ========== */
  @keyframes mbfpEntryFade {
    0% {
      opacity: 0;
      transform: translateY(10px) scale(0.99);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes mbfpRadarGlow {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(226, 54, 50, 0.5);
    }
    50% {
      opacity: 0.85;
      transform: scale(1.06);
      box-shadow: 0 0 0 6px rgba(226, 54, 50, 0);
    }
  }

  @keyframes mbfpEmeraldPulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: none;
    }
    50% {
      transform: scale(1.08);
      box-shadow: none;
    }
  }

  @keyframes mbfpSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes mbfpShimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  /* ========== REAL SKELETON SHIMMER SYSTEM ========== */
  .mbfp-skeleton-val,
  .mbfp-skeleton-line,
  .mbfp-skeleton-pill,
  .mbfp-skeleton-icon,
  .mbfp-skeleton-accent {
    background: linear-gradient(
      90deg,
      #E2E8F0 0%,
      #F8FAFC 50%,
      #E2E8F0 100%
    );
    background-size: 200% 100%;
    animation: mbfpShimmer 1.5s ease-in-out infinite;
    display: inline-block;
    border-radius: 6px;
    vertical-align: middle;
  }

  /* Translucent white shimmer tuned for pastel stat cards */
  .mbfp-stat-card .mbfp-skeleton-val {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.4) 0%,
      rgba(255, 255, 255, 0.85) 50%,
      rgba(255, 255, 255, 0.4) 100%
    );
    background-size: 200% 100%;
    animation: mbfpShimmer 1.4s ease-in-out infinite;
    width: 44px;
    height: 30px;
    border-radius: 6px;
    margin-bottom: 2px;
  }

  .mbfp-skeleton-line {
    height: 14px;
    border-radius: 4px;
  }

  .mbfp-skeleton-pill {
    height: 22px;
    border-radius: 9999px;
  }

  .mbfp-skeleton-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .mbfp-skeleton-accent {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .mbfp-skeleton-row {
    pointer-events: none;
    opacity: 0.85;
  }

  .mbfp-skeleton-card {
    pointer-events: none;
    opacity: 0.85;
    border-color: #E2E8F0;
  }

  /* ========== DASHBOARD BASE ========== */
  .mbfp-dash {
    padding: 1.5rem 1.75rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: #F6F7F9;
    min-height: 100%;
    max-width: 1600px;
    margin: 0 auto;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1E293B;
  }

  /* ========== COMPACT HEADER STRIP ========== */
  .mbfp-dash-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.2rem 0.25rem 0.1rem;
    animation: mbfpEntryFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-dash-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .mbfp-dash-fire-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: #B83229;
    color: #FFFFFF;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    box-shadow: 0 3px 10px rgba(226, 54, 50, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }

  .mbfp-dash-heading {
    font-size: 1.8rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .mbfp-top-ctrls {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .mbfp-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.72rem;
    font-weight: 700;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    color: #334155;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  .mbfp-status-dot-radar {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10B981;
    animation: none;
  }

  .mbfp-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    font-size: 0.72rem;
    font-weight: 700;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  .mbfp-refresh-btn:hover {
    background: #F1F5F9;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .mbfp-spin-icon {
    animation: mbfpSpin 0.9s linear infinite;
  }

  /* ========== 5 CLEAN KPI METRIC CARDS ROW ========== */
  .mbfp-stats-row {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .mbfp-stat-card {
    position: relative;
    border-radius: 12px;
    padding: 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    animation: mbfpEntryFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-stat-card:nth-child(1) { animation-delay: 0.05s; }
  .mbfp-stat-card:nth-child(2) { animation-delay: 0.1s; }
  .mbfp-stat-card:nth-child(3) { animation-delay: 0.15s; }
  .mbfp-stat-card:nth-child(4) { animation-delay: 0.2s; }
  .mbfp-stat-card:nth-child(5) { animation-delay: 0.25s; }

  .mbfp-stat-card { background: #fff; border: 1px solid #e2e5e9; box-shadow: none; }
  .mbfp-stat-card.red { background: #fff5f4; border-color: #f2ceca; }
  .mbfp-stat-card:hover { border-color: #a7afb9; transform: translateY(-2px); }
  .mbfp-stat-card.red:hover { border-color: #c94338; }

  .mbfp-stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
  }

  .mbfp-stat-icon {
    width: 2.35rem;
    height: 2.35rem;
    border-radius: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  .mbfp-stat-icon.red { color: #E23632; }
  .mbfp-stat-icon.amber { color: #D97706; }
  .mbfp-stat-icon.blue { color: #2563EB; }
  .mbfp-stat-icon.emerald { color: #059669; }
  .mbfp-stat-icon.purple { color: #7C3AED; }

  .mbfp-stat-trend-tag {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .mbfp-stat-trend-tag.red { background: #FDE8E8; color: #991B1B; }
  .mbfp-stat-trend-tag.amber { background: #FEF3C7; color: #92400E; }
  .mbfp-stat-trend-tag.blue { background: #DBEAFE; color: #1E40AF; }
  .mbfp-stat-trend-tag.emerald { background: #D1FAE5; color: #065F46; }
  .mbfp-stat-trend-tag.purple { background: #EDE9FE; color: #5B21B6; }

  .mbfp-stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    margin: 0.15rem 0 0.1rem;
  }

  .mbfp-stat-label {
    font-size: 0.75rem;
    font-weight: 750;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .mbfp-stat-value {
    font-size: 2.25rem;
    font-weight: 750;
    color: #0F172A;
    line-height: 1.05;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }

  /* ========== UNIFIED 2-COLUMN WORKSPACE ========== */
  .mbfp-columns {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(300px, 1fr);
    gap: 1.25rem;
    align-items: start;
  }

  .mbfp-col-main,
  .mbfp-col-side {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  @media (max-width: 1100px) {
    .mbfp-columns {
      grid-template-columns: 1fr;
    }
  }

  .mbfp-card {
    background: #FFFFFF;
    border-radius: 14px;
    border: 1px solid #E2E8F0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: mbfpEntryFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-card-header {
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #FAFCFF;
  }

  .mbfp-card-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .mbfp-card-title-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #FEE2E2;
    color: #DC2626;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
  }

  .mbfp-card-title {
    font-size: 0.92rem;
    font-weight: 800;
    color: #0F172A;
  }

  .mbfp-card-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.25rem 0.6rem;
    border-radius: 9999px;
    background: #F1F5F9;
    color: #475569;
    border: 1px solid #E2E8F0;
  }

  /* ========== INCIDENT QUEUE TABLE ========== */
  .mbfp-incident-table-wrap {
    overflow-x: auto;
  }

  .mbfp-incident-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  .mbfp-incident-table th {
    padding: 0.7rem 1rem;
    background: #F8FAFC;
    color: #64748B;
    font-weight: 700;
    font-size: 0.72rem;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 1px solid #E2E8F0;
  }

  .mbfp-incident-row {
    border-bottom: 1px solid #F1F5F9;
    transition: background 0.15s ease;
  }

  .mbfp-incident-row:hover {
    background: #F8FAFC;
  }

  .mbfp-incident-row td {
    padding: 0.75rem 1rem;
    vertical-align: middle;
  }

  .mbfp-ref-code {
    display: inline-block;
    white-space: nowrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #0F172A;
    background: #F1F5F9;
    padding: 0.15rem 0.42rem;
    border-radius: 5px;
    border: 1px solid #CBD5E1;
    line-height: 1.25;
  }

  .mbfp-fire-tag-group {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
    flex-wrap: nowrap;
  }

  .mbfp-fire-type-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: #E23632;
    background: #FFF1F2;
    padding: 0.18rem 0.45rem;
    border-radius: 5px;
    border: 1px solid #FFE4E6;
    text-transform: capitalize;
    white-space: nowrap;
    line-height: 1.2;
  }

  .mbfp-severity-tag {
    font-size: 0.58rem;
    font-weight: 800;
    padding: 0.14rem 0.4rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    line-height: 1.15;
    flex-shrink: 0;
  }
  .mbfp-severity-tag.critical { background: #EF4444; color: #FFFFFF; }
  .mbfp-severity-tag.high { background: #F97316; color: #FFFFFF; }
  .mbfp-severity-tag.moderate { background: #FBBF24; color: #78350F; }
  .mbfp-severity-tag.low { background: #34D399; color: #064E3B; }

  .mbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.22rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 750;
    text-transform: capitalize;
  }

  .mbfp-status-pill.responding { background: #FEE2E2; color: #B91C1C; }
  .mbfp-status-pill.dispatched { background: #DBEAFE; color: #1D4ED8; }
  .mbfp-status-pill.confirmed { background: #FEF3C7; color: #B45309; }
  .mbfp-status-pill.contained { background: #D1FAE5; color: #047857; }
  .mbfp-status-pill.pending { background: #F3F4F6; color: #4B5563; }

  .mbfp-pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .mbfp-view-all-footer {
    padding: 0.75rem 1.25rem;
    background: #F8FAFC;
    border-top: 1px solid #F1F5F9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-decoration: none;
    font-size: 0.78rem;
    font-weight: 750;
    color: #2563EB;
    transition: all 0.2s ease;
  }

  .mbfp-view-all-footer:hover {
    background: #F1F5F9;
    color: #1D4ED8;
    padding-left: 1.45rem;
  }

  /* ========== TACTICAL QUICK ACTIONS ========== */
  .mbfp-quick-actions-wrap {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .mbfp-qa-grid-top {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.65rem;
  }

  .mbfp-qa-box {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.85rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    text-decoration: none;
    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-qa-box:hover {
    background: #FFFFFF;
    border-color: #CBD5E1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .mbfp-qa-icon-wrap {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
  }
  .mbfp-qa-icon-wrap.red { background: #FEE2E2; color: #DC2626; }
  .mbfp-qa-icon-wrap.amber { background: #FEF3C7; color: #D97706; }
  .mbfp-qa-icon-wrap.blue { background: #DBEAFE; color: #2563EB; }
  .mbfp-qa-icon-wrap.emerald { background: #D1FAE5; color: #059669; }
  .mbfp-qa-icon-wrap.purple { background: #EDE9FE; color: #7C3AED; }

  .mbfp-qa-text {
    font-size: 0.8rem;
    font-weight: 750;
    color: #1E293B;
    line-height: 1.25;
  }

  .mbfp-qa-sub {
    font-size: 0.68rem;
    color: #64748B;
    font-weight: 500;
  }

  .mbfp-qa-box.full-width {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #FFF7F6;
    border: 1px solid #FECDD3;
  }

  .mbfp-qa-box.full-width:hover {
    background: #FFEAE7;
    border-color: #FDA4AF;
  }

  /* ========== VERIFICATION CARDS ========== */
  .mbfp-verif-list {
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .mbfp-verif-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 0.85rem;
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }

  .mbfp-verif-card:hover {
    border-color: #CBD5E1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  }

  .mbfp-verif-accent-box {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    font-weight: 800;
    flex-shrink: 0;
    gap: 0.2rem;
  }
  .mbfp-verif-accent-box.fire {
    background: #FEE2E2;
    color: #DC2626;
    border: 1px solid #FECACA;
  }
  .mbfp-verif-accent-box.resident {
    background: #FEF3C7;
    color: #D97706;
    border: 1px solid #FDE68A;
  }

  .mbfp-verif-accent-box i {
    font-size: 1.15rem;
  }

  .mbfp-verif-content {
    flex: 1;
    min-width: 0;
  }

  .mbfp-verif-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .mbfp-verif-id-pill {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.78rem;
    font-weight: 800;
    color: #0F172A;
  }

  .mbfp-verif-time-badge {
    font-size: 0.68rem;
    color: #E23632;
    font-weight: 750;
    background: #FFF1F2;
    padding: 0.15rem 0.5rem;
    border-radius: 6px;
    border: 1px solid #FFE4E6;
  }

  .mbfp-verif-loc {
    font-size: 0.78rem;
    color: #334155;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.2rem;
  }
  .mbfp-verif-loc i {
    color: #E23632;
    font-size: 0.72rem;
  }

  .mbfp-verif-summary {
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 500;
    margin-bottom: 0.55rem;
  }

  .mbfp-verif-btn-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .mbfp-btn-action {
    font-size: 0.72rem;
    font-weight: 750;
    padding: 0.35rem 0.85rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-btn-action.verify-now {
    background: #B83229;
    color: #FFFFFF;
    box-shadow: none;
  }
  .mbfp-btn-action.verify-now:hover {
    background: #96271F;
    transform: translateY(-1px);
    box-shadow: none;
  }

  .mbfp-btn-action.open-map {
    background: #EFF6FF;
    color: #2563EB;
    border: 1px solid #BFDBFE;
  }
  .mbfp-btn-action.open-map:hover {
    background: #DBEAFE;
    transform: translateY(-1px);
  }

  .mbfp-empty-verif-box {
    padding: 2.2rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #64748B;
  }
  .mbfp-empty-verif-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #ECFDF5;
    color: #059669;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
  }

  /* ========== RIGHT COLUMN: STATIONS & MUTUAL AID ========== */
  .mbfp-col-right {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mbfp-stations-list {
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .mbfp-station-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    background: #F8FAFC;
    border: 1px solid #F1F5F9;
    transition: all 0.2s ease;
  }

  .mbfp-station-row:hover {
    background: #F1F5F9;
    border-color: #E2E8F0;
  }

  .mbfp-station-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #DBEAFE;
    color: #1D4ED8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .mbfp-station-meta {
    flex: 1;
    min-width: 0;
  }

  .mbfp-station-name {
    font-size: 0.82rem;
    font-weight: 800;
    color: #0F172A;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mbfp-station-sub {
    font-size: 0.7rem;
    color: #64748B;
    font-weight: 550;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mbfp-station-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.68rem;
    font-weight: 750;
    color: #059669;
    background: #ECFDF5;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    border: 1px solid #A7F3D0;
    flex-shrink: 0;
  }

  .mbfp-station-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    animation: none;
  }

  /* ========== MUTUAL AID SECTION ========== */
  .mbfp-mutual-aid-wrap {
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .mbfp-aid-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    background: #F8FAFC;
    border: 1px solid #F1F5F9;
    transition: all 0.2s ease;
  }

  .mbfp-aid-item:hover {
    background: #F1F5F9;
    border-color: #E2E8F0;
  }

  .mbfp-aid-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .mbfp-aid-title {
    font-size: 0.8rem;
    font-weight: 800;
    color: #0F172A;
  }

  .mbfp-aid-sub {
    font-size: 0.68rem;
    color: #64748B;
    font-weight: 500;
  }

  .mbfp-aid-phone {
    font-size: 0.68rem;
    color: #2563EB;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    text-decoration: none;
  }

  .mbfp-aid-phone:hover {
    text-decoration: underline;
  }

  .mbfp-aid-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    font-size: 0.7rem;
    font-weight: 750;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .mbfp-aid-btn.support {
    background: #EDE9FE;
    color: #6D28D9;
    border: 1px solid #DDD6FE;
  }
  .mbfp-aid-btn.support:hover {
    background: #DDD6FE;
    color: #5B21B6;
    transform: translateY(-1px);
  }

  .mbfp-aid-btn.provincial {
    background: #FEE2E2;
    color: #B91C1C;
    border: 1px solid #FECACA;
  }
  .mbfp-aid-btn.provincial:hover {
    background: #FECACA;
    color: #991B1B;
    transform: translateY(-1px);
  }

  /* Responsive Adjustments */
  @media (max-width: 1200px) {
    .mbfp-stats-row {
      grid-template-columns: repeat(3, 1fr);
    }
    .mbfp-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .mbfp-dash {
      padding: 10px 1rem 2rem;
    }
    .mbfp-stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
    .mbfp-top-banner {
      flex-direction: column;
      align-items: flex-start;
    }
    .mbfp-quick-actions,
    .mbfp-quick-actions-wrap,
    .mbfp-qa-grid-top {
      grid-template-columns: 1fr;
    }
    .mbfp-card-body {
      overflow-x: auto;
    }
    .mbfp-incident-table {
      min-width: 580px;
    }
    .mbfp-emergency-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.7rem;
    }
    .mbfp-aid-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.65rem;
    }
    .mbfp-aid-btn {
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 500px) {
    .mbfp-stats-row {
      grid-template-columns: 1fr;
    }
  }

  /* Operational hierarchy and responsive finishing. */
  .mbfp-dash { --command-red: #b83229; }
  .mbfp-dash a:focus-visible, .mbfp-dash button:focus-visible {
    outline: 3px solid #2563eb; outline-offset: 4px;
  }
  .mbfp-dash button:disabled { cursor: wait; opacity: .65; }
  .mbfp-dash-title-wrap { align-items: flex-start; }
  .mbfp-dash-fire-icon { width: 42px; height: 42px; margin-top: 5px; box-shadow: none; }
  .mbfp-eyebrow { font-size: .65rem; font-weight: 750; letter-spacing: .14em; color: #7a6260; text-transform: uppercase; margin-bottom: .4rem; }
  .mbfp-dash-subtitle { margin-top: .5rem; color: #667085; font-size: .82rem; line-height: 1.6; }
  .mbfp-top-ctrls { flex-wrap: wrap; }
  .mbfp-refresh-btn { min-height: 40px; padding: .6rem .85rem; }
  .mbfp-status-badge { border: none; background: transparent; padding-left: 0; box-shadow: none; }
  .mbfp-status-badge[data-error="true"] { color: #9a3412; }
  .mbfp-status-badge[data-error="true"] .mbfp-status-dot-radar { background: #c2410c; }
  .mbfp-briefing { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; padding: 1.3rem 1.5rem; border: 1px solid #e2e5e9; border-left: 4px solid var(--command-red); border-radius: 10px; background: #fff; }
  .mbfp-briefing h2 { font-size: 1rem; font-weight: 750; margin: 0 0 .4rem; }
  .mbfp-briefing p { font-size: .8rem; line-height: 1.6; color: #667085; max-width: 65ch; }
  .mbfp-briefing-actions { display: flex; gap: .65rem; flex-shrink: 0; }
  .mbfp-primary-action, .mbfp-secondary-action { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: .55rem; border-radius: 7px; padding: .7rem 1rem; text-decoration: none; font-size: .78rem; font-weight: 700; transition: background .2s; }
  .mbfp-primary-action { background: var(--command-red); color: white; }
  .mbfp-primary-action:hover { background: #92281f; }
  .mbfp-secondary-action { border: 1px solid #d6dbe1; background: #fff; color: #344054; }
  .mbfp-secondary-action:hover { background: #f2f4f7; }
  .mbfp-error { border: 1px solid #fed7aa; background: #fff7ed; color: #9a3412; padding: 1rem; border-radius: 8px; font-size: .8rem; line-height: 1.6; }
  .mbfp-stat-icon { background: #f5f6f8; border: none; box-shadow: none; width: 32px; height: 32px; }
  .mbfp-stat-label { text-transform: none; letter-spacing: 0; font-weight: 600; margin-top: .4rem; }
  .mbfp-stat-trend-tag { font-size: .6rem; font-weight: 650; }
  .mbfp-stat-note { font-size: .68rem; color: #667085; margin-top: .65rem; line-height: 1.5; }
  .mbfp-col-main, .mbfp-col-side { min-width: 0; }
  .mbfp-card { border-radius: 12px; box-shadow: none; }
  .mbfp-card-header { padding: 1.1rem 1.2rem; background: #fff; gap: .75rem; flex-wrap: wrap; }
  .mbfp-card-title { font-size: .9rem; font-weight: 750; }
  .mbfp-card-badge { font-weight: 550; font-size: .65rem; }
  .mbfp-incident-table { min-width: 650px; }
  .mbfp-incident-table th { font-size: .62rem; background: #fafbfc; padding: .85rem 1rem; }
  .mbfp-incident-row td { padding: 1rem; }
  .mbfp-ref-code { background: transparent; border: none; padding: 0; color: #a3332b; font-size: .72rem; text-decoration: none; }
  a.mbfp-ref-code:hover { text-decoration: underline; }
  .mbfp-view-all-footer { background: #fff; color: #a3332b; font-size: .74rem; padding: .95rem 1.2rem; }
  .mbfp-view-all-footer:hover { background: #fafafa; color: #862b24; }
  .mbfp-qa-box { flex-direction: row; align-items: center; background: #fff; border-color: #eceef1; padding: .8rem; gap: .7rem; }
  .mbfp-qa-icon-wrap { flex-shrink: 0; }
  .mbfp-qa-text { font-size: .75rem; }
  .mbfp-qa-sub { font-size: .65rem; margin-top: .25rem; line-height: 1.5; }
  .mbfp-verif-card { border: none; border-radius: 0; border-bottom: 1px solid #eceef1; box-shadow: none; padding: .8rem .2rem 1rem; }
  .mbfp-verif-card:last-child { border-bottom: none; }
  .mbfp-verif-card:hover { box-shadow: none; }
  .mbfp-btn-action { min-height: 36px; }
  .mbfp-station-row, .mbfp-aid-item { background: #fafbfc; border-color: #eceef1; padding: .85rem; }
  .mbfp-station-status-pill { color: #475467; background: #f2f4f7; border-color: #e4e7ec; text-transform: capitalize; }
  .mbfp-station-dot { background: currentColor; }
  .mbfp-aid-btn.support { background: #fff; color: #475467; border-color: #d0d5dd; min-height: 36px; }
  .mbfp-aid-btn.support:hover { background: #f2f4f7; color: #1d2939; }
  .mbfp-section-note { color: #667085; font-size: .75rem; line-height: 1.6; padding: .8rem 1.2rem 0; }
  @media (min-width: 1101px) and (max-width: 1400px) { .mbfp-qa-grid-top { grid-template-columns: 1fr; } }
  @media (max-width: 1100px) { .mbfp-briefing { align-items: flex-start; flex-direction: column; } }
  @media (max-width: 768px) {
    .mbfp-dash { padding: 1rem .85rem 2rem; gap: 1rem; }
    .mbfp-dash-heading { font-size: 1.5rem; }
    .mbfp-briefing { padding: 1.1rem; }
    .mbfp-briefing-actions { flex-wrap: wrap; width: 100%; }
    .mbfp-primary-action, .mbfp-secondary-action { flex: 1; }
    .mbfp-card-header { padding: 1rem; }
    .mbfp-stats-row { gap: .65rem; }
    .mbfp-stat-card { padding: 1rem; }
    .mbfp-stats-row .mbfp-stat-card:last-child { grid-column: 1 / -1; }
    .mbfp-stat-value { font-size: 2rem; }
    .mbfp-verif-top-row { gap: .5rem; flex-wrap: wrap; }
    .mbfp-verif-id-pill { overflow-wrap: anywhere; }
  }
  @media (max-width: 500px) { .mbfp-stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } .mbfp-stat-trend-tag { display: none; } }
  @media (prefers-reduced-motion: reduce) { .mbfp-dash *, .mbfp-dash *::before, .mbfp-dash *::after { animation: none !important; transition: none !important; } }
`;

interface DashboardCacheRecord {
  data: DashboardPayload;
  timestamp: number;
}

const DASHBOARD_CACHE_KEY = 'alab_municipal_dashboard_cache';
let memoryDashboardCache: DashboardCacheRecord | null = null;

function getCachedDashboard(): DashboardPayload | null {
  if (memoryDashboardCache) {
    return memoryDashboardCache.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardCacheRecord;
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          memoryDashboardCache = parsed;
          return parsed.data;
        }
      }
    } catch {}
  }
  return null;
}

function setCachedDashboard(data: DashboardPayload) {
  const cacheObj: DashboardCacheRecord = { data, timestamp: Date.now() };
  memoryDashboardCache = cacheObj;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cacheObj));
    } catch {}
  }
}

export function MunicipalBfpDashboard() {
  const {
    incidents,
    error: incidentsError,
    loading: incidentsLoading,
    checking: incidentsChecking,
    lastCheckedAt,
    refresh: refreshIncidents,
  } = useMunicipalIncidentFeed();

  const initialCache = useRef<DashboardPayload | null>(null);
  if (initialCache.current === null) {
    initialCache.current = getCachedDashboard();
  }

  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(initialCache.current);
  const [dashLoading, setDashLoading] = useState(!initialCache.current);
  const [dashChecking, setDashChecking] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const fetchDashboard = useCallback(async (isManual = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (isManual) setDashChecking(true);

    try {
      const res = await fetch('/api/municipal-bfp/dashboard', { cache: 'no-store' });
      const payload: DashboardPayload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to fetch dashboard data');

      if (mounted.current) {
        setDashboardError('');
        setDashboardData(payload);
        setCachedDashboard(payload);
      }
    } catch (err) {
      if (mounted.current) setDashboardError(err instanceof Error ? err.message : 'Unable to refresh dashboard.');
    } finally {
      if (mounted.current) {
        setDashLoading(false);
        setDashChecking(false);
      }
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void fetchDashboard();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchDashboard();
      }
    }, 5000);

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [fetchDashboard]);

  const handleRefreshAll = () => {
    void refreshIncidents(true);
    void fetchDashboard(true);
  };

  const isChecking = incidentsChecking || dashChecking;
  const hasError = Boolean(dashboardError || incidentsError);
  const liveStatus = hasError
    ? 'Refresh unavailable'
    : isChecking ? 'Updating live data'
    : lastCheckedAt ? `Live · checked ${lastCheckedAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`
    : 'Connecting to live data';

  const getStatusClass = (status: string) => {
    if (status === 'RESPONDING') return 'responding';
    if (status === 'DISPATCHED' || status === 'ASSIGNED' || status === 'FIRETRUCK_DISPATCHED') return 'dispatched';
    if (status === 'VERIFIED') return 'confirmed';
    if (status === 'UNDER_CONTROL' || status === 'RESOLVED') return 'contained';
    return 'pending';
  };

  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null;
    const clean = severity.toLowerCase();
    return <span className={`mbfp-severity-tag ${clean}`}>{severity}</span>;
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // Derive live figures from real incident feed and backend database
  const pendingIncidents = incidents.filter((i) => ['PENDING', 'UNVERIFIED'].includes(i.status));
  const pendingResidentApps = dashboardData?.pendingVerifications?.residentApplications ?? [];
  const totalPending = pendingIncidents.length + (dashboardData?.stats?.pendingApplicationsCount ?? pendingResidentApps.length);

  const stats = dashboardData?.stats;
  const stations = dashboardData?.stations ?? [];
  const mutualAid = dashboardData?.mutualAid ?? [];
  const municipality = dashboardData?.municipality || 'Municipal';
  const recentIncidents = incidents.slice(0, 5);

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="mbfp-dash">
        {/* Sleek Compact Header */}
        <div className="mbfp-dash-header">
          <div className="mbfp-dash-title-wrap">
            <span className="mbfp-dash-fire-icon" aria-hidden="true">
              <i className="fa-solid fa-fire-flame-curved" />
            </span>
            <div>
              <p className="mbfp-eyebrow">ALAB / Municipal operations</p>
              <h1 className="mbfp-dash-heading">{municipality} Fire Command</h1>
              <p className="mbfp-dash-subtitle">Your municipality at a glance. Verify reports, coordinate response, and manage resources.</p>
            </div>
          </div>

          <div className="mbfp-top-ctrls">
            <div className="mbfp-status-badge" data-error={hasError}>
              <span className="mbfp-status-dot-radar" />
              <span>{liveStatus}</span>
            </div>
            <button
              type="button"
              className="mbfp-refresh-btn"
              onClick={handleRefreshAll}
              disabled={isChecking}
              title="Refresh live operational data"
            >
              <i className={`fa-solid fa-arrows-rotate ${isChecking ? 'mbfp-spin-icon' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {hasError && (
          <div className="mbfp-error" role="alert">
            <strong>Some operational data could not refresh.</strong> {dashboardError || incidentsError} Previously loaded information may be out of date. Use Refresh to try again.
          </div>
        )}
        <section className="mbfp-briefing" aria-labelledby="operations-briefing">
          <div>
            <p className="mbfp-eyebrow">Response overview</p>
            <h2 id="operations-briefing">{incidentsLoading ? 'Loading incident activity' : incidentsError ? 'Check incident feed connection' : pendingIncidents.length > 0 ? `${pendingIncidents.length} fire report${pendingIncidents.length === 1 ? '' : 's'} awaiting verification` : incidents.length > 0 ? 'Response operations in progress' : 'No active incidents reported'}</h2>
            <p>Review incoming reports before dispatch. Use the GIS map to locate incidents, water sources, and response routes.</p>
          </div>
          <div className="mbfp-briefing-actions">
            <Link href="/municipal-bfp/gis-map" className="mbfp-secondary-action"><i className="fa-solid fa-map-location-dot" aria-hidden="true" />Open GIS map</Link>
            <Link href="/municipal-bfp/dispatch-routing" className="mbfp-primary-action"><i className="fa-solid fa-truck-moving" aria-hidden="true" />Dispatch &amp; routing</Link>
          </div>
        </section>

        {/* Operational metrics */}
        <div className="mbfp-stats-row">
          {/* Card 1: Active Incidents */}
          <Link href="/municipal-bfp/active-incidents" className="mbfp-stat-card red">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon red">
                <i className="fa-solid fa-fire-flame-curved" />
              </div>
              <span className="mbfp-stat-trend-tag red">
                <i className="fa-solid fa-triangle-exclamation" />
                {incidentsError ? 'Check feed' : incidentsLoading ? 'Loading' : incidents.length > 0 ? 'Priority' : 'Monitoring'}
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-value">
                {incidentsLoading ? <span className="mbfp-skeleton-val" /> : incidentsError && !lastCheckedAt ? '?' : incidents.length}
              </span>
              <span className="mbfp-stat-label">Active incidents</span><span className="mbfp-stat-note">Current incident feed</span>
            </div>
          </Link>

          {/* Card 2: Pending Verification */}
          <Link href="/municipal-bfp/verification-queue" className="mbfp-stat-card amber">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon amber">
                <i className="fa-solid fa-clipboard-check" />
              </div>
              <span className="mbfp-stat-trend-tag amber">
                <i className="fa-solid fa-hourglass-half" />
                {hasError ? 'Check feed' : incidentsLoading || dashLoading ? 'Loading' : totalPending > 0 ? 'Pending' : 'Cleared'}
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-value">
                {incidentsLoading || dashLoading ? <span className="mbfp-skeleton-val" /> : hasError && !dashboardData ? '?' : totalPending}
              </span>
              <span className="mbfp-stat-label">Awaiting review</span><span className="mbfp-stat-note">Fire reports &amp; resident IDs</span>
            </div>
          </Link>

          {/* Card 3: Active Stations & Fleet */}
          <Link href="/municipal-bfp/stations" className="mbfp-stat-card blue">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon blue">
                <i className="fa-solid fa-truck-moving" />
              </div>
              <span className="mbfp-stat-trend-tag blue">
                <i className="fa-solid fa-circle-check" /> Ready
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-value">
                {dashLoading ? <span className="mbfp-skeleton-val" /> : (dashboardData ? stations.length : '?')}
              </span>
              <span className="mbfp-stat-label">Active stations</span><span className="mbfp-stat-note">Registered in your municipality</span>
            </div>
          </Link>

          {/* Card 4: Responders On Duty */}
          <Link href="/municipal-bfp/stations" className="mbfp-stat-card emerald">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon emerald">
                <i className="fa-solid fa-users-gear" />
              </div>
              <span className="mbfp-stat-trend-tag emerald">
                <i className="fa-solid fa-shield" /> Active
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-value">
                {dashLoading ? <span className="mbfp-skeleton-val" /> : (stats?.respondersOnDuty ?? '?')}
              </span>
              <span className="mbfp-stat-label">Assigned responders</span><span className="mbfp-stat-note">Active municipality assignments</span>
            </div>
          </Link>

          {/* Card 5: Dispatches & Mutual Aid */}
          <Link href="/municipal-bfp/dispatch-routing" className="mbfp-stat-card purple">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon purple">
                <i className="fa-solid fa-tower-broadcast" />
              </div>
              <span className="mbfp-stat-trend-tag purple">
                <i className="fa-solid fa-handshake" /> Support
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-value">
                {dashLoading ? <span className="mbfp-skeleton-val" /> : (stats?.assistanceRequests ?? '?')}
              </span>
              <span className="mbfp-stat-label">Active dispatches</span><span className="mbfp-stat-note">Ongoing unit deployments</span>
            </div>
          </Link>
        </div>

        {/* Unified 2-Column Responsive Workspace */}
        <div className="mbfp-columns">
          {/* Main Column: Live Incident Queue & Verification Stream */}
          <div className="mbfp-col-main">
            {/* Recent Incident Queue */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <div className="mbfp-card-title-wrap">
                  <div className="mbfp-card-title-icon">
                    <i className="fa-solid fa-fire" />
                  </div>
                  <span className="mbfp-card-title">Active incident queue</span>
                </div>
                <span className="mbfp-card-badge">{recentIncidents.length} Active in {municipality}</span>
              </div>

              <div className="mbfp-incident-table-wrap">
                <table className="mbfp-incident-table">
                  <thead>
                    <tr>
                      <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Ref. No.</th>
                      <th>Barangay &amp; Landmark</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Fire Type &amp; Severity</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Reported</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidentsLoading ? (
                      [1, 2, 3, 4, 5].map((idx) => (
                        <tr key={`skel-inc-${idx}`} className="mbfp-incident-row mbfp-skeleton-row">
                          <td style={{ whiteSpace: 'nowrap', width: '1%' }}>
                            <div className="mbfp-skeleton-pill" style={{ width: '120px', height: '20px' }} />
                          </td>
                          <td>
                            <div className="mbfp-skeleton-line" style={{ width: '140px', height: '14px', marginBottom: '4px' }} />
                            <div className="mbfp-skeleton-line" style={{ width: '90px', height: '10px' }} />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div className="mbfp-fire-tag-group">
                              <div className="mbfp-skeleton-pill" style={{ width: '90px', height: '20px' }} />
                              <div className="mbfp-skeleton-pill" style={{ width: '50px', height: '18px' }} />
                            </div>
                          </td>
                          <td>
                            <div className="mbfp-skeleton-line" style={{ width: '55px', height: '13px' }} />
                          </td>
                          <td>
                            <div className="mbfp-skeleton-pill" style={{ width: '85px', height: '22px' }} />
                          </td>
                        </tr>
                      ))
                    ) : recentIncidents.length === 0 ? (
                      <tr className="mbfp-incident-row">
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748B' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                            <i className="fa-solid fa-shield-check" style={{ fontSize: '1.8rem', color: '#10B981' }} />
                            <strong style={{ color: '#0F172A', fontSize: '0.9rem' }}>{incidentsError ? 'Incident feed unavailable' : `No active incidents in ${municipality}`}</strong>
                            <span style={{ fontSize: '0.78rem' }}>No active fire emergencies reported. Monitoring 24/7.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      recentIncidents.slice(0, 5).map((inc) => (
                        <tr key={inc.id} className="mbfp-incident-row">
                          <td style={{ whiteSpace: 'nowrap', width: '1%' }}>
                            <Link href="/municipal-bfp/active-incidents" className="mbfp-ref-code">{inc.referenceNumber}</Link>
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{inc.barangay || 'Barangay not identified'}</div>
                            {inc.landmark && <div style={{ fontSize: '0.7rem', color: '#64748B' }}>near {inc.landmark}</div>}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div className="mbfp-fire-tag-group">
                              <span className="mbfp-fire-type-tag">
                                <i className="fa-solid fa-fire-flame-simple" />
                                <span>{inc.fireType.replaceAll('_', ' ')}</span>
                              </span>
                              {getSeverityBadge(inc.calculatedSeverity)}
                            </div>
                          </td>
                          <td style={{ color: '#64748B', fontFeatureSettings: 'tnum' }}>
                            {formatTime(inc.submittedAt)}
                          </td>
                          <td>
                            <span className={`mbfp-status-pill ${getStatusClass(inc.status)}`}>
                              <span className="mbfp-pill-dot" />
                              <span>{inc.status.replaceAll('_', ' ')}</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Link href="/municipal-bfp/active-incidents" className="mbfp-view-all-footer">
                <span>View All Active Incidents</span>
                <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>

            {/* Verification Requests (Live Database Stream) */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <div className="mbfp-card-title-wrap">
                  <div className="mbfp-card-title-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                    <i className="fa-solid fa-triangle-exclamation" />
                  </div>
                  <span className="mbfp-card-title">
                    Verification Requests ({totalPending})
                  </span>
                </div>
                <span className="mbfp-card-badge" style={{ color: '#D97706', background: '#FFFBEB', borderColor: '#FDE68A' }}>
                  Fire reports & resident IDs
                </span>
              </div>

              <div className="mbfp-verif-list">
                {incidentsLoading || dashLoading ? (
                  [1, 2].map((k) => (
                    <div className="mbfp-verif-card mbfp-skeleton-card" key={`skel-verif-${k}`}>
                      <div className="mbfp-skeleton-accent" />
                      <div className="mbfp-verif-content" style={{ gap: '0.45rem' }}>
                        <div className="mbfp-verif-top-row">
                          <div className="mbfp-skeleton-pill" style={{ width: '105px', height: '18px' }} />
                          <div className="mbfp-skeleton-pill" style={{ width: '55px', height: '16px' }} />
                        </div>
                        <div className="mbfp-skeleton-line" style={{ width: '55%', height: '13px' }} />
                        <div className="mbfp-skeleton-line" style={{ width: '75%', height: '11px' }} />
                        <div className="mbfp-verif-btn-row">
                          <div className="mbfp-skeleton-pill" style={{ width: '95px', height: '26px' }} />
                          <div className="mbfp-skeleton-pill" style={{ width: '90px', height: '26px' }} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : totalPending === 0 ? (
                  <div className="mbfp-empty-verif-box">
                    <div className="mbfp-empty-verif-icon">
                      <i className="fa-solid fa-check" />
                    </div>
                    <strong style={{ color: '#0F172A', fontSize: '0.9rem' }}>Verification Queue Cleared</strong>
                    <p style={{ margin: 0, fontSize: '0.78rem' }}>
                      All incoming citizen fire reports and resident account applications in {municipality} have been verified.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Unverified Fire Reports */}
                    {pendingIncidents.slice(0, 3).map((rep) => (
                      <div className="mbfp-verif-card" key={`report-${rep.id}`}>
                        <div className="mbfp-verif-accent-box fire">
                          <i className="fa-solid fa-fire" />
                          <span>ALERT</span>
                        </div>
                        <div className="mbfp-verif-content">
                          <div className="mbfp-verif-top-row">
                            <span className="mbfp-verif-id-pill">{rep.referenceNumber}</span>
                            <span className="mbfp-verif-time-badge">{formatTime(rep.submittedAt)}</span>
                          </div>
                          <div className="mbfp-verif-loc">
                            <i className="fa-solid fa-location-dot" />
                            <span>{rep.barangay || 'Barangay not specified'}, {municipality}</span>
                          </div>
                          <div className="mbfp-verif-summary">
                            Fire Type: <strong>{rep.fireType.replaceAll('_', ' ')}</strong>
                            {rep.landmark ? ` · Landmark: ${rep.landmark}` : ''}
                            {rep.residentName ? ` · Reported by: ${rep.residentName}` : ''}
                          </div>
                          <div className="mbfp-verif-btn-row">
                            <Link href="/municipal-bfp/verification-queue" className="mbfp-btn-action verify-now">
                              <i className="fa-solid fa-check" /> Verify Report
                            </Link>
                            <Link href="/municipal-bfp/gis-map" className="mbfp-btn-action open-map">
                              <i className="fa-solid fa-map-location-dot" /> View on Map
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pending Resident KYC Applications */}
                    {pendingResidentApps.slice(0, 3).map((app) => (
                      <div className="mbfp-verif-card" key={`app-${app.id}`}>
                        <div className="mbfp-verif-accent-box resident">
                          <i className="fa-solid fa-id-card" />
                          <span>KYC</span>
                        </div>
                        <div className="mbfp-verif-content">
                          <div className="mbfp-verif-top-row">
                            <span className="mbfp-verif-id-pill">{app.reference}</span>
                            <span className="mbfp-verif-time-badge" style={{ color: '#D97706', background: '#FEF3C7', borderColor: '#FDE68A' }}>
                              {formatTime(app.submittedAt)}
                            </span>
                          </div>
                          <div className="mbfp-verif-loc">
                            <i className="fa-solid fa-user-check" style={{ color: '#D97706' }} />
                            <span>{app.firstName} {app.lastName} · {app.barangay}</span>
                          </div>
                          <div className="mbfp-verif-summary">
                            Resident ID verification request awaiting review.
                          </div>
                          <div className="mbfp-verif-btn-row">
                            <Link href="/municipal-bfp/verification-queue" className="mbfp-btn-action verify-now">
                              <i className="fa-solid fa-user-shield" /> Review Application
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <Link href="/municipal-bfp/verification-queue" className="mbfp-view-all-footer">
                <span>View Full Verification Worklist</span>
                <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>
          </div>

          {/* Side Column: Quick actions, Station Readiness & Mutual Aid */}
          <div className="mbfp-col-side">
            {/* Quick actions */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <div className="mbfp-card-title-wrap">
                  <div className="mbfp-card-title-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <i className="fa-solid fa-bolt" />
                  </div>
                  <span className="mbfp-card-title">Quick actions</span>
                </div>
                <span className="mbfp-card-badge">Workspace</span>
              </div>

              <div className="mbfp-quick-actions-wrap">
                <div className="mbfp-qa-grid-top">
                  <Link href="/municipal-bfp/verification-queue" className="mbfp-qa-box">
                    <div className="mbfp-qa-icon-wrap amber">
                      <i className="fa-solid fa-clipboard-check" />
                    </div>
                    <div>
                      <div className="mbfp-qa-text">Verify Reports</div>
                      <div className="mbfp-qa-sub">Reports &amp; resident IDs</div>
                    </div>
                  </Link>

                  <Link href="/municipal-bfp/gis-map" className="mbfp-qa-box">
                    <div className="mbfp-qa-icon-wrap blue">
                      <i className="fa-solid fa-map-location-dot" />
                    </div>
                    <div>
                      <div className="mbfp-qa-text">Open GIS Map</div>
                      <div className="mbfp-qa-sub">Satellite &amp; Hydrants</div>
                    </div>
                  </Link>

                  <Link href="/municipal-bfp/dispatch-routing" className="mbfp-qa-box">
                    <div className="mbfp-qa-icon-wrap red">
                      <i className="fa-solid fa-truck-moving" />
                    </div>
                    <div>
                      <div className="mbfp-qa-text">Dispatch Units</div>
                      <div className="mbfp-qa-sub">Route Teams</div>
                    </div>
                  </Link>

                  <Link href="/municipal-bfp/water-sources" className="mbfp-qa-box">
                    <div className="mbfp-qa-icon-wrap emerald">
                      <i className="fa-solid fa-droplet" />
                    </div>
                    <div>
                      <div className="mbfp-qa-text">Water Sources</div>
                      <div className="mbfp-qa-sub">Hydrant Inventory</div>
                    </div>
                  </Link>
                </div>

                <Link href="/municipal-bfp/incident-reports" className="mbfp-qa-box full-width">
                  <div className="mbfp-qa-icon-wrap red">
                    <i className="fa-solid fa-file-circle-plus" />
                  </div>
                  <div>
                    <div className="mbfp-qa-text">Log Phone Alarm / Incident Report</div>
                    <div className="mbfp-qa-sub">Record emergency call or investigation report</div>
                  </div>
                  <i className="fa-solid fa-arrow-right" style={{ marginLeft: 'auto', color: '#E23632', fontSize: '0.85rem' }} />
                </Link>
              </div>
            </div>

            {/* Active Municipal Stations & Fleet (Live Database) */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <div className="mbfp-card-title-wrap">
                  <div className="mbfp-card-title-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <i className="fa-solid fa-building-shield" />
                  </div>
                  <span className="mbfp-card-title">Station overview</span>
                </div>
                <Link href="/municipal-bfp/stations" style={{ fontSize: '0.72rem', fontWeight: 750, color: '#2563EB', textDecoration: 'none' }}>
                  Manage
                </Link>
              </div>

              <div className="mbfp-stations-list">
                {dashLoading ? (
                  [1, 2].map((k) => (
                    <div className="mbfp-station-row mbfp-skeleton-row" key={`skel-st-${k}`}>
                      <div className="mbfp-skeleton-icon" />
                      <div className="mbfp-station-meta" style={{ gap: '0.35rem', display: 'flex', flexDirection: 'column' }}>
                        <div className="mbfp-skeleton-line" style={{ width: '140px', height: '13px' }} />
                        <div className="mbfp-skeleton-line" style={{ width: '95px', height: '10px' }} />
                      </div>
                      <div className="mbfp-skeleton-pill" style={{ width: '55px', height: '20px', marginLeft: 'auto' }} />
                    </div>
                  ))
                ) : stations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.2rem', color: '#64748B', fontSize: '0.8rem' }}>
                    No stations registered in this municipality yet.{' '}
                    <Link href="/municipal-bfp/stations" style={{ color: '#2563EB', fontWeight: 700 }}>
                      Add Primary Station
                    </Link>
                  </div>
                ) : (
                  stations.map((st) => (
                    <div className="mbfp-station-row" key={st.id}>
                      <div className="mbfp-station-icon">
                        <i className="fa-solid fa-fire-extinguisher" />
                      </div>
                      <div className="mbfp-station-meta">
                        <div className="mbfp-station-name">{st.stationName}</div>
                        <div className="mbfp-station-sub">
                          <i className="fa-solid fa-user-shield" style={{ fontSize: '0.65rem' }} />
                          <span>{st.assignedPersonnelCount} Responders Assigned</span>
                        </div>
                      </div>
                      <div className="mbfp-station-status-pill">
                        <span className="mbfp-station-dot" />
                        <span>{st.status.replaceAll('_', ' ').toLowerCase()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Inter-Municipality Coordination (Live Antique Support Grid) */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <div className="mbfp-card-title-wrap">
                  <div className="mbfp-card-title-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <i className="fa-solid fa-tower-broadcast" />
                  </div>
                  <span className="mbfp-card-title">Mutual aid coordination</span>
                </div>
                <span className="mbfp-card-badge">Antique</span>
              </div>

              <div className="mbfp-mutual-aid-wrap">
                {dashLoading ? (
                  [1, 2].map((k) => (
                    <div className="mbfp-aid-item mbfp-skeleton-row" key={`skel-aid-${k}`}>
                      <div className="mbfp-aid-meta" style={{ gap: '0.35rem', display: 'flex', flexDirection: 'column' }}>
                        <div className="mbfp-skeleton-line" style={{ width: '135px', height: '13px' }} />
                        <div className="mbfp-skeleton-line" style={{ width: '110px', height: '10px' }} />
                        <div className="mbfp-skeleton-line" style={{ width: '85px', height: '10px' }} />
                      </div>
                      <div className="mbfp-skeleton-pill" style={{ width: '95px', height: '26px', marginLeft: 'auto' }} />
                    </div>
                  ))
                ) : (
                  mutualAid.map((aid) => (
                    <div className="mbfp-aid-item" key={aid.id}>
                      <div className="mbfp-aid-meta">
                        <span className="mbfp-aid-title">{aid.stationName}</span>
                        <span className="mbfp-aid-sub">{aid.municipalityName} · Regional Support</span>

                      </div>
                      <Link href="/municipal-bfp/dispatch-routing" className="mbfp-aid-btn support">
                        <i className="fa-solid fa-handshake" /> Request Backup
                      </Link>
                    </div>
                  ))
                )}

                {!dashLoading && mutualAid.length === 0 && (
                  <p className="mbfp-section-note">No neighboring stations are available in this overview. Open dispatch and routing to coordinate assistance.</p>
                )}
                <Link href="/municipal-bfp/dispatch-routing" className="mbfp-view-all-footer">
                  <span>Coordinate response &amp; backup</span><i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
