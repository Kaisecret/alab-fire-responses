'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  filterMunicipalityReadiness,
  paginateMunicipalityReadiness,
  summarizeMunicipalityReadiness,
} from '../../lib/provincial-bfp/municipality-overview.mjs';
import { useProvincialIncidentFeed } from './use-provincial-incident-feed';
import { useProvincialAssistanceFeed } from './use-provincial-assistance-feed';

type ManagementSummaryData = {
  totalMunicipalities: number;
  totalStations: number;
  totalPersonnel: number;
  totalResidents: number;
  pendingApplications: number;
  totalReports: number;
  activeIncidents: number;
  resolvedIncidents: number;
};

type MunicipalitySummaryItem = {
  id: string;
  name: string;
  province: string;
  stationCount: number;
  personnelCount: number;
  residentCount: number;
  pendingApplicationCount: number;
  totalReportCount: number;
  activeIncidentCount: number;
  resolvedIncidentCount: number;
};

const dashboardStyles = `
  .pbfp-dash-clean {
    padding: 1.25rem 1.75rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: #EEF5FD;
    min-height: 100%;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  /* ========== 4 PASTEL KPI METRIC CARDS ROW ========== */
  .pbfp-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 0;
  }

  .pbfp-kpi-box {
    position: relative;
    border-radius: 14px;
    padding: 1.1rem 1.2rem 1rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    animation: pbfpCardReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-kpi-box:nth-child(1) { animation-delay: 0.05s; }
  .pbfp-kpi-box:nth-child(2) { animation-delay: 0.1s; }
  .pbfp-kpi-box:nth-child(3) { animation-delay: 0.15s; }
  .pbfp-kpi-box:nth-child(4) { animation-delay: 0.2s; }

  /*
   * The same pastel tiles the municipal console uses for its own counters, so
   * an officer moving between the two reads one vocabulary rather than two.
   * The tint carries the category and the white icon tile lifts off it.
   */
  .pbfp-kpi-box.red {
    background: linear-gradient(145deg, #FFE8E8 0%, #FFD6D6 100%);
    border: 1.5px solid #FFBEBE;
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.06);
  }
  .pbfp-kpi-box.amber {
    background: linear-gradient(145deg, #FFF5DE 0%, #FFE8BA 100%);
    border: 1.5px solid #FFDC99;
    box-shadow: 0 4px 16px rgba(217, 119, 6, 0.06);
  }
  .pbfp-kpi-box.blue {
    background: linear-gradient(145deg, #E6EFFF 0%, #D2E3FD 100%);
    border: 1.5px solid #B8D3FD;
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.06);
  }
  .pbfp-kpi-box.purple {
    background: linear-gradient(145deg, #F0E8FF 0%, #E2D3FD 100%);
    border: 1.5px solid #D0BCFD;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.06);
  }

  .pbfp-kpi-box:hover { transform: translateY(-3px); }
  .pbfp-kpi-box.red:hover {
    border-color: #FFA3A3;
    box-shadow: 0 10px 22px -4px rgba(226, 54, 50, 0.2);
  }
  .pbfp-kpi-box.amber:hover {
    border-color: #FFCF70;
    box-shadow: 0 10px 22px -4px rgba(217, 119, 6, 0.2);
  }
  .pbfp-kpi-box.blue:hover {
    border-color: #91B8FA;
    box-shadow: 0 10px 22px -4px rgba(37, 99, 235, 0.2);
  }
  .pbfp-kpi-box.purple:hover {
    border-color: #B79BFB;
    box-shadow: 0 10px 22px -4px rgba(124, 58, 237, 0.2);
  }

  .pbfp-kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    margin-bottom: 0.45rem;
  }

  .pbfp-kpi-badge-icon {
    width: 2.35rem;
    height: 2.35rem;
    border-radius: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.95);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pbfp-kpi-box:hover .pbfp-kpi-badge-icon {
    transform: scale(1.06);
  }

  .pbfp-kpi-badge-icon.red { color: #E23632; }
  .pbfp-kpi-badge-icon.amber { color: #D97706; }
  .pbfp-kpi-badge-icon.blue { color: #2563EB; }
  .pbfp-kpi-badge-icon.purple { color: #7C3AED; }

  .pbfp-kpi-badge-img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  /* Pure White Trend/Status Pill Badge */
  .pbfp-kpi-trend-tag {
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

  .pbfp-kpi-trend-tag.red { color: #991B1B; background: #FDE8E8; }
  .pbfp-kpi-trend-tag.amber { color: #92400E; background: #FEF3C7; }
  .pbfp-kpi-trend-tag.blue { color: #1E40AF; background: #DBEAFE; }
  .pbfp-kpi-trend-tag.purple { color: #5B21B6; background: #EDE9FE; }

  /* The figure leads and the caption follows it, as on the municipal cards:
     the count is what is being read, the words only say what it counts. The
     order is set here so the markup can keep naming the thing before its
     value. */
  .pbfp-kpi-body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    margin: 0.15rem 0 0.1rem;
  }

  .pbfp-kpi-label {
    order: 2;
    font-size: 0.69rem;
    font-weight: 750;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pbfp-kpi-number {
    order: 1;
    font-size: 1.85rem;
    font-weight: 900;
    color: #0F172A;
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .pbfp-kpi-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.55rem;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    font-size: 0.7rem;
    font-weight: 600;
  }

  .pbfp-kpi-box.red .pbfp-kpi-footer { color: #DC2626; border-top-color: #FED7D7; }
  .pbfp-kpi-box.amber .pbfp-kpi-footer { color: #D97706; border-top-color: #FEEBC8; }
  .pbfp-kpi-box.blue .pbfp-kpi-footer { color: #2563EB; border-top-color: #DCE7FC; }
  .pbfp-kpi-box.purple .pbfp-kpi-footer { color: #7C3AED; border-top-color: #E9D8FD; }

  .pbfp-kpi-footer-subtext {
    font-weight: 600;
    opacity: 0.9;
  }

  .pbfp-kpi-footer i {
    font-size: 0.72rem;
    transition: transform 0.2s ease;
  }

  .pbfp-kpi-box:hover .pbfp-kpi-footer i {
    transform: translateX(3px);
  }

  /* ========== TWO COLUMN SECTION ========== */
  .pbfp-main-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    gap: 10px;
    align-items: stretch;
  }

  /* LEFT CARD: MUNICIPAL READINESS TABLE */
  .pbfp-table-card {
    container-name: readiness-card;
    container-type: inline-size;
    background: #FFFFFF;
    border: 1px solid #DCE4EE;
    border-radius: 18px;
    box-shadow: 0 16px 36px -28px rgba(20, 35, 59, 0.42);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    animation: pbfpCardReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-card-header {
    padding: 1.25rem 1.35rem 1rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
    gap: 1rem 1.5rem;
    border-bottom: 1px solid #E7EDF4;
    background: #FFFFFF;
  }

  .pbfp-card-header-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .pbfp-card-header-icon-badge {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: #14233B;
    border: 1px solid #14233B;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .pbfp-card-header-icon-img {
    width: 23px;
    height: 23px;
    object-fit: contain;
  }

  .pbfp-card-title-group {
    display: flex;
    flex-direction: column;
  }

  .pbfp-card-title {
    font-size: 1.12rem;
    font-weight: 850;
    color: #14233B;
    margin: 0;
    line-height: 1.2;
  }

  .pbfp-card-subtitle {
    font-size: 0.75rem;
    color: #66758C;
    font-weight: 600;
    margin-top: 0.22rem;
  }

  .pbfp-search-field {
    display: grid;
    gap: 0.35rem;
  }

  .pbfp-search-label {
    color: #4E5F76;
    font-size: 0.68rem;
    font-weight: 750;
  }

  .pbfp-search-box {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    background: #F4F7FB;
    border: 1px solid #D7E0EB;
    border-radius: 10px;
    padding: 0.58rem 0.72rem;
    min-height: 40px;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  }

  .pbfp-search-box:focus-within {
    border-color: #E23632;
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.09);
  }

  .pbfp-search-box i {
    color: #94A3B8;
    font-size: 0.8rem;
  }

  .pbfp-search-input {
    border: none;
    outline: none;
    font-size: 0.82rem;
    width: 100%;
    background: transparent;
    color: #0F172A;
    font-weight: 600;
    font-family: inherit;
    appearance: none;
  }

  .pbfp-search-input::placeholder {
    color: #94A3B8;
    font-weight: 500;
  }

  .pbfp-search-input::-webkit-search-cancel-button { appearance: none; }

  .pbfp-search-clear {
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #66758C;
    cursor: pointer;
  }

  .pbfp-search-clear:hover { background: #E7EDF4; color: #14233B; }

  .pbfp-readiness-toolbar {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .pbfp-readiness-filters {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem;
    border-radius: 10px;
    background: #F4F7FB;
  }

  .pbfp-readiness-filter {
    min-height: 32px;
    padding: 0.35rem 0.7rem;
    border: 1px solid transparent;
    border-radius: 7px;
    background: transparent;
    color: #52637A;
    cursor: pointer;
    font: inherit;
    font-size: 0.73rem;
    font-weight: 750;
  }

  .pbfp-readiness-filter strong {
    margin-left: 0.3rem;
    color: inherit;
    font-variant-numeric: tabular-nums;
  }

  .pbfp-readiness-filter:hover { color: #14233B; }
  .pbfp-readiness-filter.active {
    border-color: #D7E0EB;
    background: #FFFFFF;
    color: #14233B;
    box-shadow: 0 2px 7px rgba(20, 35, 59, 0.07);
  }
  .pbfp-readiness-filter.responding.active { color: #B42318; border-color: #F5C2BE; }
  .pbfp-readiness-filter.ready.active { color: #087F5B; border-color: #B9E6D5; }

  .pbfp-readiness-filter:focus-visible,
  .pbfp-search-clear:focus-visible,
  .pbfp-page-btn:focus-visible,
  .pbfp-empty-action:focus-visible,
  .pbfp-muni-link:focus-visible {
    outline: 3px solid rgba(36, 99, 235, 0.28);
    outline-offset: 2px;
  }

  .pbfp-readiness-guidance {
    color: #718096;
    font-size: 0.72rem;
    font-weight: 600;
  }

  /* NO-SCROLL Table styling with auto-fitting columns */
  .pbfp-table-container {
    width: 100%;
    overflow: hidden;
  }

  .pbfp-clean-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    table-layout: fixed;
  }

  .pbfp-clean-table th:first-child { width: 22%; }
  .pbfp-clean-table th:nth-child(2) { width: 23%; }
  .pbfp-clean-table th:nth-child(n + 3),
  .pbfp-clean-table td:nth-child(n + 3) { text-align: right; }

  .pbfp-clean-table th {
    background: #F8FAFC;
    color: #5B6B81;
    font-size: 0.69rem;
    font-weight: 750;
    letter-spacing: 0.01em;
    padding: 0.72rem 1rem;
    text-align: left;
    border-bottom: 1px solid #F1F5F9;
    white-space: nowrap;
  }

  .pbfp-clean-table td {
    padding: 0.82rem 1rem;
    border-bottom: 1px solid #EDF1F6;
    color: #14233B;
    font-weight: 500;
    vertical-align: middle;
    white-space: nowrap;
  }

  .pbfp-clean-table tr:hover td {
    background: #F8FAFC;
  }

  .pbfp-clean-table tbody tr { position: relative; }
  .pbfp-clean-table tbody tr.responding td { background: #FFF9F8; }
  .pbfp-clean-table tbody tr.responding td:first-child { box-shadow: inset 4px 0 0 #D92D20; }
  .pbfp-clean-table tbody tr.responding:hover td { background: #FFF4F2; }

  .pbfp-muni-bold {
    font-weight: 750;
    color: #14233B;
    font-size: 0.85rem;
  }

  .pbfp-muni-link {
    color: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }
  .pbfp-muni-link i { color: #93A1B3; font-size: 0.68rem; transition: transform 150ms ease, color 150ms ease; }
  .pbfp-muni-link:hover i { color: #D92D20; transform: translateX(2px); }

  /* Status Badges */
  .pbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.58rem;
    border-radius: 999px;
    font-size: 0.69rem;
    font-weight: 750;
  }

  .pbfp-status-pill.responding {
    background: #FEECE9;
    color: #B42318;
    border: 1px solid #F8CCC7;
  }

  .pbfp-status-pill.mutual-aid {
    background: #FFFBEB;
    color: #D97706;
    border: 1px solid #FEF3C7;
  }

  .pbfp-status-pill.ready {
    background: #EAF8F2;
    color: #087F5B;
    border: 1px solid #C2EBDD;
  }

  .pbfp-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .pbfp-status-pill.responding .pbfp-status-dot { animation: pbfpStatusPulse 1.8s ease-in-out infinite; }

  .pbfp-incidents-count {
    font-weight: 800;
    color: #E23632;
  }

  .pbfp-metric {
    color: #14233B;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
  }
  .pbfp-metric.muted { color: #9AA7B8; font-weight: 600; }

  .pbfp-incidents-zero {
    color: #94A3B8;
    font-weight: 500;
  }

  /* Table Pagination Footer */
  .pbfp-table-footer {
    padding: 0.9rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #F1F5F9;
    font-size: 0.78rem;
    color: #5B6B81;
    font-weight: 600;
    background: #FFFFFF;
  }

  .pbfp-pagination {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-page-btn {
    min-width: 34px;
    height: 34px;
    padding: 0 0.65rem;
    border: 1px solid #D7E0EB;
    border-radius: 8px;
    background: #FFFFFF;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.73rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s;
  }

  .pbfp-page-btn:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #CBD5E1;
  }

  .pbfp-page-btn.active {
    border-color: #D92D20;
    background: #D92D20;
    color: #FFFFFF;
    font-weight: 800;
  }

  .pbfp-page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .pbfp-empty-action {
    margin-left: 0.5rem;
    border: 0;
    background: transparent;
    color: #B42318;
    cursor: pointer;
    font: inherit;
    font-weight: 750;
  }

  /* RIGHT CARD: ACTIVE INCIDENTS */
  .pbfp-incidents-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
    padding: 1.15rem 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    height: 100%;
    animation: pbfpCardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-incidents-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.2rem;
  }

  .pbfp-incidents-title {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-incidents-title i {
    color: #E23632;
    font-size: 1rem;
  }

  .pbfp-view-all-link {
    font-size: 0.8rem;
    font-weight: 700;
    color: #E23632;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    transition: opacity 0.15s;
  }

  .pbfp-view-all-link:hover {
    opacity: 0.8;
  }

  .pbfp-incidents-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    justify-content: space-between;
  }

  .pbfp-incident-box {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1.05rem 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.45rem;
    flex: 1;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s;
  }

  .pbfp-incident-box:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 26px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.06);
    border-color: #CBD5E1;
  }

  .pbfp-incident-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .pbfp-incident-name {
    font-size: 0.88rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-alarm-pill {
    color: #FFFFFF;
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }

  .pbfp-alarm-pill.red {
    background: #E23632;
  }

  .pbfp-alarm-pill.orange {
    background: #D97706;
  }

  .pbfp-incident-desc {
    font-size: 0.78rem;
    color: #475569;
    font-weight: 500;
    line-height: 1.45;
  }

  .pbfp-incident-bottom-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.73rem;
    color: #64748B;
    padding-top: 0.45rem;
    border-top: 1px solid #F8FAFC;
  }

  .pbfp-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-meta-item i {
    color: #94A3B8;
    font-size: 0.75rem;
  }

  .pbfp-meta-item i.fa-location-dot {
    color: #E23632;
  }

  @media (max-width: 1200px) {
    .pbfp-kpi-row {
      grid-template-columns: repeat(2, 1fr);
    }
    .pbfp-main-grid {
      grid-template-columns: 1fr;
    }
  }

  @container readiness-card (max-width: 760px) {
    .pbfp-card-header { grid-template-columns: 1fr; padding: 1.05rem; }
    .pbfp-search-field { width: 100%; }
    .pbfp-readiness-toolbar { align-items: stretch; flex-direction: column; }
    .pbfp-readiness-filters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .pbfp-readiness-filter { padding-inline: 0.35rem; }
    .pbfp-readiness-guidance { display: none; }
    .pbfp-clean-table thead {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .pbfp-clean-table,
    .pbfp-clean-table tbody { display: block; width: 100%; }
    .pbfp-clean-table tbody tr {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0;
      padding: 1rem;
      border-bottom: 1px solid #E7EDF4;
    }
    .pbfp-clean-table tbody tr.responding { box-shadow: inset 4px 0 0 #D92D20; }
    .pbfp-clean-table tbody tr.responding td:first-child { box-shadow: none; }
    .pbfp-clean-table td {
      display: block;
      padding: 0;
      border: 0;
      white-space: normal;
    }
    .pbfp-clean-table td:first-child { grid-column: 1 / 3; }
    .pbfp-clean-table td:nth-child(2) { grid-column: 3 / 5; justify-self: end; }
    .pbfp-clean-table td:nth-child(n + 3) {
      margin-top: 0.8rem;
      padding-top: 0.7rem;
      border-top: 1px solid #E7EDF4;
      text-align: left;
    }
    .pbfp-clean-table td:nth-child(n + 3)::before {
      content: attr(data-label);
      display: block;
      margin-bottom: 0.2rem;
      color: #7B889A;
      font-size: 0.62rem;
      font-weight: 700;
    }
    .pbfp-clean-table td[colspan] { grid-column: 1 / -1; }
    .pbfp-table-footer { align-items: stretch; flex-direction: column; gap: 0.75rem; }
    .pbfp-pagination { justify-content: space-between; }
    .pbfp-pagination .pbfp-page-number { display: none; }
    .pbfp-page-btn.nav { flex: 1; }
  }

  @media (max-width: 640px) {
    .pbfp-dash-clean {
      padding: 0.9rem;
      gap: 0.9rem;
    }
    .pbfp-kpi-row {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pbfp-table-card,
    .pbfp-kpi-box,
    .pbfp-incidents-card,
    .pbfp-status-pill.responding .pbfp-status-dot { animation: none; }
    .pbfp-muni-link i { transition: none; }
  }

  @keyframes pbfpCardReveal {
    0% {
      opacity: 0;
      transform: translateY(16px) scale(0.97);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes pbfpStatusPulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(180, 35, 24, 0); }
    50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(180, 35, 24, 0.12); }
  }
`;

function FastNumber({ value, duration = 650 }: { value: string | number; duration?: number }) {
  const [display, setDisplay] = useState<string>(() => {
    if (typeof value === 'number') return '0';
    return String(value).replace(/\d+/g, '0');
  });

  useEffect(() => {
    let startTimestamp: number | null = null;
    const strVal = String(value);
    const matches = strVal.match(/\d+/g);
    if (!matches) {
      return;
    }

    const targets = matches.map(Number);
    let frameId: number;

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const progress = Math.min((now - startTimestamp) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      let matchIndex = 0;
      const currentText = strVal.replace(/\d+/g, () => {
        const target = targets[matchIndex];
        const current = Math.round(target * ease);
        matchIndex++;
        return String(current);
      });

      setDisplay(currentText);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplay(strVal);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <span>{String(value).match(/\d+/g) ? display : String(value)}</span>;
}

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ProvincialBfpDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<'ALL' | 'RESPONDING' | 'READY'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [summary, setSummary] = useState<ManagementSummaryData | null>(null);
  const [municipalities, setMunicipalities] = useState<MunicipalitySummaryItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { incidents, loading: incidentFeedLoading } = useProvincialIncidentFeed();
  const { requests: assistanceRequests } = useProvincialAssistanceFeed({ includeClosed: false });

  const activeIncidentCount = incidents.length;
  const [backupCount, setBackupCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/provincial-bfp/backup-requests", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) {
          setBackupCount(Array.isArray(body.backupRequests) ? body.backupRequests.length : 0);
        }
      } catch {
        // Leave the last known count on screen.
      }
    };
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 10_000);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  const openAssistanceCount = assistanceRequests.filter((request) =>
    ['REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(request.status)
  ).length;

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const controller = new AbortController();
    async function fetchDashboardData() {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const [sumRes, munRes] = await Promise.all([
          fetch('/api/provincial-bfp/management-summary', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/provincial-bfp/municipalities?pageSize=100&page=1', { cache: 'no-store', signal: controller.signal }),
        ]);
        if (!active) return;
        if ([sumRes.status, munRes.status].some(status => status === 401 || status === 403)) {
          setSummary(null);
          setMunicipalities([]);
          setUpdatedAt(null);
          throw new Error('Your provincial session has expired. Please sign in again.');
        }
        if (!sumRes.ok || !munRes.ok) throw new Error('Unable to refresh municipality data. Please try again.');
        const [sumData, munData] = await Promise.all([sumRes.json(), munRes.json()]);
        if (active) {
          setSummary(sumData);
          setMunicipalities(munData.items ?? []);
          setUpdatedAt(new Date().toISOString());
          setSummaryError(null);
        }
      } catch (err) {
        if (active && !controller.signal.aborted) setSummaryError(err instanceof Error ? err.message : 'Unable to load municipality data.');
      } finally {
        inFlight = false;
        if (active) setLoadingSummary(false);
      }
    }

    fetchDashboardData();
    const timer = setInterval(fetchDashboardData, 30000);
    document.addEventListener('visibilitychange', fetchDashboardData);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', fetchDashboardData);
    };
  }, [refreshKey]);

  const readinessSummary = summarizeMunicipalityReadiness(municipalities);
  const filteredMunicipalities = filterMunicipalityReadiness(
    municipalities,
    searchQuery,
    readinessFilter,
  ) as MunicipalitySummaryItem[];
  const pagination = paginateMunicipalityReadiness(filteredMunicipalities, currentPage, pageSize);
  const paginatedMunicipalities = pagination.items as MunicipalitySummaryItem[];
  const { visiblePage, totalPages, rangeStart, rangeEnd } = pagination;

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="pbfp-dash-clean">
        {summaryError && <div role="alert" style={{ padding: '12px 16px', border: '1px solid #FECACA', borderRadius: 10, background: '#FFF1F2', color: '#991B1B' }}>
          {summaryError} {updatedAt && 'Showing the last loaded data. '}
          <button type="button" className="pbfp-page-btn" style={{ display: 'inline-flex', width: 'auto', padding: '6px 12px', marginLeft: 8 }} onClick={() => setRefreshKey(key => key + 1)}>Retry</button>
        </div>}
        {/* ===== 4 PASTEL STAT CARDS ROW ===== */}
        <section className="pbfp-kpi-row" aria-label="Provincial KPI Metrics">
          {/* Card 1: Active Incidents */}
          <Link href="/provincial-bfp/incidents" className="pbfp-kpi-box red">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon red">
                <Image
                  src="/images/fire logo.webp"
                  alt="Fire Icon"
                  className="pbfp-kpi-badge-img"
                  width={20}
                  height={20}
                />
              </div>
              <span className="pbfp-kpi-trend-tag red">
                <i className="fa-solid fa-triangle-exclamation" /> Priority
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Active Province Incidents</span>
              <span className="pbfp-kpi-number">
                {incidentFeedLoading ? '—' : <FastNumber value={activeIncidentCount} />}
              </span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">
                {backupCount > 0
                  ? `${backupCount} backup request${backupCount > 1 ? "s" : ""} awaiting an alarm`
                  : `Live Operations · ${openAssistanceCount} aid requests`}
              </span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          {/* Card 2: Municipal Stations */}
          <Link href="/provincial-bfp/firetrucks-stations" className="pbfp-kpi-box amber">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon amber">
                <i className="fa-solid fa-building" />
              </div>
              <span className="pbfp-kpi-trend-tag amber">
                <i className="fa-solid fa-circle-check" /> {summary?.totalMunicipalities ?? '—'} LGUs
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Municipal Fire Stations</span>
              <span className="pbfp-kpi-number">
                {summary ? <FastNumber value={summary.totalStations} /> : '—'}
              </span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Station Directory</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          {/* Card 3: BFP Personnel Roster */}
          <Link href="/provincial-bfp/responders" className="pbfp-kpi-box blue">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon blue">
                <i className="fa-solid fa-user-shield" />
              </div>
              <span className="pbfp-kpi-trend-tag blue">
                <i className="fa-solid fa-shield-halved" /> Officers & Staff
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">BFP Personnel Roster</span>
              <span className="pbfp-kpi-number">
                {summary ? <FastNumber value={summary.totalPersonnel} /> : '—'}
              </span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Personnel Registry</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          {/* Card 4: Resident Applications */}
          <Link href="/provincial-bfp/resident-applications" className="pbfp-kpi-box purple">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon purple">
                <i className="fa-solid fa-id-card" />
              </div>
              <span className="pbfp-kpi-trend-tag purple">
                <i className="fa-solid fa-clock" /> {summary?.pendingApplications ?? '—'} Pending
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Resident Applications</span>
              <span className="pbfp-kpi-number">
                {summary ? <FastNumber value={summary.totalResidents} /> : '—'}
              </span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Verification Queue</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>
        </section>

        {/* ===== TWO-COLUMN MAIN SECTION ===== */}
        <div className="pbfp-main-grid">
          {/* LEFT: Municipal Readiness Table (No Side Scroll + Page Size 8) */}
          <section className="pbfp-table-card">
            <div className="pbfp-card-header">
              <div className="pbfp-card-header-left">
                <div className="pbfp-card-header-icon-badge">
                  <Image
                    src="/images/fire logo.webp"
                    alt="Fire Logo"
                    className="pbfp-card-header-icon-img"
                    width={23}
                    height={23}
                  />
                </div>
                <div className="pbfp-card-title-group">
                  <h2 className="pbfp-card-title">Municipal readiness</h2>
                  <span className="pbfp-card-subtitle">
                    {loadingSummary ? 'Loading the provincial roster…' : 'Province-wide operational status'}
                    {updatedAt && ` — updated ${new Date(updatedAt).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </div>
              </div>
              <div className="pbfp-search-field">
                <label className="pbfp-search-label" htmlFor="pbfp-municipality-search">Find a municipality</label>
                <span className="pbfp-search-box">
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                  <input
                    id="pbfp-municipality-search"
                    type="search"
                    placeholder="Type a municipality name"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pbfp-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="pbfp-search-clear"
                      aria-label="Clear municipality search"
                      onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
              <div className="pbfp-readiness-toolbar">
                <div className="pbfp-readiness-filters" role="group" aria-label="Filter municipal readiness">
                  {([
                    ['ALL', 'All', readinessSummary.total],
                    ['RESPONDING', 'Responding', readinessSummary.responding],
                    ['READY', 'Ready', readinessSummary.ready],
                  ] as const).map(([value, label, count]) => (
                    <button
                      key={value}
                      type="button"
                      className={`pbfp-readiness-filter ${value.toLowerCase()} ${readinessFilter === value ? 'active' : ''}`}
                      aria-pressed={readinessFilter === value}
                      onClick={() => { setReadinessFilter(value); setCurrentPage(1); }}
                    >
                      {label}<strong>{count}</strong>
                    </button>
                  ))}
                </div>
                <span className="pbfp-readiness-guidance">Select a municipality to open its command profile.</span>
              </div>
            </div>

            <div className="pbfp-table-container">
              <table className="pbfp-clean-table">
                <thead>
                  <tr>
                    <th id="municipality-name">Municipality</th>
                    <th id="municipality-status">Operational status</th>
                    <th id="municipality-active">Active</th>
                    <th id="municipality-stations">Stations</th>
                    <th id="municipality-personnel">Personnel</th>
                    <th id="municipality-residents">Residents</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMunicipalities.map((m) => (
                    <tr key={m.id} className={m.activeIncidentCount > 0 ? 'responding' : 'ready'}>
                      <td className="pbfp-muni-bold" headers="municipality-name">
                        <Link
                          href={`/provincial-bfp/municipal-status?municipalityId=${encodeURIComponent(m.id)}`}
                          className="pbfp-muni-link"
                        >
                          <span>{m.name}</span>
                          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        </Link>
                      </td>
                      <td headers="municipality-status">
                        {m.activeIncidentCount > 0 ? (
                          <span className="pbfp-status-pill responding">
                            <span className="pbfp-status-dot" aria-hidden="true" /> Responding
                          </span>
                        ) : (
                          <span className="pbfp-status-pill ready">
                            <span className="pbfp-status-dot" aria-hidden="true" /> Ready
                          </span>
                        )}
                      </td>
                      <td data-label="Active incidents" headers="municipality-active">
                        {m.activeIncidentCount > 0 ? (
                          <span className="pbfp-incidents-count">{m.activeIncidentCount}</span>
                        ) : (
                          <span className="pbfp-metric muted" aria-label="No active incidents">—</span>
                        )}
                      </td>
                      <td data-label="Stations" headers="municipality-stations">
                        <span className={`pbfp-metric ${m.stationCount === 0 ? 'muted' : ''}`} aria-label={m.stationCount === 0 ? 'No station registered' : undefined}>
                          {m.stationCount || '—'}
                        </span>
                      </td>
                      <td data-label="Personnel" headers="municipality-personnel">
                        <span className={`pbfp-metric ${m.personnelCount === 0 ? 'muted' : ''}`} aria-label={m.personnelCount === 0 ? 'No personnel registered' : undefined}>
                          {m.personnelCount || '—'}
                        </span>
                      </td>
                      <td data-label="Residents" headers="municipality-residents">
                        <span className={`pbfp-metric ${m.residentCount === 0 ? 'muted' : ''}`} aria-label={m.residentCount === 0 ? 'No residents registered' : undefined}>{m.residentCount || '—'}</span>
                      </td>
                    </tr>
                  ))}
                  {paginatedMunicipalities.length === 0 && <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: '#64748B' }}>
                    {loadingSummary
                      ? 'Loading municipalities…'
                      : summaryError
                        ? 'Municipality data is unavailable.'
                        : <>
                            No municipalities match this view.
                            <button type="button" className="pbfp-empty-action" onClick={() => { setSearchQuery(''); setReadinessFilter('ALL'); setCurrentPage(1); }}>
                              Clear filters
                            </button>
                          </>}
                  </td></tr>}
                </tbody>
              </table>
            </div>

            {/* Clean Pagination Footer */}
            <div className="pbfp-table-footer">
              <span>
                Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{filteredMunicipalities.length}</strong> municipalities
              </span>
              <div className="pbfp-pagination">
                <button
                  type="button"
                  className="pbfp-page-btn nav"
                  onClick={() => setCurrentPage(Math.max(visiblePage - 1, 1))}
                  disabled={visiblePage === 1}
                  aria-label="Previous page"
                >
                  <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Previous
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`pbfp-page-btn pbfp-page-number ${visiblePage === pageNum ? 'active' : ''}`}
                    aria-current={visiblePage === pageNum ? 'page' : undefined}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="pbfp-page-btn nav"
                  onClick={() => setCurrentPage(Math.min(visiblePage + 1, totalPages))}
                  disabled={visiblePage === totalPages}
                  aria-label="Next page"
                >
                  Next <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT: Active Incidents Card */}
          <section className="pbfp-incidents-card">
            <div className="pbfp-incidents-header">
              <div className="pbfp-incidents-title">
                <i className="fa-solid fa-triangle-exclamation" />
                <span>Active Incidents</span>
              </div>
              <Link href="/provincial-bfp/incidents" prefetch={true} className="pbfp-view-all-link">
                View All &rarr;
              </Link>
            </div>

            <div className="pbfp-incidents-list">
              {incidentFeedLoading && incidents.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.4rem', color: '#DC2626' }} />
                  Loading active incidents...
                </div>
              ) : incidents.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem 1.25rem',
                    textAlign: 'center',
                    color: '#64748B',
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    border: '1px dashed #CBD5E1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    flex: 1,
                  }}
                >
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: '1.8rem', color: '#10B981', marginBottom: '0.25rem' }} />
                  <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.92rem' }}>No Active Incidents</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    All municipal jurisdictions in Antique are currently all-clear.
                  </div>
                </div>
              ) : (
                incidents.slice(0, 3).map((inc) => (
                  <Link
                    key={inc.id}
                    href={`/provincial-bfp/incidents?incident=${encodeURIComponent(inc.id)}`}
                    className="pbfp-incident-box"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="pbfp-incident-header">
                      <span className="pbfp-incident-name">
                        {inc.barangay ? `Brgy. ${inc.barangay}, ` : ''}{inc.originMunicipality}
                      </span>
                      <span
                        className={`pbfp-alarm-pill ${
                          inc.calculatedSeverity === 'ALARM_3' || inc.calculatedSeverity === 'ALARM_2' ? 'red' : 'orange'
                        }`}
                      >
                        {inc.calculatedSeverity ? inc.calculatedSeverity.replace(/_/g, ' ') : inc.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="pbfp-incident-desc">
                      Ref #{inc.referenceNumber} • {inc.fireType}
                      {inc.assignedStationCount > 0 && ` • ${inc.assignedStationCount} responding station${inc.assignedStationCount === 1 ? '' : 's'}`}
                      {inc.observers.length > 0 && ` • ${inc.observers.length} observer${inc.observers.length === 1 ? '' : 's'}`}
                      {inc.openAssistanceCount > 0 && ` • ${inc.openAssistanceCount} mutual aid`}
                    </p>
                    <div className="pbfp-incident-bottom-meta">
                      <span className="pbfp-meta-item">
                        <i className="fa-solid fa-location-dot" /> Origin: {inc.originMunicipality} BFP
                      </span>
                      <span className="pbfp-meta-item">
                        <i className="fa-regular fa-clock" /> {formatTimeAgo(inc.submittedAt)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
