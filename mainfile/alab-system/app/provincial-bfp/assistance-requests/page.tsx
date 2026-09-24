'use client';

import React, { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useProvincialAssistanceFeed } from '../../_components/use-provincial-assistance-feed';
import { BfpDataLoader } from '../../_components/bfp-data-loader';
import { ProvincialAlarmPanel } from '../../_components/provincial-alarm-panel';

const pageStyles = `
  .pbfp-aid-page {
    padding: 12px 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #F8FAFC;
    min-height: 100%;
    color: #0F172A;
  }

  /* Header Hub */
  .pbfp-aid-header-hub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding-bottom: 0.25rem;
  }

  .pbfp-aid-header-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .pbfp-aid-icon-badge {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #DC2626;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 1.15rem;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
    flex-shrink: 0;
  }

  .pbfp-aid-header-title-box h1 {
    font-size: 1.3rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pbfp-live-check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 750;
    color: #065F46;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
  }

  .pbfp-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 6px #10B981;
    animation: pbfp-live-pulse 2s infinite ease-in-out;
  }

  @keyframes pbfp-live-pulse {
    0% { transform: scale(0.9); opacity: 0.8; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.8; }
  }

  .pbfp-aid-header-title-box p {
    font-size: 0.78rem;
    color: #64748B;
    margin: 0.15rem 0 0;
    font-weight: 500;
  }

  .pbfp-aid-header-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-aid-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.48rem 0.9rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #334155;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    transition: all 0.15s ease;
  }

  .pbfp-aid-refresh-btn:hover {
    background: #F8FAFC;
    border-color: #94A3B8;
    color: #0F172A;
  }

  .pbfp-btn-gis {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.48rem 1rem;
    background: #0F172A;
    color: #FFFFFF;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.78rem;
    text-decoration: none;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
    transition: all 0.18s ease;
  }

  .pbfp-btn-gis:hover {
    background: #1E293B;
    transform: translateY(-1px);
  }

  /* ========== 4 PASTEL KPI METRIC CARDS (DASHBOARD STYLE - COMPACT) ========== */
  .pbfp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  @media (max-width: 1024px) {
    .pbfp-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .pbfp-kpi-grid { grid-template-columns: 1fr; }
  }

  .pbfp-kpi-box {
    position: relative;
    border-radius: 11px;
    padding: 0.72rem 0.95rem 0.62rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    min-height: 98px;
  }
  .pbfp-kpi-box.blue {
    background: linear-gradient(145deg, #E6EFFF 0%, #D2E3FD 100%);
    border: 1.5px solid #B8D3FD;
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.06);
  }
  .pbfp-kpi-box.amber {
    background: linear-gradient(145deg, #FFF5DE 0%, #FFE8BA 100%);
    border: 1.5px solid #FFDC99;
    box-shadow: 0 4px 16px rgba(217, 119, 6, 0.06);
  }
  .pbfp-kpi-box.emerald {
    background: linear-gradient(145deg, #E6FBF0 0%, #D1F7E2 100%);
    border: 1.5px solid #A7F3D0;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.06);
  }
  .pbfp-kpi-box.purple {
    background: linear-gradient(145deg, #F0E8FF 0%, #E2D3FD 100%);
    border: 1.5px solid #D0BCFD;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.06);
  }

  .pbfp-kpi-box:hover { transform: translateY(-2.5px); }
  .pbfp-kpi-box.blue:hover { border-color: #91B8FA; box-shadow: 0 10px 22px -4px rgba(37, 99, 235, 0.2); }
  .pbfp-kpi-box.amber:hover { border-color: #FFCF70; box-shadow: 0 10px 22px -4px rgba(217, 119, 6, 0.2); }
  .pbfp-kpi-box.emerald:hover { border-color: #6EE7B7; box-shadow: 0 10px 22px -4px rgba(16, 185, 129, 0.2); }
  .pbfp-kpi-box.purple:hover { border-color: #B79BFB; box-shadow: 0 10px 22px -4px rgba(124, 58, 237, 0.2); }

  .pbfp-kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    margin-bottom: 0.25rem;
  }
  .pbfp-kpi-badge-icon {
    width: 1.95rem;
    height: 1.95rem;
    border-radius: 8px;
    background: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.95);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.88rem;
    flex-shrink: 0;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pbfp-kpi-box:hover .pbfp-kpi-badge-icon { transform: scale(1.06); }
  .pbfp-kpi-badge-icon.blue { color: #2563EB; }
  .pbfp-kpi-badge-icon.amber { color: #D97706; }
  .pbfp-kpi-badge-icon.emerald { color: #059669; }
  .pbfp-kpi-badge-icon.purple { color: #7C3AED; }

  .pbfp-kpi-trend-tag {
    font-size: 0.58rem;
    font-weight: 800;
    padding: 0.14rem 0.42rem;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    gap: 0.22rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .pbfp-kpi-trend-tag.blue { color: #1E40AF; background: #DBEAFE; }
  .pbfp-kpi-trend-tag.amber { color: #92400E; background: #FEF3C7; }
  .pbfp-kpi-trend-tag.emerald { color: #065F46; background: #D1FAE5; }
  .pbfp-kpi-trend-tag.purple { color: #5B21B6; background: #EDE9FE; }

  .pbfp-kpi-body {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
    margin: 0.08rem 0;
  }
  .pbfp-kpi-label {
    order: 2;
    font-size: 0.63rem;
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
    font-size: 1.45rem;
    font-weight: 850;
    color: #0F172A;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .pbfp-kpi-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.35rem;
    padding-top: 0.32rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    font-size: 0.65rem;
    font-weight: 600;
  }
  .pbfp-kpi-box.blue .pbfp-kpi-footer { color: #2563EB; border-top-color: #DCE7FC; }
  .pbfp-kpi-box.amber .pbfp-kpi-footer { color: #D97706; border-top-color: #FEEBC8; }
  .pbfp-kpi-box.emerald .pbfp-kpi-footer { color: #059669; border-top-color: #A7F3D0; }
  .pbfp-kpi-box.purple .pbfp-kpi-footer { color: #7C3AED; border-top-color: #E9D8FD; }

  .pbfp-kpi-footer-subtext {
    font-weight: 600;
    opacity: 0.9;
  }
  .pbfp-kpi-footer i {
    font-size: 0.64rem;
    transition: transform 0.2s ease;
  }
  .pbfp-kpi-box:hover .pbfp-kpi-footer i {
    transform: translateX(3px);
  }


  /* Escalation Section */
  .pbfp-escalation-section {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .pbfp-escalation-head {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-escalation-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 8px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    font-size: 0.85rem;
  }

  .pbfp-escalation-head h2 {
    margin: 0;
    font-size: 0.98rem;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.01em;
  }

  .pbfp-escalation-head p {
    margin: 2px 0 0;
    font-size: 0.76rem;
    color: #64748B;
    font-weight: 500;
  }

  /* Unified Coordination Panel */
  .pbfp-aid-panel {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .pbfp-aid-toolbar {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    flex-wrap: wrap;
    background: #FAFCFE;
  }

  .pbfp-tab-pills {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .pbfp-tab-pill {
    padding: 0.38rem 0.8rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 700;
    background: #F1F5F9;
    color: #475569;
    border: 1px solid #E2E8F0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    transition: all 0.15s ease;
  }

  .pbfp-tab-pill:hover {
    color: #0F172A;
    border-color: #CBD5E1;
  }

  .pbfp-tab-pill.active {
    background: #DC2626;
    color: #FFFFFF;
    border-color: #DC2626;
    box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);
  }

  .pbfp-tab-count {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.08);
    font-size: 0.68rem;
    font-weight: 800;
  }

  .pbfp-tab-pill.active .pbfp-tab-count {
    background: rgba(255, 255, 255, 0.25);
    color: #FFFFFF;
  }

  .pbfp-toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-search-box {
    position: relative;
    width: 250px;
    max-width: 100%;
  }

  .pbfp-search-box i {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94A3B8;
    font-size: 0.8rem;
  }

  .pbfp-search-input {
    width: 100%;
    padding: 0.45rem 0.85rem 0.45rem 2.1rem;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.78rem;
    font-family: inherit;
    outline: none;
    background: #FFFFFF;
    color: #0F172A;
    box-sizing: border-box;
    transition: all 0.15s ease;
  }

  .pbfp-search-input:focus {
    border-color: #DC2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
  }

  .pbfp-view-toggle {
    display: flex;
    align-items: center;
    background: #F1F5F9;
    border-radius: 8px;
    padding: 2px;
    border: 1px solid #E2E8F0;
  }

  .pbfp-view-btn {
    padding: 0.4rem 0.65rem;
    border: none;
    background: transparent;
    color: #64748B;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.76rem;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pbfp-view-btn.active {
    background: #FFFFFF;
    color: #0F172A;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    font-weight: 700;
  }

  /* Table View */
  .pbfp-aid-table-wrap {
    overflow-x: auto;
  }

  .pbfp-aid-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    text-align: left;
  }

  .pbfp-aid-table th {
    padding: 0.85rem 1.15rem;
    background: #F8FAFC;
    color: #475569;
    font-weight: 800;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #E2E8F0;
    white-space: nowrap;
  }

  .pbfp-aid-table td {
    padding: 0.95rem 1.15rem;
    border-bottom: 1px solid #F1F5F9;
    vertical-align: middle;
  }

  .pbfp-aid-table tr {
    transition: background 0.14s ease;
  }

  .pbfp-aid-table tr:hover td {
    background: #F8FAFC;
  }

  .pbfp-aid-table tr.highlighted td {
    background: #EFF6FF;
  }

  .pbfp-ref-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 800;
    color: #0F172A;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-flow-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8rem;
    font-weight: 750;
    color: #0F172A;
  }

  .pbfp-muni-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 750;
  }

  .pbfp-muni-pill.requester {
    background: #FEF2F2;
    color: #991B1B;
    border: 1px solid #FECACA;
  }

  .pbfp-muni-pill.recipient {
    background: #EFF6FF;
    color: #1E40AF;
    border: 1px solid #BFDBFE;
  }

  .pbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    white-space: nowrap;
    text-transform: uppercase;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .pbfp-status-pill.requested { background: rgba(255, 247, 237, 0.9); color: #C2410C; border: 1px solid rgba(254, 215, 170, 0.9); }
  .pbfp-status-pill.accepted { background: rgba(236, 253, 245, 0.9); color: #065F46; border: 1px solid rgba(167, 243, 207, 0.9); }
  .pbfp-status-pill.partially_accepted { background: rgba(239, 246, 255, 0.9); color: #1E40AF; border: 1px solid rgba(191, 219, 254, 0.9); }
  .pbfp-status-pill.rejected { background: rgba(254, 242, 242, 0.9); color: #991B1B; border: 1px solid rgba(254, 202, 202, 0.9); }
  .pbfp-status-pill.cancelled { background: rgba(241, 245, 249, 0.9); color: #475569; border: 1px solid rgba(203, 213, 225, 0.9); }
  .pbfp-status-pill.completed { background: rgba(243, 244, 246, 0.9); color: #374151; border: 1px solid rgba(209, 213, 219, 0.9); }

  .pbfp-btn-inspect {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.32rem 0.65rem;
    background: rgba(241, 245, 249, 0.85);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(203, 213, 225, 0.9);
    border-radius: 6px;
    color: #334155;
    font-size: 0.72rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pbfp-btn-inspect:hover {
    background: #0F172A;
    color: #FFFFFF;
    border-color: #0F172A;
  }

  /* Compact Cards Grid View */
  .pbfp-aid-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 0.75rem;
    padding: 0.85rem;
  }

  .pbfp-aid-grid-card {
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 14px;
    padding: 0.85rem 1.05rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.65rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.95);
    transition: all 0.16s ease;
  }

  .pbfp-aid-grid-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 1);
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  }

  .pbfp-aid-grid-card.highlighted {
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  /* Res items */
  .pbfp-res-items {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .pbfp-res-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.18rem 0.45rem;
    border-radius: 5px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    font-size: 0.72rem;
    font-weight: 700;
    color: #334155;
  }

  /* Empty State */
  .pbfp-aid-empty {
    padding: 3rem 1.5rem;
    text-align: center;
    color: #64748B;
  }

  .pbfp-aid-empty-icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #F1F5F9;
    color: #94A3B8;
    font-size: 1.25rem;
    margin: 0 auto 0.75rem;
  }

  .pbfp-aid-empty h3 {
    font-size: 0.98rem;
    font-weight: 800;
    color: #1E293B;
    margin: 0 0 0.3rem;
  }

  .pbfp-aid-empty p {
    font-size: 0.8rem;
    margin: 0;
    max-width: 460px;
    margin: 0 auto;
  }

  /* Table Footer */
  .pbfp-table-footer {
    padding: 0.75rem 1.15rem;
    background: #FAFCFE;
    border-top: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #64748B;
    font-weight: 600;
  }

  /* Inspection Modal */
  .pbfp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 1.25rem;
  }

  .pbfp-modal-panel {
    background: #FFFFFF;
    border-radius: 16px;
    width: 100%;
    max-width: 620px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.3);
    border: 1px solid #E2E8F0;
    display: flex;
    flex-direction: column;
  }

  .pbfp-modal-header {
    padding: 1.1rem 1.4rem;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background: #FAFCFE;
  }

  .pbfp-modal-title {
    font-size: 1.05rem;
    font-weight: 850;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pbfp-modal-body {
    padding: 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-size: 0.82rem;
  }

  .pbfp-modal-section {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .pbfp-modal-sec-title {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748B;
  }

  .pbfp-modal-footer {
    padding: 0.95rem 1.4rem;
    border-top: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.65rem;
    background: #FAFCFE;
  }

  .pbfp-btn-close {
    padding: 0.45rem 0.95rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #334155;
    cursor: pointer;
  }
  .pbfp-btn-close:hover {
    background: #F1F5F9;
    color: #0F172A;
  }

  .pbfp-btn-link-incident {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    background: #DC2626;
    color: #FFFFFF;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 750;
    text-decoration: none;
    transition: background 0.15s ease;
  }
  .pbfp-btn-link-incident:hover {
    background: #B91C1C;
  }
`;

function AssistanceRequestsContent() {
  const {
    requests,
    isRefreshing,
    lastUpdated,
    refresh,
  } = useProvincialAssistanceFeed();

  // Metrics computation
  const metrics = useMemo(() => {
    const total = requests.length;
    const requested = requests.filter((r) => r.status === 'REQUESTED').length;
    const coordinated = requests.filter((r) =>
      r.status === 'ACCEPTED' || r.status === 'PARTIALLY_ACCEPTED'
    ).length;
    const completed = requests.filter((r) =>
      r.status === 'COMPLETED' || r.status === 'REJECTED' || r.status === 'CANCELLED'
    ).length;

    return { total, requested, coordinated, completed };
  }, [requests]);

  return (
    <>
      <style>{pageStyles}</style>
      <div className="pbfp-aid-page">
        {/* Header Hub */}
        <div className="pbfp-aid-header-hub">
          <div className="pbfp-aid-header-left">
            <div className="pbfp-aid-icon-badge">
              <i className="fa-solid fa-handshake-angle" />
            </div>
            <div className="pbfp-aid-header-title-box">
              <h1>
                Inter-Municipality Mutual Aid Coordination
                <span className="pbfp-live-check">
                  <span className="pbfp-live-dot" />
                  Live (5s)
                </span>
              </h1>
            </div>
          </div>

          <div className="pbfp-aid-header-actions">
            {lastUpdated && (
              <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              className="pbfp-aid-refresh-btn"
              onClick={() => void refresh(true)}
              disabled={isRefreshing}
              title="Refresh requests feed"
            >
              <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? 'fa-spin' : ''}`} />
              Refresh
            </button>
            <Link href="/provincial-bfp/gis-map" className="pbfp-btn-gis" title="View Antique GIS Map">
              <i className="fa-solid fa-map-location-dot" />
              GIS Map
            </Link>
          </div>
        </div>

        {/* 4 Tactical KPI Cards (Dashboard Style) */}
        <div className="pbfp-kpi-grid">
          {/* Card 1: Blue */}
          <div className="pbfp-kpi-box blue">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon blue">
                <i className="fa-solid fa-layer-group" />
              </div>
              <span className="pbfp-kpi-trend-tag blue">
                <i className="fa-solid fa-tower-broadcast" /> Total Feed
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Total Calls In Feed</span>
              <span className="pbfp-kpi-number">{metrics.total}</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Cross-jurisdiction logs</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </div>

          {/* Card 2: Amber */}
          <div className="pbfp-kpi-box amber">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon amber">
                <i className="fa-solid fa-hourglass-half" />
              </div>
              <span className="pbfp-kpi-trend-tag amber">
                <i className="fa-solid fa-clock" /> Pending
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Awaiting Response</span>
              <span className="pbfp-kpi-number">{metrics.requested}</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Station decisions pending</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </div>

          {/* Card 3: Emerald */}
          <div className="pbfp-kpi-box emerald">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon emerald">
                <i className="fa-solid fa-truck-fast" />
              </div>
              <span className="pbfp-kpi-trend-tag emerald">
                <i className="fa-solid fa-truck-moving" /> Active
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Units Dispatched</span>
              <span className="pbfp-kpi-number">{metrics.coordinated}</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Active apparatus en route</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </div>

          {/* Card 4: Purple */}
          <div className="pbfp-kpi-box purple">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon purple">
                <i className="fa-solid fa-circle-check" />
              </div>
              <span className="pbfp-kpi-trend-tag purple">
                <i className="fa-solid fa-check-double" /> Closed
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Concluded / Returned</span>
              <span className="pbfp-kpi-number">{metrics.completed}</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Demobilized & closed</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </div>
        </div>



        {/*
          Escalations the province has to answer, above the feed of what has
          already been asked. It carries its own heading: mounting it bare and
          ahead of the page title meant the title was pushed off the screen the
          moment a request arrived.
        */}
        <section className="pbfp-escalation-section" aria-labelledby="pbfp-escalation-heading">
          <div className="pbfp-escalation-head">
            <div className="pbfp-escalation-icon" aria-hidden="true">
              <i className="fa-solid fa-tower-broadcast" />
            </div>
            <div>
              <h2 id="pbfp-escalation-heading">Escalated to the province</h2>
            </div>
          </div>
          <ProvincialAlarmPanel />
        </section>
      </div>
    </>
  );
}

export default function AssistanceRequestsPage() {
  return (
    <Suspense fallback={<BfpDataLoader theme="provincial" title="Loading assistance requests..." />}>
      <AssistanceRequestsContent />
    </Suspense>
  );
}
