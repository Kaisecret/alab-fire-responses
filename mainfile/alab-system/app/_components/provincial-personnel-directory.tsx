'use client';

import { ProvincialManagementToolbar } from './provincial-management-toolbar';
import { useManagementMutation } from './use-management-mutation';
import React, { useState, useEffect, useMemo } from 'react';
import { useProvincialManagementList } from './use-provincial-management-list';
import { useManagementDialog } from './use-management-dialog';
import type { ManagedPersonnel } from '../../lib/provincial-bfp/management/types';

const directoryStyles = `
  .ppd-container {
    --navy-900: #0F172A;
    --navy-800: #1E293B;
    --navy-700: #334155;
    --slate-500: #64748B;
    --slate-400: #94A3B8;
    --slate-200: #E2E8F0;
    --slate-100: #F1F5F9;
    --slate-50: #F8FAFC;
    --red-600: #E23632;
    --red-700: #C92E2A;
    --emerald-600: #059669;
    --emerald-50: #ECFDF5;
    --amber-600: #D97706;
    --amber-50: #FFFBEB;
    --blue-600: #2563EB;
    --blue-50: #EFF6FF;
    --purple-600: #7C3AED;
    --purple-50: #F5F3FF;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: var(--navy-800);
  }

  .ppd-container ::selection {
    background: #FEE2E2;
    color: #991B1B;
  }

  /* Command Header */
  .ppd-header-card {
    background: #FFFFFF;
    border: 1px solid var(--slate-200);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.25rem;
    box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04);
  }

  .ppd-header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
  }

  .ppd-header-icon-box {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: linear-gradient(135deg, #FFF1F1 0%, #FEE2E2 100%);
    border: 1px solid #FECACA;
    display: grid;
    place-items: center;
    color: var(--red-600);
    font-size: 1.35rem;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(226, 54, 50, 0.12);
  }

  .ppd-kicker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--red-600);
  }

  .ppd-kicker-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--emerald-600);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.2);
    animation: ppdPulse 2s infinite;
  }

  @keyframes ppdPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.9); }
  }

  .ppd-title {
    margin: 0.2rem 0 0;
    font-size: clamp(1.25rem, 2vw, 1.55rem);
    font-weight: 800;
    color: var(--navy-900);
    letter-spacing: -0.025em;
    line-height: 1.2;
  }

  .ppd-subtitle {
    margin: 0.3rem 0 0;
    font-size: 0.825rem;
    color: var(--slate-500);
  }

  .ppd-header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .ppd-btn-refresh {
    min-height: 42px;
    padding: 0.65rem 1.15rem;
    border-radius: 10px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: var(--navy-800);
    font: inherit;
    font-size: 0.825rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    transition: all 0.15s ease;
  }

  .ppd-btn-refresh:hover:not(:disabled) {
    background: var(--slate-50);
    border-color: #94A3B8;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
  }

  .ppd-header-actions .no-print button {
    min-height: 42px !important;
    padding: 0.65rem 1.15rem !important;
    border-radius: 10px !important;
    border: 1px solid #CBD5E1 !important;
    background: #FFFFFF !important;
    color: var(--navy-800) !important;
    font: inherit !important;
    font-size: 0.825rem !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.5rem !important;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05) !important;
    transition: all 0.15s ease !important;
  }

  .ppd-header-actions .no-print button:hover:not(:disabled) {
    background: var(--slate-50) !important;
    border-color: #94A3B8 !important;
    transform: translateY(-1px) !important;
  }

  .ppd-btn-provision {
    min-height: 42px;
    padding: 0.65rem 1.25rem;
    border-radius: 10px;
    border: 1px solid var(--red-600);
    background: var(--red-600);
    color: #FFFFFF;
    font: inherit;
    font-size: 0.825rem;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 14px rgba(226, 54, 50, 0.25);
    transition: all 0.15s ease;
  }

  .ppd-btn-provision:hover {
    background: var(--red-700);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(226, 54, 50, 0.35);
  }

  /* KPI Summary Stats */
  .ppd-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 1rem;
  }

  .ppd-stat-card {
    background: #FFFFFF;
    border: 1px solid var(--slate-200);
    border-radius: 14px;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.03);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ppd-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.08);
  }

  .ppd-stat-card.active {
    border-color: var(--navy-800);
    box-shadow: 0 0 0 2px var(--navy-800);
  }

  .ppd-stat-info {
    display: flex;
    flex-direction: column;
  }

  .ppd-stat-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--slate-500);
  }

  .ppd-stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--navy-900);
    line-height: 1.2;
    margin-top: 0.25rem;
    font-variant-numeric: tabular-nums;
  }

  .ppd-stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-size: 1.15rem;
  }

  .ppd-stat-card--all .ppd-stat-icon { background: #F1F5F9; color: var(--navy-700); }
  .ppd-stat-card--stations .ppd-stat-icon { background: #EFF6FF; color: var(--blue-600); }
  .ppd-stat-card--admins .ppd-stat-icon { background: #FEF3C7; color: var(--amber-600); }
  .ppd-stat-card--active .ppd-stat-icon { background: #D1FAE5; color: var(--emerald-600); }

  /* Filter Console */
  .ppd-filter-console {
    background: #FFFFFF;
    border: 1px solid var(--slate-200);
    border-radius: 14px;
    padding: 1.15rem 1.25rem;
    box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.03);
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .ppd-filter-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--slate-100);
    padding-bottom: 0.75rem;
  }

  .ppd-filter-title {
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--navy-800);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ppd-filter-title i {
    color: var(--red-600);
  }

  .ppd-filter-right {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .ppd-count-pill {
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--slate-500);
    background: var(--slate-100);
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
  }

  .ppd-clear-btn {
    border: none;
    background: transparent;
    color: var(--red-600);
    font: inherit;
    font-size: 0.76rem;
    font-weight: 800;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .ppd-clear-btn:hover:not(:disabled) {
    background: #FEE2E2;
  }

  .ppd-clear-btn:disabled {
    color: var(--slate-400);
    cursor: default;
  }

  .ppd-filters-row {
    display: grid;
    grid-template-columns: minmax(180px, 1.2fr) minmax(200px, 1.4fr) minmax(140px, 1fr) minmax(220px, 1.6fr);
    gap: 0.85rem;
    align-items: end;
  }

  .ppd-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .ppd-field label {
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--navy-700);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .ppd-field label i {
    color: var(--slate-400);
  }

  .ppd-field select, .ppd-field input {
    width: 100%;
    min-height: 42px;
    box-sizing: border-box;
    padding: 0.6rem 0.85rem;
    border: 1px solid #CBD5E1;
    border-radius: 9px;
    background: #FFFFFF;
    color: var(--navy-900);
    font: inherit;
    font-size: 0.825rem;
    transition: all 0.15s ease;
  }

  .ppd-field select:hover, .ppd-field input:hover {
    border-color: #94A3B8;
  }

  .ppd-field select:focus, .ppd-field input:focus {
    border-color: var(--navy-800);
    box-shadow: 0 0 0 3px rgba(30, 41, 59, 0.1);
    outline: none;
  }

  .ppd-search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .ppd-search-icon {
    position: absolute;
    left: 0.85rem;
    color: var(--slate-400);
    font-size: 0.82rem;
    pointer-events: none;
  }

  .ppd-search-input {
    padding-left: 2.3rem !important;
    padding-right: 2rem !important;
  }

  .ppd-search-clear {
    position: absolute;
    right: 0.75rem;
    background: transparent;
    border: none;
    color: var(--slate-400);
    font-size: 0.82rem;
    cursor: pointer;
    padding: 0.2rem;
  }

  .ppd-search-clear:hover {
    color: var(--navy-800);
  }

  /* Records Section */
  .ppd-records-card {
    background: #FFFFFF;
    border: 1px solid var(--slate-200);
    border-radius: 16px;
    box-shadow: 0 4px 24px -2px rgba(15, 23, 42, 0.05);
    overflow: hidden;
  }

  .ppd-table-wrap {
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: #CBD5E1 transparent;
  }

  .ppd-table {
    width: 100%;
    min-width: 980px;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.825rem;
  }

  .ppd-table thead {
    background: var(--slate-50);
    border-bottom: 1px solid var(--slate-200);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .ppd-table th {
    padding: 0.95rem 1.15rem;
    font-size: 0.68rem;
    font-weight: 800;
    color: var(--navy-700);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .ppd-table-row {
    border-bottom: 1px solid var(--slate-100);
    transition: background-color 0.15s ease, box-shadow 0.15s ease;
  }

  .ppd-table-row:hover {
    background: #F8FBFF;
    box-shadow: inset 3px 0 0 var(--red-600);
  }

  .ppd-table td {
    padding: 1rem 1.15rem;
    vertical-align: middle;
  }

  /* Officer Cell */
  .ppd-officer-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .ppd-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: #FFFFFF;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 0.85rem;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }

  .ppd-officer-name {
    font-weight: 700;
    color: var(--navy-900);
    font-size: 0.875rem;
    line-height: 1.25;
  }

  .ppd-officer-meta {
    font-size: 0.74rem;
    color: var(--slate-500);
    margin-top: 0.2rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .ppd-officer-meta a {
    color: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .ppd-officer-meta a:hover {
    color: var(--navy-900);
    text-decoration: underline;
  }

  /* Rank Badge */
  .ppd-rank-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    background: var(--slate-100);
    border: 1px solid #CBD5E1;
    color: var(--navy-800);
    font-weight: 700;
    font-size: 0.75rem;
  }

  /* Location Cell */
  .ppd-location-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 700;
    color: var(--navy-900);
  }

  .ppd-location-badge i {
    color: var(--red-600);
    font-size: 0.75rem;
  }

  /* Station Badge */
  .ppd-station-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #F8FAFC;
    border: 1px solid var(--slate-200);
    padding: 0.25rem 0.65rem;
    border-radius: 8px;
    font-weight: 600;
    color: var(--navy-800);
    font-size: 0.76rem;
    max-width: 260px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ppd-station-badge i {
    color: var(--blue-600);
    font-size: 0.75rem;
  }

  .ppd-station-unassigned {
    color: var(--slate-400);
    font-style: italic;
    font-size: 0.76rem;
  }

  /* Role Badge */
  .ppd-role-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .ppd-role-pill--admin {
    background: var(--amber-50);
    color: #92400E;
    border: 1px solid #FDE68A;
  }

  .ppd-role-pill--staff {
    background: var(--slate-100);
    color: var(--navy-700);
    border: 1px solid var(--slate-200);
  }

  /* Status Pill */
  .ppd-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .ppd-status-pill--active {
    background: var(--emerald-50);
    color: #065F46;
    border: 1px solid #A7F3D0;
  }

  .ppd-status-pill--suspended {
    background: #FFF1F2;
    color: #991B1B;
    border: 1px solid #FECACA;
  }

  .ppd-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  /* Action Buttons Cluster */
  .ppd-actions-cluster {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .ppd-act-btn {
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 0.4rem 0.65rem;
    font: inherit;
    font-size: 0.74rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    transition: all 0.15s ease;
  }

  .ppd-act-btn:hover {
    transform: translateY(-1px);
  }

  .ppd-act-btn--edit {
    background: var(--slate-100);
    border-color: var(--slate-200);
    color: var(--navy-700);
  }
  .ppd-act-btn--edit:hover {
    background: var(--slate-200);
    color: var(--navy-900);
  }

  .ppd-act-btn--station {
    background: var(--blue-50);
    border-color: #BFDBFE;
    color: var(--blue-600);
  }
  .ppd-act-btn--station:hover {
    background: #DBEAFE;
  }

  .ppd-act-btn--transfer {
    background: var(--purple-50);
    border-color: #E9D5FF;
    color: var(--purple-600);
  }
  .ppd-act-btn--transfer:hover {
    background: #F3E8FF;
  }

  .ppd-act-btn--suspend {
    background: #FFF1F2;
    border-color: #FECACA;
    color: var(--red-600);
  }
  .ppd-act-btn--suspend:hover {
    background: #FEE2E2;
  }

  .ppd-act-btn--reactivate {
    background: var(--emerald-50);
    border-color: #A7F3D0;
    color: var(--emerald-600);
  }
  .ppd-act-btn--reactivate:hover {
    background: #D1FAE5;
  }

  /* Table Footer Pagination */
  .ppd-footer {
    padding: 0.95rem 1.25rem;
    background: var(--slate-50);
    border-top: 1px solid var(--slate-200);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--slate-500);
  }

  .ppd-page-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ppd-page-btn {
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: var(--navy-800);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .ppd-page-btn:hover:not(:disabled) {
    background: var(--slate-100);
    border-color: #94A3B8;
  }

  .ppd-page-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* Modals */
  .ppd-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 1rem;
    animation: ppdFadeIn 0.2s ease-out;
  }

  @keyframes ppdFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .ppd-modal-dialog {
    background: #FFFFFF;
    border-radius: 20px;
    width: 100%;
    overflow: hidden;
    box-shadow: 0 24px 60px -12px rgba(15, 23, 42, 0.3);
    border: 1px solid var(--slate-200);
    animation: ppdPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes ppdPopIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }

  .ppd-modal-header {
    padding: 1.25rem 1.5rem;
    background: var(--slate-50);
    border-bottom: 1px solid var(--slate-200);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ppd-modal-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--navy-900);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ppd-modal-close-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--slate-200);
    background: #FFFFFF;
    color: var(--slate-500);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: all 0.15s ease;
  }

  .ppd-modal-close-btn:hover {
    background: #FEE2E2;
    border-color: #FECACA;
    color: var(--red-600);
    transform: rotate(90deg);
  }

  .ppd-modal-form {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }

  .ppd-input-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .ppd-input-group label {
    font-size: 0.74rem;
    font-weight: 800;
    color: var(--navy-700);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ppd-input-group input, .ppd-input-group select, .ppd-input-group textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.65rem 0.85rem;
    border: 1px solid #CBD5E1;
    border-radius: 9px;
    font: inherit;
    font-size: 0.85rem;
    color: var(--navy-900);
    transition: all 0.15s ease;
  }

  .ppd-input-group input:focus, .ppd-input-group select:focus, .ppd-input-group textarea:focus {
    border-color: var(--navy-800);
    box-shadow: 0 0 0 3px rgba(30, 41, 59, 0.1);
    outline: none;
  }

  .ppd-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--slate-100);
    padding-top: 1rem;
  }

  .ppd-btn-cancel {
    padding: 0.6rem 1.15rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: var(--navy-700);
    font: inherit;
    font-size: 0.825rem;
    font-weight: 700;
    cursor: pointer;
  }

  .ppd-btn-submit {
    padding: 0.6rem 1.35rem;
    border-radius: 8px;
    border: none;
    background: var(--red-600);
    color: #FFFFFF;
    font: inherit;
    font-size: 0.825rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .ppd-btn-submit:hover:not(:disabled) {
    background: var(--red-700);
    transform: translateY(-1px);
  }

  .ppd-btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 960px) {
    .ppd-filters-row {
      grid-template-columns: 1fr 1fr;
    }
    .ppd-header-card {
      flex-direction: column;
      align-items: flex-start;
    }
    .ppd-header-actions {
      width: 100%;
    }
    .ppd-header-actions > * {
      flex: 1 1 auto;
    }
    .ppd-btn-provision, .ppd-btn-refresh, .ppd-header-actions .no-print button {
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 600px) {
    .ppd-filters-row {
      grid-template-columns: 1fr;
    }
  }
`;

export function ProvincialPersonnelDirectory() {
  const mutate = useManagementMutation();
  const {
    items: personnel,
    total,
    loading,
    error,
    page,
    pageSize,
    setPage,
    filters,
    setFilter,
    setFilters,
    refresh: fetchPersonnel,
  } = useProvincialManagementList<ManagedPersonnel>({
    endpoint: '/api/provincial-bfp/personnel',
  });

  const municipalityId = filters.municipalityId || '';
  const setMunicipalityId = (value: string) => setFilter('municipalityId', value);
  const status = filters.status || '';
  const setStatus = (value: string) => setFilter('status', value);
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);
  const stationId = filters.stationId || '';
  const setStationId = (value: string) => setFilter('stationId', value);

  // Reference lists
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; name: string }>>([]);
  const [stations, setStations] = useState<Array<{ id: string; stationName: string; municipalityId: string }>>([]);

  // Modals
  const [isCreating, setIsCreating] = useState(false);
  const [editingPerson, setEditingPerson] = useState<ManagedPersonnel | null>(null);
  const [transferringPerson, setTransferringPerson] = useState<ManagedPersonnel | null>(null);
  const [assigningStationPerson, setAssigningStationPerson] = useState<ManagedPersonnel | null>(null);
  const [suspendingPerson, setSuspendingPerson] = useState<ManagedPersonnel | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [newPerson, setNewPerson] = useState({
    email: '',
    displayName: '',
    rankOrPosition: 'Fire Officer 1',
    municipalityId: municipalityId,
    stationId: '',
    assignmentRole: 'MUNICIPAL_STAFF' as 'MUNICIPAL_ADMIN' | 'MUNICIPAL_STAFF',
    temporaryPassword: '',
  });

  // Transfer state
  const [transferState, setTransferState] = useState({
    municipalityId: '',
    stationId: '',
    assignmentRole: 'MUNICIPAL_STAFF' as 'MUNICIPAL_ADMIN' | 'MUNICIPAL_STAFF',
    reason: '',
  });

  // Assign station state
  const [targetStationId, setTargetStationId] = useState('');

  // Load municipalities & stations
  useEffect(() => {
    fetch('/api/provincial-bfp/municipalities?pageSize=100&page=1')
      .then((res) => res.json())
      .then((data) => setMunicipalities(data.items || []))
      .catch(() => {});

    fetch('/api/provincial-bfp/stations?pageSize=100&page=1')
      .then((res) => res.json())
      .then((data) => setStations(data.items || []))
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate('/api/provincial-bfp/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPerson),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create personnel');
      setIsCreating(false);
      setNewPerson({
        email: '',
        displayName: '',
        rankOrPosition: 'Fire Officer 1',
        municipalityId: '',
        stationId: '',
        assignmentRole: 'MUNICIPAL_STAFF',
        temporaryPassword: '',
      });
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error creating personnel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/personnel/${editingPerson.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': editingPerson.updatedAt,
        },
        body: JSON.stringify({
          action: 'UPDATE',
          displayName: editingPerson.displayName,
          rankOrPosition: editingPerson.rankOrPosition ?? '',
          expectedVersion: editingPerson.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setEditingPerson(null);
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStationPerson) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/personnel/${assigningStationPerson.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': assigningStationPerson.updatedAt,
        },
        body: JSON.stringify({
          action: 'ASSIGN_STATION',
          stationId: targetStationId || null,
          expectedVersion: assigningStationPerson.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign station');
      setAssigningStationPerson(null);
      setTargetStationId('');
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error assigning station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringPerson) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/personnel/${transferringPerson.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': transferringPerson.updatedAt,
        },
        body: JSON.stringify({
          action: 'TRANSFER_MUNICIPALITY',
          municipalityId: transferState.municipalityId,
          stationId: transferState.stationId || null,
          assignmentRole: transferState.assignmentRole,
          reason: transferState.reason,
          expectedVersion: transferringPerson.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to transfer personnel');
      setTransferringPerson(null);
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error transferring personnel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendingPerson) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/personnel/${suspendingPerson.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': suspendingPerson.updatedAt,
        },
        body: JSON.stringify({
          action: 'SUSPEND',
          reason: suspensionReason,
          expectedVersion: suspendingPerson.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to suspend account');
      setSuspendingPerson(null);
      setSuspensionReason('');
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error suspending account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (person: ManagedPersonnel) => {
    try {
      setSubmitting(true);
      const res = await mutate(`/api/provincial-bfp/personnel/${person.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': person.updatedAt,
        },
        body: JSON.stringify({
          action: 'REACTIVATE',
          expectedVersion: person.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reactivate account');
      fetchPersonnel();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error reactivating account');
    } finally {
      setSubmitting(false);
    }
  };

  useManagementDialog(
    !!(isCreating || editingPerson || transferringPerson || assigningStationPerson || suspendingPerson),
    () => {
      setIsCreating(false);
      setEditingPerson(null);
      setTransferringPerson(null);
      setAssigningStationPerson(null);
      setSuspendingPerson(null);
    },
    submitting
  );

  const getInitials = (name: string) => {
    if (!name) return 'BFP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const getAvatarGradient = (name: string) => {
    const colors = [
      'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
      'linear-gradient(135deg, #059669 0%, #047857 100%)',
      'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
      'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
      'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // KPI Computations
  const assignedStationCount = personnel.filter((p) => !!p.stationId).length;
  const adminCount = personnel.filter((p) => p.assignmentRole === 'MUNICIPAL_ADMIN').length;
  const activeCount = personnel.filter((p) => p.accountStatus === 'ACTIVE').length;

  const activeFiltersCount = [municipalityId, stationId, status, search].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilters({});
    setPage(1);
  };

  return (
    <section className="ppd-container" aria-label="Municipal BFP Personnel Registry">
      <style>{directoryStyles}</style>

      {/* Header Hub */}
      <header className="ppd-header-card">
        <div className="ppd-header-left">
          <div className="ppd-header-icon-box" aria-hidden="true">
            <i className="fa-solid fa-user-shield" />
          </div>
          <div>
            <div className="ppd-kicker">
              <span className="ppd-kicker-dot" />
              <span>BUREAU OF FIRE PROTECTION • REGION VI</span>
            </div>
            <h1 className="ppd-title">Municipal BFP Personnel Registry</h1>
            <p className="ppd-subtitle">
              Authoritative roster of all municipal BFP administrators, station firefighters, and operational personnel across Antique.
            </p>
          </div>
        </div>

        <div className="ppd-header-actions">
          <button
            type="button"
            className="ppd-btn-refresh"
            onClick={fetchPersonnel}
            disabled={loading}
            aria-label="Refresh Roster"
          >
            <i className={`fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}`} aria-hidden="true" />
            {loading ? 'Refreshing…' : '↻ Refresh Roster'}
          </button>
          <ProvincialManagementToolbar exportOnly dataset="PERSONNEL" filters={filters} onFilterChange={() => {}} />
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="ppd-btn-provision"
          >
            <i className="fa-solid fa-user-plus" />
            <span>+ Provision Personnel</span>
          </button>
        </div>
      </header>

      {/* KPI Stats Bar */}
      <div className="ppd-stats-grid" role="region" aria-label="Personnel registry metrics">
        <div
          className={`ppd-stat-card ppd-stat-card--all ${!status && !municipalityId && !stationId ? 'active' : ''}`}
          onClick={clearAllFilters}
          title="Click to view all personnel"
        >
          <div className="ppd-stat-info">
            <span className="ppd-stat-label">Total Personnel</span>
            <span className="ppd-stat-value">{total}</span>
          </div>
          <div className="ppd-stat-icon">
            <i className="fa-solid fa-users" />
          </div>
        </div>

        <div
          className="ppd-stat-card ppd-stat-card--stations"
          title="Personnel assigned to fire stations"
        >
          <div className="ppd-stat-info">
            <span className="ppd-stat-label">Station Crews</span>
            <span className="ppd-stat-value">{assignedStationCount}</span>
          </div>
          <div className="ppd-stat-icon">
            <i className="fa-solid fa-building-shield" />
          </div>
        </div>

        <div
          className="ppd-stat-card ppd-stat-card--admins"
          title="Municipal Administrators"
        >
          <div className="ppd-stat-info">
            <span className="ppd-stat-label">Municipal Admins</span>
            <span className="ppd-stat-value">{adminCount}</span>
          </div>
          <div className="ppd-stat-icon">
            <i className="fa-solid fa-user-gear" />
          </div>
        </div>

        <div
          className={`ppd-stat-card ppd-stat-card--active ${status === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => {
            setStatus('ACTIVE');
            setPage(1);
          }}
          title="Active Duty Personnel"
        >
          <div className="ppd-stat-info">
            <span className="ppd-stat-label">Active Duty</span>
            <span className="ppd-stat-value">{activeCount}</span>
          </div>
          <div className="ppd-stat-icon">
            <i className="fa-solid fa-circle-check" />
          </div>
        </div>
      </div>

      {/* Filter Console */}
      <section className="ppd-filter-console" aria-label="Personnel Filter Console">
        <div className="ppd-filter-top">
          <div className="ppd-filter-title">
            <i className="fa-solid fa-sliders" />
            <span>Filter Personnel Roster</span>
          </div>

          <div className="ppd-filter-right">
            <span className="ppd-count-pill">
              Showing <strong>{personnel.length}</strong> of <strong>{total}</strong> personnel
            </span>
            <button
              type="button"
              className="ppd-clear-btn"
              onClick={clearAllFilters}
              disabled={activeFiltersCount === 0}
            >
              <i className="fa-solid fa-rotate-left" />
              Clear filters
            </button>
          </div>
        </div>

        <div className="ppd-filters-row">
          {/* Municipality select */}
          <div className="ppd-field">
            <label htmlFor="ppd-muni-select">
              <i className="fa-solid fa-location-dot" /> Municipality
            </label>
            <select
              id="ppd-muni-select"
              value={municipalityId}
              onChange={(e) => {
                setMunicipalityId(e.target.value);
                setStationId('');
                setPage(1);
              }}
            >
              <option value="">All Municipalities</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Station select */}
          <div className="ppd-field">
            <label htmlFor="ppd-station-select">
              <i className="fa-solid fa-building" /> Assigned Station
            </label>
            <select
              id="ppd-station-select"
              value={stationId}
              onChange={(e) => {
                setStationId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Stations</option>
              {stations
                .filter((s) => !municipalityId || s.municipalityId === municipalityId)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.stationName}</option>
                ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="ppd-field">
            <label htmlFor="ppd-status-select">
              <i className="fa-solid fa-tag" /> Status
            </label>
            <select
              id="ppd-status-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>

          {/* Search input */}
          <div className="ppd-field">
            <label htmlFor="ppd-search-input">
              <i className="fa-solid fa-magnifying-glass" /> Search Personnel
            </label>
            <div className="ppd-search-wrap">
              <i className="fa-solid fa-magnifying-glass ppd-search-icon" aria-hidden="true" />
              <input
                id="ppd-search-input"
                className="ppd-search-input"
                type="text"
                placeholder="Search name, rank, email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  className="ppd-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Error notification */}
      {error && (
        <div style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', borderRadius: '12px', padding: '1rem 1.25rem', color: '#E23632', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />{error}</span>
          <button type="button" onClick={() => fetchPersonnel()} style={{ background: '#E23632', color: '#FFF', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
        </div>
      )}

      {/* Personnel Table Card */}
      <div className="ppd-records-card">
        <div className="ppd-table-wrap">
          <table className="ppd-table">
            <thead>
              <tr>
                <th>OFFICER / STAFF</th>
                <th>RANK & POSITION</th>
                <th>MUNICIPALITY</th>
                <th>ASSIGNED STATION</th>
                <th>ROLE</th>
                <th>ACCOUNT</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && personnel.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td colSpan={7} style={{ padding: '1.4rem', textAlign: 'center', color: '#94A3B8' }}>
                      <i className="fa-solid fa-arrows-rotate fa-spin" style={{ marginRight: '0.5rem' }} />
                      Loading municipal BFP personnel roster…
                    </td>
                  </tr>
                ))
              ) : personnel.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: '#F1F5F9', display: 'grid', placeItems: 'center', margin: '0 auto 0.75rem', color: '#94A3B8', fontSize: '1.5rem' }}>
                      <i className="fa-solid fa-users-slash" />
                    </div>
                    <strong style={{ display: 'block', color: '#0F172A', fontSize: '1rem', marginBottom: '0.25rem' }}>No Personnel Records Found</strong>
                    <span style={{ fontSize: '0.8rem' }}>Try clearing filters or search criteria to view roster records.</span>
                  </td>
                </tr>
              ) : (
                personnel.map((p) => (
                  <tr key={p.userId} className="ppd-table-row">
                    <td>
                      <div className="ppd-officer-cell">
                        <div
                          className="ppd-avatar"
                          style={{ background: getAvatarGradient(p.displayName) }}
                        >
                          {getInitials(p.displayName)}
                        </div>
                        <div>
                          <div className="ppd-officer-name">{p.displayName}</div>
                          <div className="ppd-officer-meta">
                            <a href={`mailto:${p.email}`}>
                              <i className="fa-regular fa-envelope" /> {p.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="ppd-rank-badge">
                        <i className="fa-solid fa-award" style={{ color: '#E23632', fontSize: '0.7rem' }} />
                        {p.rankOrPosition || '—'}
                      </span>
                    </td>

                    <td>
                      <span className="ppd-location-badge">
                        <i className="fa-solid fa-location-dot" />
                        {p.municipalityName || <span style={{ color: '#94A3B8' }}>Unassigned</span>}
                      </span>
                    </td>

                    <td>
                      {p.stationName ? (
                        <span className="ppd-station-badge" title={p.stationName}>
                          <i className="fa-solid fa-building" />
                          {p.stationName}
                        </span>
                      ) : (
                        <span className="ppd-station-unassigned">No station assigned</span>
                      )}
                    </td>

                    <td>
                      {p.assignmentRole === 'MUNICIPAL_ADMIN' ? (
                        <span className="ppd-role-pill ppd-role-pill--admin">
                          <i className="fa-solid fa-crown" /> ADMIN
                        </span>
                      ) : (
                        <span className="ppd-role-pill ppd-role-pill--staff">
                          <i className="fa-solid fa-shield-halved" /> STAFF
                        </span>
                      )}
                    </td>

                    <td>
                      {p.accountStatus === 'ACTIVE' ? (
                        <span className="ppd-status-pill ppd-status-pill--active">
                          <span className="ppd-status-dot" /> ACTIVE
                        </span>
                      ) : (
                        <span className="ppd-status-pill ppd-status-pill--suspended">
                          <span className="ppd-status-dot" /> SUSPENDED
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="ppd-actions-cluster">
                        <button
                          type="button"
                          onClick={() => setEditingPerson(p)}
                          className="ppd-act-btn ppd-act-btn--edit"
                          title="Edit profile details"
                        >
                          <i className="fa-solid fa-pen" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAssigningStationPerson(p);
                            setTargetStationId(p.stationId || '');
                          }}
                          className="ppd-act-btn ppd-act-btn--station"
                          title="Assign station"
                        >
                          <i className="fa-solid fa-building-circle-check" /> Station
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTransferringPerson(p);
                            setTransferState({
                              municipalityId: p.municipalityId || '',
                              stationId: '',
                              assignmentRole: p.assignmentRole || 'MUNICIPAL_STAFF',
                              reason: '',
                            });
                          }}
                          className="ppd-act-btn ppd-act-btn--transfer"
                          title="Transfer municipality"
                        >
                          <i className="fa-solid fa-right-left" /> Transfer
                        </button>

                        {p.accountStatus === 'ACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => setSuspendingPerson(p)}
                            className="ppd-act-btn ppd-act-btn--suspend"
                            title="Suspend account access"
                          >
                            <i className="fa-solid fa-ban" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReactivate(p)}
                            className="ppd-act-btn ppd-act-btn--reactivate"
                            title="Reactivate account"
                          >
                            <i className="fa-solid fa-check" />
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
        <footer className="ppd-footer">
          <span>Showing <strong>{personnel.length}</strong> of <strong>{total}</strong> personnel</span>
          <div className="ppd-page-nav">
            <button
              type="button"
              className="ppd-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span style={{ fontWeight: 700, color: '#0F172A', padding: '0 0.4rem' }}>
              Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              type="button"
              className="ppd-page-btn"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </footer>
      </div>

      {/* Provision Personnel Modal */}
      {isCreating && (
        <div data-management-dialog className="ppd-modal-backdrop">
          <div className="ppd-modal-dialog" style={{ maxWidth: '540px' }}>
            <div className="ppd-modal-header">
              <h3 className="ppd-modal-title">
                <i className="fa-solid fa-user-plus" style={{ color: '#E23632' }} />
                Provision BFP Officer / Staff
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="ppd-modal-close-btn"
                aria-label="Close dialog"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="ppd-modal-form">
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>{actionError}</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="ppd-input-group">
                  <label>Official Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roberto Ramos"
                    value={newPerson.displayName}
                    onChange={(e) => setNewPerson({ ...newPerson, displayName: e.target.value })}
                  />
                </div>
                <div className="ppd-input-group">
                  <label>Official Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. r.ramos@bfp.gov.ph"
                    value={newPerson.email}
                    onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="ppd-input-group">
                  <label>Rank or Position</label>
                  <input
                    type="text"
                    placeholder="e.g. SFO1 / Driver"
                    value={newPerson.rankOrPosition}
                    onChange={(e) => setNewPerson({ ...newPerson, rankOrPosition: e.target.value })}
                  />
                </div>
                <div className="ppd-input-group">
                  <label>Role Assignment</label>
                  <select
                    value={newPerson.assignmentRole}
                    onChange={(e) => setNewPerson({ ...newPerson, assignmentRole: e.target.value as "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" })}
                  >
                    <option value="MUNICIPAL_STAFF">Municipal Staff / Responder</option>
                    <option value="MUNICIPAL_ADMIN">Municipal Administrator</option>
                  </select>
                </div>
              </div>

              <div className="ppd-input-group">
                <label>Temporary Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={newPerson.temporaryPassword}
                  onChange={(event) => setNewPerson({ ...newPerson, temporaryPassword: event.target.value })}
                  placeholder="Min 12 characters..."
                />
                <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                  Use at least 12 characters. The officer must change this upon first sign-in.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="ppd-input-group">
                  <label>Municipality (Antique)</label>
                  <select
                    required
                    value={newPerson.municipalityId}
                    onChange={(e) => setNewPerson({ ...newPerson, municipalityId: e.target.value, stationId: '' })}
                  >
                    <option value="">Select Municipality...</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="ppd-input-group">
                  <label>Initial Station (Optional)</label>
                  <select
                    value={newPerson.stationId}
                    onChange={(e) => setNewPerson({ ...newPerson, stationId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {stations
                      .filter((s) => s.municipalityId === newPerson.municipalityId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.stationName}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="ppd-modal-footer">
                <button type="button" onClick={() => setIsCreating(false)} className="ppd-btn-cancel">Cancel</button>
                <button type="submit" disabled={submitting} className="ppd-btn-submit">
                  {submitting ? 'Provisioning…' : 'Issue Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingPerson && (
        <div data-management-dialog className="ppd-modal-backdrop">
          <div className="ppd-modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="ppd-modal-header">
              <h3 className="ppd-modal-title">
                <i className="fa-solid fa-pen" style={{ color: '#E23632' }} />
                Edit Personnel Profile
              </h3>
              <button type="button" onClick={() => setEditingPerson(null)} className="ppd-modal-close-btn" aria-label="Close dialog">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="ppd-modal-form">
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <div className="ppd-input-group">
                <label>Email Address (Immutable)</label>
                <input type="text" disabled value={editingPerson.email} style={{ background: '#F8FAFC', color: '#64748B' }} />
              </div>
              <div className="ppd-input-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={editingPerson.displayName}
                  onChange={(e) => setEditingPerson({ ...editingPerson, displayName: e.target.value })}
                />
              </div>
              <div className="ppd-input-group">
                <label>Rank / Position</label>
                <input
                  type="text"
                  value={editingPerson.rankOrPosition || ''}
                  onChange={(e) => setEditingPerson({ ...editingPerson, rankOrPosition: e.target.value })}
                />
              </div>
              <div className="ppd-modal-footer">
                <button type="button" onClick={() => setEditingPerson(null)} className="ppd-btn-cancel">Cancel</button>
                <button type="submit" disabled={submitting} className="ppd-btn-submit">
                  {submitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Station Modal */}
      {assigningStationPerson && (
        <div data-management-dialog className="ppd-modal-backdrop">
          <div className="ppd-modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="ppd-modal-header">
              <h3 className="ppd-modal-title">
                <i className="fa-solid fa-building-circle-check" style={{ color: '#2563EB' }} />
                Assign Station: {assigningStationPerson.displayName}
              </h3>
              <button type="button" onClick={() => setAssigningStationPerson(null)} className="ppd-modal-close-btn" aria-label="Close dialog">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={handleAssignStation} className="ppd-modal-form">
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '0.85rem 1rem', color: '#1E40AF', fontSize: '0.825rem' }}>
                Assigning within <strong>{assigningStationPerson.municipalityName}</strong> municipality. Select an active station or unassign.
              </div>
              <div className="ppd-input-group">
                <label>Target Fire Station</label>
                <select
                  value={targetStationId}
                  onChange={(e) => setTargetStationId(e.target.value)}
                >
                  <option value="">No Station (Unassigned)</option>
                  {stations
                    .filter((s) => s.municipalityId === assigningStationPerson.municipalityId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.stationName}</option>
                    ))}
                </select>
              </div>
              <div className="ppd-modal-footer">
                <button type="button" onClick={() => setAssigningStationPerson(null)} className="ppd-btn-cancel">Cancel</button>
                <button type="submit" disabled={submitting} className="ppd-btn-submit" style={{ background: '#2563EB' }}>
                  {submitting ? 'Assigning…' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Municipality Modal */}
      {transferringPerson && (
        <div data-management-dialog className="ppd-modal-backdrop">
          <div className="ppd-modal-dialog" style={{ maxWidth: '520px' }}>
            <div className="ppd-modal-header" style={{ background: '#F5F3FF', borderBottomColor: '#E9D5FF' }}>
              <h3 className="ppd-modal-title" style={{ color: '#7C3AED' }}>
                <i className="fa-solid fa-right-left" />
                Transfer Personnel: {transferringPerson.displayName}
              </h3>
              <button type="button" onClick={() => setTransferringPerson(null)} className="ppd-modal-close-btn" aria-label="Close dialog">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="ppd-modal-form">
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.825rem', color: '#334155' }}>
                Current Municipality: <strong>{transferringPerson.municipalityName}</strong> · Station: <strong>{transferringPerson.stationName || 'Unassigned'}</strong>
              </div>
              <div className="ppd-input-group">
                <label>Destination Municipality (Antique)</label>
                <select
                  required
                  value={transferState.municipalityId}
                  onChange={(e) => setTransferState({ ...transferState, municipalityId: e.target.value, stationId: '' })}
                >
                  <option value="">Select Destination Municipality...</option>
                  {municipalities
                    .filter((m) => m.id !== transferringPerson.municipalityId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="ppd-input-group">
                  <label>Destination Role</label>
                  <select
                    value={transferState.assignmentRole}
                    onChange={(e) => setTransferState({ ...transferState, assignmentRole: e.target.value as "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" })}
                  >
                    <option value="MUNICIPAL_STAFF">Municipal Staff</option>
                    <option value="MUNICIPAL_ADMIN">Municipal Administrator</option>
                  </select>
                </div>
                <div className="ppd-input-group">
                  <label>Destination Station</label>
                  <select
                    value={transferState.stationId}
                    onChange={(e) => setTransferState({ ...transferState, stationId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {stations
                      .filter((s) => s.municipalityId === transferState.municipalityId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.stationName}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="ppd-input-group">
                <label>Transfer Reason & Authority</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Special order for regional operational repositioning..."
                  value={transferState.reason}
                  onChange={(e) => setTransferState({ ...transferState, reason: e.target.value })}
                />
              </div>
              <div className="ppd-modal-footer">
                <button type="button" onClick={() => setTransferringPerson(null)} className="ppd-btn-cancel">Cancel</button>
                <button type="submit" disabled={submitting || !transferState.municipalityId} className="ppd-btn-submit" style={{ background: '#7C3AED' }}>
                  {submitting ? 'Transferring…' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Account Modal */}
      {suspendingPerson && (
        <div data-management-dialog className="ppd-modal-backdrop">
          <div className="ppd-modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="ppd-modal-header" style={{ background: '#FFF1F2', borderBottomColor: '#FECACA' }}>
              <h3 className="ppd-modal-title" style={{ color: '#E23632' }}>
                <i className="fa-solid fa-triangle-exclamation" />
                Suspend Account: {suspendingPerson.displayName}
              </h3>
              <button type="button" onClick={() => setSuspendingPerson(null)} className="ppd-modal-close-btn" aria-label="Close dialog">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="ppd-modal-form">
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                Suspending this account will immediately revoke all access and refuse existing sessions on the next API call.
              </p>
              <div className="ppd-input-group">
                <label>Mandatory Suspension Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the administrative or disciplinary reason..."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                />
              </div>
              <div className="ppd-modal-footer">
                <button type="button" onClick={() => setSuspendingPerson(null)} className="ppd-btn-cancel">Cancel</button>
                <button
                  type="button"
                  disabled={submitting || !suspensionReason.trim()}
                  onClick={handleSuspend}
                  className="ppd-btn-submit"
                >
                  {submitting ? 'Suspending…' : 'Confirm Suspension'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
