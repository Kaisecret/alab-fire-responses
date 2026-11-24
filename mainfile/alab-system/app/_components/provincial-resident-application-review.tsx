'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProvincialTableToolbar, ProvincialManagementToolbar, ProvincialMunicipalityFilter, ProvincialManagementPagination } from './provincial-management-toolbar';
import { useProvincialManagementList } from './use-provincial-management-list';
import { useManagementDialog } from './use-management-dialog';
import { PhotoLightbox } from './photo-lightbox';
import type { ManagedApplication } from '../../lib/provincial-bfp/management/types';
import { StatCards } from "./municipal-stat-cards";
import { FireCommandHeader } from "./fire-command-header";
import { SkeletonDetail } from './skeleton-loader';

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
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.25rem;
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
  /* Top three municipalities stay on one row down to tablets, then stack. */
  .par-container .par-verified-stats { grid-template-columns: repeat(var(--mstat-columns, 3), minmax(0, 1fr)); }
  @media (max-width: 700px) { .par-container .par-verified-stats { grid-template-columns: minmax(0, 1fr); } }









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
    grid-template-columns: minmax(220px, 1fr) minmax(260px, 1.6fr);
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

  /* Three identical tiles; the photo itself opens in the viewer. */
  .par-evidence-grid { grid-auto-rows: 1fr; }
  .par-evidence-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    min-height: 148px;
    height: 100%;
    padding: 1.1rem 0.85rem;
    border: 1px solid var(--slate-200);
    border-radius: 14px;
    background: #FFFFFF;
    color: var(--navy-700);
    font: inherit;
    text-align: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
  }
  .par-evidence-tile:hover:not(:disabled) { border-color: #FCA5A5; box-shadow: 0 8px 20px rgba(220, 38, 38, 0.1); transform: translateY(-2px); }
  .par-evidence-tile:focus-visible { outline: 3px solid rgba(220, 38, 38, 0.35); outline-offset: 2px; }
  .par-evidence-tile:disabled { cursor: default; background: var(--slate-50); border-style: dashed; }
  .par-evidence-tile-icon {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: #FEF2F2;
    color: #DC2626;
    font-size: 1.15rem;
  }
  .par-evidence-tile:disabled .par-evidence-tile-icon { background: var(--slate-200); color: var(--slate-400); }
  .par-evidence-tile-label { font-size: 0.86rem; font-weight: 800; color: #0F172A; }
  .par-evidence-tile-action {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    background: #FEF2F2;
    color: #B91C1C;
    font-size: 0.74rem;
    font-weight: 800;
  }
  .par-evidence-tile:disabled .par-evidence-tile-action { background: transparent; color: var(--slate-400); }

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
  }

  .par-timeline-note--alert {
    background: #FFF7ED;
    border-color: #FED7AA;
    color: #9A3412;
  }

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
      gap: 0.6rem;
    }
    .par-evidence-tile {
      min-height: 120px;
      padding: 0.85rem 0.4rem;
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

const TOP_TONES = ["emerald", "blue", "violet"] as const;

export function ProvincialResidentApplicationReview({ initialMunicipalityId = '' }: ApplicationReviewProps) {
  const {
    items: applicationRecords,
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
    response,
  } = useProvincialManagementList<ManagedApplication>({
    endpoint: '/api/provincial-bfp/resident-applications',
    initialFilters: { municipalityId: initialMunicipalityId, status: 'VERIFIED', pageSize: 7 },
  });

  const municipalityFilter = filters.municipalityId || '';
  const setMunicipalityFilter = (value: string) => setFilter('municipalityId', value);
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);

  // Old bookmarks can restore queue statuses; normalize them before the list's
  // debounced request and filter every render while that state is reconciled.
  useEffect(() => {
    if (filters.status !== 'VERIFIED') setFilter('status', 'VERIFIED');
  }, [filters.status, setFilter]);
  const applications = useMemo(() => applicationRecords.filter(
    application => application.status === 'VERIFIED' && application.accountStatus === 'ACTIVE'
  ), [applicationRecords]);
  const verifiedFilters = { ...filters, status: 'VERIFIED' };
  const topMunicipalities = (response.topMunicipalities as Array<{ name: string; users: number }> | undefined) ?? [];

  // Review Dossier State
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<ManagedApplication | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  // Lightbox Photo Inspection
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const detailController = useRef<AbortController | null>(null);
  useEffect(() => () => detailController.current?.abort(), []);

  const loadDossier = async (id: string) => {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setDossier(null);
    setSelectedAppId(id);
    setDossierLoading(true);
    setDossierError(null);
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
      if (controller.signal.aborted) return;
      if (data.application?.status !== 'VERIFIED' || data.application?.accountStatus !== 'ACTIVE') {
        throw new Error('This resident is no longer an active verified user. Refresh the list to see current records.');
      }
      setDossier(data.application);
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setDossierError(err instanceof Error ? err.message : 'Error fetching application dossier');
      }
    } finally {
      if (!controller.signal.aborted) setDossierLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Keep the resident details dialog open while its evidence lightbox is active.
  useManagementDialog(
    !!selectedAppId,
    () => {
      if (lightboxIndex !== null) {
        setLightboxIndex(null);
      } else {
        setSelectedAppId(null);
      }
    },
    lightboxIndex !== null
  );

  // Evidence photos list for Lightbox
  const evidenceItems = [
    { key: "front", label: "Front of ID", icon: "fa-id-card", url: dossier?.evidence?.frontUrl ?? null },
    { key: "back", label: "Back of ID", icon: "fa-id-card-clip", url: dossier?.evidence?.backUrl ?? null },
    { key: "selfie", label: "Selfie with ID", icon: "fa-camera", url: dossier?.evidence?.selfieUrl ?? null },
  ];
  const uploadedEvidence = evidenceItems.filter((item) => item.url);
  const evidencePhotos = uploadedEvidence.map((item) => item.url as string);

  const getStatusBadge = () => (
    <span className="par-status-pill par-status-pill--verified">
      <span className="par-status-dot" />
      Verified
    </span>
  );

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
  const activeFiltersCount = [municipalityFilter, search, filters.from, filters.to].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilters({ status: 'VERIFIED' });
    setPage(1);
  };

  return (
    <section className="par-container" aria-label="Provincial Verified Users">
      <style>{reviewStyles}</style>
      <FireCommandHeader slotId="provincial-fire-command-header" title="Verified Users" icon="fa-user-check" />

      {(topMunicipalities.length > 0 || loading) && (
        <StatCards
          label="Municipalities with the most verified users"
          className="par-verified-stats"
          items={(topMunicipalities.length > 0 ? topMunicipalities : [{ name: "", users: 0 }, { name: "", users: 0 }, { name: "", users: 0 }]).map((row, index) => ({
            key: `top-${index}`,
            icon: index === 0 ? "fa-trophy" : "fa-location-dot",
            tone: TOP_TONES[index],
            badge: `#${index + 1} Most users`,
            value: row.users,
            suffix: row.users === 1 ? "user" : "users",
            label: row.name,
            description: index === 0 ? "Most verified residents" : index === 1 ? "Second most" : "Third most",
            loading: loading && topMunicipalities.length === 0,
          }))}
        />
      )}

      {/* Filter Console */}
      <section className="par-filter-console" aria-label="Verified User Filters">
        <div className="par-filter-top">
          <div className="par-filter-title">
            <i className="fa-solid fa-sliders" />
            <span>Filter Verified Users</span>
          </div>

          <div className="par-filter-right">
            <span className="par-count-pill">
              Showing <strong>{applications.length}</strong> of <strong>{total}</strong> verified users
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
            <label htmlFor="par-search-input">
              <i className="fa-solid fa-magnifying-glass" /> Search Resident
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
        <ProvincialTableToolbar title="Verified users">
          <button type="button" className="par-btn-refresh" onClick={fetchApplications} disabled={loading}>
            <i className={`fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          <ProvincialManagementToolbar exportOnly dataset="APPLICATIONS" filters={verifiedFilters} onFilterChange={() => {}} />
        </ProvincialTableToolbar>
        {error && (
          <div style={{ padding: '1rem 1.25rem', background: '#FEE2E2', color: '#991B1B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <i className="fa-solid fa-triangle-exclamation" />
            <span><strong>Record Sync Error:</strong> {error}</span>
          </div>
        )}

        {loading && applications.length === 0 ? (
          <div aria-label="Loading verified users">
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
            <div className="par-state-title">No Verified Users Found</div>
            <div>Try adjusting or clearing your municipality or search filters to find verified users.</div>
          </div>
        ) : (
          <div className="par-table-wrap">
            <table className="par-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Resident</th>
                  <th>Municipality / Barangay</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
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

                    <td>{getStatusBadge()}</td>

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
                        <span>View Details</span>
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
            if (e.target === e.currentTarget && lightboxIndex === null) {
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
                    {getStatusBadge()}
                    <span className="par-subm-badge">
                      <i className="fa-solid fa-layer-group" />
                      Submission #{dossier.submissionNumber}
                    </span>
                  </div>
                )}
              </div>

              <button
                aria-label="Close application"
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
                <SkeletonDetail label="Loading the application evidence and dossier" />
              ) : dossierError ? (
                <div style={{ padding: '1.25rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>{dossierError}</span>
                </div>
              ) : dossier ? (
                <>
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

                  {/* Government ID & Selfie Evidence: equal tiles; photos open only in the viewer. */}
                  <div>
                    <div className="par-section-heading">
                      <div className="par-section-heading-left">
                        <i className="fa-solid fa-camera" />
                        <span>Identity photos</span>
                      </div>
                    </div>

                    <div className="par-evidence-grid">
                      {evidenceItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className="par-evidence-tile"
                          disabled={!item.url}
                          onClick={() => setLightboxIndex(Math.max(0, evidencePhotos.indexOf(item.url!)))}
                        >
                          <span className="par-evidence-tile-icon"><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span>
                          <span className="par-evidence-tile-label">{item.label}</span>
                          <span className="par-evidence-tile-action">
                            {item.url ? <><i className="fa-solid fa-eye" aria-hidden="true" /> View photo</> : "Not uploaded"}
                          </span>
                        </button>
                      ))}
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
                          const isVerified = ev.eventType.includes('APPROVE') || ev.eventType.includes('VERIFIED');
                          const isChanges = ev.eventType.includes('CHANGES_REQUESTED');
                          const isResubmitted = ev.eventType.includes('RESUBMITTED');

                          return (
                            <div key={idx} className="par-timeline-item">
                              <div
                                className={`par-timeline-node ${
                                  isVerified
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
                                    isVerified
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
                                    isVerified
                                      ? 'par-timeline-badge--approved'
                                      : isChanges
                                      ? 'par-timeline-badge--corrections'
                                      : isResubmitted
                                      ? 'par-timeline-badge--resubmitted'
                                      : ''
                                  }`}
                                >
                                  {ev.eventType.replace(/APPROVED?/g, 'VERIFIED').replace(/_/g, ' ')}
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

                  <div className="par-verified-banner">
                    <i className="fa-solid fa-certificate" />
                    <div className="par-banner-content">
                      <strong>Verified resident with an active account</strong>
                      <span>Identity and phone verification are complete. This resident can use ALAB across Antique.</span>
                    </div>
                  </div>
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
          labels={uploadedEvidence.map((item) => item.label)}
          caption={dossier ? `${dossier.firstName} ${dossier.lastName} · ${dossier.reference}` : undefined}
        />
      )}
    </section>
  );
}
