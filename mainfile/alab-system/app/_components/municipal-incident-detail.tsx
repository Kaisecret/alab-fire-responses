"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MunicipalIncidentMap } from "./municipal-incident-map";
import { BfpDataLoader } from "./bfp-data-loader";
import { canMunicipalResolveReport } from "../../lib/fire-reports/validation";
import { fireReportStatusLabels, type FireReportStatus } from "../../lib/fire-reports/types";

type Incident = {
  id: string;
  referenceNumber: string;
  reportSource: "ALAB_APP" | "PHONE_CALL";
  status: FireReportStatus;
  fireType: string;
  description: string;
  landmark: string | null;
  latitude: number;
  longitude: number;
  submittedAt: string;
  responseStartedAt: string | null;
  respondingStationName: string | null;
  residentName: string;
  phone: string;
  reporterIpAddress: string | null;
  reporterDeviceSummary: string | null;
  email: string;
  address: string | null;
  barangay: string;
  municipality: string;
  stationName: string | null;
  stationLatitude: number | null;
  stationLongitude: number | null;
  structureMaterial?: string | null;
  houseDensity?: string | null;
  routeAccessibility?: string | null;
  weatherTemperature?: number | string | null;
  weatherHumidity?: number | string | null;
  weatherWindSpeed?: number | string | null;
  weatherWindDirection?: number | string | null;
  weatherWindCondition?: string | null;
  calculatedSeverity?: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null;
  severityScore?: number | null;
  severityFactors?: string[] | null;
  photos: Array<{ url: string | null }>;
  history: Array<{ status: FireReportStatus; message: string | null; createdAt: string }>;
  previousReports: Array<{ id: string; referenceNumber: string; status: FireReportStatus; submittedAt: string }>;
};

type DispatchStation = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  activePersonnelCount: number;
};

const detailStyles = `
  /* ========== MUNICIPAL INCIDENT DETAIL STYLES ========== */
  .mbfp-detail-shell {
    padding: 10px 1.5rem 2.5rem;
    max-width: 1640px;
    margin: 0 auto;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0F172A;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #EEF5FD;
    min-height: 100%;
  }

  /* Top Navigation & Breadcrumbs */
  .mbfp-detail-top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    margin-bottom: 0.25rem;
    flex-wrap: wrap;
  }

  .mbfp-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 1rem;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    color: #334155;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }

  .mbfp-back-btn:hover {
    background: #F8FAFC;
    border-color: #CBD5E1;
    color: #0F172A;
    transform: translateX(-2px);
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
  }

  .mbfp-telemetry-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.74rem;
    font-weight: 700;
    color: #059669;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 0.28rem 0.75rem;
    border-radius: 999px;
  }

  .mbfp-telemetry-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #059669;
    animation: mbfpTelPulse 1.8s infinite;
  }

  @keyframes mbfpTelPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.4; }
  }

  /* Incident Hero Command Banner */
  .mbfp-incident-hero {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    padding: 1.15rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.25rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
    flex-wrap: wrap;
  }

  .mbfp-hero-left {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .mbfp-hero-meta-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .mbfp-hero-ref-tag {
    font-family: 'JetBrains Mono', monospace, sans-serif;
    font-size: 0.8rem;
    font-weight: 800;
    color: #475569;
    background: #F1F5F9;
    padding: 0.22rem 0.6rem;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
  }

  .mbfp-hero-firetype-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: #FFF1F2;
    border: 1px solid #FECDD3;
    color: #E11D48;
    font-size: 0.74rem;
    font-weight: 800;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .mbfp-hero-title {
    font-size: clamp(1.4rem, 2vw, 1.8rem);
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.03em;
    line-height: 1.15;
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .mbfp-hero-time {
    font-size: 0.8rem;
    color: #64748B;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  /* Response Trigger Button */
  .mbfp-respond-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.75rem 1.45rem;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 14px rgba(208, 15, 9, 0.28);
    color: #FFFFFF;
    background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%);
    font-family: inherit;
  }

  .mbfp-respond-btn:hover:not(:disabled) {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 18px rgba(208, 15, 9, 0.38);
  }

  .mbfp-respond-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .mbfp-respond-btn.active-responding {
    background: #059669;
    box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28);
  }

  .mbfp-respond-btn.active-responding:hover:not(:disabled) {
    background: #047857;
    box-shadow: 0 6px 20px rgba(5, 150, 105, 0.38);
  }

  .mbfp-respond-btn:disabled {
    opacity: 0.85;
  }

  .mbfp-hero-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .mbfp-resolve-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.15rem;
    border: 1px solid #FCA5A5;
    border-radius: 8px;
    background: #FFF1F2;
    color: #BE123C;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-resolve-btn:hover:not(:disabled) {
    background: #FFE4E6;
    border-color: #FB7185;
    transform: translateY(-1.5px);
  }

  .mbfp-resolve-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Tactical Severity & Conflagration Assessment */
  .mbfp-severity-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.28rem 0.75rem;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 850;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .mbfp-severity-hero-badge.CRITICAL { background: #7F1D1D; color: #FEE2E2; border: 1px solid #B91C1C; }
  .mbfp-severity-hero-badge.HIGH { background: #991B1B; color: #FEF2F2; border: 1px solid #DC2626; }
  .mbfp-severity-hero-badge.MODERATE { background: #D97706; color: #FFFBEB; border: 1px solid #F59E0B; }
  .mbfp-severity-hero-badge.LOW { background: #047857; color: #ECFDF5; border: 1px solid #10B981; }

  .mbfp-tactical-severity-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    margin-bottom: 1.25rem;
  }
  .mbfp-severity-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.28rem 0.65rem;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .mbfp-severity-tag.CRITICAL { background: #FEE2E2; color: #991B1B; border: 1px solid #F87171; }
  .mbfp-severity-tag.HIGH { background: #FEF2F2; color: #DC2626; border: 1px solid #FCA5A5; }
  .mbfp-severity-tag.MODERATE { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
  .mbfp-severity-tag.LOW { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }

  .mbfp-tactical-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.85rem;
  }
  .mbfp-metric-item {
    padding: 0.85rem 1rem;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    background: #F8FAFC;
    transition: all 0.15s ease;
  }
  .mbfp-metric-item.alert-conflagration {
    border-color: #FECACA;
    background: #FFFBFB;
    border-left: 4px solid #DC2626;
  }
  .mbfp-metric-item.alert-wind {
    border-color: #BFDBFE;
    background: #F8FAFC;
    border-left: 4px solid #2563EB;
  }
  .mbfp-metric-item.alert-route {
    border-color: #FED7AA;
    background: #FFFDFB;
    border-left: 4px solid #EA580C;
  }
  .mbfp-metric-label {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.71rem;
    font-weight: 750;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.4rem;
  }
  .mbfp-metric-label i {
    font-size: 0.85rem;
    color: #475569;
  }
  .mbfp-metric-val {
    display: block;
    font-size: 0.88rem;
    font-weight: 750;
    color: #0F172A;
    line-height: 1.35;
  }
  .mbfp-metric-item.alert-conflagration .mbfp-metric-val {
    color: #B91C1C;
  }
  .mbfp-metric-item.alert-route .mbfp-metric-val {
    color: #9A3412;
  }

  .mbfp-factors-list {
    padding: 0.8rem 1rem;
    border-radius: 8px;
    background: #FEF2F2;
    border: 1px solid #FEE2E2;
  }
  .mbfp-factors-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.72rem;
    font-weight: 800;
    color: #991B1B;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }
  .mbfp-factors-list ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .mbfp-factors-list li {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: #FFFFFF;
    border: 1px solid #FECACA;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.76rem;
    font-weight: 700;
    color: #991B1B;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
  .mbfp-factors-list li i {
    color: #DC2626;
    font-size: 0.75rem;
  }
  @media (max-width: 640px) {
    .mbfp-tactical-metrics-grid { grid-template-columns: 1fr; }
  }

  /* 2-Column Tactical Layout Grid (Balanced Mission Control) */
  .mbfp-tactical-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 14px;
    align-items: start;
  }

  @media (max-width: 1080px) {
    .mbfp-tactical-grid {
      grid-template-columns: 1fr;
      gap: 14px;
    }
  }

  .mbfp-intel-column,
  .mbfp-map-card-wrapper {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  /* Card Containers */
  .mbfp-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    padding: 1.15rem 1.35rem;
    margin-bottom: 0;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
  }

  .mbfp-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.85rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #F1F5F9;
  }

  .mbfp-card-title {
    font-size: 1.05rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    letter-spacing: -0.02em;
  }

  .mbfp-card-title i {
    color: #DC2626;
  }

  /* Resident Profile Data Grid (Strictly 8px Spacing) */
  .mbfp-profile-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .mbfp-data-cell {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .mbfp-data-label {
    font-size: 0.7rem;
    font-weight: 800;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-data-value {
    font-size: 0.88rem;
    font-weight: 700;
    color: #0F172A;
    word-break: break-word;
  }

  .mbfp-phone-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #2563EB;
    font-weight: 800;
    text-decoration: none;
    transition: color 0.18s;
  }

  .mbfp-phone-link:hover {
    color: #1D4ED8;
    text-decoration: underline;
  }

  /* Incident Details Description Block */
  .mbfp-desc-box {
    background: #F8FAFC;
    border-left: 3.5px solid #DC2626;
    border-radius: 4px 10px 10px 4px;
    padding: 0.85rem 1.05rem;
    font-size: 0.88rem;
    line-height: 1.55;
    color: #334155;
    font-weight: 500;
    margin: 0;
  }

  /* Photo Evidence Card & Lightbox Trigger */
  .mbfp-photo-showcase {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid #E2E8F0;
    max-height: 320px;
    background: #0F172A;
  }

  .mbfp-photo-img {
    width: 100%;
    height: 100%;
    max-height: 320px;
    object-fit: cover;
    display: block;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s;
  }

  .mbfp-photo-showcase:hover .mbfp-photo-img {
    transform: scale(1.03);
    opacity: 0.9;
  }

  .mbfp-photo-overlay-badge {
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    color: #FFFFFF;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .mbfp-photo-click-hint {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    background: rgba(220, 38, 38, 0.9);
    backdrop-filter: blur(8px);
    color: #FFFFFF;
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  /* Response Timeline / History */
  .mbfp-timeline {
    list-style: none;
    padding: 0;
    margin: 0;
    position: relative;
  }

  .mbfp-timeline::before {
    content: '';
    position: absolute;
    top: 8px;
    bottom: 8px;
    left: 11px;
    width: 2px;
    background: #E2E8F0;
  }

  .mbfp-timeline-item {
    position: relative;
    padding-left: 2rem;
    margin-bottom: 8px;
  }

  .mbfp-timeline-item:last-child {
    margin-bottom: 0;
  }

  .mbfp-timeline-node {
    position: absolute;
    left: 5px;
    top: 3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 3px solid #DC2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
  }

  .mbfp-timeline-content {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
  }

  .mbfp-timeline-title {
    font-size: 0.84rem;
    font-weight: 800;
    color: #0F172A;
  }

  .mbfp-timeline-meta {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 600;
  }

  /* Right Column: Route Map & Evidence Showcase */
  .mbfp-photo-thumbs-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
  }
  .mbfp-photo-thumb-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border: 1.5px solid #E2E8F0;
    border-radius: 8px;
    background: #F8FAFC;
    cursor: pointer;
    transition: all 0.15s ease;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 750;
    color: #475569;
  }
  .mbfp-photo-thumb-btn:hover {
    border-color: #DC2626;
    background: #FEF2F2;
    color: #DC2626;
  }
  .mbfp-photo-thumb-btn.is-active {
    border-color: #DC2626;
    background: #FEF2F2;
    color: #DC2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
  }
  .mbfp-photo-thumb-btn img {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    object-fit: cover;
  }
  .mbfp-no-photo-card {
    background: #FAFAFA;
    border: 1.5px dashed #CBD5E1;
  }
  .mbfp-no-photo-badge {
    font-size: 0.69rem;
    font-weight: 800;
    color: #64748B;
    background: #F1F5F9;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
  }
  .mbfp-no-photo-body {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0.5rem 0.25rem;
    color: #64748B;
  }
  .mbfp-no-photo-body i {
    font-size: 1.8rem;
    color: #94A3B8;
    flex-shrink: 0;
  }
  .mbfp-no-photo-body p {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.45;
  }
  .mbfp-lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 2.85rem;
    height: 2.85rem;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.3);
    background: rgba(15, 23, 42, 0.85);
    color: #FFFFFF;
    font-size: 1.8rem;
    font-weight: 700;
    display: grid;
    place-items: center;
    cursor: pointer;
    z-index: 10;
    transition: all 0.15s ease;
  }
  .mbfp-lightbox-nav:hover {
    background: #DC2626;
    border-color: #DC2626;
    transform: translateY(-50%) scale(1.1);
  }
  .mbfp-lightbox-nav.prev { left: 1rem; }
  .mbfp-lightbox-nav.next { right: 1rem; }

  .mbfp-route-stats-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.75rem 0.95rem;
    margin-top: 8px;
  }

  .mbfp-route-icon-box {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: #EFF6FF;
    color: #2563EB;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    flex-shrink: 0;
  }

  .mbfp-route-text-val {
    font-size: 0.82rem;
    font-weight: 700;
    color: #1E293B;
    line-height: 1.4;
  }

  /* Mission Loading State Skeleton */
  .mbfp-loading-shell {
    padding: 3rem 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }

  .mbfp-radar-scanner {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: #FFF1F2;
    border: 2px solid #FECDD3;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 1.5rem;
    box-shadow: 0 0 0 8px rgba(220, 38, 38, 0.08);
  }

  .mbfp-radar-inner-icon {
    font-size: 2.2rem;
    color: #DC2626;
    animation: mbfpRadarPulse 1.8s ease-in-out infinite;
  }

  .mbfp-radar-beam {
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #DC2626;
    animation: mbfpSpin 1.2s linear infinite;
  }

  @keyframes mbfpRadarPulse {
    0%, 100% { transform: scale(0.92); opacity: 0.9; }
    50% { transform: scale(1.08); opacity: 1; }
  }

  .mbfp-loading-title {
    font-size: 1.25rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0 0 0.45rem;
  }

  .mbfp-loading-subtext {
    font-size: 0.86rem;
    color: #64748B;
    font-weight: 500;
    margin: 0;
  }

  /* Station-team dispatch modal overlay */
  .mbfp-dispatch-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999999 !important;
    display: grid;
    place-items: center;
    padding: clamp(0.75rem, 3vw, 1.5rem);
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-sizing: border-box;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-dispatch-modal {
    width: min(100%, 540px);
    max-height: min(780px, calc(100dvh - 2.5rem));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 20px;
    background: #FFFFFF;
    box-shadow: 0 32px 80px -12px rgba(15, 23, 42, 0.42);
    animation: mbfpModalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes mbfpModalPop {
    0% { opacity: 0; transform: scale(0.96) translateY(8px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  .mbfp-dispatch-header {
    padding: 1.25rem 1.4rem 1.1rem;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background: #FAFCFE;
  }

  .mbfp-dispatch-header-title-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    min-width: 0;
  }

  .mbfp-dispatch-icon-badge {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
    border: 1px solid #FCA5A5;
    display: grid;
    place-items: center;
    color: #DC2626;
    font-size: 1.15rem;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.12);
  }

  .mbfp-dispatch-title {
    margin: 0;
    color: #0F172A;
    font-size: 1.15rem;
    font-weight: 850;
    letter-spacing: -0.025em;
    line-height: 1.25;
  }

  .mbfp-dispatch-subtitle {
    margin: 0.2rem 0 0;
    color: #64748B;
    font-size: 0.8rem;
    line-height: 1.35;
    font-weight: 600;
  }

  .mbfp-dispatch-close {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    display: grid;
    place-items: center;
    cursor: pointer;
    font-size: 0.95rem;
    transition: all 0.18s ease;
    flex-shrink: 0;
  }

  .mbfp-dispatch-close:hover {
    background: #FEE2E2;
    border-color: #FCA5A5;
    color: #DC2626;
    transform: rotate(90deg);
  }

  .mbfp-dispatch-body {
    padding: 1.15rem 1.4rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .mbfp-dispatch-alert-dispatched {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.95rem;
    border-radius: 12px;
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    color: #166534;
  }

  .mbfp-dispatch-dispatched-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #DCFCE7;
    display: grid;
    place-items: center;
    color: #16A34A;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .mbfp-dispatch-alert-dispatched strong {
    display: block;
    font-size: 0.82rem;
    font-weight: 800;
    color: #15803D;
  }

  .mbfp-dispatch-alert-dispatched p {
    margin: 0.1rem 0 0;
    font-size: 0.75rem;
    color: #166534;
    font-weight: 600;
  }

  .mbfp-dispatch-all {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 1rem;
    border: 1.5px solid #FEE2E2;
    border-radius: 14px;
    background: linear-gradient(135deg, #FFF8F8 0%, #FFFFFF 100%);
    cursor: pointer;
    text-align: left;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-dispatch-all:hover:not(:disabled) {
    border-color: #F87171;
    background: #FFF1F2;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.08);
  }

  .mbfp-dispatch-all.is-active {
    border-color: #DC2626;
    background: #FEF2F2;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }

  .mbfp-dispatch-all:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    background: #F8FAFC;
    border-color: #E2E8F0;
  }

  .mbfp-dispatch-all-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .mbfp-dispatch-all-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: #FEE2E2;
    color: #DC2626;
    display: grid;
    place-items: center;
    font-size: 0.95rem;
    flex-shrink: 0;
  }

  .mbfp-dispatch-all strong {
    display: block;
    font-size: 0.86rem;
    font-weight: 800;
    color: #991B1B;
  }

  .mbfp-dispatch-all span {
    display: block;
    margin-top: 0.12rem;
    font-size: 0.72rem;
    color: #B91C1C;
    font-weight: 600;
  }

  .mbfp-custom-checkbox {
    font-size: 1.25rem;
    color: #DC2626;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .mbfp-dispatch-stations {
    display: grid;
    gap: 0.55rem;
  }

  .mbfp-dispatch-station {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    padding: 0.8rem 1rem;
    border: 1.5px solid #E2E8F0;
    border-radius: 13px;
    background: #FFFFFF;
    color: #0F172A;
    cursor: pointer;
    text-align: left;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-dispatch-station:hover:not(:disabled) {
    border-color: #CBD5E1;
    background: #F8FAFC;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  .mbfp-dispatch-station.selected {
    border-color: #DC2626;
    background: linear-gradient(135deg, #FFF9F9 0%, #FFFFFF 100%);
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1), 0 4px 14px rgba(220, 38, 38, 0.06);
  }

  .mbfp-dispatch-station.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
    background: #F8FAFC;
  }

  .mbfp-station-card-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .mbfp-station-badge-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #F1F5F9;
    color: #64748B;
    display: grid;
    place-items: center;
    font-size: 0.95rem;
    flex-shrink: 0;
    transition: all 0.18s ease;
  }

  .mbfp-station-badge-icon.is-selected {
    background: #FEE2E2;
    color: #DC2626;
  }

  .mbfp-station-info {
    min-width: 0;
  }

  .mbfp-dispatch-station-name {
    font-size: 0.88rem;
    font-weight: 800;
    color: #0F172A;
    display: block;
    line-height: 1.25;
  }

  .mbfp-dispatch-station-meta {
    display: block;
    margin-top: 0.16rem;
    color: #64748B;
    font-size: 0.72rem;
    font-weight: 600;
  }

  .mbfp-station-card-right {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
  }

  .mbfp-dispatch-count {
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: 999px;
    padding: 0.22rem 0.55rem;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .mbfp-dispatch-count.is-staffed {
    color: #047857;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
  }

  .mbfp-dispatch-count.is-empty {
    color: #64748B;
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
  }

  .mbfp-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .mbfp-station-check-indicator {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1.5px solid #CBD5E1;
    display: grid;
    place-items: center;
    background: #FFFFFF;
    color: #FFFFFF;
    font-size: 0.68rem;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-station-check-indicator.checked {
    background: #DC2626;
    border-color: #DC2626;
    box-shadow: 0 2px 6px rgba(220, 38, 38, 0.35);
  }

  .mbfp-dispatch-empty, .mbfp-dispatch-error {
    margin: 0.35rem 0 0;
    border-radius: 12px;
    padding: 0.75rem 0.9rem;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .mbfp-dispatch-empty {
    background: #F8FAFC;
    color: #475569;
    border: 1px solid #E2E8F0;
    text-align: center;
  }

  .mbfp-dispatch-error {
    background: #FEF2F2;
    color: #B91C1C;
    border: 1px solid #FECACA;
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .mbfp-dispatch-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.4rem;
    border-top: 1px solid #E2E8F0;
    background: #FAFCFE;
  }

  .mbfp-dispatch-cancel {
    border-radius: 11px;
    padding: 0.62rem 1.1rem;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #475569;
    transition: all 0.18s ease;
  }

  .mbfp-dispatch-cancel:hover:not(:disabled) {
    background: #F1F5F9;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .mbfp-dispatch-confirm {
    border-radius: 8px;
    padding: 0.62rem 1.25rem;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    border: none;
    background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%);
    color: #FFFFFF;
    box-shadow: 0 4px 14px rgba(208, 15, 9, 0.28);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: inherit;
  }

  .mbfp-dispatch-confirm:hover:not(:disabled) {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 18px rgba(208, 15, 9, 0.38);
  }

  .mbfp-dispatch-confirm:active:not(:disabled) {
    transform: translateY(0);
  }

  .mbfp-dispatch-confirm:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
    box-shadow: none;
  }

  /* PHOTO LIGHTBOX MODAL POPUP */
  .mbfp-lightbox-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 99999999 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    box-sizing: border-box;
    animation: mbfpLightboxFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes mbfpLightboxFadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  .mbfp-lightbox-modal {
    background: #1E293B;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    max-width: 960px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.7);
    animation: mbfpModalZoom 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes mbfpModalZoom {
    0% { transform: scale(0.95) translateY(10px); }
    100% { transform: scale(1) translateY(0); }
  }

  .mbfp-lightbox-header {
    padding: 1rem 1.35rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: #FFFFFF;
  }

  .mbfp-lightbox-title {
    font-size: 0.95rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
  }

  .mbfp-lightbox-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #FFFFFF;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.18s ease;
  }

  .mbfp-lightbox-close-btn:hover {
    background: #DC2626;
  }

  .mbfp-lightbox-body {
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0F172A;
    overflow: auto;
    max-height: calc(90vh - 120px);
  }

  .mbfp-lightbox-body img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  }

  .mbfp-lightbox-footer {
    padding: 0.85rem 1.35rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #94A3B8;
    font-size: 0.8rem;
    background: #1E293B;
  }

  .mbfp-lightbox-open-external {
    color: #60A5FA;
    font-weight: 700;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-lightbox-open-external:hover {
    text-decoration: underline;
  }

  /* Responsive Adjustments */
  @media (max-width: 992px) {
    .mbfp-tactical-grid {
      grid-template-columns: 1fr;
    }
    .mbfp-map-card-wrapper {
      position: static;
    }
  }

  @media (max-width: 640px) {
    .mbfp-detail-shell {
      padding: 1rem 0.85rem 2.5rem;
    }
    .mbfp-profile-grid {
      grid-template-columns: 1fr;
    }
    .mbfp-respond-btn {
      width: 100%;
      justify-content: center;
    }
    .mbfp-hero-actions { width: 100%; }
    .mbfp-resolve-btn { flex: 1; justify-content: center; }
  }
`;

export function MunicipalIncidentDetail({
  incidentId,
  onBack,
  onResponded,
}: {
  incidentId: string;
  onBack?: () => void;
  onResponded?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [dispatchStations, setDispatchStations] = useState<DispatchStation[]>([]);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!dispatchOpen && !resolveOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) {
        setDispatchOpen(false);
        setResolveOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dispatchOpen, resolveOpen, sending]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/municipal-bfp/incidents/${incidentId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load incident");
      setIncident(data.incident);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load incident.");
    }
  }, [incidentId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const openDispatch = async () => {
    setDispatchOpen(true);
    setDispatchError("");
    setSelectedStationIds([]);
    setStationsLoading(true);
    try {
      const res = await fetch(`/api/municipal-bfp/incidents/${incidentId}/respond`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load station choices");
      setDispatchStations(Array.isArray(data.stations) ? data.stations : []);
    } catch (e) {
      setDispatchError(e instanceof Error ? e.message : "Unable to load station choices.");
    } finally {
      setStationsLoading(false);
    }
  };

  const toggleStation = (stationId: string) => {
    setSelectedStationIds((current) => current.includes(stationId)
      ? current.filter((id) => id !== stationId)
      : [...current, stationId]);
  };

  const selectAllStations = () => {
    const staffedIds = dispatchStations.filter((station) => station.activePersonnelCount > 0).map((station) => station.id);
    setSelectedStationIds((current) => current.length === staffedIds.length ? [] : staffedIds);
  };

  const respond = async () => {
    setSending(true);
    setDispatchError("");
    try {
      const staffedIds = dispatchStations.filter((station) => station.activePersonnelCount > 0).map((station) => station.id);
      const selectAllStations = staffedIds.length > 0 && selectedStationIds.length === staffedIds.length;
      const res = await fetch(`/api/municipal-bfp/incidents/${incidentId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationIds: selectedStationIds, selectAllStations }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start response");
      await load();
      setDispatchOpen(false);
      onResponded?.();
    } catch (e) {
      setDispatchError(e instanceof Error ? e.message : "Unable to start response.");
    } finally {
      setSending(false);
    }
  };

  const resolveIncident = async () => {
    setSending(true);
    setDispatchError("");
    try {
      const res = await fetch(`/api/municipal-bfp/incidents/${incidentId}/resolve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to resolve this incident");
      await load();
      setResolveOpen(false);
      onResponded?.();
    } catch (e) {
      setDispatchError(e instanceof Error ? e.message : "Unable to resolve this incident.");
    } finally {
      setSending(false);
    }
  };

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (error) {
    return (
      <>
        <style>{detailStyles}</style>
        <div className="mbfp-detail-shell">
          <div className="mbfp-detail-top-nav">
            {onBack && (
              <button className="mbfp-back-btn" onClick={onBack}>
                <i className="fa-solid fa-arrow-left" />
                <span>Back to Incident Queue</span>
              </button>
            )}
          </div>
          <div className="mbfp-card" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
            <p style={{ color: "#991B1B", fontWeight: 700, margin: 0 }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: "0.5rem" }} />
              {error}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Polished Mission Control Loading State (Attached In-Card BFP Fire Loader)
  if (!incident) {
    return (
      <>
        <style>{detailStyles}</style>
        <main className="mbfp-detail-shell">
          <div className="mbfp-card" style={{ padding: "3rem 1.5rem" }}>
            <BfpDataLoader
              theme="municipal"
              size="lg"
              title="Accessing Live Incident Telemetry…"
              subtitle="Connecting to municipal station GPS, caller verification, and tactical road routing."
              minHeight="340px"
            />
          </div>
        </main>
      </>
    );
  }

  const isPhoneReport = incident.reportSource === "PHONE_CALL";
  const isResponding = incident.status === "RESPONDING";
  const canResolve = canMunicipalResolveReport(incident.status);
  const isTerminal = ["RESOLVED", "CLOSED", "REJECTED", "FALSE_REPORT", "DUPLICATE"].includes(incident.status);
  const validPhotos = (incident.photos ?? []).filter((p): p is { url: string } => Boolean(p && p.url));
  const evidencePhoto = validPhotos[activePhotoIdx]?.url || validPhotos[0]?.url || null;

  return (
    <>
      <style>{detailStyles}</style>
      <main className="mbfp-detail-shell">
        {/* Top Navigation Row */}
        <div className="mbfp-detail-top-nav">
          {onBack ? (
            <button className="mbfp-back-btn" onClick={onBack}>
              <i className="fa-solid fa-arrow-left" />
              <span>Back to Active Incidents</span>
            </button>
          ) : (
            <div />
          )}

          <div className="mbfp-telemetry-badge">
            <span className="mbfp-telemetry-dot" />
            <span>Live Incident Stream · {incident.barangay}, {incident.municipality}</span>
          </div>
        </div>

        {/* Hero Command Banner */}
        <header className="mbfp-incident-hero">
          <div className="mbfp-hero-left">
            <div className="mbfp-hero-meta-row">
              <span className="mbfp-hero-ref-tag">{incident.referenceNumber}</span>
              {isPhoneReport && <span className="mbfp-hero-ref-tag">From Phone Caller</span>}
              <span className="mbfp-hero-firetype-pill">
                <i className="fa-solid fa-fire" />
                <span>{incident.fireType.replaceAll("_", " ")}</span>
              </span>
              {incident.calculatedSeverity && (
                <span className={`mbfp-severity-hero-badge ${incident.calculatedSeverity}`}>
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>{incident.calculatedSeverity} SEVERITY ({incident.severityScore ?? '--'}/100)</span>
                </span>
              )}
            </div>
            <h1 className="mbfp-hero-title">
              <i className="fa-solid fa-tower-broadcast" style={{ color: "#DC2626", fontSize: "1.5rem" }} />
              <span>{fireReportStatusLabels[incident.status] || incident.status}</span>
            </h1>
            <div className="mbfp-hero-time">
              <i className="fa-regular fa-clock" />
              <span>Reported at {new Date(incident.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} on {new Date(incident.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {!isTerminal && <div className="mbfp-hero-actions">
            <button
              className={`mbfp-respond-btn ${isResponding ? "active-responding" : ""}`}
              disabled={sending}
              onClick={() => void openDispatch()}
              aria-label={isResponding ? "View active BFP dispatch status" : "Choose station teams for BFP response"}
            >
              {sending ? (
                <>
                  <i className="fa-solid fa-arrows-rotate spin" />
                  <span>Dispatching Response…</span>
                </>
              ) : isResponding ? (
                <>
                  <i className="fa-solid fa-truck-fast" />
                  <span>VIEW DISPATCH STATUS</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-bell" />
                  <span>ACKNOWLEDGE &amp; RESPOND</span>
                </>
              )}
            </button>
            {canResolve && (
              <button
                className="mbfp-resolve-btn"
                type="button"
                disabled={sending}
                onClick={() => { setDispatchError(""); setResolveOpen(true); }}
              >
                <i className="fa-solid fa-circle-check" />
                <span>RESOLVE INCIDENT</span>
              </button>
            )}
          </div>}
        </header>

        {/* Tactical 2-Column Grid */}
        <div className="mbfp-tactical-grid">
          {/* Left Column: Data & Photos */}
          <div>
            {/* Tactical Severity & Conflagration Assessment Card */}
            <section className="mbfp-card mbfp-tactical-severity-card" aria-labelledby="mbfp-severity-heading">
              <div className="mbfp-card-header">
                <h2 id="mbfp-severity-heading" className="mbfp-card-title">
                  <i className="fa-solid fa-shield-halved" style={{ color: "#DC2626" }} />
                  <span>Tactical Severity &amp; Conflagration Assessment</span>
                </h2>
                <span className={`mbfp-severity-tag ${incident.calculatedSeverity || "MODERATE"}`}>
                  {incident.calculatedSeverity || "MODERATE"} ({incident.severityScore ?? 45}/100)
                </span>
              </div>

              <div className="mbfp-tactical-metrics-grid">
                {/* House Density */}
                <div className={`mbfp-metric-item ${incident.houseDensity === "PACKED_MAGKAKADIKIT" ? "alert-conflagration" : ""}`}>
                  <div className="mbfp-metric-label">
                    <i className="fa-solid fa-people-roof" />
                    <span>House Density (Agwat)</span>
                  </div>
                  <strong className="mbfp-metric-val">
                    {incident.houseDensity === "PACKED_MAGKAKADIKIT"
                      ? "DIKIT-DIKIT (< 2m Conflagration Hazard)"
                      : incident.houseDensity === "ISOLATED_FAR" || incident.houseDensity === "MODERATE_SPACING"
                        ? "Magkakalayo na Bahay (> 15m spacing)"
                        : "Standard Residential"}
                  </strong>
                </div>

                {/* Wind & Weather Telemetry */}
                <div className={`mbfp-metric-item ${(Number(incident.weatherWindSpeed) || 0) >= 25 ? "alert-wind" : ""}`}>
                  <div className="mbfp-metric-label">
                    <i className="fa-solid fa-wind" />
                    <span>Weather at Incident Site ({incident.barangay})</span>
                  </div>
                  <strong className="mbfp-metric-val">
                    {incident.weatherWindSpeed != null
                      ? `${incident.weatherWindSpeed} km/h (${incident.weatherWindCondition || "Normal"}) · ${incident.weatherTemperature ?? 29}°C (${incident.weatherHumidity ?? 70}% RH)`
                      : "12 km/h Moderate Breeze · 29°C"}
                  </strong>
                </div>

                {/* Structure Fuel */}
                <div className="mbfp-metric-item">
                  <div className="mbfp-metric-label">
                    <i className="fa-solid fa-cubes-stacked" />
                    <span>Structure Material</span>
                  </div>
                  <strong className="mbfp-metric-val">
                    {incident.structureMaterial === "LIGHT_MATERIALS"
                      ? "Light Combustible (Kahoy / Bamboo / Nipa)"
                      : incident.structureMaterial === "COMMERCIAL_STORAGE"
                        ? "Commercial / Flammable Storage"
                        : incident.structureMaterial === "MIXED_SEMI_CONCRETE"
                          ? "Semi-Concrete"
                          : incident.structureMaterial === "CONCRETE"
                            ? "Concrete / Semento"
                            : "Residential Standard"}
                  </strong>
                </div>

                {/* Route Accessibility */}
                <div className={`mbfp-metric-item ${incident.routeAccessibility === "INTERIOR_ALLEY_ESKINITA" ? "alert-route" : ""}`}>
                  <div className="mbfp-metric-label">
                    <i className="fa-solid fa-road-barrier" />
                    <span>Road &amp; Alley Access</span>
                  </div>
                  <strong className="mbfp-metric-val">
                    {incident.routeAccessibility === "INTERIOR_ALLEY_ESKINITA"
                      ? "ESKINITA / LOOBAN (Restricted: Prepare Long Hose)"
                      : incident.routeAccessibility === "NARROW_STREET"
                        ? "Makipot na Kalsada (1-Lane)"
                        : incident.routeAccessibility === "WIDE_ROAD"
                          ? "Malapad na Daan (Direct Access)"
                          : "Standard Municipal Access"}
                  </strong>
                </div>
              </div>

              {/* Active Risk Factors */}
              {Array.isArray(incident.severityFactors) && incident.severityFactors.length > 0 && (
                <div className="mbfp-factors-list">
                  <span className="mbfp-factors-title">
                    <i className="fa-solid fa-triangle-exclamation" /> Primary Operational Hazard Factors:
                  </span>
                  <ul>
                    {incident.severityFactors.map((factor, idx) => (
                      <li key={idx}>
                        <i className="fa-solid fa-circle-exclamation" /> {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Caller Profile Card */}
            <section className="mbfp-card" aria-labelledby="mbfp-resident-heading">
              <div className="mbfp-card-header">
                <h2 id="mbfp-resident-heading" className="mbfp-card-title">
                  <i className="fa-solid fa-id-card" />
                  <span>{isPhoneReport ? "Phone caller details" : "Resident emergency profile"}</span>
                </h2>
              </div>

              <div className="mbfp-profile-grid">
                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-regular fa-user" /> {isPhoneReport ? "Caller name" : "Resident Name"}
                  </span>
                  <span className="mbfp-data-value">{incident.residentName || (isPhoneReport ? "Anonymous caller" : "Anonymous Resident")}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-phone" /> {isPhoneReport ? "Caller contact" : "Direct Contact"}
                  </span>
                  <span className="mbfp-data-value">
                    <a href={`tel:${incident.phone}`} className="mbfp-phone-link">
                      <i className="fa-solid fa-phone-volume" />
                      <span>{incident.phone || "No phone provided"}</span>
                    </a>
                  </span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-regular fa-map" /> {isPhoneReport ? "Reported address" : "Registered Address"}
                  </span>
                  <span className="mbfp-data-value">{incident.address || "Not specified"}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-location-dot" /> Reported Location
                  </span>
                  <span className="mbfp-data-value">{incident.barangay}, {incident.municipality}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-signs-post" /> Nearest Landmark
                  </span>
                  <span className="mbfp-data-value">{incident.landmark || "None provided by caller"}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-regular fa-clock" /> Verified Timestamp
                  </span>
                  <span className="mbfp-data-value">{new Date(incident.submittedAt).toLocaleString()}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-crosshairs" /> GPS coordinates
                  </span>
                  <span className="mbfp-data-value">{incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}</span>
                </div>

                {!isPhoneReport && <>
                  <div className="mbfp-data-cell">
                    <span className="mbfp-data-label">
                      <i className="fa-solid fa-network-wired" /> Public IP address
                    </span>
                    <span className="mbfp-data-value">{incident.reporterIpAddress || "Unavailable"}</span>
                  </div>

                  <div className="mbfp-data-cell">
                    <span className="mbfp-data-label">
                      <i className="fa-solid fa-mobile-screen-button" /> Device / browser
                    </span>
                    <span className="mbfp-data-value">{incident.reporterDeviceSummary || "Unavailable"}</span>
                  </div>
                </>}
              </div>
            </section>

            {/* Incident Details / Situation Report */}
            <section className="mbfp-card" aria-labelledby="mbfp-details-heading">
              <div className="mbfp-card-header">
                <h2 id="mbfp-details-heading" className="mbfp-card-title">
                  <i className="fa-solid fa-file-waveform" />
                  <span>Situation Report &amp; Description</span>
                </h2>
              </div>
              <p className="mbfp-desc-box">
                {incident.description || "No written description provided with initial transmission."}
              </p>
            </section>
          </div>

          {/* Right Column: Live Route Map, Evidence Photos, and Status Logs */}
          <div className="mbfp-map-card-wrapper">
            {/* 1. Tactical Route & GIS Map */}
            <section className="mbfp-card" aria-labelledby="mbfp-map-heading">
              <div className="mbfp-card-header">
                <h2 id="mbfp-map-heading" className="mbfp-card-title">
                  <i className="fa-solid fa-map-location-dot" />
                  <span>Tactical Route &amp; GIS Map</span>
                </h2>
              </div>

              <MunicipalIncidentMap incident={incident} />
            </section>

            {/* 2. Photo Evidence Section with Multi-Photo Switcher */}
            {validPhotos.length > 0 && evidencePhoto ? (
              <section className="mbfp-card" aria-labelledby="mbfp-photo-heading">
                <div className="mbfp-card-header">
                  <h2 id="mbfp-photo-heading" className="mbfp-card-title">
                    <i className="fa-solid fa-camera" />
                    <span>Attached Evidence Photo</span>
                  </h2>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B" }}>
                    {validPhotos.length} {validPhotos.length === 1 ? "Photo Attached" : "Photos Attached"}
                  </span>
                </div>

                <div
                  className="mbfp-photo-showcase"
                  onClick={() => setSelectedPhoto(evidencePhoto)}
                  role="button"
                  tabIndex={0}
                  aria-label="Click to enlarge photo evidence"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedPhoto(evidencePhoto);
                  }}
                >
                  <span className="mbfp-photo-click-hint">
                    <i className="fa-solid fa-magnifying-glass-plus" /> Click To Enlarge
                  </span>
                  <img
                    src={evidencePhoto}
                    alt={`Resident fire evidence submission ${activePhotoIdx + 1}`}
                    className="mbfp-photo-img"
                  />
                  <div className="mbfp-photo-overlay-badge">
                    <i className="fa-solid fa-expand" />
                    <span>Inspect High-Res Photo Evidence {validPhotos.length > 1 ? `(${activePhotoIdx + 1}/${validPhotos.length})` : ""}</span>
                  </div>
                </div>

                {validPhotos.length > 1 && (
                  <div className="mbfp-photo-thumbs-strip">
                    {validPhotos.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`mbfp-photo-thumb-btn ${idx === activePhotoIdx ? "is-active" : ""}`}
                        onClick={() => setActivePhotoIdx(idx)}
                        aria-label={`Select photo ${idx + 1}`}
                      >
                        <img src={p.url} alt={`Evidence thumb ${idx + 1}`} />
                        <span>Photo {idx + 1}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="mbfp-card mbfp-no-photo-card" aria-labelledby="mbfp-photo-heading">
                <div className="mbfp-card-header">
                  <h2 id="mbfp-photo-heading" className="mbfp-card-title">
                    <i className="fa-solid fa-camera" />
                    <span>Attached Evidence Photo</span>
                  </h2>
                  <span className="mbfp-no-photo-badge">No Camera Attachment</span>
                </div>
                <div className="mbfp-no-photo-body">
                  <i className="fa-regular fa-image" />
                  <p>
                    {isPhoneReport
                      ? "Phone caller emergency report logged without photo evidence. Dispatch guided by verified location coordinates."
                      : "Resident submitted alert without attached photos. Responder units proceed with visual confirmation on-site."}
                  </p>
                </div>
              </section>
            )}

            {/* 3. Timeline / Response History */}
            <section className="mbfp-card" aria-labelledby="mbfp-history-heading">
              <div className="mbfp-card-header">
                <h2 id="mbfp-history-heading" className="mbfp-card-title">
                  <i className="fa-solid fa-timeline" />
                  <span>Response History &amp; Status Logs</span>
                </h2>
              </div>

              <ol className="mbfp-timeline">
                {incident.history && incident.history.length > 0 ? (
                  incident.history.map((item, index) => (
                    <li key={`${item.createdAt}-${index}`} className="mbfp-timeline-item">
                      <span className="mbfp-timeline-node" />
                      <div className="mbfp-timeline-content">
                        <span className="mbfp-timeline-title">
                          {fireReportStatusLabels[item.status] || item.status}
                        </span>
                        <span className="mbfp-timeline-meta">
                          {new Date(item.createdAt).toLocaleString()} · {item.message || "Status updated in operational queue"}
                        </span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="mbfp-timeline-item">
                    <span className="mbfp-timeline-node" />
                    <div className="mbfp-timeline-content">
                      <span className="mbfp-timeline-title">Report Received</span>
                      <span className="mbfp-timeline-meta">
                        {new Date(incident.submittedAt).toLocaleString()} · Initial emergency report logged
                      </span>
                    </div>
                  </li>
                )}
              </ol>
            </section>
          </div>
        </div>
      </main>

      {mounted && dispatchOpen && createPortal(
        <div
          className="mbfp-dispatch-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !sending) setDispatchOpen(false);
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !sending) setDispatchOpen(false);
          }}
        >
          <section
            className="mbfp-dispatch-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mbfp-dispatch-title"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="mbfp-dispatch-header">
              <div className="mbfp-dispatch-header-title-row">
                <div className="mbfp-dispatch-icon-badge">
                  <i className="fa-solid fa-truck-medical" />
                </div>
                <div>
                  <h2 id="mbfp-dispatch-title" className="mbfp-dispatch-title">
                    <span>Select station teams</span>
                  </h2>
                  <p className="mbfp-dispatch-subtitle">
                    Alert available stations to dispatch responders.
                  </p>
                </div>
              </div>
              <button
                className="mbfp-dispatch-close"
                type="button"
                onClick={() => setDispatchOpen(false)}
                disabled={sending}
                aria-label="Close station selection"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </header>

            <div className="mbfp-dispatch-body">
              {isResponding && (
                <div className="mbfp-dispatch-alert-dispatched">
                  <div className="mbfp-dispatch-dispatched-icon">
                    <i className="fa-solid fa-circle-check" />
                  </div>
                  <div>
                    <strong>Incident Dispatched</strong>
                    <p>Station teams are active on mobile navigation.</p>
                  </div>
                </div>
              )}

              {stationsLoading ? (
                <BfpDataLoader theme="municipal" size="sm" title="Loading available stations" minHeight="190px" />
              ) : (
                <>
                  <button
                    className={`mbfp-dispatch-all ${selectedStationIds.length === dispatchStations.filter((station) => station.activePersonnelCount > 0).length && selectedStationIds.length > 0 ? "is-active" : ""}`}
                    type="button"
                    onClick={selectAllStations}
                    disabled={!dispatchStations.some((station) => station.activePersonnelCount > 0)}
                  >
                    <div className="mbfp-dispatch-all-content">
                      <div className="mbfp-dispatch-all-icon">
                        <i className="fa-solid fa-layer-group" />
                      </div>
                      <div>
                        <strong>Dispatch to all staffed stations</strong>
                        <span>Alert all ready municipal stations</span>
                      </div>
                    </div>
                    <div className="mbfp-custom-checkbox">
                      <i className={`fa-solid ${selectedStationIds.length === dispatchStations.filter((station) => station.activePersonnelCount > 0).length && selectedStationIds.length > 0 ? "fa-square-check" : "fa-square"}`} />
                    </div>
                  </button>

                  <div className="mbfp-dispatch-stations">
                    {dispatchStations.map((station) => {
                      const selected = selectedStationIds.includes(station.id);
                      const staffed = station.activePersonnelCount > 0;
                      return (
                        <button
                          key={station.id}
                          type="button"
                          className={`mbfp-dispatch-station ${selected ? "selected" : ""} ${!staffed ? "is-disabled" : ""}`}
                          onClick={() => toggleStation(station.id)}
                          disabled={!staffed}
                          aria-pressed={selected}
                        >
                          <div className="mbfp-station-card-left">
                            <div className={`mbfp-station-badge-icon ${selected ? "is-selected" : ""}`}>
                              <i className="fa-solid fa-building-shield" />
                            </div>
                            <div className="mbfp-station-info">
                              <span className="mbfp-dispatch-station-name">{station.stationName}</span>
                              <span className="mbfp-dispatch-station-meta">
                                {staffed ? "Ready for live dispatch" : "Unavailable · No personnel on duty"}
                              </span>
                            </div>
                          </div>

                          <div className="mbfp-station-card-right">
                            <span className={`mbfp-dispatch-count ${staffed ? "is-staffed" : "is-empty"}`}>
                              <span className="mbfp-status-dot" />
                              {staffed ? `${station.activePersonnelCount} active` : "No active team"}
                            </span>
                            <div className={`mbfp-station-check-indicator ${selected ? "checked" : ""}`}>
                              <i className={`fa-solid ${selected ? "fa-check" : ""}`} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {!dispatchError && !dispatchStations.length && (
                    <p className="mbfp-dispatch-empty">No active municipal stations are ready to receive this incident.</p>
                  )}
                  {dispatchError && (
                    <p className="mbfp-dispatch-error"><i className="fa-solid fa-circle-exclamation" /> {dispatchError}</p>
                  )}
                </>
              )}
            </div>

            <footer className="mbfp-dispatch-footer">
              <button className="mbfp-dispatch-cancel" type="button" onClick={() => setDispatchOpen(false)} disabled={sending}>
                {isResponding ? "Close" : "Cancel"}
              </button>
              {!isResponding && (
                <button
                  className="mbfp-dispatch-confirm"
                  type="button"
                  onClick={() => void respond()}
                  disabled={sending || stationsLoading || selectedStationIds.length === 0}
                >
                  {sending ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" />
                      <span>Dispatching teams…</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane" />
                      <span>
                        {selectedStationIds.length === 0
                          ? "Select a Station"
                          : `Dispatch ${selectedStationIds.length} Station Team${selectedStationIds.length === 1 ? "" : "s"}`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </footer>
          </section>
        </div>,
        document.body,
      )}

      {mounted && resolveOpen && createPortal(
        <div
          className="mbfp-dispatch-backdrop"
          role="presentation"
          onClick={(event) => { if (event.target === event.currentTarget && !sending) setResolveOpen(false); }}
        >
          <section className="mbfp-dispatch-modal" role="dialog" aria-modal="true" aria-labelledby="mbfp-resolve-title">
            <header className="mbfp-dispatch-header">
              <div className="mbfp-dispatch-header-title-row">
                <div className="mbfp-dispatch-icon-badge"><i className="fa-solid fa-circle-check" /></div>
                <div>
                  <h2 id="mbfp-resolve-title" className="mbfp-dispatch-title">Resolve this incident?</h2>
                  <p className="mbfp-dispatch-subtitle">Municipal Operations closure</p>
                </div>
              </div>
              <button className="mbfp-dispatch-close" type="button" onClick={() => setResolveOpen(false)} disabled={sending} aria-label="Close resolution confirmation">
                <i className="fa-solid fa-xmark" />
              </button>
            </header>
            <div className="mbfp-dispatch-body">
              <div className="mbfp-dispatch-alert-dispatched">
                <div className="mbfp-dispatch-dispatched-icon"><i className="fa-solid fa-building-shield" /></div>
                <div>
                  <strong>Municipal approval required</strong>
                  <p>Confirm that {incident.referenceNumber} is resolved. Active BFP dispatches will be completed and the {isPhoneReport ? "caller record" : "resident"} will be updated.</p>
                </div>
              </div>
              {dispatchError && <p className="mbfp-dispatch-error"><i className="fa-solid fa-circle-exclamation" /> {dispatchError}</p>}
            </div>
            <footer className="mbfp-dispatch-footer">
              <button className="mbfp-dispatch-cancel" type="button" onClick={() => setResolveOpen(false)} disabled={sending}>Cancel</button>
              <button className="mbfp-dispatch-confirm" type="button" onClick={() => void resolveIncident()} disabled={sending}>
                {sending ? <><i className="fa-solid fa-spinner fa-spin" /><span>Resolving incident…</span></> : <><i className="fa-solid fa-circle-check" /><span>Confirm Resolution</span></>}
              </button>
            </footer>
          </section>
        </div>,
        document.body,
      )}

      {/* Full Photo Evidence Lightbox Modal Popup */}
      {mounted && selectedPhoto && createPortal(
        <div
          className="mbfp-lightbox-backdrop"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged photo evidence modal"
        >
          <div className="mbfp-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <header className="mbfp-lightbox-header">
              <h3 className="mbfp-lightbox-title">
                <i className="fa-solid fa-image" style={{ color: "#DC2626" }} />
                <span>Incident Photo Evidence {validPhotos.length > 1 ? `(${activePhotoIdx + 1} of ${validPhotos.length})` : ""} — {incident?.referenceNumber || ""}</span>
              </h3>
              <button
                className="mbfp-lightbox-close-btn"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Close photo modal"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </header>

            <div className="mbfp-lightbox-body" style={{ position: "relative" }}>
              {validPhotos.length > 1 && (
                <button
                  type="button"
                  className="mbfp-lightbox-nav prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIdx = activePhotoIdx > 0 ? activePhotoIdx - 1 : validPhotos.length - 1;
                    setActivePhotoIdx(nextIdx);
                    setSelectedPhoto(validPhotos[nextIdx].url);
                  }}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
              )}
              <img src={selectedPhoto} alt="Enlarged resident fire report evidence" />
              {validPhotos.length > 1 && (
                <button
                  type="button"
                  className="mbfp-lightbox-nav next"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIdx = (activePhotoIdx + 1) % validPhotos.length;
                    setActivePhotoIdx(nextIdx);
                    setSelectedPhoto(validPhotos[nextIdx].url);
                  }}
                  aria-label="Next photo"
                >
                  ›
                </button>
              )}
            </div>

            <footer className="mbfp-lightbox-footer">
              <span>
                <i className="fa-solid fa-camera" style={{ marginRight: "0.4rem" }} />
                Uploaded by resident ({incident?.residentName || "Resident"}) at {incident?.submittedAt ? new Date(incident.submittedAt).toLocaleTimeString() : ""}
              </span>
              <a
                href={selectedPhoto}
                target="_blank"
                rel="noreferrer"
                className="mbfp-lightbox-open-external"
              >
                <span>Open Original in New Tab</span>
                <i className="fa-solid fa-arrow-up-right-from-square" />
              </a>
            </footer>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
