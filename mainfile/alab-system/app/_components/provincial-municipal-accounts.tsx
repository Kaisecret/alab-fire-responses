'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ProvincialRequestError, requestProvincialJson } from "../../lib/provincial-bfp/client-request";
import { ProvincialAccountDialog } from "./provincial-account-dialog";

type Municipality = { id: string; name: string; psgcCode: string | null };
type Account = {
  userId: string;
  email: string;
  displayName: string;
  rankOrPosition: string | null;
  municipalityId: string;
  municipalityName: string;
  assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF";
  status: string;
  mustChangePassword: boolean;
};
type FormState = {
  municipalityId: string;
  displayName: string;
  email: string;
  rankOrPosition: string;
  assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF";
  temporaryPassword: string;
};

type StatusFilter = 'ALL' | 'PROVISIONED' | 'UNPROVISIONED';

const initialForm: FormState = {
  municipalityId: "",
  displayName: "",
  email: "",
  rankOrPosition: "",
  assignmentRole: "MUNICIPAL_ADMIN",
  temporaryPassword: "",
};

const pageStyles = `
  .pma-container {
    padding: 1.5rem 2rem 3.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1E293B;
  }

  /* ========== HEADER CARD ========== */
  .pma-header {
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

  .pma-header-title-area {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .pma-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pma-kicker-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #FEF2F2;
    color: #DB1B0D;
    border: 1px solid #FEE2E2;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .pma-kicker-emblem {
    width: 16px;
    height: 16px;
    object-fit: contain;
  }

  .pma-kicker-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #CBD5E1;
  }

  .pma-kicker-text {
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748B;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .pma-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .pma-subtitle {
    font-size: 0.85rem;
    color: #64748B;
    margin: 0;
    line-height: 1.4;
  }

  .pma-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .pma-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.62rem 1.15rem;
    border-radius: 8px;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid transparent;
    font-family: inherit;
    white-space: nowrap;
  }

  .pma-btn-refresh {
    background: #FFFFFF;
    border-color: #E2E8F0;
    color: #475569;
  }

  .pma-btn-refresh:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #CBD5E1;
  }

  .pma-btn-primary {
    background: linear-gradient(180deg, #E52E20 0%, #DB1B0D 100%);
    color: #FFFFFF;
    box-shadow: 0 4px 14px rgba(219, 27, 13, 0.28);
  }

  .pma-btn-primary:hover:not(:disabled) {
    background: linear-gradient(180deg, #DB1B0D 0%, #C2160A 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(219, 27, 13, 0.38);
  }

  .pma-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .pma-btn:focus-visible {
    outline: 3px solid #DB1B0D;
    outline-offset: 2px;
  }

  /* ========== KPI STATS BAR (Pastel Gradient System) ========== */
  .pma-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.85rem;
  }
  @media (max-width: 1024px) {
    .pma-stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .pma-stats-grid { grid-template-columns: 1fr; }
  }

  .pma-stat-card {
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
  .pma-stat-card.blue {
    background: linear-gradient(145deg, #E6EFFF 0%, #D2E3FD 100%);
    border: 1.5px solid #B8D3FD;
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.06);
  }
  .pma-stat-card.emerald {
    background: linear-gradient(145deg, #E6FBF0 0%, #D1F7E2 100%);
    border: 1.5px solid #A7F3D0;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.06);
  }
  .pma-stat-card.amber {
    background: linear-gradient(145deg, #FFF5DE 0%, #FFE8BA 100%);
    border: 1.5px solid #FFDC99;
    box-shadow: 0 4px 16px rgba(217, 119, 6, 0.06);
  }
  .pma-stat-card.red {
    background: linear-gradient(145deg, #FFF1F1 0%, #FEE2E2 100%);
    border: 1.5px solid #FECACA;
    box-shadow: 0 4px 16px rgba(220, 38, 38, 0.06);
  }

  .pma-stat-card:hover { transform: translateY(-2.5px); }
  .pma-stat-card.blue:hover { border-color: #91B8FA; box-shadow: 0 10px 22px -4px rgba(37, 99, 235, 0.2); }
  .pma-stat-card.emerald:hover { border-color: #6EE7B7; box-shadow: 0 10px 22px -4px rgba(16, 185, 129, 0.2); }
  .pma-stat-card.amber:hover { border-color: #FFCF70; box-shadow: 0 10px 22px -4px rgba(217, 119, 6, 0.2); }
  .pma-stat-card.red:hover { border-color: #F87171; box-shadow: 0 10px 22px -4px rgba(220, 38, 38, 0.2); }

  .pma-stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    margin-bottom: 0.25rem;
  }
  .pma-stat-badge-icon {
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
  .pma-stat-card:hover .pma-stat-badge-icon { transform: scale(1.06); }
  .pma-stat-card.blue .pma-stat-badge-icon { color: #2563EB; }
  .pma-stat-card.emerald .pma-stat-badge-icon { color: #059669; }
  .pma-stat-card.amber .pma-stat-badge-icon { color: #D97706; }
  .pma-stat-card.red .pma-stat-badge-icon { color: #DC2626; }

  .pma-stat-trend-tag {
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
  .pma-stat-trend-tag.blue { color: #1E40AF; background: #DBEAFE; }
  .pma-stat-trend-tag.emerald { color: #065F46; background: #D1FAE5; }
  .pma-stat-trend-tag.amber { color: #92400E; background: #FEF3C7; }
  .pma-stat-trend-tag.red { color: #991B1B; background: #FEE2E2; }

  .pma-stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
    margin: 0.08rem 0;
  }
  .pma-stat-label {
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
  .pma-stat-value {
    order: 1;
    font-size: 1.45rem;
    font-weight: 850;
    color: #0F172A;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .pma-stat-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.35rem;
    padding-top: 0.32rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    font-size: 0.65rem;
    font-weight: 600;
  }
  .pma-stat-card.blue .pma-stat-footer { color: #2563EB; border-top-color: #DCE7FC; }
  .pma-stat-card.emerald .pma-stat-footer { color: #059669; border-top-color: #A7F3D0; }
  .pma-stat-card.amber .pma-stat-footer { color: #D97706; border-top-color: #FEEBC8; }
  .pma-stat-card.red .pma-stat-footer { color: #DC2626; border-top-color: #FED7D7; }

  .pma-stat-subtext {
    font-weight: 600;
    opacity: 0.9;
  }
  .pma-stat-footer i {
    font-size: 0.64rem;
    transition: transform 0.2s ease;
  }
  .pma-stat-card:hover .pma-stat-footer i {
    transform: translateX(3px);
  }

  /* ========== CARD & TABLE ========== */
  .pma-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
  }

  .pma-toolbar {
    padding: 0.9rem 1.4rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: #FAFAFA;
    border-bottom: 1px solid #E2E8F0;
  }

  .pma-filter-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #F1F5F9;
    padding: 0.25rem;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
  }

  .pma-filter-btn {
    border: none;
    background: transparent;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.76rem;
    font-weight: 700;
    color: #64748B;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
  }

  .pma-filter-btn.active {
    background: #FFFFFF;
    color: #0F172A;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
  }

  .pma-search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: min(100%, 280px);
  }

  .pma-search-icon {
    position: absolute;
    left: 0.75rem;
    color: #94A3B8;
    font-size: 0.8rem;
    pointer-events: none;
  }

  .pma-search-input {
    width: 100%;
    padding: 0.5rem 0.85rem 0.5rem 2.1rem;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.82rem;
    outline: none;
    font-family: inherit;
    background: #FFFFFF;
    transition: all 0.15s ease;
  }

  .pma-search-input:focus {
    border-color: #DB1B0D;
    box-shadow: 0 0 0 3px rgba(219, 27, 13, 0.1);
  }

  .pma-clear-btn {
    position: absolute;
    right: 0.6rem;
    background: transparent;
    border: none;
    color: #94A3B8;
    cursor: pointer;
    padding: 0.2rem;
    font-size: 0.75rem;
  }

  .pma-clear-btn:hover {
    color: #475569;
  }

  .pma-table-container {
    overflow-x: auto;
  }

  .pma-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  .pma-table th {
    background: #F8FAFC;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.85rem 1.4rem;
    text-align: left;
    border-bottom: 1px solid #E2E8F0;
    white-space: nowrap;
  }

  .pma-table td {
    padding: 0.9rem 1.4rem;
    border-bottom: 1px solid #F1F5F9;
    color: #334155;
    vertical-align: middle;
  }

  .pma-table tr:last-child td {
    border-bottom: none;
  }

  .pma-table tr:hover td {
    background: #F8FAFC;
  }

  .pma-muni-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    color: #0F172A;
  }

  .pma-muni-icon {
    color: #94A3B8;
    font-size: 0.85rem;
  }

  .pma-psgc-tag {
    display: inline-block;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.75rem;
    color: #475569;
    background: #F1F5F9;
    padding: 0.2rem 0.45rem;
    border-radius: 5px;
    border: 1px solid #E2E8F0;
  }

  .pma-badge-status {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.28rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .pma-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .pma-badge-status.active {
    background: #ECFDF5;
    color: #047857;
    border: 1px solid #A7F3D0;
  }

  .pma-badge-status.active .pma-status-dot {
    background: #10B981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  }

  .pma-badge-status.empty {
    background: #FFFBEB;
    color: #B45309;
    border: 1px solid #FDE68A;
  }

  .pma-badge-status.empty .pma-status-dot {
    background: #F59E0B;
  }

  .pma-personnel-cell {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .pma-officer-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    padding: 0.25rem 0.55rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }

  .pma-officer-name {
    font-weight: 700;
    color: #0F172A;
  }

  .pma-role-tag {
    font-size: 0.68rem;
    padding: 0.12rem 0.35rem;
    border-radius: 4px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  .pma-role-tag.admin {
    background: #FEF2F2;
    color: #DC2626;
    border: 1px solid #FEE2E2;
  }

  .pma-role-tag.staff {
    background: #EFF6FF;
    color: #2563EB;
    border: 1px solid #DBEAFE;
  }

  .pma-rank-tag {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 500;
  }

  .pma-no-personnel {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #94A3B8;
    font-size: 0.78rem;
    font-style: italic;
  }

  .pma-row-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: transparent;
    border: 1px dashed #CBD5E1;
    color: #64748B;
    padding: 0.25rem 0.55rem;
    border-radius: 6px;
    font-size: 0.74rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
  }

  .pma-row-action-btn:hover {
    background: #FEF2F2;
    color: #DB1B0D;
    border-color: #FCA5A5;
  }

  .pma-alert {
    padding: 0.85rem 1.25rem;
    border-radius: 10px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #B91C1C;
    font-weight: 600;
    font-size: 0.86rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  /* ========== EXPANDED & REFINED MODAL DIALOGS ========== */
  .pma-modal::backdrop {
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(8px);
  }

  .pma-modal {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 1.5rem;
    border: 0;
    background: transparent;
    box-sizing: border-box;
    overflow: hidden;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .pma-modal[open] {
    display: grid;
    place-items: center;
  }

  .pma-dialog {
    width: min(calc(100vw - 2.5rem), 52rem);
    max-height: calc(100dvh - 3.5rem);
    margin: 0;
    box-sizing: border-box;
    min-height: 0;
    overscroll-behavior: contain;
    overflow-y: auto;
    background: #FFFFFF;
    border-radius: 20px;
    padding: 2.25rem 2.5rem;
    box-shadow: 0 30px 70px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.08);
    border: 1px solid #E2E8F0;
    animation: pmaSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
  }

  @keyframes pmaSlideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .pma-dialog-close {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.18s ease;
  }

  .pma-dialog-close:hover:not(:disabled) {
    background: #F1F5F9;
    color: #0F172A;
    border-color: #CBD5E1;
  }

  .pma-dialog-close:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pma-dialog-header {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
    padding-right: 3rem;
  }

  .pma-dialog-emblem-wrap {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
    border: 1.5px solid #FECACA;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 6px 16px rgba(219, 27, 13, 0.12);
  }

  .pma-dialog-emblem-wrap.success {
    background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
    border-color: #A7F3D0;
    box-shadow: 0 6px 16px rgba(5, 150, 105, 0.12);
  }

  .pma-dialog-emblem {
    width: 46px;
    height: 46px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
  }

  .pma-dialog-kicker {
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #DB1B0D;
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .pma-dialog-kicker.success {
    color: #059669;
  }

  .pma-dialog-title {
    margin: 0 0 0.3rem;
    font-size: 1.5rem;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .pma-dialog-subtitle {
    color: #64748B;
    font-size: 0.9rem;
    line-height: 1.45;
    margin: 0;
  }

  .pma-dialog-notice {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    border-left: 4px solid #D97706;
    border-radius: 10px;
    padding: 0.85rem 1.15rem;
    font-size: 0.85rem;
    color: #92400E;
    margin-bottom: 1.5rem;
    font-weight: 500;
    line-height: 1.4;
  }

  .pma-dialog-notice i {
    color: #D97706;
    font-size: 1rem;
    flex-shrink: 0;
  }

  /* Form Layout */
  .pma-form {
    display: flex;
    flex-direction: column;
    gap: 1.35rem;
  }

  .pma-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }

  .pma-field-label {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    font-size: 0.84rem;
    font-weight: 700;
    color: #1E293B;
  }

  .pma-field-header {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .pma-field-header i {
    color: #DB1B0D;
    font-size: 0.82rem;
  }

  .pma-form input,
  .pma-form select {
    height: 48px;
    padding: 0.75rem 1rem;
    border: 1.5px solid #CBD5E1;
    border-radius: 10px;
    font-size: 0.92rem;
    color: #0F172A;
    outline: none;
    font-family: inherit;
    background: #FFFFFF;
    transition: all 0.18s ease;
    box-sizing: border-box;
    width: 100%;
  }

  .pma-form select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1.15rem;
    padding-right: 2.75rem;
    cursor: pointer;
  }

  .pma-form input::placeholder {
    color: #94A3B8;
    font-size: 0.88rem;
  }

  .pma-form input:focus,
  .pma-form select:focus {
    border-color: #DB1B0D;
    box-shadow: 0 0 0 4px rgba(219, 27, 13, 0.12);
  }

  /* Prevent browser autofill from turning inputs blue/purple */
  .pma-form input:-webkit-autofill,
  .pma-form input:-webkit-autofill:hover,
  .pma-form input:-webkit-autofill:focus,
  .pma-form select:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
    -webkit-text-fill-color: #0F172A !important;
    transition: background-color 5000s ease-in-out 0s;
  }

  .pma-form-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 1rem;
    margin-top: 0.75rem;
    padding-top: 1.35rem;
    border-top: 1px solid #F1F5F9;
  }

  .pma-btn-cancel {
    background: #FFFFFF;
    border: 1.5px solid #CBD5E1;
    color: #475569;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 700;
  }

  .pma-btn-cancel:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .pma-btn-submit {
    background: linear-gradient(180deg, #E52E20 0%, #DB1B0D 100%);
    color: #FFFFFF;
    padding: 0.75rem 2rem;
    border-radius: 10px;
    font-size: 0.94rem;
    font-weight: 800;
    box-shadow: 0 4px 16px rgba(219, 27, 13, 0.32);
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    font-family: inherit;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pma-btn-submit:hover:not(:disabled) {
    background: linear-gradient(180deg, #DB1B0D 0%, #C2160A 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(219, 27, 13, 0.42);
  }

  .pma-btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* Issued Password Card */
  .pma-secret-container {
    background: #FFFBEB;
    border: 1.5px solid #FDE68A;
    border-radius: 14px;
    padding: 1.35rem 1.5rem;
    margin: 1.35rem 0;
  }

  .pma-secret-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    font-size: 0.76rem;
    font-weight: 800;
    color: #92400E;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .pma-copy-btn {
    background: #FFFFFF;
    border: 1px solid #FCD34D;
    color: #92400E;
    padding: 0.35rem 0.85rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: inherit;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .pma-copy-btn:hover {
    background: #FEF3C7;
    border-color: #F59E0B;
  }

  .pma-secret-box {
    display: block;
    padding: 1rem 1.25rem;
    background: #FFFFFF;
    border: 1.5px dashed #F59E0B;
    border-radius: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 1.35rem;
    font-weight: 800;
    word-break: break-all;
    color: #B45309;
    text-align: center;
    letter-spacing: 0.08em;
  }

  .pma-warning-note {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: #C2410C;
    font-weight: 600;
    font-size: 0.85rem;
    background: #FFF7ED;
    border: 1px solid #FFEDD5;
    padding: 0.8rem 1rem;
    border-radius: 10px;
    margin-bottom: 1.25rem;
  }

  .pma-warning-note i {
    font-size: 1rem;
    flex-shrink: 0;
  }

  /* Responsive Design */
  @media (max-width: 900px) {
    .pma-stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 680px) {
    .pma-container {
      padding: 1rem 1rem 3rem;
      gap: 1rem;
    }

    .pma-header {
      flex-direction: column;
      align-items: stretch;
      padding: 1.15rem;
    }

    .pma-actions {
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .pma-stats-grid {
      grid-template-columns: 1fr;
    }

    .pma-toolbar {
      flex-direction: column;
      align-items: stretch;
      padding: 0.9rem;
    }

    .pma-search-wrapper {
      width: 100%;
    }

    .pma-dialog {
      padding: 1.5rem 1.25rem;
      width: calc(100vw - 1.5rem);
    }

    .pma-dialog-header {
      padding-right: 2rem;
    }

    .pma-form-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
`;

export function ProvincialMunicipalAccounts() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [copied, setCopied] = useState(false);
  const submitting = useRef(false);
  const [issued, setIssued] = useState<{
    municipalityName: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);

  function refresh() {
    setLoading(true);
    setError("");
    setRevision(value => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    requestProvincialJson<{ municipalities: Municipality[]; accounts: Account[] }>(
      "/api/provincial-bfp/municipal-accounts", { signal: controller.signal },
    )
      .then(result => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(result.municipalities) || !Array.isArray(result.accounts)) {
          throw new Error("The account roster returned an invalid response. Please retry.");
        }
        setMunicipalities(result.municipalities);
        setAccounts(result.accounts);
        setLoaded(true);
        setError("");
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ProvincialRequestError && (reason.status === 401 || reason.status === 403)) {
          setMunicipalities([]);
          setAccounts([]);
          setLoaded(false);
        }
        setError(reason instanceof Error ? reason.message : "Unable to load municipal accounts.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  const activeFor = (municipalityId: string) =>
    accounts.filter(
      (account) =>
        account.municipalityId === municipalityId && account.status === "ACTIVE"
    );

  const provisionedCount = useMemo(
    () => municipalities.filter(m => activeFor(m.id).length > 0).length,
    [municipalities, accounts]
  );

  const unprovisionedCount = useMemo(
    () => municipalities.length - provisionedCount,
    [municipalities, provisionedCount]
  );

  const totalActiveOfficers = useMemo(
    () => accounts.filter(a => a.status === 'ACTIVE').length,
    [accounts]
  );

  const filteredMunicipalities = useMemo(() => {
    return municipalities.filter((municipality) => {
      const matchesQuery = municipality.name.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;

      const active = activeFor(municipality.id);
      if (statusFilter === 'PROVISIONED') return active.length > 0;
      if (statusFilter === 'UNPROVISIONED') return active.length === 0;
      return true;
    });
  }, [municipalities, query, statusFilter, accounts]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFormError("");
    try {
      const result = await requestProvincialJson<{
        account?: { municipalityName: string; email: string };
        temporaryPassword?: string;
      }>("/api/provincial-bfp/municipal-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!result.account || !result.temporaryPassword)
        throw new Error("The account response was incomplete. Refresh the roster before submitting again.");
      setIssued({
        municipalityName: result.account.municipalityName,
        email: result.account.email,
        temporaryPassword: result.temporaryPassword,
      });
      setForm(initialForm);
      setOpen(false);
      refresh();
    } catch (reason) {
      setFormError(
        reason instanceof Error
          ? reason.message
          : "Unable to issue the account."
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function handleOpenForMunicipality(municipalityId: string) {
    setForm({
      ...initialForm,
      municipalityId,
    });
    setFormError("");
    setOpen(true);
  }

  function copyPassword() {
    if (!issued?.temporaryPassword) return;
    navigator.clipboard.writeText(issued.temporaryPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="pma-container">
      <style>{pageStyles}</style>

      {/* Header section */}
      <div className="pma-header">
        <div className="pma-header-title-area">
          <div className="pma-kicker">
            <span className="pma-kicker-badge">
              <img src="/images/bfp logo.png" alt="BFP Official Logo" className="pma-kicker-emblem" />
              <span>PROVINCIAL COMMAND</span>
            </span>
            <span className="pma-kicker-dot" />
            <span className="pma-kicker-text">ANTIQUE JURISDICTION</span>
          </div>
          <h1 className="pma-title">Municipal BFP Accounts</h1>
          <p className="pma-subtitle">
            Station credential oversight and officer access provisioning.
          </p>
        </div>
        <div className="pma-actions">
          <button className="pma-btn pma-btn-refresh" type="button" onClick={refresh} disabled={loading} title="Refresh Roster">
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
            <span>{loading ? 'Loading…' : 'Refresh'}</span>
          </button>
          <button
            className="pma-btn pma-btn-primary"
            type="button"
            disabled={!loaded || saving}
            onClick={() => { setForm(initialForm); setFormError(""); setOpen(true); }}
          >
            <i className="fa-solid fa-user-plus" />
            <span>Issue New Account</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Stats Overview */}
      <div className="pma-stats-grid" role="region" aria-label="Municipal accounts metrics">
        {/* Card 1: Municipalities (Blue) */}
        <div
          className="pma-stat-card blue"
          onClick={() => setStatusFilter('ALL')}
          role="button"
          tabIndex={0}
          title="Click to view all municipalities"
        >
          <div className="pma-stat-header">
            <div className="pma-stat-badge-icon">
              <i className="fa-solid fa-city" />
            </div>
            <span className="pma-stat-trend-tag blue">
              <i className="fa-solid fa-map-location-dot" /> Antique
            </span>
          </div>
          <div className="pma-stat-body">
            <span className="pma-stat-label">Municipalities</span>
            <span className="pma-stat-value">{loaded ? municipalities.length : '18'}</span>
          </div>
          <div className="pma-stat-footer">
            <span className="pma-stat-subtext">Province of Antique</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>

        {/* Card 2: Provisioned (Emerald) */}
        <div
          className="pma-stat-card emerald"
          onClick={() => setStatusFilter('PROVISIONED')}
          role="button"
          tabIndex={0}
          title="Click to view provisioned accounts"
        >
          <div className="pma-stat-header">
            <div className="pma-stat-badge-icon">
              <i className="fa-solid fa-circle-check" />
            </div>
            <span className="pma-stat-trend-tag emerald">
              <i className="fa-solid fa-check" /> Active
            </span>
          </div>
          <div className="pma-stat-body">
            <span className="pma-stat-label">Provisioned</span>
            <span className="pma-stat-value">{loaded ? provisionedCount : '—'}</span>
          </div>
          <div className="pma-stat-footer">
            <span className="pma-stat-subtext">Active municipal admins</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>

        {/* Card 3: Pending Stations (Amber) */}
        <div
          className="pma-stat-card amber"
          onClick={() => setStatusFilter('UNPROVISIONED')}
          role="button"
          tabIndex={0}
          title="Click to view pending stations"
        >
          <div className="pma-stat-header">
            <div className="pma-stat-badge-icon">
              <i className="fa-solid fa-clock" />
            </div>
            <span className="pma-stat-trend-tag amber">
              <i className="fa-solid fa-hourglass-half" /> Pending
            </span>
          </div>
          <div className="pma-stat-body">
            <span className="pma-stat-label">Pending Stations</span>
            <span className="pma-stat-value">{loaded ? unprovisionedCount : '—'}</span>
          </div>
          <div className="pma-stat-footer">
            <span className="pma-stat-subtext">Awaiting admin issuance</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>

        {/* Card 4: Active Officers (Red) */}
        <div
          className="pma-stat-card red"
          title="Active assigned officers"
        >
          <div className="pma-stat-header">
            <div className="pma-stat-badge-icon">
              <i className="fa-solid fa-user-shield" />
            </div>
            <span className="pma-stat-trend-tag red">
              <i className="fa-solid fa-shield-halved" /> Officers
            </span>
          </div>
          <div className="pma-stat-body">
            <span className="pma-stat-label">Active Officers</span>
            <span className="pma-stat-value">{loaded ? totalActiveOfficers : '—'}</span>
          </div>
          <div className="pma-stat-footer">
            <span className="pma-stat-subtext">BFP commanding officers</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>
      </div>

      {error && (
        <div className="pma-alert" role="alert">
          <div>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
            <span>{error}</span>
          </div>
          <button className="pma-btn pma-btn-cancel" type="button" onClick={refresh} disabled={loading}>Retry</button>
        </div>
      )}

      {/* Table Card */}
      <div className="pma-card">
        <div className="pma-toolbar">
          <div className="pma-filter-group" role="tablist" aria-label="Status filter">
            <button
              type="button"
              className={`pma-filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({loaded ? municipalities.length : 18})
            </button>
            <button
              type="button"
              className={`pma-filter-btn ${statusFilter === 'PROVISIONED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('PROVISIONED')}
            >
              Provisioned ({loaded ? provisionedCount : 0})
            </button>
            <button
              type="button"
              className={`pma-filter-btn ${statusFilter === 'UNPROVISIONED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('UNPROVISIONED')}
            >
              Pending ({loaded ? unprovisionedCount : 0})
            </button>
          </div>

          <div className="pma-search-wrapper">
            <i className="fa-solid fa-magnifying-glass pma-search-icon" />
            <input
              className="pma-search-input"
              aria-label="Search municipalities"
              placeholder="Search municipality…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                className="pma-clear-btn"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        <div className="pma-table-container">
          <table className="pma-table">
            <thead>
              <tr>
                <th>Municipality</th>
                <th>PSGC Code</th>
                <th>Account Status</th>
                <th>Assigned Municipal Personnel</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && !loaded ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.5rem', color: '#DB1B0D' }} />
                    Loading municipal account roster…
                  </td>
                </tr>
              ) : filteredMunicipalities.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                    {error
                      ? 'The account roster could not be loaded. Use Retry above.'
                      : query
                      ? 'No municipalities match your search.'
                      : 'No municipalities found.'}
                  </td>
                </tr>
              ) : (
                filteredMunicipalities.map((municipality) => {
                  const active = activeFor(municipality.id);
                  const isProvisioned = active.length > 0;
                  return (
                    <tr key={municipality.id}>
                      <td>
                        <div className="pma-muni-cell">
                          <i className="fa-solid fa-building-shield pma-muni-icon" />
                          <span>{municipality.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="pma-psgc-tag">
                          {municipality.psgcCode ?? "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`pma-badge-status ${
                            isProvisioned ? "active" : "empty"
                          }`}
                        >
                          <span className="pma-status-dot" />
                          {isProvisioned ? "Provisioned" : "Not Provisioned"}
                        </span>
                      </td>
                      <td>
                        {isProvisioned ? (
                          <div className="pma-personnel-cell">
                            {active.map((account) => (
                              <div key={account.userId} className="pma-officer-pill">
                                <span className="pma-officer-name">{account.displayName}</span>
                                <span
                                  className={`pma-role-tag ${
                                    account.assignmentRole === "MUNICIPAL_ADMIN" ? "admin" : "staff"
                                  }`}
                                >
                                  {account.assignmentRole === "MUNICIPAL_ADMIN" ? "Admin" : "Staff"}
                                </span>
                                {account.rankOrPosition && (
                                  <span className="pma-rank-tag">
                                    ({account.rankOrPosition})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="pma-no-personnel">
                            <i className="fa-regular fa-clock" />
                            No active account issued
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="pma-row-action-btn"
                          onClick={() => handleOpenForMunicipality(municipality.id)}
                          title={`Issue account for ${municipality.name}`}
                        >
                          <i className="fa-solid fa-plus" />
                          <span>Issue</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Account Modal */}
      {open && (
        <ProvincialAccountDialog label="Issue municipal BFP account" onClose={() => setOpen(false)} dismissible={!saving}>
          <button
            type="button"
            className="pma-dialog-close"
            onClick={() => setOpen(false)}
            disabled={saving}
            aria-label="Close dialog"
          >
            <i className="fa-solid fa-xmark" />
          </button>

          <div className="pma-dialog-header">
            <div className="pma-dialog-emblem-wrap">
              <img src="/images/bfp logo.png" alt="BFP Seal" className="pma-dialog-emblem" />
            </div>
            <div>
              <div className="pma-dialog-kicker">
                <i className="fa-solid fa-shield-halved" /> OFFICIAL PROVISIONING
              </div>
              <h2 className="pma-dialog-title">Issue Municipal BFP Account</h2>
              <p className="pma-dialog-subtitle">
                Assign administrative or operational credentials to a municipal fire station.
              </p>
            </div>
          </div>

          <div className="pma-dialog-notice">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>The temporary password will only be displayed once upon submission.</span>
          </div>

          <form className="pma-form" onSubmit={submit}>
            {formError && (
              <div className="pma-alert" role="alert" style={{ margin: '0 0 0.5rem' }}>
                <div>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />
                  {formError}
                </div>
              </div>
            )}

            <div className="pma-form-grid">
              <label className="pma-field-label">
                <span className="pma-field-header">
                  <i className="fa-solid fa-city" /> Target Municipality
                </span>
                <select
                  value={form.municipalityId}
                  onChange={(event) =>
                    setForm({ ...form, municipalityId: event.target.value })
                  }
                  required
                >
                  <option value="">Select Antique Municipality</option>
                  {municipalities.map((municipality) => (
                    <option key={municipality.id} value={municipality.id}>
                      {municipality.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="pma-field-label">
                <span className="pma-field-header">
                  <i className="fa-solid fa-user-shield" /> Authorization Role
                </span>
                <select
                  value={form.assignmentRole}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      assignmentRole: event.target.value as FormState["assignmentRole"],
                    })
                  }
                >
                  <option value="MUNICIPAL_ADMIN">Municipal Administrator (Full Station Control)</option>
                  <option value="MUNICIPAL_STAFF">Municipal Staff (Operations & Dispatch)</option>
                </select>
              </label>
            </div>

            <div className="pma-form-grid">
              <label className="pma-field-label">
                <span className="pma-field-header">
                  <i className="fa-solid fa-user" /> Official Staff Full Name
                </span>
                <input
                  placeholder="e.g. SFO2 Ricardo Santos"
                  value={form.displayName}
                  onChange={(event) =>
                    setForm({ ...form, displayName: event.target.value })
                  }
                  required
                />
              </label>

              <label className="pma-field-label">
                <span className="pma-field-header">
                  <i className="fa-solid fa-id-badge" /> Rank or Position (Optional)
                </span>
                <input
                  value={form.rankOrPosition}
                  onChange={(event) =>
                    setForm({ ...form, rankOrPosition: event.target.value })
                  }
                  placeholder="e.g. Municipal Fire Marshal / Shift Commander"
                />
              </label>
            </div>

            <div className="pma-form-grid">
              <label className="pma-field-label">
                <span className="pma-field-header">
                  <i className="fa-solid fa-envelope" /> Official Email Address
                </span>
                <input
                  type="email"
                  placeholder="e.g. sanjose.bfp@antique.gov.ph"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  required
                />
              </label>

              <label className="pma-field-label">
                <span className="pma-field-header">
                  <i className="fa-solid fa-key" /> Temporary Password (Optional)
                </span>
                <input
                  type="password"
                  minLength={12}
                  value={form.temporaryPassword}
                  onChange={(event) =>
                    setForm({ ...form, temporaryPassword: event.target.value })
                  }
                  placeholder="Leave blank to generate securely"
                />
              </label>
            </div>

            <div className="pma-form-actions">
              <button
                className="pma-btn pma-btn-cancel"
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="pma-btn pma-btn-primary pma-btn-submit"
                disabled={saving}
                type="submit"
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    <span>Issuing Account…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check" />
                    <span>Issue Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </ProvincialAccountDialog>
      )}

      {/* Issued Password Notice Modal */}
      {issued && (
        <ProvincialAccountDialog label="Temporary password" onClose={() => setIssued(null)} dismissible={false}>
          <div className="pma-dialog-header">
            <div className="pma-dialog-emblem-wrap success">
              <img src="/images/bfp logo.png" alt="BFP Seal" className="pma-dialog-emblem" />
            </div>
            <div>
              <div className="pma-dialog-kicker success">
                <i className="fa-solid fa-circle-check" /> PROVISIONING COMPLETE
              </div>
              <h2 className="pma-dialog-title" style={{ color: '#059669' }}>
                Account Successfully Provisioned
              </h2>
              <p className="pma-dialog-subtitle">
                Official credentials issued for <strong>{issued.email}</strong> ({issued.municipalityName}).
              </p>
            </div>
          </div>

          <div className="pma-secret-container">
            <div className="pma-secret-header">
              <span>
                <i className="fa-solid fa-key" style={{ marginRight: '0.4rem' }} />
                Generated Temporary Password
              </span>
              <button type="button" className="pma-copy-btn" onClick={copyPassword}>
                <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} />
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <code className="pma-secret-box">{issued.temporaryPassword}</code>
          </div>

          <div className="pma-warning-note">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>The recipient must change this password immediately upon their first sign-in.</span>
          </div>

          <div className="pma-form-actions">
            <button
              className="pma-btn pma-btn-primary pma-btn-submit"
              type="button"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setIssued(null)}
            >
              <i className="fa-solid fa-shield-check" />
              <span>I have securely recorded this password</span>
            </button>
          </div>
        </ProvincialAccountDialog>
      )}
    </div>
  );
}
