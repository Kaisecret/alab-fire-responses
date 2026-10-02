'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ProvincialManagementToolbar } from './provincial-management-toolbar';
import { useManagementMutation } from './use-management-mutation';
import { useProvincialManagementList } from './use-provincial-management-list';
import { useManagementDialog } from './use-management-dialog';
import type { ManagedStation } from '../../lib/provincial-bfp/management/types';

const pageStyles = `
  .psd-container {
    padding: 0.5rem 0 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1E293B;
  }

  /* ========== HEADER CARD ========== */
  .psd-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.25rem;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1.25rem 1.6rem;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
  }

  .psd-header-title-area {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .psd-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .psd-kicker-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: #FEF2F2;
    color: #DB1B0D;
    border: 1px solid #FEE2E2;
    padding: 0.22rem 0.65rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .psd-kicker-emblem {
    width: 16px;
    height: 16px;
    object-fit: contain;
  }

  .psd-kicker-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #CBD5E1;
  }

  .psd-kicker-text {
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748B;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .psd-title {
    font-size: 1.55rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.025em;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .psd-title-icon {
    color: #DB1B0D;
    font-size: 1.35rem;
  }

  .psd-subtitle {
    font-size: 0.85rem;
    color: #64748B;
    margin: 0;
    line-height: 1.45;
  }

  .psd-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .psd-actions .no-print {
    display: inline-flex !important;
  }

  .psd-actions .no-print button {
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.45rem !important;
    padding: 0.62rem 1.15rem !important;
    border-radius: 9px !important;
    border: 1px solid #D7E3F1 !important;
    background: #FFFFFF !important;
    color: #334155 !important;
    font-size: 0.84rem !important;
    font-weight: 750 !important;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04) !important;
    cursor: pointer !important;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
    font-family: inherit !important;
    white-space: nowrap !important;
  }

  .psd-actions .no-print button:hover:not(:disabled) {
    background: #F8FAFC !important;
    border-color: #94A3B8 !important;
    color: #0F172A !important;
    transform: translateY(-1px);
  }

  .psd-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.62rem 1.15rem;
    border-radius: 9px;
    font-size: 0.84rem;
    font-weight: 750;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid transparent;
    font-family: inherit;
    white-space: nowrap;
  }

  .psd-btn-refresh {
    background: #FFFFFF;
    border-color: #D7E3F1;
    color: #475569;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }

  .psd-btn-refresh:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #94A3B8;
    transform: translateY(-1px);
  }

  .psd-btn-primary {
    background: linear-gradient(180deg, #E52E20 0%, #DB1B0D 100%);
    color: #FFFFFF;
    box-shadow: 0 4px 14px rgba(219, 27, 13, 0.28);
  }

  .psd-btn-primary:hover:not(:disabled) {
    background: linear-gradient(180deg, #DB1B0D 0%, #C2160A 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(219, 27, 13, 0.38);
  }

  .psd-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .psd-btn:focus-visible {
    outline: 3px solid #DB1B0D;
    outline-offset: 2px;
  }

  /* ========== KPI STATS BAR (Pastel Gradient System) ========== */
  .psd-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.85rem;
  }
  @media (max-width: 1024px) {
    .psd-stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .psd-stats-grid { grid-template-columns: 1fr; }
  }

  .psd-stat-card {
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
  .psd-stat-card.blue {
    background: linear-gradient(145deg, #E6EFFF 0%, #D2E3FD 100%);
    border: 1.5px solid #B8D3FD;
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.06);
  }
  .psd-stat-card.emerald {
    background: linear-gradient(145deg, #E6FBF0 0%, #D1F7E2 100%);
    border: 1.5px solid #A7F3D0;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.06);
  }
  .psd-stat-card.purple {
    background: linear-gradient(145deg, #F0E8FF 0%, #E2D3FD 100%);
    border: 1.5px solid #D0BCFD;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.06);
  }
  .psd-stat-card.red {
    background: linear-gradient(145deg, #FFF1F1 0%, #FEE2E2 100%);
    border: 1.5px solid #FECACA;
    box-shadow: 0 4px 16px rgba(220, 38, 38, 0.06);
  }

  .psd-stat-card:hover { transform: translateY(-2.5px); }
  .psd-stat-card.blue:hover { border-color: #91B8FA; box-shadow: 0 10px 22px -4px rgba(37, 99, 235, 0.2); }
  .psd-stat-card.emerald:hover { border-color: #6EE7B7; box-shadow: 0 10px 22px -4px rgba(16, 185, 129, 0.2); }
  .psd-stat-card.purple:hover { border-color: #B79BFB; box-shadow: 0 10px 22px -4px rgba(124, 58, 237, 0.2); }
  .psd-stat-card.red:hover { border-color: #F87171; box-shadow: 0 10px 22px -4px rgba(220, 38, 38, 0.2); }

  .psd-stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    margin-bottom: 0.25rem;
  }
  .psd-stat-badge-icon {
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
  .psd-stat-card:hover .psd-stat-badge-icon { transform: scale(1.06); }
  .psd-stat-card.blue .psd-stat-badge-icon { color: #2563EB; }
  .psd-stat-card.emerald .psd-stat-badge-icon { color: #059669; }
  .psd-stat-card.purple .psd-stat-badge-icon { color: #7C3AED; }
  .psd-stat-card.red .psd-stat-badge-icon { color: #DC2626; }

  .psd-stat-trend-tag {
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
  .psd-stat-trend-tag.blue { color: #1E40AF; background: #DBEAFE; }
  .psd-stat-trend-tag.emerald { color: #065F46; background: #D1FAE5; }
  .psd-stat-trend-tag.purple { color: #5B21B6; background: #EDE9FE; }
  .psd-stat-trend-tag.red { color: #991B1B; background: #FEE2E2; }

  .psd-stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
    margin: 0.08rem 0;
  }
  .psd-stat-label {
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
  .psd-stat-value {
    order: 1;
    font-size: 1.45rem;
    font-weight: 850;
    color: #0F172A;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .psd-stat-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.35rem;
    padding-top: 0.32rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    font-size: 0.65rem;
    font-weight: 600;
  }
  .psd-stat-card.blue .psd-stat-footer { color: #2563EB; border-top-color: #DCE7FC; }
  .psd-stat-card.emerald .psd-stat-footer { color: #059669; border-top-color: #A7F3D0; }
  .psd-stat-card.purple .psd-stat-footer { color: #7C3AED; border-top-color: #E9D8FD; }
  .psd-stat-card.red .psd-stat-footer { color: #DC2626; border-top-color: #FED7D7; }

  .psd-stat-subtext {
    font-weight: 600;
    opacity: 0.9;
  }
  .psd-stat-footer i {
    font-size: 0.64rem;
    transition: transform 0.2s ease;
  }
  .psd-stat-card:hover .psd-stat-footer i {
    transform: translateX(3px);
  }

  /* ========== TOOLBAR BOX ========== */
  .psd-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
  }

  .psd-toolbar {
    padding: 0.95rem 1.4rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: #FAFAFA;
    border-bottom: 1px solid #E2E8F0;
    flex-wrap: wrap;
  }

  .psd-filters-left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .psd-select {
    padding: 0.48rem 0.9rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    font-size: 0.82rem;
    font-weight: 650;
    color: #0F172A;
    background: #FFFFFF;
    outline: none;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .psd-select:hover {
    border-color: #94A3B8;
  }

  .psd-select:focus {
    border-color: #DB1B0D;
    outline: 2px solid rgba(219, 27, 13, 0.15);
  }

  .psd-filter-group {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: #F1F5F9;
    padding: 0.25rem;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
  }

  .psd-filter-btn {
    border: none;
    background: transparent;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.76rem;
    font-weight: 750;
    color: #64748B;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .psd-filter-btn.active {
    background: #FFFFFF;
    color: #0F172A;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
  }

  .psd-btn-clear {
    background: transparent;
    border: none;
    color: #DB1B0D;
    font-size: 0.78rem;
    font-weight: 750;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    transition: background 0.15s ease;
    font-family: inherit;
  }

  .psd-btn-clear:hover {
    background: #FEF2F2;
  }

  .psd-search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: min(100%, 280px);
  }

  .psd-search-icon {
    position: absolute;
    left: 0.8rem;
    color: #94A3B8;
    font-size: 0.82rem;
    pointer-events: none;
  }

  .psd-search-input {
    width: 100%;
    padding: 0.48rem 2.1rem 0.48rem 2.2rem;
    border-radius: 999px;
    border: 1px solid #CBD5E1;
    font-size: 0.82rem;
    font-weight: 600;
    background: #FFFFFF;
    color: #0F172A;
    outline: none;
    font-family: inherit;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    transition: all 0.15s ease;
  }

  .psd-search-input:focus {
    border-color: #DB1B0D;
    box-shadow: 0 0 0 3px rgba(219, 27, 13, 0.1);
  }

  .psd-search-clear {
    position: absolute;
    right: 0.65rem;
    background: transparent;
    border: none;
    color: #94A3B8;
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .psd-search-clear:hover {
    color: #0F172A;
  }

  /* ========== ERROR ALERT ========== */
  .psd-alert {
    background: #FEF2F2;
    border: 1px solid #FEE2E2;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    color: #DB1B0D;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.84rem;
    font-weight: 600;
  }

  .psd-alert-btn {
    background: #DB1B0D;
    color: #FFFFFF;
    border: none;
    border-radius: 7px;
    padding: 0.35rem 0.8rem;
    cursor: pointer;
    font-weight: 750;
    font-size: 0.78rem;
    font-family: inherit;
    transition: background 0.15s ease;
  }

  .psd-alert-btn:hover {
    background: #B91C1C;
  }

  /* ========== TABLE ARCHITECTURE ========== */
  .psd-table-wrap {
    overflow-x: auto;
    width: 100%;
  }

  .psd-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.84rem;
  }

  .psd-table th {
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    color: #475569;
    font-weight: 800;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.95rem 1.25rem;
    white-space: nowrap;
  }

  .psd-table td {
    padding: 0.95rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    vertical-align: middle;
  }

  .psd-table tr:last-child td {
    border-bottom: none;
  }

  .psd-table tr:hover td {
    background: #F8FAFC;
  }

  /* Station name cell */
  .psd-station-cell {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .psd-station-avatar {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
    border: 1px solid #FECACA;
    color: #DB1B0D;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .psd-station-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .psd-station-name {
    font-weight: 800;
    color: #0F172A;
    font-size: 0.88rem;
    letter-spacing: -0.01em;
  }

  .psd-station-sub {
    font-size: 0.72rem;
    color: #64748B;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 550;
  }

  /* Municipality cell */
  .psd-muni-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 700;
    color: #334155;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }

  .psd-muni-pill i {
    color: #DB1B0D;
    font-size: 0.75rem;
  }

  /* Coordinates cell */
  .psd-coord-cell {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.78rem;
    color: #475569;
    background: #F1F5F9;
    padding: 0.25rem 0.55rem;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
  }

  .psd-coord-cell i {
    color: #64748B;
    font-size: 0.75rem;
  }

  /* Personnel link */
  .psd-personnel-link {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: #1D4ED8;
    background: #EFF6FF;
    border: 1px solid #DBEAFE;
    padding: 0.28rem 0.65rem;
    border-radius: 7px;
    font-size: 0.78rem;
    font-weight: 750;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .psd-personnel-link:hover {
    background: #DBEAFE;
    color: #1E40AF;
    transform: translateY(-1px);
  }

  .psd-link-icon {
    font-size: 0.65rem;
    opacity: 0.7;
  }

  /* Status badge */
  .psd-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.24rem 0.65rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .psd-status-badge.active {
    background: #ECFDF5;
    color: #059669;
    border: 1px solid #A7F3D0;
  }

  .psd-status-badge.inactive {
    background: #F1F5F9;
    color: #64748B;
    border: 1px solid #E2E8F0;
  }

  .psd-pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #059669;
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.2);
  }

  .psd-neutral-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94A3B8;
  }

  /* Actions buttons */
  .psd-actions-cell {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .psd-btn-action {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.65rem;
    border-radius: 7px;
    font-size: 0.76rem;
    font-weight: 750;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .psd-btn-action.edit {
    background: #FFFFFF;
    border-color: #CBD5E1;
    color: #334155;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .psd-btn-action.edit:hover {
    background: #F1F5F9;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .psd-btn-action.deactivate {
    background: #FEF2F2;
    border-color: #FEE2E2;
    color: #DC2626;
  }

  .psd-btn-action.deactivate:hover {
    background: #FEE2E2;
    color: #B91C1C;
  }

  .psd-btn-action.reactivate {
    background: #ECFDF5;
    border-color: #D1FAE5;
    color: #059669;
  }

  .psd-btn-action.reactivate:hover {
    background: #D1FAE5;
    color: #047857;
  }

  /* ========== PAGINATION FOOTER ========== */
  .psd-pagination {
    padding: 0.95rem 1.4rem;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: #64748B;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .psd-page-controls {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .psd-page-btn {
    padding: 0.38rem 0.8rem;
    border-radius: 7px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #334155;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .psd-page-btn:hover:not(:disabled) {
    background: #F1F5F9;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .psd-page-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    background: #F8FAFC;
  }

  /* ========== MODALS (HIGH-END PROVINCIAL ARCHITECTURE) ========== */
  .psd-dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 1.25rem;
    box-sizing: border-box;
    animation: psdFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes psdFadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .psd-dialog {
    background: #FFFFFF;
    border-radius: 18px;
    max-width: 520px;
    width: 100%;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.8);
    display: flex;
    flex-direction: column;
  }

  .psd-dialog-header {
    padding: 1.25rem 1.6rem;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .psd-dialog-header.danger {
    background: #FEF2F2;
    border-bottom-color: #FEE2E2;
  }

  .psd-dialog-title-area {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .psd-dialog-emblem {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
  }

  .psd-dialog-emblem.primary {
    background: #FEF2F2;
    color: #DB1B0D;
    border: 1px solid #FECACA;
  }

  .psd-dialog-emblem.blue {
    background: #EFF6FF;
    color: #2563EB;
    border: 1px solid #DBEAFE;
  }

  .psd-dialog-emblem.danger {
    background: #FEF2F2;
    color: #DC2626;
    border: 1px solid #FECACA;
  }

  .psd-dialog-heading {
    margin: 0;
    font-size: 1.18rem;
    font-weight: 850;
    color: #0F172A;
    letter-spacing: -0.02em;
  }

  .psd-dialog-subheading {
    margin: 0.15rem 0 0;
    font-size: 0.78rem;
    color: #64748B;
  }

  .psd-dialog-close {
    border: none;
    background: transparent;
    color: #94A3B8;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    transition: all 0.15s ease;
  }

  .psd-dialog-close:hover {
    background: #E2E8F0;
    color: #0F172A;
  }

  .psd-dialog-body {
    padding: 1.5rem 1.6rem;
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }

  .psd-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .psd-label {
    font-size: 0.76rem;
    font-weight: 750;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .psd-input, .psd-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.62rem 0.85rem;
    border-radius: 9px;
    border: 1px solid #CBD5E1;
    font-size: 0.85rem;
    font-family: inherit;
    color: #0F172A;
    background: #FFFFFF;
    outline: none;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  }

  .psd-input:focus, .psd-textarea:focus {
    border-color: #DB1B0D;
    box-shadow: 0 0 0 3px rgba(219, 27, 13, 0.1);
  }

  .psd-input:disabled {
    background: #F8FAFC;
    color: #64748B;
    border-color: #E2E8F0;
    cursor: not-allowed;
  }

  .psd-coord-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
  }

  .psd-hint {
    font-size: 0.72rem;
    color: #94A3B8;
    margin-top: 0.15rem;
  }

  .psd-dialog-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.65rem;
    margin-top: 0.5rem;
  }

  .psd-btn-dialog-cancel {
    padding: 0.58rem 1.15rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #475569;
    cursor: pointer;
    font-weight: 750;
    font-size: 0.82rem;
    font-family: inherit;
    transition: all 0.15s ease;
  }

  .psd-btn-dialog-cancel:hover {
    background: #F1F5F9;
    color: #0F172A;
  }

  .psd-btn-dialog-submit {
    padding: 0.58rem 1.35rem;
    border-radius: 8px;
    border: none;
    background: linear-gradient(180deg, #E52E20 0%, #DB1B0D 100%);
    color: #FFFFFF;
    cursor: pointer;
    font-weight: 750;
    font-size: 0.82rem;
    font-family: inherit;
    box-shadow: 0 4px 14px rgba(219, 27, 13, 0.28);
    transition: all 0.15s ease;
  }

  .psd-btn-dialog-submit:hover:not(:disabled) {
    background: linear-gradient(180deg, #DB1B0D 0%, #C2160A 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(219, 27, 13, 0.38);
  }

  .psd-btn-dialog-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .psd-btn-dialog-danger {
    background: #DC2626 !important;
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3) !important;
  }

  .psd-btn-dialog-danger:hover:not(:disabled) {
    background: #B91C1C !important;
  }

  /* Responsive Design */
  @media (max-width: 960px) {
    .psd-stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 680px) {
    .psd-header {
      flex-direction: column;
      align-items: stretch;
      padding: 1.15rem;
    }

    .psd-actions {
      justify-content: flex-start;
    }

    .psd-stats-grid {
      grid-template-columns: 1fr;
    }

    .psd-toolbar {
      flex-direction: column;
      align-items: stretch;
      padding: 0.85rem;
    }

    .psd-search-wrapper {
      width: 100%;
    }

    .psd-coord-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export function ProvincialStationDirectory() {
  const mutate = useManagementMutation();
  const {
    items: stations,
    total,
    loading,
    error,
    page,
    pageSize,
    setPage,
    filters,
    setFilter,
    refresh: fetchStations,
  } = useProvincialManagementList<ManagedStation>({ endpoint: '/api/provincial-bfp/stations' });

  const municipalityId = filters.municipalityId || '';
  const setMunicipalityId = (value: string) => setFilter('municipalityId', value);
  const status = filters.status || '';
  const setStatus = (value: string) => setFilter('status', value);
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);

  // Municipalities for filter and form
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; name: string }>>([]);

  // Modals state
  const [editingStation, setEditingStation] = useState<ManagedStation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deactivatingStation, setDeactivatingStation] = useState<ManagedStation | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [newStation, setNewStation] = useState({
    municipalityId: municipalityId,
    stationName: '',
    latitude: 10.743,
    longitude: 121.94,
  });

  // Fetch municipalities for dropdown
  useEffect(() => {
    fetch('/api/provincial-bfp/municipalities?pageSize=100&page=1')
      .then((res) => res.json())
      .then((data) => setMunicipalities(data.items || []))
      .catch(() => {});
  }, []);

  // Update default municipality in form when filter changes
  useEffect(() => {
    if (municipalityId) {
      setNewStation((prev) => ({ ...prev, municipalityId }));
    }
  }, [municipalityId]);

  // Executive KPI stats calculation
  const totalStationsCount = total > 0 ? total : stations.length;

  const activeStationsCount = useMemo(
    () => stations.filter((s) => s.status === 'ACTIVE').length,
    [stations]
  );

  const coveredMunicipalitiesCount = useMemo(() => {
    const set = new Set(
      stations
        .map((s) => s.municipalityName || s.municipalityId)
        .filter(Boolean)
    );
    return set.size;
  }, [stations]);

  const totalPersonnelCount = useMemo(
    () => stations.reduce((acc, s) => acc + (Number(s.personnelCount) || 0), 0),
    [stations]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate('/api/provincial-bfp/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStation),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create station');
      setIsCreating(false);
      setNewStation({ municipalityId: '', stationName: '', latitude: 10.743, longitude: 121.94 });
      fetchStations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error creating station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/stations/${editingStation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': editingStation.updatedAt,
        },
        body: JSON.stringify({
          action: 'UPDATE',
          stationName: editingStation.stationName,
          latitude: editingStation.latitude,
          longitude: editingStation.longitude,
          expectedVersion: editingStation.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update station');
      setEditingStation(null);
      fetchStations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingStation) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/stations/${deactivatingStation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': deactivatingStation.updatedAt,
        },
        body: JSON.stringify({
          action: 'DEACTIVATE',
          reason: deactivationReason,
          expectedVersion: deactivatingStation.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate station');
      setDeactivatingStation(null);
      setDeactivationReason('');
      fetchStations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error deactivating station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (station: ManagedStation) => {
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/stations/${station.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': station.updatedAt,
        },
        body: JSON.stringify({
          action: 'REACTIVATE',
          expectedVersion: station.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reactivate station');
      fetchStations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error reactivating station');
    } finally {
      setSubmitting(false);
    }
  };

  useManagementDialog(
    !!(isCreating || editingStation || deactivatingStation),
    () => {
      setIsCreating(false);
      setEditingStation(null);
      setDeactivatingStation(null);
    },
    submitting
  );

  return (
    <div className="psd-container">
      <style>{pageStyles}</style>

      {/* Header Hub */}
      <div className="psd-header">
        <div className="psd-header-title-area">
          <div className="psd-kicker">
            <span className="psd-kicker-badge">
              <img src="/images/bfp logo.png" alt="BFP Official Logo" className="psd-kicker-emblem" />
              <span>PROVINCIAL COMMAND</span>
            </span>
            <span className="psd-kicker-dot" />
            <span className="psd-kicker-text">ANTIQUE JURISDICTION</span>
          </div>
          <h1 className="psd-title">
            <i className="fa-solid fa-truck-fast psd-title-icon" />
            Provincial Fire Station Directory
          </h1>
          <p className="psd-subtitle">
            Manage all municipal BFP fire stations, geographical coordinates, and deployment readiness across Antique.
          </p>
        </div>

        <div className="psd-actions">
          {/* Provincial export trigger */}
          <ProvincialManagementToolbar exportOnly dataset="STATIONS" filters={filters} onFilterChange={() => {}} />

          <button
            type="button"
            onClick={() => fetchStations()}
            disabled={loading}
            className="psd-btn psd-btn-refresh"
            title="Refresh Directory"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="psd-btn psd-btn-primary"
          >
            <i className="fa-solid fa-plus" />
            <span>Provision Station</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Stat Cards */}
      <div className="psd-stats-grid" role="region" aria-label="Station metrics">
        {/* Card 1: Total Stations (Blue) */}
        <div
          className="psd-stat-card blue"
          onClick={() => { setStatus(''); setPage(1); }}
          role="button"
          tabIndex={0}
          title="Click to view all stations"
        >
          <div className="psd-stat-header">
            <div className="psd-stat-badge-icon">
              <i className="fa-solid fa-building-shield" />
            </div>
            <span className="psd-stat-trend-tag blue">
              <i className="fa-solid fa-building" /> Stations
            </span>
          </div>
          <div className="psd-stat-body">
            <span className="psd-stat-label">Total Stations</span>
            <span className="psd-stat-value">{loading && stations.length === 0 ? '—' : totalStationsCount}</span>
          </div>
          <div className="psd-stat-footer">
            <span className="psd-stat-subtext">Registered in Antique</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>

        {/* Card 2: Active Operational (Emerald) */}
        <div
          className="psd-stat-card emerald"
          onClick={() => { setStatus('ACTIVE'); setPage(1); }}
          role="button"
          tabIndex={0}
          title="Click to view active operational stations"
        >
          <div className="psd-stat-header">
            <div className="psd-stat-badge-icon">
              <i className="fa-solid fa-tower-broadcast" />
            </div>
            <span className="psd-stat-trend-tag emerald">
              <i className="fa-solid fa-signal" /> Ready
            </span>
          </div>
          <div className="psd-stat-body">
            <span className="psd-stat-label">Active Operational</span>
            <span className="psd-stat-value">{loading && stations.length === 0 ? '—' : activeStationsCount}</span>
          </div>
          <div className="psd-stat-footer">
            <span className="psd-stat-subtext">Dispatch ready stations</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>

        {/* Card 3: Municipalities Covered (Purple) */}
        <div
          className="psd-stat-card purple"
          title="Municipal coverage across Antique province"
        >
          <div className="psd-stat-header">
            <div className="psd-stat-badge-icon">
              <i className="fa-solid fa-map-location-dot" />
            </div>
            <span className="psd-stat-trend-tag purple">
              <i className="fa-solid fa-location-dot" /> Coverage
            </span>
          </div>
          <div className="psd-stat-body">
            <span className="psd-stat-label">Municipalities Covered</span>
            <span className="psd-stat-value">
              {loading && stations.length === 0 ? '—' : `${coveredMunicipalitiesCount} / 18`}
            </span>
          </div>
          <div className="psd-stat-footer">
            <span className="psd-stat-subtext">Across Antique province</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>

        {/* Card 4: Station Personnel (Red) */}
        <div
          className="psd-stat-card red"
          title="Active assigned station responders"
        >
          <div className="psd-stat-header">
            <div className="psd-stat-badge-icon">
              <i className="fa-solid fa-users" />
            </div>
            <span className="psd-stat-trend-tag red">
              <i className="fa-solid fa-user-shield" /> Crew
            </span>
          </div>
          <div className="psd-stat-body">
            <span className="psd-stat-label">Station Personnel</span>
            <span className="psd-stat-value">{loading && stations.length === 0 ? '—' : totalPersonnelCount}</span>
          </div>
          <div className="psd-stat-footer">
            <span className="psd-stat-subtext">Active assigned responders</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="psd-alert" role="alert">
          <div>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => fetchStations()} className="psd-alert-btn">
            Retry
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="psd-card">
        {/* Toolbar Bar */}
        <div className="psd-toolbar">
          <div className="psd-filters-left">
            {/* Municipality Select */}
            <select
              value={municipalityId}
              onChange={(e) => {
                setMunicipalityId(e.target.value);
                setPage(1);
              }}
              className="psd-select"
              aria-label="Filter by Municipality"
            >
              <option value="">All Municipalities ({municipalities.length || 18})</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Status Filter Segmented */}
            <div className="psd-filter-group" role="tablist" aria-label="Status filter">
              <button
                type="button"
                className={`psd-filter-btn ${status === '' ? 'active' : ''}`}
                onClick={() => {
                  setStatus('');
                  setPage(1);
                }}
              >
                All Statuses
              </button>
              <button
                type="button"
                className={`psd-filter-btn ${status === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => {
                  setStatus('ACTIVE');
                  setPage(1);
                }}
              >
                Active Only
              </button>
              <button
                type="button"
                className={`psd-filter-btn ${status === 'INACTIVE' ? 'active' : ''}`}
                onClick={() => {
                  setStatus('INACTIVE');
                  setPage(1);
                }}
              >
                Inactive Only
              </button>
            </div>

            {(municipalityId || status || search) && (
              <button
                type="button"
                onClick={() => {
                  setMunicipalityId('');
                  setStatus('');
                  setSearch('');
                  setPage(1);
                }}
                className="psd-btn-clear"
                title="Reset all filters"
              >
                <i className="fa-solid fa-xmark" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          {/* Search Station */}
          <div className="psd-search-wrapper">
            <i className="fa-solid fa-magnifying-glass psd-search-icon" />
            <input
              type="text"
              placeholder="Search station or municipality..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="psd-search-input"
              aria-label="Search station directory"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="psd-search-clear"
                title="Clear search"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Stations Table */}
        <div className="psd-table-wrap">
          <table className="psd-table">
            <thead>
              <tr>
                <th>STATION NAME</th>
                <th>MUNICIPALITY</th>
                <th>COORDINATES</th>
                <th>PERSONNEL</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && stations.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} style={{ padding: '1.4rem', textAlign: 'center', color: '#94A3B8' }}>
                      <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: '0.5rem' }} />
                      Loading provincial stations registry…
                    </td>
                  </tr>
                ))
              ) : stations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                    <i
                      className="fa-solid fa-building-shield"
                      style={{ fontSize: '2.8rem', color: '#CBD5E1', marginBottom: '0.75rem', display: 'block' }}
                    />
                    <strong style={{ display: 'block', color: '#0F172A', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                      No fire stations found
                    </strong>
                    <span style={{ fontSize: '0.82rem' }}>
                      Try adjusting your municipality or status filters.
                    </span>
                  </td>
                </tr>
              ) : (
                stations.map((st) => (
                  <tr key={st.id}>
                    <td>
                      <div className="psd-station-cell">
                        <div className="psd-station-avatar">
                          <i className="fa-solid fa-building-shield" />
                        </div>
                        <div className="psd-station-info">
                          <span className="psd-station-name">{st.stationName || st.name}</span>
                          <span className="psd-station-sub">
                            <i className="fa-solid fa-shield-halved" />
                            Antique Fleet Logistics
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="psd-muni-pill">
                        <i className="fa-solid fa-location-dot" />
                        {st.municipalityName}
                      </span>
                    </td>

                    <td>
                      <span
                        className="psd-coord-cell"
                        title={`Latitude: ${st.latitude}, Longitude: ${st.longitude}`}
                      >
                        <i className="fa-solid fa-compass" />
                        <code>
                          {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                        </code>
                      </span>
                    </td>

                    <td>
                      <Link
                        href={`/provincial-bfp/responders?stationId=${st.id}`}
                        className="psd-personnel-link"
                        title="View responders assigned to this station"
                      >
                        <i className="fa-solid fa-users" />
                        <span>{st.personnelCount} Personnel</span>
                        <i className="fa-solid fa-arrow-up-right-from-square psd-link-icon" />
                      </Link>
                    </td>

                    <td>
                      {st.status === 'ACTIVE' ? (
                        <span className="psd-status-badge active">
                          <span className="psd-pulse-dot" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="psd-status-badge inactive">
                          <span className="psd-neutral-dot" />
                          INACTIVE
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="psd-actions-cell">
                        <button
                          type="button"
                          onClick={() => setEditingStation(st)}
                          className="psd-btn-action edit"
                          title="Edit Station Parameters"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                          <span>Edit</span>
                        </button>
                        {st.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeactivatingStation(st);
                              setDeactivationReason('');
                              setActionError(null);
                            }}
                            className="psd-btn-action deactivate"
                            title="Deactivate Station"
                          >
                            <i className="fa-solid fa-power-off" />
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReactivate(st)}
                            className="psd-btn-action reactivate"
                            title="Reactivate Station"
                          >
                            <i className="fa-solid fa-rotate-left" />
                            <span>Reactivate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="psd-pagination">
          <span>
            Showing <strong>{stations.length}</strong> of <strong>{total}</strong> stations
          </span>
          <div className="psd-page-controls">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="psd-page-btn"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="psd-page-btn"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Provision Station Modal */}
      {isCreating && (
        <div data-management-dialog className="psd-dialog-backdrop">
          <div className="psd-dialog">
            <div className="psd-dialog-header">
              <div className="psd-dialog-title-area">
                <div className="psd-dialog-emblem primary">
                  <i className="fa-solid fa-building-shield" />
                </div>
                <div>
                  <h3 className="psd-dialog-heading">Provision Fire Station</h3>
                  <p className="psd-dialog-subheading">
                    Register a new municipal BFP facility into Antique directory.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="psd-dialog-close"
                title="Close"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="psd-dialog-body">
              {actionError && (
                <div className="psd-alert">
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="psd-form-group">
                <label className="psd-label">Municipality (Antique)</label>
                <select
                  required
                  value={newStation.municipalityId}
                  onChange={(e) => setNewStation({ ...newStation, municipalityId: e.target.value })}
                  className="psd-input"
                >
                  <option value="">Select Municipality...</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="psd-form-group">
                <label className="psd-label">Station Official Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Jose Sub-Station 1"
                  value={newStation.stationName}
                  onChange={(e) => setNewStation({ ...newStation, stationName: e.target.value })}
                  className="psd-input"
                />
              </div>

              <div className="psd-coord-grid">
                <div className="psd-form-group">
                  <label className="psd-label">Latitude (4 to 22)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newStation.latitude}
                    onChange={(e) => setNewStation({ ...newStation, latitude: parseFloat(e.target.value) })}
                    className="psd-input"
                  />
                  <span className="psd-hint">e.g. 10.7442</span>
                </div>

                <div className="psd-form-group">
                  <label className="psd-label">Longitude (116 to 127)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newStation.longitude}
                    onChange={(e) => setNewStation({ ...newStation, longitude: parseFloat(e.target.value) })}
                    className="psd-input"
                  />
                  <span className="psd-hint">e.g. 121.9422</span>
                </div>
              </div>

              <div className="psd-dialog-footer">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="psd-btn-dialog-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="psd-btn-dialog-submit"
                >
                  {submitting ? 'Creating…' : 'Create Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Station Modal */}
      {editingStation && (
        <div data-management-dialog className="psd-dialog-backdrop">
          <div className="psd-dialog">
            <div className="psd-dialog-header">
              <div className="psd-dialog-title-area">
                <div className="psd-dialog-emblem blue">
                  <i className="fa-solid fa-pen-to-square" />
                </div>
                <div>
                  <h3 className="psd-dialog-heading">Edit Station</h3>
                  <p className="psd-dialog-subheading">
                    {editingStation.stationName} ({editingStation.municipalityName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStation(null)}
                className="psd-dialog-close"
                title="Close"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="psd-dialog-body">
              {actionError && (
                <div className="psd-alert">
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="psd-form-group">
                <label className="psd-label">Municipality</label>
                <input
                  type="text"
                  disabled
                  value={editingStation.municipalityName}
                  className="psd-input"
                />
              </div>

              <div className="psd-form-group">
                <label className="psd-label">Station Official Name</label>
                <input
                  type="text"
                  required
                  value={editingStation.stationName}
                  onChange={(e) => setEditingStation({ ...editingStation, stationName: e.target.value })}
                  className="psd-input"
                />
              </div>

              <div className="psd-coord-grid">
                <div className="psd-form-group">
                  <label className="psd-label">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editingStation.latitude}
                    onChange={(e) => setEditingStation({ ...editingStation, latitude: parseFloat(e.target.value) })}
                    className="psd-input"
                  />
                </div>

                <div className="psd-form-group">
                  <label className="psd-label">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editingStation.longitude}
                    onChange={(e) => setEditingStation({ ...editingStation, longitude: parseFloat(e.target.value) })}
                    className="psd-input"
                  />
                </div>
              </div>

              <div className="psd-dialog-footer">
                <button
                  type="button"
                  onClick={() => setEditingStation(null)}
                  className="psd-btn-dialog-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="psd-btn-dialog-submit"
                >
                  {submitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Station Reason Modal */}
      {deactivatingStation && (
        <div data-management-dialog className="psd-dialog-backdrop">
          <div className="psd-dialog">
            <div className="psd-dialog-header danger">
              <div className="psd-dialog-title-area">
                <div className="psd-dialog-emblem danger">
                  <i className="fa-solid fa-triangle-exclamation" />
                </div>
                <div>
                  <h3 className="psd-dialog-heading" style={{ color: '#DC2626' }}>
                    Deactivate Station
                  </h3>
                  <p className="psd-dialog-subheading">
                    Suspend dispatches for {deactivatingStation.stationName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeactivatingStation(null)}
                className="psd-dialog-close"
                title="Close"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="psd-dialog-body">
              {actionError && (
                <div className="psd-alert">
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
                  <span>{actionError}</span>
                </div>
              )}

              <p style={{ fontSize: '0.86rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to deactivate{' '}
                <strong style={{ color: '#0F172A' }}>{deactivatingStation.stationName}</strong> in{' '}
                <strong style={{ color: '#0F172A' }}>{deactivatingStation.municipalityName}</strong>?
                Deactivation blocks new mobile dispatches. Deactivation will be rejected if there are active personnel assignments or active emergency responses.
              </p>

              <div className="psd-form-group">
                <label className="psd-label">Mandatory Deactivation Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the operational or logistical reason for deactivation..."
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  className="psd-textarea"
                />
              </div>

              <div className="psd-dialog-footer">
                <button
                  type="button"
                  onClick={() => setDeactivatingStation(null)}
                  className="psd-btn-dialog-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || !deactivationReason.trim()}
                  onClick={handleDeactivate}
                  className="psd-btn-dialog-submit psd-btn-dialog-danger"
                >
                  {submitting ? 'Deactivating…' : 'Confirm Deactivation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
