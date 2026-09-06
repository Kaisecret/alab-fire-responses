'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMunicipalIncidentFeed } from './use-municipal-incident-feed';

/* =====================================================================
   Municipal BFP Dashboard — Mission Command Center
   Engineered with UI/UX Pro Max & Dev-Engineering Design Principles
   - 100% Real PostgreSQL Database Data (Zero fake mock cards or numbers)
   - Live authenticated incident feed via useMunicipalIncidentFeed
   - High-contrast tactical command layout with glowing status radar
   - Live 5s auto-polling with seamless manual refresh
   - 5 Pastel KPI metric cards with live counts and sub-breakdowns
   - Citizen incident verification & resident KYC application streams
   - Real active stations fleet readiness & Antique mutual aid support
   ===================================================================== */

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
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45);
    }
    50% {
      transform: scale(1.08);
      box-shadow: 0 0 0 5px rgba(16, 185, 129, 0);
    }
  }

  @keyframes mbfpSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ========== DASHBOARD BASE ========== */
  .mbfp-dash {
    padding: 12px 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: #EEF5FD;
    min-height: 100%;
    max-width: 1640px;
    margin: 0 auto;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1E293B;
  }

  /* ========== COMMAND BANNER HEADER ========== */
  .mbfp-top-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.9rem 1.4rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    animation: mbfpEntryFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-top-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .mbfp-top-shield-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: linear-gradient(135deg, #B91C1C 0%, #E23632 100%);
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    box-shadow: 0 3px 10px rgba(185, 28, 28, 0.25);
  }

  .mbfp-top-title-text h1 {
    font-size: 1.25rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mbfp-top-title-text p {
    font-size: 0.8rem;
    color: #64748B;
    margin: 0.2rem 0 0 0;
    font-weight: 500;
  }

  .mbfp-top-ctrls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mbfp-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.85rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    color: #334155;
  }

  .mbfp-status-dot-radar {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10B981;
    animation: mbfpEmeraldPulse 2s ease-in-out infinite;
  }

  .mbfp-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mbfp-refresh-btn:hover {
    background: #F1F5F9;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .mbfp-spin-icon {
    animation: mbfpSpin 0.9s linear infinite;
  }

  /* ========== 5 PASTEL KPI METRIC CARDS ROW ========== */
  .mbfp-stats-row {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .mbfp-stat-card {
    position: relative;
    border-radius: 14px;
    padding: 0.95rem 1rem 0.85rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
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

  /* Distinct Pastel Gradient Themes */
  .mbfp-stat-card.red {
    background: linear-gradient(145deg, #FFE8E8 0%, #FFD6D6 100%);
    border: 1.5px solid #FFBEBE;
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.06);
  }
  .mbfp-stat-card.amber {
    background: linear-gradient(145deg, #FFF5DE 0%, #FFE8BA 100%);
    border: 1.5px solid #FFDC99;
    box-shadow: 0 4px 16px rgba(217, 119, 6, 0.06);
  }
  .mbfp-stat-card.blue {
    background: linear-gradient(145deg, #E6EFFF 0%, #D2E3FD 100%);
    border: 1.5px solid #B8D3FD;
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.06);
  }
  .mbfp-stat-card.emerald {
    background: linear-gradient(145deg, #E3F8ED 0%, #CEF2DE 100%);
    border: 1.5px solid #B1ECC8;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.06);
  }
  .mbfp-stat-card.purple {
    background: linear-gradient(145deg, #F0E8FF 0%, #E2D3FD 100%);
    border: 1.5px solid #D0BCFD;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.06);
  }

  .mbfp-stat-card:hover {
    transform: translateY(-3px);
  }
  .mbfp-stat-card.red:hover {
    border-color: #FFA3A3;
    box-shadow: 0 10px 22px -4px rgba(226, 54, 50, 0.2);
  }
  .mbfp-stat-card.amber:hover {
    border-color: #FFCF70;
    box-shadow: 0 10px 22px -4px rgba(217, 119, 6, 0.2);
  }
  .mbfp-stat-card.blue:hover {
    border-color: #91B8FA;
    box-shadow: 0 10px 22px -4px rgba(37, 99, 235, 0.2);
  }
  .mbfp-stat-card.emerald:hover {
    border-color: #88E4AA;
    box-shadow: 0 10px 22px -4px rgba(16, 185, 129, 0.2);
  }
  .mbfp-stat-card.purple:hover {
    border-color: #B79BFB;
    box-shadow: 0 10px 22px -4px rgba(124, 58, 237, 0.2);
  }

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
    gap: 0.15rem;
    margin: 0.2rem 0 0.4rem;
  }

  .mbfp-stat-label {
    font-size: 0.72rem;
    font-weight: 750;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .mbfp-stat-value {
    font-size: 1.85rem;
    font-weight: 900;
    color: #0F172A;
    line-height: 1.1;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }

  .mbfp-stat-subtext {
    font-size: 0.68rem;
    font-weight: 600;
    color: #64748B;
    margin-top: 0.1rem;
  }

  .mbfp-stat-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.68rem;
    font-weight: 700;
    color: #64748B;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .mbfp-stat-link-arrow {
    font-size: 0.7rem;
    transition: transform 0.2s ease;
  }
  .mbfp-stat-card:hover .mbfp-stat-link-arrow {
    transform: translateX(3px);
  }

  /* ========== 2-COLUMN TACTICAL GRID ========== */
  .mbfp-grid {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 1rem;
    align-items: start;
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
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.78rem;
    font-weight: 800;
    color: #0F172A;
    background: #F1F5F9;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    border: 1px solid #CBD5E1;
  }

  .mbfp-fire-type-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #E23632;
    background: #FFF1F2;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    border: 1px solid #FFE4E6;
    text-transform: capitalize;
  }

  .mbfp-severity-tag {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    text-transform: uppercase;
    margin-left: 0.35rem;
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
    background: linear-gradient(145deg, #FFF1F2 0%, #FFE4E6 100%);
    border: 1px solid #FECDD3;
  }

  .mbfp-qa-box.full-width:hover {
    background: linear-gradient(145deg, #FFE4E6 0%, #FECDD3 100%);
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
    gap: 0.85rem;
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
    background: linear-gradient(135deg, #10B981, #059669);
    color: #FFFFFF;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
  }
  .mbfp-btn-action.verify-now:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35);
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
    animation: mbfpEmeraldPulse 2s infinite;
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
`;

export function MunicipalBfpDashboard() {
  const {
    incidents,
    loading: incidentsLoading,
    checking: incidentsChecking,
    lastCheckedAt,
    refresh: refreshIncidents,
  } = useMunicipalIncidentFeed();

  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashChecking, setDashChecking] = useState(false);
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
        setDashboardData(payload);
      }
    } catch (err) {
      console.error('Municipal dashboard fetch error:', err);
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
  const liveStatus = isChecking
    ? 'Live · checking...'
    : lastCheckedAt
      ? 'Live · checked just now'
      : 'Live · connecting...';

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
  const totalPending = pendingIncidents.length + pendingResidentApps.length;

  const stats = dashboardData?.stats;
  const stations = dashboardData?.stations ?? [];
  const mutualAid = dashboardData?.mutualAid ?? [];
  const municipality = dashboardData?.municipality || 'Municipal';
  const recentIncidents = incidents;

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="mbfp-dash">
        {/* Top Command Banner Header */}
        <div className="mbfp-top-banner">
          <div className="mbfp-top-title-wrap">
            <div className="mbfp-top-shield-icon">
              <i className="fa-solid fa-shield-halved" />
            </div>
            <div className="mbfp-top-title-text">
              <h1>{municipality} Fire Station</h1>
              <p>Municipal Incident Command &amp; Emergency Coordination Center</p>
            </div>
          </div>

          <div className="mbfp-top-ctrls">
            <div className="mbfp-status-badge">
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

        {/* 5 KPI Metric Cards Row (100% Bound to Database) */}
        <div className="mbfp-stats-row">
          {/* Card 1: Active Incidents */}
          <Link href="/municipal-bfp/active-incidents" className="mbfp-stat-card red">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon red">
                <i className="fa-solid fa-fire-flame-curved" />
              </div>
              <span className="mbfp-stat-trend-tag red">
                <i className="fa-solid fa-triangle-exclamation" />
                {incidents.length > 0 ? 'Priority Alarm' : 'Normal'}
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-label">Active Incidents</span>
              <span className="mbfp-stat-value">{incidentsLoading ? '...' : incidents.length}</span>
              <span className="mbfp-stat-subtext">Live Fire Events</span>
            </div>
            <div className="mbfp-stat-foot">
              <span>View Active Queue</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
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
                {totalPending > 0 ? 'Action Req.' : 'Cleared'}
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-label">Pending Verification</span>
              <span className="mbfp-stat-value">{incidentsLoading || dashLoading ? '...' : totalPending}</span>
              <span className="mbfp-stat-subtext">
                {`${pendingIncidents.length} Reports · ${pendingResidentApps.length} Resident IDs`}
              </span>
            </div>
            <div className="mbfp-stat-foot">
              <span>Process Requests</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
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
              <span className="mbfp-stat-label">Active Stations &amp; Fleet</span>
              <span className="mbfp-stat-value">{dashLoading ? '...' : (stations.length || stats?.availableFiretrucks || 0)}</span>
              <span className="mbfp-stat-subtext">{stations.length} Station{stations.length === 1 ? '' : 's'} Operational</span>
            </div>
            <div className="mbfp-stat-foot">
              <span>Station Resources</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
            </div>
          </Link>

          {/* Card 4: Responders On Duty */}
          <Link href="/municipal-bfp/responders" className="mbfp-stat-card emerald">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon emerald">
                <i className="fa-solid fa-users-gear" />
              </div>
              <span className="mbfp-stat-trend-tag emerald">
                <i className="fa-solid fa-shield" /> Roster
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-label">Responders On Duty</span>
              <span className="mbfp-stat-value">{dashLoading ? '...' : (stats?.respondersOnDuty ?? 0)}</span>
              <span className="mbfp-stat-subtext">Duty Personnel Assigned</span>
            </div>
            <div className="mbfp-stat-foot">
              <span>Duty Roster</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
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
              <span className="mbfp-stat-label">Active Dispatches</span>
              <span className="mbfp-stat-value">{dashLoading ? '...' : (stats?.assistanceRequests ?? 0)}</span>
              <span className="mbfp-stat-subtext">Active Incident Runs</span>
            </div>
            <div className="mbfp-stat-foot">
              <span>Dispatch Routing</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
            </div>
          </Link>
        </div>

        {/* Top Grid: Recent Incident Queue & Tactical Quick Actions */}
        <div className="mbfp-grid">
          {/* Recent Incident Queue */}
          <div className="mbfp-card">
            <div className="mbfp-card-header">
              <div className="mbfp-card-title-wrap">
                <div className="mbfp-card-title-icon">
                  <i className="fa-solid fa-fire" />
                </div>
                <span className="mbfp-card-title">Recent / Active Incident Queue</span>
              </div>
              <span className="mbfp-card-badge">{recentIncidents.length} Active in {municipality}</span>
            </div>

            <div className="mbfp-incident-table-wrap">
              <table className="mbfp-incident-table">
                <thead>
                  <tr>
                    <th>Ref. No.</th>
                    <th>Barangay &amp; Landmark</th>
                    <th>Fire Type &amp; Severity</th>
                    <th>Reported</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentsLoading ? (
                    <tr className="mbfp-incident-row">
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                        <i className="fa-solid fa-circle-notch mbfp-spin-icon" style={{ marginRight: '0.5rem' }} />
                        Loading live municipal incident feed...
                      </td>
                    </tr>
                  ) : recentIncidents.length === 0 ? (
                    <tr className="mbfp-incident-row">
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748B' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                          <i className="fa-solid fa-shield-check" style={{ fontSize: '1.8rem', color: '#10B981' }} />
                          <strong style={{ color: '#0F172A', fontSize: '0.9rem' }}>All Clear in {municipality}</strong>
                          <span style={{ fontSize: '0.78rem' }}>No active fire emergencies currently reported. Monitoring 24/7.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    incidents.slice(0, 5).map((inc) => (
                      <tr key={inc.id} className="mbfp-incident-row">
                        <td>
                          <span className="mbfp-ref-code">{inc.referenceNumber}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{inc.barangay || 'Barangay not identified'}</div>
                          {inc.landmark && <div style={{ fontSize: '0.7rem', color: '#64748B' }}>near {inc.landmark}</div>}
                        </td>
                        <td>
                          <span className="mbfp-fire-type-tag">
                            <i className="fa-solid fa-fire-flame-simple" />
                            <span>{inc.fireType.replaceAll('_', ' ')}</span>
                          </span>
                          {getSeverityBadge(inc.calculatedSeverity)}
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
              <span>View All Active Incidents in Municipality</span>
              <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>

          {/* Tactical Quick Actions */}
          <div className="mbfp-card">
            <div className="mbfp-card-header">
              <div className="mbfp-card-title-wrap">
                <div className="mbfp-card-title-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <i className="fa-solid fa-bolt" />
                </div>
                <span className="mbfp-card-title">Tactical Quick Actions</span>
              </div>
              <span className="mbfp-card-badge">Instant Access</span>
            </div>

            <div className="mbfp-quick-actions-wrap">
              <div className="mbfp-qa-grid-top">
                <Link href="/municipal-bfp/verification-queue" className="mbfp-qa-box">
                  <div className="mbfp-qa-icon-wrap amber">
                    <i className="fa-solid fa-clipboard-check" />
                  </div>
                  <div>
                    <div className="mbfp-qa-text">Verify Reports</div>
                    <div className="mbfp-qa-sub">{totalPending} Pending Actions</div>
                  </div>
                </Link>

                <Link href="/municipal-bfp/gis-map" className="mbfp-qa-box">
                  <div className="mbfp-qa-icon-wrap blue">
                    <i className="fa-solid fa-map-location-dot" />
                  </div>
                  <div>
                    <div className="mbfp-qa-text">Open GIS Map</div>
                    <div className="mbfp-qa-sub">Live Satellite &amp; Hydrants</div>
                  </div>
                </Link>

                <Link href="/municipal-bfp/dispatch-routing" className="mbfp-qa-box">
                  <div className="mbfp-qa-icon-wrap red">
                    <i className="fa-solid fa-truck-moving" />
                  </div>
                  <div>
                    <div className="mbfp-qa-text">Dispatch Units</div>
                    <div className="mbfp-qa-sub">Route Teams to Alarms</div>
                  </div>
                </Link>

                <Link href="/municipal-bfp/water-sources" className="mbfp-qa-box">
                  <div className="mbfp-qa-icon-wrap emerald">
                    <i className="fa-solid fa-droplet" />
                  </div>
                  <div>
                    <div className="mbfp-qa-text">Water Sources</div>
                    <div className="mbfp-qa-sub">Hydrants &amp; Drafting Points</div>
                  </div>
                </Link>
              </div>

              <Link href="/municipal-bfp/incident-reports" className="mbfp-qa-box full-width">
                <div className="mbfp-qa-icon-wrap red">
                  <i className="fa-solid fa-file-circle-plus" />
                </div>
                <div>
                  <div className="mbfp-qa-text">Log Phone-In Alarm / Generate Official Incident Report</div>
                  <div className="mbfp-qa-sub">Record emergency call or generate BFP investigation paperwork</div>
                </div>
                <i className="fa-solid fa-arrow-right" style={{ marginLeft: 'auto', color: '#E23632', fontSize: '0.85rem' }} />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Grid: Verification Stream & Station Fleet Readiness */}
        <div className="mbfp-grid">
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
                Citizen Reports &amp; Resident KYC
              </span>
            </div>

            <div className="mbfp-verif-list">
              {incidentsLoading || dashLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                  <i className="fa-solid fa-circle-notch mbfp-spin-icon" style={{ marginRight: '0.5rem' }} />
                  Checking verification requests...
                </div>
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

          {/* Right Column: Active Stations & Mutual Aid Support */}
          <div className="mbfp-col-right">
            {/* Active Municipal Stations & Fleet (Live Database) */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <div className="mbfp-card-title-wrap">
                  <div className="mbfp-card-title-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <i className="fa-solid fa-building-shield" />
                  </div>
                  <span className="mbfp-card-title">Municipal Stations &amp; Readiness</span>
                </div>
                <Link href="/municipal-bfp/stations" style={{ fontSize: '0.72rem', fontWeight: 750, color: '#2563EB', textDecoration: 'none' }}>
                  Manage
                </Link>
              </div>

              <div className="mbfp-stations-list">
                {dashLoading ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#64748B', fontSize: '0.8rem' }}>
                    Loading station roster...
                  </div>
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
                        <span>Ready</span>
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
                  <span className="mbfp-card-title">Antique Mutual Aid Grid</span>
                </div>
                <span className="mbfp-card-badge">Neighbor Support</span>
              </div>

              <div className="mbfp-mutual-aid-wrap">
                {mutualAid.map((aid) => (
                  <div className="mbfp-aid-item" key={aid.id}>
                    <div className="mbfp-aid-meta">
                      <span className="mbfp-aid-title">{aid.stationName}</span>
                      <span className="mbfp-aid-sub">{aid.municipalityName} · Regional Support</span>
                      <a href={`tel:${aid.phone}`} className="mbfp-aid-phone">
                        <i className="fa-solid fa-phone-volume" />
                        <span>{aid.phone}</span>
                      </a>
                    </div>
                    <Link href="/municipal-bfp/dispatch-routing" className="mbfp-aid-btn support">
                      <i className="fa-solid fa-handshake" /> Request Backup
                    </Link>
                  </div>
                ))}

                {/* Provincial Command Center Hotline */}
                <div className="mbfp-aid-item" style={{ background: '#FFF1F2', borderColor: '#FFE4E6' }}>
                  <div className="mbfp-aid-meta">
                    <span className="mbfp-aid-title" style={{ color: '#991B1B' }}>Provincial BFP Headquarters</span>
                    <span className="mbfp-aid-sub">San Jose Command · 24/7 Operations</span>
                    <a href="tel:(036) 540-9999" className="mbfp-aid-phone" style={{ color: '#B91C1C' }}>
                      <i className="fa-solid fa-phone-volume" />
                      <span>(036) 540-9999</span>
                    </a>
                  </div>
                  <a href="tel:(036) 540-9999" className="mbfp-aid-btn provincial">
                    <i className="fa-solid fa-phone" /> Call HQ
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
