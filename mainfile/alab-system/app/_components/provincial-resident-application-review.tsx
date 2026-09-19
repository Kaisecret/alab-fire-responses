'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProvincialManagementToolbar, ProvincialMunicipalityFilter, ProvincialManagementPagination } from './provincial-management-toolbar';
import { useProvincialManagementList } from './use-provincial-management-list';
import { useManagementDialog } from './use-management-dialog';
import { PhotoLightbox } from './photo-lightbox';
import type { ManagedApplication } from '../../lib/provincial-bfp/management/types';

interface ApplicationReviewProps {
  initialMunicipalityId?: string;
}

const reviewStyles = `
  .par-container {
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
    --orange-600: #EA580C;
    --orange-50: #FFF7ED;
    --blue-600: #2563EB;
    --blue-50: #EFF6FF;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: var(--navy-800);
  }

  .par-container ::selection {
    background: #FEE2E2;
    color: #991B1B;
  }

  /* Command Header */
  .par-header-card {
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

  .par-header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
  }

  .par-header-icon-box {
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

  .par-kicker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--red-600);
  }

  .par-kicker-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--emerald-600);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.2);
    animation: parPulse 2s infinite;
  }

  @keyframes parPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.9); }
  }

  .par-title {
    margin: 0.2rem 0 0;
    font-size: clamp(1.25rem, 2vw, 1.55rem);
    font-weight: 800;
    color: var(--navy-900);
    letter-spacing: -0.025em;
    line-height: 1.2;
  }

  .par-subtitle {
    margin: 0.3rem 0 0;
    font-size: 0.825rem;
    color: var(--slate-500);
  }

  .par-header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .par-btn-refresh {
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

  .par-btn-refresh:hover:not(:disabled) {
    background: var(--slate-50);
    border-color: #94A3B8;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
  }

  .par-btn-refresh:active:not(:disabled) {
    transform: scale(0.98);
  }

  .par-header-actions .no-print button {
    min-height: 42px !important;
    padding: 0.65rem 1.15rem !important;
    border-radius: 10px !important;
    border: 1px solid var(--red-600) !important;
    background: var(--red-600) !important;
    color: #FFFFFF !important;
    font: inherit !important;
    font-size: 0.825rem !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.5rem !important;
    box-shadow: 0 4px 14px rgba(226, 54, 50, 0.25) !important;
    transition: all 0.15s ease !important;
  }

  .par-header-actions .no-print button:hover:not(:disabled) {
    background: var(--red-700) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 18px rgba(226, 54, 50, 0.35) !important;
  }

  /* KPI Summary Stats */
  .par-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 1rem;
  }

  .par-stat-card {
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
    position: relative;
    overflow: hidden;
  }

  .par-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.08);
  }

  .par-stat-card.active {
    border-color: var(--navy-800);
    box-shadow: 0 0 0 2px var(--navy-800);
  }

  .par-stat-info {
    display: flex;
    flex-direction: column;
  }

  .par-stat-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--slate-500);
  }

  .par-stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--navy-900);
    line-height: 1.2;
    margin-top: 0.25rem;
    font-variant-numeric: tabular-nums;
  }

  .par-stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-size: 1.15rem;
  }

  .par-stat-card--all .par-stat-icon { background: #F1F5F9; color: var(--navy-700); }
  .par-stat-card--pending .par-stat-icon { background: #FEF3C7; color: #D97706; }
  .par-stat-card--verified .par-stat-icon { background: #D1FAE5; color: #059669; }
  .par-stat-card--changes .par-stat-icon { background: #FFEDD5; color: #EA580C; }

  /* Filter Console */
  .par-filter-console {
    background: #FFFFFF;
    border: 1px solid var(--slate-200);
    border-radius: 14px;
    padding: 1.15rem 1.25rem;
    box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.03);
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .par-filter-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--slate-100);
    padding-bottom: 0.75rem;
  }

  .par-filter-title {
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--navy-800);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .par-filter-title i {
    color: var(--red-600);
  }

  .par-filter-right {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .par-count-pill {
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--slate-500);
    background: var(--slate-100);
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
  }

  .par-clear-btn {
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

  .par-clear-btn:hover:not(:disabled) {
    background: #FEE2E2;
  }

  .par-clear-btn:disabled {
    color: var(--slate-400);
    cursor: default;
  }

  .par-filters-row {
    display: grid;
    grid-template-columns: minmax(220px, 1.2fr) minmax(180px, 0.9fr) minmax(260px, 1.6fr);
    gap: 1rem;
    align-items: end;
  }

  .par-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .par-field label, .par-municipality-field label {
    font-size: 0.7rem !important;
    font-weight: 800 !important;
    color: var(--navy-700) !important;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .par-field label i, .par-municipality-field label i {
    color: var(--slate-400);
  }

  .par-field select, .par-field input, .par-municipality-field select {
    width: 100%;
    min-height: 42px;
    box-sizing: border-box;
    padding: 0.6rem 0.85rem;
    border: 1px solid #CBD5E1 !important;
    border-radius: 9px !important;
    background: #FFFFFF;
    color: var(--navy-900);
    font: inherit;
    font-size: 0.825rem !important;
    transition: all 0.15s ease;
  }

  .par-field select:hover, .par-field input:hover, .par-municipality-field select:hover {
    border-color: #94A3B8 !important;
  }

  .par-field select:focus, .par-field input:focus, .par-municipality-field select:focus {
    border-color: var(--navy-800) !important;
    box-shadow: 0 0 0 3px rgba(30, 41, 59, 0.1);
    outline: none;
  }

  .par-search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .par-search-icon {
    position: absolute;
    left: 0.85rem;
    color: var(--slate-400);
    font-size: 0.82rem;
    pointer-events: none;
  }

  .par-search-input {
    padding-left: 2.3rem !important;
    padding-right: 2rem !important;
  }

  .par-search-clear {
    position: absolute;
    right: 0.75rem;
    background: transparent;
    border: none;
    color: var(--slate-400);
    font-size: 0.82rem;
    cursor: pointer;
    padding: 0.2rem;
  }

  .par-search-clear:hover {
    color: var(--navy-800);
  }

  /* Records Section */
  .par-records-card {
    background: #FFFFFF;
    border: 1px solid var(--slate-200);
    border-radius: 16px;
    box-shadow: 0 4px 24px -2px rgba(15, 23, 42, 0.05);
    overflow: hidden;
  }

  .par-table-wrap {
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: #CBD5E1 transparent;
  }

  .par-table {
    width: 100%;
    min-width: 980px;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.825rem;
  }

  .par-table thead {
    background: var(--slate-50);
    border-bottom: 1px solid var(--slate-200);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .par-table th {
    padding: 0.95rem 1.15rem;
    font-size: 0.68rem;
    font-weight: 800;
    color: var(--navy-700);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .par-table-row {
    border-bottom: 1px solid var(--slate-100);
    transition: background-color 0.15s ease, box-shadow 0.15s ease;
  }

  .par-table-row:hover {
    background: #F8FBFF;
    box-shadow: inset 3px 0 0 var(--red-600);
  }

  .par-table-row.selected {
    background: #EFF6FF;
    box-shadow: inset 3px 0 0 var(--blue-600);
  }

  .par-table td {
    padding: 1rem 1.15rem;
    vertical-align: middle;
  }

  /* Reference Cell */
  .par-ref-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .par-ref-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-weight: 800;
    font-size: 0.8rem;
    color: var(--navy-900);
    letter-spacing: 0.02em;
    background: var(--slate-100);
    padding: 3px 7px;
    border-radius: 6px;
    border: 1px solid #CBD5E1;
  }

  .par-btn-copy {
    background: transparent;
    border: none;
    color: var(--slate-400);
    cursor: pointer;
    padding: 4px;
    font-size: 0.78rem;
    border-radius: 4px;
    transition: color 0.15s ease;
  }

  .par-btn-copy:hover {
    color: var(--navy-900);
  }

  /* Applicant Cell */
  .par-applicant-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .par-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    color: #FFFFFF;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 0.82rem;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }

  .par-applicant-name {
    font-weight: 700;
    color: var(--navy-900);
    font-size: 0.875rem;
    line-height: 1.25;
  }

  .par-applicant-meta {
    font-size: 0.74rem;
    color: var(--slate-500);
    margin-top: 0.2rem;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .par-applicant-meta a {
    color: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .par-applicant-meta a:hover {
    color: var(--navy-900);
    text-decoration: underline;
  }

  /* Location Cell */
  .par-location-cell {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .par-muni-name {
    font-weight: 700;
    color: var(--navy-800);
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .par-muni-name i {
    color: var(--red-600);
    font-size: 0.7rem;
  }

  .par-brgy-name {
    font-size: 0.74rem;
    color: var(--slate-500);
    padding-left: 0.85rem;
  }

  /* Submission Version Badge */
  .par-subm-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.55rem;
    border-radius: 6px;
    background: #F1F5F9;
    border: 1px solid #CBD5E1;
    color: var(--navy-700);
    font-weight: 800;
    font-size: 0.75rem;
  }

  /* Status Pill */
  .par-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    border: 1px solid transparent;
  }

  .par-status-pill--pending {
    background: var(--amber-50);
    color: #92400E;
    border-color: #FDE68A;
  }

  .par-status-pill--verified {
    background: var(--emerald-50);
    color: #065F46;
    border-color: #A7F3D0;
  }

  .par-status-pill--changes {
    background: var(--orange-50);
    color: #9A3412;
    border-color: #FED7AA;
  }

  .par-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  /* Action Button */
  .par-btn-review {
    background: var(--red-600);
    color: #FFFFFF;
    border: none;
    padding: 0.55rem 0.95rem;
    border-radius: 8px;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    box-shadow: 0 2px 6px rgba(226, 54, 50, 0.2);
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .par-btn-review:hover {
    background: var(--red-700);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(226, 54, 50, 0.3);
  }

  .par-btn-review:active {
    transform: scale(0.98);
  }

  /* Loading & Empty States */
  .par-state-box {
    padding: 3.5rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--slate-500);
  }

  .par-state-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: var(--slate-100);
    display: grid;
    place-items: center;
    color: var(--slate-400);
    font-size: 1.4rem;
    margin-bottom: 0.9rem;
  }

  .par-state-title {
    font-weight: 800;
    color: var(--navy-900);
    font-size: 0.95rem;
    margin-bottom: 0.3rem;
  }

  /* Shimmer Skeleton */
  .par-skeleton-row {
    display: grid;
    grid-template-columns: 1.2fr 1.8fr 1.2fr 0.6fr 1fr 1fr 0.8fr;
    gap: 1rem;
    padding: 1.25rem 1.15rem;
    border-bottom: 1px solid var(--slate-100);
  }

  .par-skeleton-bar {
    height: 16px;
    border-radius: 9999px;
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 200% 100%;
    animation: parShimmer 1.5s infinite linear;
  }

  @keyframes parShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Dossier Slide-Over Modal */
  .par-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.68);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    justify-content: flex-end;
    z-index: 99999;
    animation: parFadeIn 0.2s ease-out;
  }

  @keyframes parFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .par-modal-drawer {
    width: 100%;
    max-width: 760px;
    background: #FFFFFF;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: -12px 0 40px rgba(15, 23, 42, 0.25);
    animation: parSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  @keyframes parSlideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .par-drawer-header {
    padding: 1.25rem 1.75rem;
    background: #FFFFFF;
    border-bottom: 1px solid var(--slate-200);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    flex-shrink: 0;
  }

  .par-drawer-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--red-600);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .par-drawer-title {
    margin: 0.25rem 0 0;
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--navy-900);
    letter-spacing: -0.02em;
  }

  .par-drawer-meta-bar {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .par-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--slate-200);
    background: var(--slate-50);
    color: var(--navy-700);
    font-size: 1.15rem;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .par-close-btn:hover:not(:disabled) {
    background: #FEE2E2;
    border-color: #FECACA;
    color: var(--red-600);
    transform: rotate(90deg);
  }

  .par-drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Profile Card in Dossier */
  .par-profile-card {
    background: var(--slate-50);
    border: 1px solid var(--slate-200);
    border-radius: 14px;
    padding: 1.25rem 1.35rem;
  }

  .par-profile-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--navy-700);
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--slate-200);
    padding-bottom: 0.65rem;
  }

  .par-profile-card-header i {
    color: var(--red-600);
  }

  .par-profile-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem 1.25rem;
    font-size: 0.825rem;
  }

  .par-profile-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .par-profile-label {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--slate-500);
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .par-profile-value {
    font-weight: 700;
    color: var(--navy-900);
    word-break: break-word;
  }

  .par-profile-value a {
    color: inherit;
    text-decoration: none;
  }

  .par-profile-value a:hover {
    color: var(--red-600);
    text-decoration: underline;
  }

  /* Identity Evidence Cards */
  .par-section-heading {
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--navy-900);
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .par-section-heading-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .par-section-heading-left i {
    color: var(--red-600);
  }

  .par-evidence-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .par-evidence-card {
    background: #FFFFFF;
    border: 1px solid var(--slate-200);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .par-evidence-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
    border-color: #CBD5E1;
  }

  .par-evidence-header {
    padding: 0.6rem 0.85rem;
    background: var(--slate-50);
    border-bottom: 1px solid var(--slate-200);
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--navy-700);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .par-evidence-header span {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .par-evidence-img-wrap {
    position: relative;
    height: 150px;
    background: #0F172A;
    cursor: pointer;
    overflow: hidden;
  }

  .par-evidence-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.25s ease;
  }

  .par-evidence-card:hover .par-evidence-img {
    transform: scale(1.04);
  }

  .par-evidence-hover-overlay {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    color: #FFFFFF;
    opacity: 0;
    transition: opacity 0.2s ease;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .par-evidence-img-wrap:hover .par-evidence-hover-overlay {
    opacity: 1;
  }

  .par-evidence-empty {
    height: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: var(--slate-50);
    border: 2px dashed var(--slate-200);
    color: var(--slate-400);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 1rem;
    text-align: center;
  }

  /* Timeline */
  .par-timeline {
    display: flex;
    flex-direction: column;
    position: relative;
    padding-left: 1.5rem;
    gap: 1.25rem;
  }

  .par-timeline::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 4px;
    bottom: 4px;
    width: 2px;
    background: var(--slate-200);
  }

  .par-timeline-item {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .par-timeline-node {
    position: absolute;
    left: -1.5rem;
    top: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #FFFFFF;
    border: 2px solid #94A3B8;
    color: #475569;
    font-size: 0.55rem;
    z-index: 2;
  }

  .par-timeline-node--approved {
    border-color: var(--emerald-600);
    background: var(--emerald-600);
    color: #FFFFFF;
  }

  .par-timeline-node--corrections {
    border-color: var(--orange-600);
    background: var(--orange-600);
    color: #FFFFFF;
  }

  .par-timeline-node--resubmitted {
    border-color: var(--blue-600);
    background: var(--blue-600);
    color: #FFFFFF;
  }

  .par-timeline-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.78rem;
  }

  .par-timeline-badge {
    font-weight: 800;
    font-size: 0.72rem;
    padding: 2px 7px;
    border-radius: 5px;
    background: var(--slate-100);
    color: var(--navy-800);
  }

  .par-timeline-badge--approved { background: #D1FAE5; color: #065F46; }
  .par-timeline-badge--corrections { background: #FFEDD5; color: #9A3412; }
  .par-timeline-badge--resubmitted { background: #DBEAFE; color: #1E40AF; }

  .par-timeline-time {
    color: var(--slate-500);
    font-size: 0.74rem;
  }

  .par-timeline-note {
    background: #FFFFFF;
    border: 1px solid var(--slate-200);
    border-radius: 8px;
    padding: 0.65rem 0.85rem;
    font-size: 0.78rem;
    color: var(--navy-800);
    line-height: 1.4;
    border-left: 3px solid #CBD5E1;
  }

  .par-timeline-note--alert {
    background: #FFF7ED;
    border-color: #FED7AA;
    border-left-color: #EA580C;
    color: #9A3412;
  }

  /* Review Actions Deck */
  .par-actions-deck {
    background: var(--slate-50);
    border: 1px solid var(--slate-200);
    border-radius: 14px;
    padding: 1.25rem 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }

  .par-actions-heading {
    font-size: 0.875rem;
    font-weight: 800;
    color: var(--navy-900);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .par-actions-heading i {
    color: var(--red-600);
  }

  .par-btn-approve {
    width: 100%;
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    color: #FFFFFF;
    border: none;
    padding: 0.8rem 1.25rem;
    border-radius: 10px;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);
    transition: all 0.15s ease;
  }

  .par-btn-approve:hover:not(:disabled) {
    background: linear-gradient(135deg, #047857 0%, #065F46 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(5, 150, 105, 0.35);
  }

  .par-btn-approve:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  .par-corrections-box {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    background: #FFFFFF;
    border: 1px solid var(--slate-200);
    border-radius: 10px;
    padding: 1rem;
  }

  .par-preset-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .par-chip {
    background: var(--slate-100);
    border: 1px solid var(--slate-200);
    border-radius: 9999px;
    padding: 3px 9px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--navy-700);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .par-chip:hover {
    background: #FEE2E2;
    border-color: #FECACA;
    color: var(--red-600);
  }

  .par-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem 0.85rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    font: inherit;
    font-size: 0.825rem;
    color: var(--navy-900);
    resize: vertical;
    outline: none;
    transition: all 0.15s ease;
  }

  .par-textarea:focus {
    border-color: var(--amber-600);
    box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.12);
  }

  .par-btn-corrections {
    background: var(--amber-600);
    color: #FFFFFF;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    font: inherit;
    font-size: 0.825rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.15s ease;
  }

  .par-btn-corrections:hover:not(:disabled) {
    background: #B45309;
    transform: translateY(-1px);
  }

  .par-btn-corrections:disabled {
    background: #CBD5E1;
    cursor: not-allowed;
  }

  /* Verified Processed Banner */
  .par-verified-banner {
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    border-radius: 12px;
    padding: 1.15rem;
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    color: #065F46;
  }

  .par-verified-banner i {
    font-size: 1.35rem;
    color: var(--emerald-600);
    margin-top: 2px;
  }

  .par-banner-content strong {
    display: block;
    font-size: 0.9rem;
    font-weight: 800;
    margin-bottom: 0.2rem;
  }

  .par-banner-content span {
    font-size: 0.8rem;
    color: #047857;
  }

  /* Mobile Responsive */
  @media (max-width: 960px) {
    .par-filters-row {
      grid-template-columns: 1fr;
    }
    .par-evidence-grid {
      grid-template-columns: 1fr;
    }
    .par-profile-grid {
      grid-template-columns: 1fr;
    }
    .par-header-card {
      flex-direction: column;
      align-items: flex-start;
    }
    .par-header-actions {
      width: 100%;
    }
    .par-header-actions > * {
      flex: 1 1 auto;
    }
    .par-btn-refresh, .par-header-actions .no-print button {
      width: 100%;
      justify-content: center;
    }
  }
`;

export function ProvincialResidentApplicationReview({ initialMunicipalityId = '' }: ApplicationReviewProps) {
  const {
    items: applications,
    total,
    page,
    pageSize,
    setPage,
    loading,
    error,
    filters,
    setFilter,
    setFilters,
    refresh: fetchApplications,
  } = useProvincialManagementList<ManagedApplication>({
    endpoint: '/api/provincial-bfp/resident-applications',
    initialFilters: { municipalityId: initialMunicipalityId },
  });

  const municipalityFilter = filters.municipalityId || '';
  const setMunicipalityFilter = (value: string) => setFilter('municipalityId', value);
  const statusFilter = filters.status || '';
  const setStatusFilter = (value: string) => setFilter('status', value);
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);

  // Review Dossier State
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<ManagedApplication | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  // Lightbox Photo Inspection
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Action states
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const detailController = useRef<AbortController | null>(null);
  const operation = useRef<{ payload: string; requestId: string } | null>(null);

  useEffect(() => () => detailController.current?.abort(), []);

  const operationId = (payload: string) => {
    if (operation.current?.payload !== payload) {
      operation.current = { payload, requestId: crypto.randomUUID() };
    }
    return operation.current.requestId;
  };

  const loadDossier = async (id: string) => {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setDossier(null);
    setSelectedAppId(id);
    setDossierLoading(true);
    setDossierError(null);
    setActionSuccess(null);
    setActionError(null);
    setCorrectionReason('');
    setLightboxIndex(null);

    try {
      const res = await fetch(`/api/provincial-bfp/resident-applications/${id}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load application dossier');
      }
      const data = await res.json();
      if (!controller.signal.aborted) setDossier(data.application);
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setDossierError(err instanceof Error ? err.message : 'Error fetching application dossier');
      }
    } finally {
      if (!controller.signal.aborted) setDossierLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!dossier) return;
    if (!window.confirm(`Are you sure you want to APPROVE ${dossier.firstName} ${dossier.lastName}'s resident application?`)) {
      return;
    }

    setIsApproving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/provincial-bfp/resident-applications/${dossier.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedSubmissionNumber: dossier.submissionNumber,
          requestId: operationId(`${dossier.id}:${dossier.submissionNumber}:approve`),
          reason: 'Verified and approved by Provincial BFP Command',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Approval failed');
      }

      await loadDossier(dossier.id);
      setActionSuccess('Application approval saved successfully.');
      fetchApplications();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to approve application');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestCorrections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier) return;
    if (correctionReason.trim().length < 10) {
      setActionError('Correction reason must be at least 10 characters detailing what needs to be changed.');
      return;
    }

    setIsRejecting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/provincial-bfp/resident-applications/${dossier.id}/request-corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedSubmissionNumber: dossier.submissionNumber,
          requestId: operationId(`${dossier.id}:${dossier.submissionNumber}:corrections:${correctionReason.trim()}`),
          message: correctionReason.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Requesting corrections failed');
      }

      await loadDossier(dossier.id);
      const deliveries = Array.isArray(data.delivery) ? (data.delivery as Array<{ channel: string; status: string }>) : [];
      setActionSuccess(
        `Correction request saved. ${
          deliveries.length
            ? deliveries.map((item) => `${item.channel}: ${item.status.replaceAll('_', ' ').toLowerCase()}`).join('; ')
            : 'Notification delivery is queued.'
        }`
      );
      fetchApplications();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to request corrections');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Close modal via useManagementDialog (locked when approving/rejecting or lightbox open)
  useManagementDialog(
    !!selectedAppId,
    () => {
      if (lightboxIndex !== null) {
        setLightboxIndex(null);
      } else {
        setSelectedAppId(null);
      }
    },
    isApproving || isRejecting || lightboxIndex !== null
  );

  // Evidence photos list for Lightbox
  const evidencePhotos = useMemo(() => {
    if (!dossier?.evidence) return [];
    return [dossier.evidence.frontUrl, dossier.evidence.backUrl, dossier.evidence.selfieUrl].filter(Boolean) as string[];
  }, [dossier]);

  // Quick preset chips for corrections
  const correctionPresets = [
    'The submitted ID photo is blurry and illegible. Please upload a clear photo.',
    'The back of the government ID is missing. Please upload the back side.',
    'The selfie verification photo is unclear or does not match the ID photo.',
    'The government ID appears to be expired. Please upload a valid, unexpired ID.',
    'Residential address details require clarification or matching utility proof.',
  ];

  const applyPreset = (preset: string) => {
    setCorrectionReason(preset);
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="par-status-pill par-status-pill--pending">
            <span className="par-status-dot" />
            Pending Review
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="par-status-pill par-status-pill--verified">
            <span className="par-status-dot" />
            Verified
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="par-status-pill par-status-pill--changes">
            <span className="par-status-dot" />
            Changes Requested
          </span>
        );
      default:
        return (
          <span className="par-status-pill" style={{ background: '#E2E8F0', color: '#475569' }}>
            <span className="par-status-dot" />
            {status}
          </span>
        );
    }
  };

  const getInitials = (first: string, last: string) => {
    const f = first ? first.trim()[0].toUpperCase() : '';
    const l = last ? last.trim()[0].toUpperCase() : '';
    return `${f}${l}` || 'U';
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

  const formatDateTime = (val: string) => {
    if (!val) return '—';
    try {
      return new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
      }).format(new Date(val));
    } catch {
      return val;
    }
  };

  // Active filters count
  const activeFiltersCount = [municipalityFilter, statusFilter && statusFilter !== 'ALL', search].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Stat counts based on loaded queue
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;
  const verifiedCount = applications.filter((a) => a.status === 'VERIFIED').length;
  const changesCount = applications.filter((a) => a.status === 'CHANGES_REQUESTED').length;

  return (
    <section className="par-container" aria-label="Provincial Resident Applications Review">
      <style>{reviewStyles}</style>

      {/* Header Bar */}
      <header className="par-header-card">
        <div className="par-header-left">
          <div className="par-header-icon-box" aria-hidden="true">
            <i className="fa-solid fa-id-card-clip" />
          </div>
          <div>
            <div className="par-kicker">
              <span className="par-kicker-dot" />
              <span>BUREAU OF FIRE PROTECTION • REGION VI</span>
            </div>
            <h1 className="par-title">Resident Applications Review</h1>
            <p className="par-subtitle">
              Provincial jurisdiction queue for reviewing, verifying, and requesting corrections on resident accounts across Antique.
            </p>
          </div>
        </div>

        <div className="par-header-actions">
          <button
            type="button"
            className="par-btn-refresh"
            onClick={fetchApplications}
            disabled={loading}
            aria-label="Refresh Queue"
          >
            <i className={`fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}`} aria-hidden="true" />
            {loading ? 'Refreshing…' : '↻ Refresh Queue'}
          </button>
          <ProvincialManagementToolbar exportOnly dataset="APPLICATIONS" filters={filters} onFilterChange={() => {}} />
        </div>
      </header>

      {/* KPI Stats Bar */}
      <div className="par-stats-grid" role="region" aria-label="Application summary metrics">
        <div
          className={`par-stat-card par-stat-card--all ${!statusFilter || statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          title="Click to view all applications"
        >
          <div className="par-stat-info">
            <span className="par-stat-label">Total Applications</span>
            <span className="par-stat-value">{total}</span>
          </div>
          <div className="par-stat-icon">
            <i className="fa-solid fa-folder-open" />
          </div>
        </div>

        <div
          className={`par-stat-card par-stat-card--pending ${statusFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('PENDING');
            setPage(1);
          }}
          title="Click to filter by Pending Review"
        >
          <div className="par-stat-info">
            <span className="par-stat-label">Pending Review</span>
            <span className="par-stat-value">{pendingCount}</span>
          </div>
          <div className="par-stat-icon">
            <i className="fa-solid fa-clock-rotate-left" />
          </div>
        </div>

        <div
          className={`par-stat-card par-stat-card--verified ${statusFilter === 'VERIFIED' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('VERIFIED');
            setPage(1);
          }}
          title="Click to filter by Verified"
        >
          <div className="par-stat-info">
            <span className="par-stat-label">Verified Accounts</span>
            <span className="par-stat-value">{verifiedCount}</span>
          </div>
          <div className="par-stat-icon">
            <i className="fa-solid fa-circle-check" />
          </div>
        </div>

        <div
          className={`par-stat-card par-stat-card--changes ${statusFilter === 'CHANGES_REQUESTED' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('CHANGES_REQUESTED');
            setPage(1);
          }}
          title="Click to filter by Changes Requested"
        >
          <div className="par-stat-info">
            <span className="par-stat-label">Changes Requested</span>
            <span className="par-stat-value">{changesCount}</span>
          </div>
          <div className="par-stat-icon">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
        </div>
      </div>

      {/* Filter Console */}
      <section className="par-filter-console" aria-label="Queue Filter Console">
        <div className="par-filter-top">
          <div className="par-filter-title">
            <i className="fa-solid fa-sliders" />
            <span>Filter Resident Applications</span>
          </div>

          <div className="par-filter-right">
            <span className="par-count-pill">
              Showing <strong>{applications.length}</strong> of <strong>{total}</strong> applications
            </span>
            <button
              type="button"
              className="par-clear-btn"
              onClick={clearAllFilters}
              disabled={activeFiltersCount === 0}
            >
              <i className="fa-solid fa-rotate-left" />
              Clear filters
            </button>
          </div>
        </div>

        <div className="par-filters-row">
          <div className="par-field par-municipality-field">
            <ProvincialMunicipalityFilter value={municipalityFilter} onChange={(val) => { setMunicipalityFilter(val); setPage(1); }} />
          </div>

          <div className="par-field">
            <label htmlFor="par-status-select">
              <i className="fa-solid fa-tag" /> Status
            </label>
            <select
              id="par-status-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>

          <div className="par-field">
            <label htmlFor="par-search-input">
              <i className="fa-solid fa-magnifying-glass" /> Search Applicant
            </label>
            <div className="par-search-wrap">
              <i className="fa-solid fa-magnifying-glass par-search-icon" aria-hidden="true" />
              <input
                id="par-search-input"
                className="par-search-input"
                type="text"
                placeholder="Search by name, reference, email, or phone…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  className="par-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search text"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Applications Table */}
      <div className="par-records-card">
        {error && (
          <div style={{ padding: '1rem 1.25rem', background: '#FEE2E2', color: '#991B1B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <i className="fa-solid fa-triangle-exclamation" />
            <span><strong>Queue Sync Error:</strong> {error}</span>
          </div>
        )}

        {loading && applications.length === 0 ? (
          <div aria-label="Loading applications">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="par-skeleton-row">
                <span className="par-skeleton-bar" style={{ width: '80%' }} />
                <span className="par-skeleton-bar" style={{ width: '90%' }} />
                <span className="par-skeleton-bar" style={{ width: '70%' }} />
                <span className="par-skeleton-bar" style={{ width: '40%' }} />
                <span className="par-skeleton-bar" style={{ width: '60%' }} />
                <span className="par-skeleton-bar" style={{ width: '75%' }} />
                <span className="par-skeleton-bar" style={{ width: '85%' }} />
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="par-state-box">
            <div className="par-state-icon">
              <i className="fa-solid fa-file-excel" />
            </div>
            <div className="par-state-title">No Resident Applications Found</div>
            <div>Try adjusting or clearing your municipality, status, or search filters to find records.</div>
          </div>
        ) : (
          <div className="par-table-wrap">
            <table className="par-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Applicant</th>
                  <th>Municipality / Barangay</th>
                  <th>Subm #</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className={`par-table-row ${selectedAppId === app.id ? 'selected' : ''}`}
                  >
                    <td>
                      <div className="par-ref-cell">
                        <span className="par-ref-code">{app.reference}</span>
                        <button
                          type="button"
                          className="par-btn-copy"
                          title="Copy Reference"
                          onClick={() => handleCopy(app.reference)}
                          aria-label={`Copy reference ${app.reference}`}
                        >
                          <i className={copiedText === app.reference ? 'fa-solid fa-check' : 'fa-regular fa-copy'} />
                        </button>
                      </div>
                    </td>

                    <td>
                      <div className="par-applicant-cell">
                        <div
                          className="par-avatar"
                          style={{ background: getAvatarGradient(`${app.firstName} ${app.lastName}`) }}
                        >
                          {getInitials(app.firstName, app.lastName)}
                        </div>
                        <div>
                          <div className="par-applicant-name">
                            {app.firstName} {app.lastName}
                          </div>
                          <div className="par-applicant-meta">
                            <span>
                              <i className="fa-regular fa-envelope" /> {app.email}
                            </span>
                            <span>•</span>
                            <span>
                              <i className="fa-solid fa-phone" /> {app.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="par-location-cell">
                        <div className="par-muni-name">
                          <i className="fa-solid fa-location-dot" />
                          <span>{app.municipalityName}</span>
                        </div>
                        <div className="par-brgy-name">{app.barangayName}</div>
                      </div>
                    </td>

                    <td>
                      <span className="par-subm-badge">v{app.submissionNumber}</span>
                    </td>

                    <td>{getStatusBadge(app.status)}</td>

                    <td style={{ color: '#64748B', whiteSpace: 'nowrap' }}>
                      {formatDateTime(app.submittedAt)}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => loadDossier(app.id)}
                        className="par-btn-review"
                      >
                        <i className="fa-solid fa-folder-open" />
                        <span>Review Dossier</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProvincialManagementPagination
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        setPage={setPage}
      />

      {/* Review Dossier Slide-Over Drawer */}
      {selectedAppId && (
        <div
          data-management-dialog
          className="par-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isApproving && !isRejecting && lightboxIndex === null) {
              setSelectedAppId(null);
            }
          }}
        >
          <div className="par-modal-drawer">
            {/* Dossier Header */}
            <div className="par-drawer-header">
              <div>
                <span className="par-drawer-kicker">
                  <i className="fa-solid fa-shield-halved" />
                  PROVINCIAL VERIFICATION DOSSIER
                </span>
                <h2 className="par-drawer-title">
                  {dossier ? `${dossier.firstName} ${dossier.lastName}` : 'Loading Application Dossier…'}
                </h2>
                {dossier && (
                  <div className="par-drawer-meta-bar">
                    <span className="par-ref-code">{dossier.reference}</span>
                    <button
                      type="button"
                      className="par-btn-copy"
                      onClick={() => handleCopy(dossier.reference)}
                      title="Copy Reference"
                    >
                      <i className={copiedText === dossier.reference ? 'fa-solid fa-check' : 'fa-regular fa-copy'} />
                    </button>
                    {getStatusBadge(dossier.status)}
                    <span className="par-subm-badge">
                      <i className="fa-solid fa-layer-group" />
                      Submission #{dossier.submissionNumber}
                    </span>
                  </div>
                )}
              </div>

              <button
                aria-label="Close application"
                disabled={isApproving || isRejecting}
                onClick={() => setSelectedAppId(null)}
                className="par-close-btn"
                title="Close dossier (Esc)"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="par-drawer-body">
              {dossierLoading ? (
                <div className="par-state-box">
                  <div className="par-state-icon">
                    <i className="fa-solid fa-arrows-rotate fa-spin" />
                  </div>
                  <div className="par-state-title">Loading Application Evidence & Dossier…</div>
                  <div>Retrieving resident government identification and audit records.</div>
                </div>
              ) : dossierError ? (
                <div style={{ padding: '1.25rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>{dossierError}</span>
                </div>
              ) : dossier ? (
                <>
                  {/* Action Alerts */}
                  {actionSuccess && (
                    <div style={{ padding: '0.9rem 1.25rem', background: '#D1FAE5', color: '#065F46', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fa-solid fa-circle-check" />
                      <span>{actionSuccess}</span>
                    </div>
                  )}
                  {actionError && (
                    <div style={{ padding: '0.9rem 1.25rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fa-solid fa-triangle-exclamation" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Resident Details Card */}
                  <div className="par-profile-card">
                    <div className="par-profile-card-header">
                      <i className="fa-solid fa-user-check" />
                      <span>Resident Jurisdiction & Contact Profile</span>
                    </div>
                    <div className="par-profile-grid">
                      <div className="par-profile-item">
                        <span className="par-profile-label">
                          <i className="fa-solid fa-building" /> Municipality
                        </span>
                        <span className="par-profile-value">{dossier.municipalityName}</span>
                      </div>

                      <div className="par-profile-item">
                        <span className="par-profile-label">
                          <i className="fa-solid fa-map-pin" /> Barangay
                        </span>
                        <span className="par-profile-value">{dossier.barangayName}</span>
                      </div>

                      <div className="par-profile-item">
                        <span className="par-profile-label">
                          <i className="fa-solid fa-phone" /> Contact Number
                        </span>
                        <span className="par-profile-value">
                          <a href={`tel:${dossier.phone}`}>{dossier.phone}</a>
                        </span>
                      </div>

                      <div className="par-profile-item">
                        <span className="par-profile-label">
                          <i className="fa-regular fa-envelope" /> Email Address
                        </span>
                        <span className="par-profile-value">
                          <a href={`mailto:${dossier.email}`}>{dossier.email}</a>
                        </span>
                      </div>

                      <div className="par-profile-item" style={{ gridColumn: 'span 2' }}>
                        <span className="par-profile-label">
                          <i className="fa-solid fa-house" /> Full Residential Address
                        </span>
                        <span className="par-profile-value">{dossier.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Government ID & Selfie Evidence */}
                  <div>
                    <div className="par-section-heading">
                      <div className="par-section-heading-left">
                        <i className="fa-solid fa-camera-viewfinder" />
                        <span>Identity Verification Evidence</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                        Click any photo to inspect full-screen
                      </span>
                    </div>

                    <div className="par-evidence-grid">
                      {/* Front ID */}
                      <div className="par-evidence-card">
                        <div className="par-evidence-header">
                          <span>
                            <i className="fa-solid fa-id-card" /> Front Government ID
                          </span>
                          {dossier.evidence?.frontUrl ? (
                            <span style={{ color: '#059669', fontSize: '0.68rem' }}>Uploaded</span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>Missing</span>
                          )}
                        </div>
                        {dossier.evidence?.frontUrl ? (
                          <div
                            className="par-evidence-img-wrap"
                            onClick={() => {
                              const idx = evidencePhotos.indexOf(dossier.evidence!.frontUrl!);
                              setLightboxIndex(idx >= 0 ? idx : 0);
                            }}
                          >
                            <img
                              src={dossier.evidence.frontUrl}
                              alt="Front Government ID"
                              className="par-evidence-img"
                            />
                            <div className="par-evidence-hover-overlay">
                              <i className="fa-solid fa-magnifying-glass-plus" style={{ fontSize: '1.25rem' }} />
                              <span>Inspect in Lightbox</span>
                            </div>
                          </div>
                        ) : (
                          <div className="par-evidence-empty">
                            <i className="fa-solid fa-image-slash" style={{ fontSize: '1.5rem' }} />
                            <span>No front ID uploaded</span>
                          </div>
                        )}
                      </div>

                      {/* Back ID */}
                      <div className="par-evidence-card">
                        <div className="par-evidence-header">
                          <span>
                            <i className="fa-solid fa-id-card-clip" /> Back Government ID
                          </span>
                          {dossier.evidence?.backUrl ? (
                            <span style={{ color: '#059669', fontSize: '0.68rem' }}>Uploaded</span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>Missing</span>
                          )}
                        </div>
                        {dossier.evidence?.backUrl ? (
                          <div
                            className="par-evidence-img-wrap"
                            onClick={() => {
                              const idx = evidencePhotos.indexOf(dossier.evidence!.backUrl!);
                              setLightboxIndex(idx >= 0 ? idx : 0);
                            }}
                          >
                            <img
                              src={dossier.evidence.backUrl}
                              alt="Back Government ID"
                              className="par-evidence-img"
                            />
                            <div className="par-evidence-hover-overlay">
                              <i className="fa-solid fa-magnifying-glass-plus" style={{ fontSize: '1.25rem' }} />
                              <span>Inspect in Lightbox</span>
                            </div>
                          </div>
                        ) : (
                          <div className="par-evidence-empty">
                            <i className="fa-solid fa-image-slash" style={{ fontSize: '1.5rem' }} />
                            <span>No back ID uploaded</span>
                          </div>
                        )}
                      </div>

                      {/* Selfie */}
                      <div className="par-evidence-card">
                        <div className="par-evidence-header">
                          <span>
                            <i className="fa-solid fa-camera-rotate" /> Selfie with ID
                          </span>
                          {dossier.evidence?.selfieUrl ? (
                            <span style={{ color: '#059669', fontSize: '0.68rem' }}>Uploaded</span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>Missing</span>
                          )}
                        </div>
                        {dossier.evidence?.selfieUrl ? (
                          <div
                            className="par-evidence-img-wrap"
                            onClick={() => {
                              const idx = evidencePhotos.indexOf(dossier.evidence!.selfieUrl!);
                              setLightboxIndex(idx >= 0 ? idx : 0);
                            }}
                          >
                            <img
                              src={dossier.evidence.selfieUrl}
                              alt="Selfie with ID"
                              className="par-evidence-img"
                            />
                            <div className="par-evidence-hover-overlay">
                              <i className="fa-solid fa-magnifying-glass-plus" style={{ fontSize: '1.25rem' }} />
                              <span>Inspect in Lightbox</span>
                            </div>
                          </div>
                        ) : (
                          <div className="par-evidence-empty">
                            <i className="fa-solid fa-image-slash" style={{ fontSize: '1.5rem' }} />
                            <span>No selfie uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verification Audit Timeline */}
                  {dossier.events && dossier.events.length > 0 && (
                    <div>
                      <div className="par-section-heading">
                        <div className="par-section-heading-left">
                          <i className="fa-solid fa-timeline" />
                          <span>Verification History & Audit Trail</span>
                        </div>
                      </div>

                      <div className="par-timeline">
                        {dossier.events.map((ev, idx) => {
                          const isApproved = ev.eventType.includes('APPROVED');
                          const isChanges = ev.eventType.includes('CHANGES_REQUESTED');
                          const isResubmitted = ev.eventType.includes('RESUBMITTED');

                          return (
                            <div key={idx} className="par-timeline-item">
                              <div
                                className={`par-timeline-node ${
                                  isApproved
                                    ? 'par-timeline-node--approved'
                                    : isChanges
                                    ? 'par-timeline-node--corrections'
                                    : isResubmitted
                                    ? 'par-timeline-node--resubmitted'
                                    : ''
                                }`}
                              >
                                <i
                                  className={
                                    isApproved
                                      ? 'fa-solid fa-check'
                                      : isChanges
                                      ? 'fa-solid fa-exclamation'
                                      : isResubmitted
                                      ? 'fa-solid fa-arrows-rotate'
                                      : 'fa-solid fa-circle'
                                  }
                                />
                              </div>

                              <div className="par-timeline-header">
                                <span
                                  className={`par-timeline-badge ${
                                    isApproved
                                      ? 'par-timeline-badge--approved'
                                      : isChanges
                                      ? 'par-timeline-badge--corrections'
                                      : isResubmitted
                                      ? 'par-timeline-badge--resubmitted'
                                      : ''
                                  }`}
                                >
                                  {ev.eventType.replace(/_/g, ' ')}
                                </span>
                                <span className="par-timeline-time">{formatDateTime(ev.createdAt)}</span>
                              </div>

                              {ev.notes && (
                                <div
                                  className={`par-timeline-note ${
                                    isChanges ? 'par-timeline-note--alert' : ''
                                  }`}
                                >
                                  {ev.notes}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Review Actions Section */}
                  {dossier.status === 'PENDING' ? (
                    <div className="par-actions-deck">
                      <div className="par-actions-heading">
                        <i className="fa-solid fa-gavel" />
                        <span>Provincial Command Review Decisions</span>
                      </div>

                      {/* Approve Button */}
                      <div>
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={isApproving || isRejecting}
                          className="par-btn-approve"
                        >
                          <i className={isApproving ? 'fa-solid fa-arrows-rotate fa-spin' : 'fa-solid fa-circle-check'} />
                          <span>{isApproving ? 'Verifying & Approving…' : '✓ Approve Resident Application'}</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 800 }}>
                        <span style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                        <span>OR REQUEST CORRECTIONS</span>
                        <span style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                      </div>

                      {/* Request Corrections Form */}
                      <form onSubmit={handleRequestCorrections} className="par-corrections-box">
                        <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>
                          Request Corrections from Resident
                        </label>

                        {/* Preset Chips */}
                        <div className="par-preset-chips">
                          {correctionPresets.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="par-chip"
                              onClick={() => applyPreset(preset)}
                            >
                              + {preset.split('.')[0]}
                            </button>
                          ))}
                        </div>

                        <textarea
                          rows={3}
                          className="par-textarea"
                          placeholder="Detail specifically what needs clarification or re-upload (e.g., 'The ID photo is blurry and illegible. Please upload a clear photo of your primary ID')..."
                          value={correctionReason}
                          onChange={(e) => setCorrectionReason(e.target.value)}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: correctionReason.trim().length >= 10 ? '#059669' : '#94A3B8' }}>
                            {correctionReason.trim().length}/10 characters minimum
                          </span>

                          <button
                            type="submit"
                            disabled={isApproving || isRejecting || correctionReason.trim().length < 10}
                            className="par-btn-corrections"
                          >
                            <i className={isRejecting ? 'fa-solid fa-arrows-rotate fa-spin' : 'fa-solid fa-paper-plane'} />
                            <span>{isRejecting ? 'Sending Correction Notice…' : 'Request Corrections'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="par-verified-banner">
                      <i className={dossier.status === 'VERIFIED' ? 'fa-solid fa-certificate' : 'fa-solid fa-circle-info'} />
                      <div className="par-banner-content">
                        <strong>Official BFP Dossier Status: {dossier.status}</strong>
                        <span>
                          This application has already been processed by Provincial Command.
                          {dossier.status === 'VERIFIED' && ' Resident credentials are active and verified across Antique jurisdiction.'}
                        </span>
                        {dossier.correctionReason && (
                          <div style={{ marginTop: 8, padding: '8px 12px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, color: '#C2410C', fontSize: '0.78rem' }}>
                            <strong>Active Correction Request:</strong> {dossier.correctionReason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Full-Screen Evidence Inspection */}
      {lightboxIndex !== null && evidencePhotos.length > 0 && (
        <PhotoLightbox
          photos={evidencePhotos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          caption={dossier ? `Verification Evidence — ${dossier.firstName} ${dossier.lastName} (${dossier.reference})` : undefined}
        />
      )}
    </section>
  );
}
