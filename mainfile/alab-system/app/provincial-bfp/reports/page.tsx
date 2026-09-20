'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ProvincialMunicipalityFilter } from '../../_components/provincial-management-toolbar';
import { getFireTypeLabel, getSeverityLabel, getStatusLabel } from '../../../lib/municipal-bfp/reports/formatters';
import { requestProvincialJson } from '../../../lib/provincial-bfp/client-request';
import type { ManagementPage, ProvincialReportRow, ProvincialReportSummary } from '../../../lib/provincial-bfp/management/types';

type ReportQuery = {
  municipalityId: string;
  from: string;
  to: string;
  reportSource: string;
  fireType: string;
  severity: string;
  status: string;
  search: string;
};

const EMPTY_QUERY: ReportQuery = {
  municipalityId: '', from: '', to: '', reportSource: '', fireType: '', severity: '', status: '', search: '',
};

// Operational outcomes: a fire actually happened and the province worked it.
const CONFIRMED_STATUSES = ['CONFIRMED', 'VERIFIED', 'RESPONDING', 'FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL', 'RESOLVED', 'CLOSED'];
// Administrative outcomes: intake closed without a fire response.
const ADMIN_STATUSES = ['FALSE_REPORT', 'DUPLICATE', 'REJECTED'];

const SOURCE_OPTIONS = [
  { value: 'ALAB_APP', label: 'ALAB Resident Mobile' },
  { value: 'PHONE_CALL', label: 'Direct Phone Call' },
];
const FIRE_TYPE_OPTIONS = ['HOUSE_BUILDING', 'GRASS', 'FOREST', 'VEHICLE', 'OTHER'];
const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN'];
const STATUS_OPTIONS = [
  'SUBMITTED', 'PENDING_VERIFICATION', 'UNDER_VERIFICATION', 'NEEDS_MORE_INFO', 'CONFIRMED', 'VERIFIED',
  'RESPONDING', 'FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL', 'RESOLVED', 'CLOSED',
  'FALSE_REPORT', 'DUPLICATE', 'REJECTED',
];
const PAGE_SIZES: Array<25 | 50 | 100> = [25, 50, 100];

const reportStyles = `
  .prr{--navy:#10234a;--ink:#081a3a;--red:#e23632;--border:#dce6f2;--muted:#5b7089;display:flex;flex-direction:column;gap:1rem;color:var(--navy);font-family:inherit}
  .prr ::selection{background:#fee2e2;color:#7f1d1d}
  .prr :is(button,select,input,a):focus-visible{outline:3px solid rgba(226,54,50,.24);outline-offset:2px}
  .prr-panel{background:#fff;border:1px solid var(--border);border-radius:15px;box-shadow:0 8px 24px rgba(38,65,99,.06)}
  .prr-command{padding:1.15rem 1.3rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
  .prr-heading{display:flex;align-items:center;gap:.95rem;min-width:0}
  .prr-heading-icon{width:48px;height:48px;flex:0 0 auto;display:grid;place-items:center;border:1px solid #fee2e2;border-radius:12px;background:#fff1f1;color:var(--red);font-size:1.08rem}
  .prr-heading h1{margin:0;color:var(--ink);font-size:clamp(1.25rem,2vw,1.55rem);font-weight:800;letter-spacing:-.035em;line-height:1.15}
  .prr-heading-meta{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem .65rem;margin:.35rem 0 0;color:var(--muted);font-size:.82rem;font-weight:500}
  .prr-meta-dot{color:#b8c4d2}
  .prr-actions{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap}
  .prr-button{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:42px;padding:.65rem 1rem;border-radius:9px;border:1px solid #b9cbe1;background:#fff;color:#1e3a67;font:inherit;font-size:.82rem;font-weight:800;cursor:pointer;transition:transform 160ms ease,box-shadow 160ms ease,background 160ms ease,border-color 160ms ease}
  .prr-button:hover:not(:disabled){background:#f8fbff;border-color:#7898be;transform:translateY(-1px)}
  .prr-button:active:not(:disabled){transform:scale(.98)}
  .prr-button:disabled{opacity:.6;cursor:not-allowed}
  .prr-button--primary{border-color:var(--red);background:var(--red);color:#fff;box-shadow:0 6px 14px rgba(226,54,50,.18)}
  .prr-button--primary:hover:not(:disabled){background:#c82e2a;border-color:#c82e2a}
  .prr-button--primary:disabled{cursor:progress}
  .prr-button--dark{border-color:#12294f;background:#12294f;color:#fff}
  .prr-button--dark:hover:not(:disabled){background:#0b1c38;border-color:#0b1c38}
  .prr-console{padding:1rem 1.2rem 1.15rem}
  .prr-console-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-bottom:.85rem;margin-bottom:.85rem;border-bottom:1px solid #edf2f7}
  .prr-console-head strong{color:#20365e;font-size:.82rem}
  .prr-console-head p{margin:.2rem 0 0;color:var(--muted);font-size:.76rem;font-weight:500}
  .prr-clear{padding:.25rem;border:0;background:transparent;color:#b42320;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer}
  .prr-clear:disabled{color:#a8b4c2;cursor:default}
  .prr-filters{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:.8rem;align-items:end}
  .prr-field{display:flex;flex-direction:column;gap:.38rem;min-width:0}
  .prr-field>label,.prr-municipality>label{color:#3e5572!important;font-size:.66rem!important;font-weight:800!important;letter-spacing:.065em;text-transform:uppercase}
  .prr-field :is(select,input),.prr-municipality select{width:100%;min-width:0;min-height:42px;box-sizing:border-box;padding:.62rem .75rem;border:1px solid #c7d5e5!important;border-radius:8px!important;background:#fff;color:#152a4b;font:inherit;font-size:.81rem!important;transition:border-color 150ms ease,box-shadow 150ms ease}
  .prr-field :is(select,input):hover,.prr-municipality select:hover{border-color:#8da6c2!important}
  .prr-field :is(select,input):focus,.prr-municipality select:focus{border-color:#587ba7!important;box-shadow:0 0 0 3px rgba(77,119,170,.1)}
  .prr-municipality label{width:100%}
  .prr-search{position:relative}
  .prr-search i{position:absolute;left:.78rem;bottom:14px;color:#6f819a;font-size:.78rem;pointer-events:none}
  .prr-search input{padding-left:2.15rem!important}
  .prr-console-foot{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:1rem}
  .prr-hint{color:var(--muted);font-size:.76rem;font-weight:500}
  .prr-hint--warn{color:#b42320;font-weight:700}
  .prr-alert{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 1.15rem;border:1px solid #fecaca;border-radius:12px;background:#fff4f4;color:#991b1b;font-size:.82rem}
  .prr-alert button{border:0;background:transparent;color:inherit;font:inherit;font-weight:800;cursor:pointer}
  .prr-masthead{padding:1.35rem 1.4rem}
  .prr-masthead-top{display:flex;align-items:flex-start;justify-content:space-between;gap:1.25rem;flex-wrap:wrap}
  .prr-org{color:#43607f;font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
  .prr-masthead h2{margin:.4rem 0 .3rem;color:var(--ink);font-size:1.3rem;font-weight:800;letter-spacing:-.03em;line-height:1.2}
  .prr-coverage{color:#3f566f;font-size:.84rem;font-weight:500}
  .prr-coverage strong{color:var(--ink);font-variant-numeric:tabular-nums}
  .prr-stamp{text-align:right;color:var(--muted);font-size:.72rem;line-height:1.55}
  .prr-stamp strong{display:block;color:#20365e;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
  .prr-figures{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-top:1px solid #e6edf6;margin-top:1.15rem}
  .prr-figure{padding:1.05rem 1.15rem 0;border-left:1px solid #edf2f7}
  .prr-figure:first-child{padding-left:0;border-left:0}
  .prr-figure-label{color:#41597a;font-size:.65rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
  .prr-figure-value{margin-top:.3rem;color:var(--ink);font-size:1.65rem;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
  .prr-figure-value--good{color:#16865a}
  .prr-figure-value--warn{color:#a35408}
  .prr-figure-value--info{color:#1d63ac}
  .prr-figure-value--small{font-size:1.24rem}
  .prr-figure-note{margin-top:.25rem;color:var(--muted);font-size:.73rem;font-weight:500;line-height:1.45}
  .prr-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
  .prr-section-head{padding:1rem 1.15rem;border-bottom:1px solid #e6edf6;background:#f8fbff;border-radius:15px 15px 0 0}
  .prr-section-head h3{margin:0;color:#20365e;font-size:.8rem;font-weight:800;letter-spacing:.055em;text-transform:uppercase}
  .prr-section-head p{margin:.25rem 0 0;color:var(--muted);font-size:.74rem;font-weight:500}
  .prr-ledger{display:flex;flex-direction:column;gap:.7rem;margin:0;padding:1.05rem 1.15rem}
  .prr-ledger-row{display:grid;grid-template-columns:1fr auto;gap:.2rem .75rem;align-items:baseline}
  .prr-ledger-row dt{color:#33506f;font-size:.8rem;font-weight:600}
  .prr-ledger-row dd{margin:0;color:var(--ink);font-size:.86rem;font-weight:800;font-variant-numeric:tabular-nums}
  .prr-bar{grid-column:1/-1;height:5px;border-radius:999px;background:#eef3f9;overflow:hidden}
  .prr-bar span{display:block;width:100%;height:100%;border-radius:999px;background:#2474c8;transform-origin:left center;transition:transform 220ms cubic-bezier(.2,.7,.3,1)}
  .prr-bar--red span{background:var(--red)}
  .prr-bar--slate span{background:#8fa4bd}
  .prr-scroll{overflow-x:auto;scrollbar-width:thin;scrollbar-color:#b9c7d8 transparent}
  .prr-scroll::-webkit-scrollbar{height:9px}
  .prr-scroll::-webkit-scrollbar-thumb{border-radius:999px;background:#b9c7d8}
  .prr-scroll::-webkit-scrollbar-track{background:transparent}
  .prr-table{width:100%;border-collapse:collapse;text-align:left;font-size:.82rem}
  .prr-table--log{min-width:1240px}
  .prr-table--matrix{min-width:720px}
  .prr-table th{padding:.85rem 1rem;background:#f6f9fd;border-bottom:1px solid #ccd9e8;color:#304766;font-size:.645rem;font-weight:800;letter-spacing:.055em;text-transform:uppercase;white-space:nowrap}
  .prr-table td{padding:.9rem 1rem;border-bottom:1px solid #e8eef5;vertical-align:middle}
  .prr-table tbody tr:last-child td{border-bottom:0}
  .prr-table tbody tr{transition:background-color 140ms ease,box-shadow 140ms ease}
  .prr-table tbody tr:hover{background:#f7faff;box-shadow:inset 3px 0 0 var(--red)}
  .prr-num{text-align:right;font-variant-numeric:tabular-nums}
  .prr-num--zero{color:#61758d}
  .prr-total-row td{background:#f6f9fd;border-top:1px solid #ccd9e8;color:var(--ink);font-weight:800}
  .prr-total-row:hover td{background:#f6f9fd}
  .prr-total-row:hover{box-shadow:none}
  .prr-reference{color:#0b2147;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.77rem;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
  .prr-place strong{display:block;color:#102448;font-weight:800}
  .prr-place span,.prr-not-rated{color:var(--muted);font-size:.73rem}
  .prr-fire-type{display:block;color:#102448;font-weight:800}
  .prr-source{display:inline-flex;padding:.2rem .45rem;border-radius:5px;background:#edf3fa;color:#304c70;font-size:.73rem;font-weight:700;white-space:nowrap}
  .prr-badge{display:inline-flex;align-items:center;border:1px solid;border-radius:999px;padding:.24rem .56rem;font-size:.67rem;font-weight:800;line-height:1.1;white-space:nowrap}
  .prr-badge--red{background:#e23632;border-color:#c92d29;color:#fff}
  .prr-badge--orange{background:#f25716;border-color:#d9480f;color:#fff}
  .prr-badge--blue{background:#2474c8;border-color:#1d63ac;color:#fff}
  .prr-badge--green{background:#16865a;border-color:#0e7049;color:#fff}
  .prr-badge--amber{background:#fff3cf;border-color:#f4d469;color:#9a4b04}
  .prr-badge--slate{background:#edf2f7;border-color:#d7e0ea;color:#455a72}
  .prr-badge--critical{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
  .prr-badge--high{background:#fff0df;border-color:#fdba74;color:#b53d0b}
  .prr-badge--moderate{background:#fff4cf;border-color:#f3d274;color:#a35408}
  .prr-badge--low{background:#e5f8ed;border-color:#a7e3bf;color:#157146}
  .prr-fire-type+.prr-badge,.prr-fire-type+.prr-not-rated{margin-top:.32rem}
  .prr-date{display:block;color:#22405f;font-variant-numeric:tabular-nums;white-space:nowrap}
  .prr-date--pending{color:var(--muted)}
  .prr-elapsed{color:#526b8a;font-variant-numeric:tabular-nums;white-space:nowrap}
  .prr-dispatch{color:#526b8a;font-size:.72rem;line-height:1.4}
  .prr-state{padding:3.2rem 1.5rem;text-align:center;color:#60748c}
  .prr-state-icon{width:44px;height:44px;margin:0 auto .8rem;display:grid;place-items:center;border-radius:12px;background:#eef4fb;color:#426891}
  .prr-state strong{display:block;margin-bottom:.25rem;color:#243b5d}
  .prr-state p{margin:0;font-size:.82rem}
  .prr-skeleton{height:13px;border-radius:999px;background:linear-gradient(90deg,#edf2f7 20%,#f8fafc 50%,#edf2f7 80%);background-size:220% 100%;animation:prr-shimmer 1.35s infinite linear}
  .prr-skeleton-row{display:grid;grid-template-columns:1.1fr 1.3fr 1.1fr .7fr .9fr 1fr 1fr 1fr;gap:1rem;padding:1.2rem 1rem;border-bottom:1px solid #edf2f7}
  @keyframes prr-shimmer{to{background-position:-220% 0}}
  .prr-mobile-log{display:none}
  .prr-foot{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:.85rem 1.15rem;border-top:1px solid #e1e9f2;color:var(--muted);font-size:.75rem}
  .prr-pagination,.prr-page-size{display:flex;align-items:center;gap:.55rem}
  .prr-foot select,.prr-page-button{min-height:34px;border:1px solid #c8d5e4;border-radius:7px;background:#fff;color:#294466;font:inherit;font-size:.75rem;font-weight:700}
  .prr-foot select{padding:.35rem .55rem}
  .prr-page-button{display:inline-flex;align-items:center;gap:.4rem;min-width:34px;padding:.35rem .6rem;cursor:pointer;transition:background 140ms ease,border-color 140ms ease}
  .prr-page-button:hover:not(:disabled){background:#f4f8fd;border-color:#8da6c2}
  .prr-page-button:disabled{color:#9aa8b8;background:#f4f7fa;cursor:default}
  .prr-print-note{display:none}
  @media(max-width:1280px){.prr-figures{grid-template-columns:repeat(3,minmax(0,1fr))}.prr-figure:nth-child(3n+1){padding-left:0;border-left:0}.prr-figure:nth-child(n+4){margin-top:.9rem;padding-top:.9rem;border-top:1px solid #edf2f7}.prr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.prr-grid>*:last-child:nth-child(odd){grid-column:1/-1}}
  @media(max-width:900px){.prr-command{flex-direction:column;align-items:flex-start}.prr-actions{width:100%}.prr-actions>*{flex:1 1 auto}.prr-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.prr-figures{grid-template-columns:repeat(2,minmax(0,1fr))}.prr-figure{padding-left:1.15rem;border-left:1px solid #edf2f7}.prr-figure:nth-child(odd){padding-left:0;border-left:0}.prr-figure:nth-child(n+3){margin-top:.9rem;padding-top:.9rem;border-top:1px solid #edf2f7}.prr-grid{grid-template-columns:1fr}.prr-scroll--log{display:none}.prr-mobile-log{display:grid}.prr-mobile-card{padding:1rem 1.15rem;border-bottom:1px solid #e4ebf3;display:grid;gap:.8rem}.prr-mobile-card:last-child{border-bottom:0}.prr-mobile-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.7rem}.prr-mobile-data{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem 1rem}.prr-mobile-label{display:block;margin-bottom:.18rem;color:#5f7288;font-size:.61rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}}
  @media(max-width:600px){.prr{gap:.75rem}.prr-command,.prr-console,.prr-masthead{padding:1rem}.prr-heading-icon{width:42px;height:42px}.prr-filters{grid-template-columns:1fr}.prr-figures{grid-template-columns:1fr}.prr-figure{padding-left:0;border-left:0}.prr-figure:nth-child(n+2){margin-top:.85rem;padding-top:.85rem;border-top:1px solid #edf2f7}.prr-stamp{text-align:left}.prr-mobile-data{grid-template-columns:1fr}.prr-foot,.prr-console-foot{flex-direction:column;align-items:stretch}.prr-pagination{justify-content:space-between}}
  @media(prefers-reduced-motion:reduce){.prr *,.prr *::before,.prr *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
  @page{size:A4 landscape;margin:12mm}
  @media print{
    .no-print{display:none!important}
    body{background:#fff!important}
    .prr{gap:.7rem;padding:0!important;color:#000}
    .prr-panel{border:1px solid #c9d4e2;border-radius:0;box-shadow:none;break-inside:avoid}
    .prr-section-head{border-radius:0;background:#eef3f9}
    .prr-scroll,.prr-scroll--log{overflow:visible!important;display:block!important}
    .prr-table--log,.prr-table--matrix{min-width:0;font-size:.66rem}
    .prr-table th{background:#eef3f9;padding:.45rem .5rem;font-size:.57rem}
    .prr-table td{padding:.45rem .5rem}
    .prr-table tbody tr{break-inside:avoid}
    .prr-table thead{display:table-header-group}
    .prr-mobile-log{display:none!important}
    .prr-dispatch,.prr-source,.prr-badge{font-size:.6rem}
    .prr-print-note{display:block;padding:.75rem 1.15rem;border-top:1px solid #c9d4e2;color:#334155;font-size:.68rem}
  }
`;

const statusTone = (status: string) => {
  if (['CONFIRMED', 'VERIFIED'].includes(status)) return 'red';
  if (status === 'RESPONDING') return 'orange';
  if (['FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL'].includes(status)) return 'blue';
  if (['RESOLVED', 'CLOSED'].includes(status)) return 'green';
  if (['SUBMITTED', 'PENDING_VERIFICATION', 'UNDER_VERIFICATION', 'NEEDS_MORE_INFO'].includes(status)) return 'amber';
  return 'slate';
};

const severityTone = (severity: string) =>
  severity === 'CRITICAL' ? 'critical' : severity === 'HIGH' ? 'high' : severity === 'MODERATE' ? 'moderate' : 'low';

const counter = new Intl.NumberFormat('en-PH');
const dateTimeFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });
const coverageFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' });

const formatDateTime = (value: string | null) => (value ? dateTimeFormat.format(new Date(value)) : null);

// Coverage bounds arrive as plain Philippine calendar days. Anchor a date-only
// bound at Manila noon so no UTC offset can roll the label onto the next day.
const formatCoverage = (value: string | null, fallback: string) =>
  value ? coverageFormat.format(new Date(value.length === 10 ? `${value}T12:00:00+08:00` : value)) : fallback;

const formatMinutes = (minutes: number | null) => {
  if (minutes === null || Number.isNaN(minutes)) return 'Not recorded';
  if (minutes < 1) return `${Math.round(minutes * 60)} secs`;
  if (minutes < 60) return `${minutes % 1 ? minutes.toFixed(1) : minutes} mins`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${Math.round(minutes - hours * 60)}m`;
};

const elapsedMinutes = (from: string, to: string | null) => {
  if (!to) return null;
  const span = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
  return Number.isFinite(span) && span >= 0 ? Math.round(span * 10) / 10 : null;
};

const share = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

export default function ProvincialReportsPage() {
  const [draft, setDraft] = useState<ReportQuery>(EMPTY_QUERY);
  const [applied, setApplied] = useState<ReportQuery>(EMPTY_QUERY);
  const [reloadToken, setReloadToken] = useState(0);

  const [summary, setSummary] = useState<ProvincialReportSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const [records, setRecords] = useState<ProvincialReportRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);

  const [exporting, setExporting] = useState<'REPORT_SUMMARY' | 'FIRE_REPORTS' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const invertedRange = Boolean(draft.from && draft.to && draft.from > draft.to);
  const canReset = useMemo(
    () => Object.values(draft).some(Boolean) || Object.values(applied).some(Boolean),
    [draft, applied],
  );

  const queryString = useCallback((query: ReportQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    return params;
  }, []);

  // Both reads are scheduled off the effect body so a filter change never
  // cascades renders, matching how the management directories load.
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const body = await requestProvincialJson<{ summary: ProvincialReportSummary }>(
          `/api/provincial-bfp/report-summaries?${queryString(applied)}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setSummary(body.summary);
        setGeneratedAt(new Date().toISOString());
      } catch (cause) {
        if (controller.signal.aborted) return;
        setSummary(null);
        setSummaryError(cause instanceof Error ? cause.message : 'Unable to generate the provincial summary.');
      } finally {
        if (!controller.signal.aborted) setSummaryLoading(false);
      }
    }, 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [applied, reloadToken, queryString]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRecordsLoading(true);
      setRecordsError(null);
      const params = queryString(applied);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      try {
        const body = await requestProvincialJson<ManagementPage<ProvincialReportRow>>(
          `/api/provincial-bfp/incident-reports?${params}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const total = body.total || 0;
        setRecords(Array.isArray(body.items) ? body.items : []);
        setTotalRecords(total);
        const lastPage = Math.max(1, Math.ceil(total / pageSize));
        if (page > lastPage) setPage(lastPage);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setRecords([]);
        setTotalRecords(0);
        setRecordsError(cause instanceof Error ? cause.message : 'Unable to load the incident record log.');
      } finally {
        if (!controller.signal.aborted) setRecordsLoading(false);
      }
    }, 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [applied, page, pageSize, reloadToken, queryString]);

  const generate = useCallback(() => {
    if (invertedRange) return;
    setApplied(draft);
    setPage(1);
    setReloadToken((token) => token + 1);
  }, [draft, invertedRange]);

  const resetFilters = useCallback(() => {
    setDraft(EMPTY_QUERY);
    setApplied(EMPTY_QUERY);
    setPage(1);
    setReloadToken((token) => token + 1);
  }, []);

  const exportDataset = useCallback(async (dataset: 'REPORT_SUMMARY' | 'FIRE_REPORTS') => {
    setExporting(dataset);
    setExportError(null);
    try {
      const params = queryString(applied);
      params.set('dataset', dataset);
      const response = await fetch(`/api/provincial-bfp/export?${params}`, { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Export failed. Please retry.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // The route names the file after the dataset and the day it was pulled.
      const disposition = response.headers.get('Content-Disposition') ?? '';
      link.download = /filename="([^"]+)"/.exec(disposition)?.[1] || `${dataset.toLowerCase()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : 'Export failed. Please retry.');
    } finally {
      setExporting(null);
    }
  }, [applied, queryString]);

  const confirmedCount = useMemo(
    () => (summary ? CONFIRMED_STATUSES.reduce((sum, status) => sum + (summary.byStatus[status] || 0), 0) : 0),
    [summary],
  );
  const adminOutcomeCount = useMemo(
    () => (summary ? ADMIN_STATUSES.reduce((sum, status) => sum + (summary.byStatus[status] || 0), 0) : 0),
    [summary],
  );
  const statusLedger = useMemo(
    () => (summary ? Object.entries(summary.byStatus).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]) : []),
    [summary],
  );
  const fireTypeLedger = useMemo(
    () => (summary ? Object.entries(summary.byFireType).sort((a, b) => b[1] - a[1]) : []),
    [summary],
  );
  const municipalities = useMemo(
    () => (Array.isArray(summary?.byMunicipality) ? summary.byMunicipality : []),
    [summary],
  );

  const reportingMunicipalities = municipalities.filter((row) => row.total > 0).length;
  const municipalityCount = municipalities.length || 18;
  const totalReports = summary?.totalReports ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const firstRow = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, totalRecords);
  const coverageFrom = formatCoverage(summary?.dateBoundaries.from ?? null, 'Earliest record on file');
  const coverageTo = formatCoverage(summary?.dateBoundaries.to ?? null, 'Present');
  const busy = summaryLoading || recordsLoading;

  const statusBadge = (status: string) => (
    <span className={`prr-badge prr-badge--${statusTone(status)}`}>{getStatusLabel(status)}</span>
  );
  const severityBadge = (severity: string) =>
    severity && severity !== 'UNKNOWN'
      ? <span className={`prr-badge prr-badge--${severityTone(severity)}`}>{getSeverityLabel(severity)}</span>
      : <span className="prr-not-rated">Not rated</span>;
  const dateCell = (value: string | null, pending: string) =>
    value
      ? <span className="prr-date">{formatDateTime(value)}</span>
      : <span className="prr-date prr-date--pending">{pending}</span>;

  return (
    <div className="prr" style={{ padding: '10px 1.5rem 2.5rem' }}>
      <style>{reportStyles}</style>

      <header className="prr-panel prr-command no-print">
        <div className="prr-heading">
          <span className="prr-heading-icon" aria-hidden="true"><i className="fa-solid fa-file-shield" /></span>
          <div style={{ minWidth: 0 }}>
            <h1>Official Provincial Reports &amp; Incident Summaries</h1>
            <p className="prr-heading-meta">
              <span>Antique Province · Asia/Manila</span>
              <span className="prr-meta-dot" aria-hidden="true">•</span>
              <span aria-live="polite">{counter.format(totalRecords)} incident records in coverage</span>
              <span className="prr-meta-dot" aria-hidden="true">•</span>
              <span>{generatedAt ? `Generated ${formatDateTime(generatedAt)}` : 'Generating…'}</span>
            </p>
          </div>
        </div>

        <div className="prr-actions">
          <button type="button" className="prr-button" onClick={() => setReloadToken((token) => token + 1)} disabled={busy}>
            <i className="fa-solid fa-rotate" aria-hidden="true" /> {busy ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="prr-button" onClick={() => exportDataset('REPORT_SUMMARY')} disabled={exporting !== null || !summary}>
            <i className="fa-solid fa-chart-column" aria-hidden="true" /> {exporting === 'REPORT_SUMMARY' ? 'Exporting…' : 'Export Summary'}
          </button>
          <button type="button" className="prr-button" onClick={() => exportDataset('FIRE_REPORTS')} disabled={exporting !== null || totalRecords === 0}>
            <i className="fa-solid fa-file-excel" aria-hidden="true" /> {exporting === 'FIRE_REPORTS' ? 'Exporting…' : 'Export Records'}
          </button>
          <button type="button" className="prr-button prr-button--dark" onClick={() => window.print()} disabled={!summary}>
            <i className="fa-solid fa-print" aria-hidden="true" /> Print Summary
          </button>
        </div>
      </header>

      {exportError && (
        <div className="prr-alert no-print" role="alert">
          <span><strong>Export failed.</strong> {exportError}</span>
          <button type="button" onClick={() => setExportError(null)}>Dismiss</button>
        </div>
      )}

      <section className="prr-panel prr-console no-print" aria-label="Report coverage and filters">
        <div className="prr-console-head">
          <div>
            <strong>Coverage &amp; Filters</strong>
            <p>Every filter applies to both the aggregated summary and the dated incident record log.</p>
          </div>
          <button type="button" className="prr-clear" onClick={resetFilters} disabled={!canReset}>Reset filters</button>
        </div>

        <div className="prr-filters">
          <div className="prr-municipality">
            <ProvincialMunicipalityFilter
              value={draft.municipalityId}
              onChange={(value) => setDraft((previous) => ({ ...previous, municipalityId: value }))}
            />
          </div>

          <div className="prr-field">
            <label htmlFor="prr-from">Coverage From</label>
            <input
              id="prr-from"
              type="date"
              value={draft.from}
              onChange={(event) => setDraft((previous) => ({ ...previous, from: event.target.value }))}
            />
          </div>

          <div className="prr-field">
            <label htmlFor="prr-to">Coverage To</label>
            <input
              id="prr-to"
              type="date"
              value={draft.to}
              onChange={(event) => setDraft((previous) => ({ ...previous, to: event.target.value }))}
            />
          </div>

          <div className="prr-field">
            <label htmlFor="prr-source">Intake Source</label>
            <select
              id="prr-source"
              value={draft.reportSource}
              onChange={(event) => setDraft((previous) => ({ ...previous, reportSource: event.target.value }))}
            >
              <option value="">All Sources</option>
              {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="prr-field">
            <label htmlFor="prr-fire-type">Fire Type</label>
            <select
              id="prr-fire-type"
              value={draft.fireType}
              onChange={(event) => setDraft((previous) => ({ ...previous, fireType: event.target.value }))}
            >
              <option value="">All Fire Types</option>
              {FIRE_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{getFireTypeLabel(type)}</option>)}
            </select>
          </div>

          <div className="prr-field">
            <label htmlFor="prr-severity">Severity</label>
            <select
              id="prr-severity"
              value={draft.severity}
              onChange={(event) => setDraft((previous) => ({ ...previous, severity: event.target.value }))}
            >
              <option value="">All Severities</option>
              {SEVERITY_OPTIONS.map((level) => <option key={level} value={level}>{getSeverityLabel(level)}</option>)}
            </select>
          </div>

          <div className="prr-field">
            <label htmlFor="prr-status">Record Status</label>
            <select
              id="prr-status"
              value={draft.status}
              onChange={(event) => setDraft((previous) => ({ ...previous, status: event.target.value }))}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{getStatusLabel(status)}</option>)}
            </select>
          </div>

          <div className="prr-field prr-search">
            <label htmlFor="prr-search">Search</label>
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              id="prr-search"
              type="search"
              placeholder="Reference, barangay, or description"
              value={draft.search}
              onChange={(event) => setDraft((previous) => ({ ...previous, search: event.target.value }))}
              onKeyDown={(event) => { if (event.key === 'Enter') generate(); }}
            />
          </div>
        </div>

        <div className="prr-console-foot">
          <span className={invertedRange ? 'prr-hint prr-hint--warn' : 'prr-hint'}>
            {invertedRange
              ? 'Coverage From is later than Coverage To. Swap the two dates to generate.'
              : 'Leave both dates empty to cover every record ever logged in Antique.'}
          </span>
          <button type="button" className="prr-button prr-button--primary" onClick={generate} disabled={busy || invertedRange}>
            <i className="fa-solid fa-file-circle-check" aria-hidden="true" />
            {summaryLoading ? 'Generating…' : 'Generate Provincial Summary'}
          </button>
        </div>
      </section>

      {summaryError && (
        <div className="prr-alert" role="alert">
          <span><strong>Summary unavailable.</strong> {summaryError}</span>
          <button type="button" className="no-print" onClick={() => setReloadToken((token) => token + 1)}>Retry</button>
        </div>
      )}

      <section className="prr-panel prr-masthead" aria-label="Consolidated provincial incident report">
        <div className="prr-masthead-top">
          <div style={{ minWidth: 0 }}>
            <div className="prr-org">Bureau of Fire Protection · Region VI · Province of Antique</div>
            <h2>Official Consolidated Provincial Incident Report</h2>
            <div className="prr-coverage">
              Reporting period <strong>{coverageFrom}</strong> to <strong>{coverageTo}</strong>, counted on Philippine calendar days.
            </div>
          </div>
          <div className="prr-stamp">
            <strong>Generated</strong>
            {generatedAt ? formatDateTime(generatedAt) : 'Pending'}
            <br />
            {applied.municipalityId ? 'Single municipality scope' : `All ${municipalityCount} municipalities`}
          </div>
        </div>

        <div className="prr-figures">
          <div className="prr-figure">
            <div className="prr-figure-label">Total Reports Intake</div>
            <div className="prr-figure-value">{counter.format(totalReports)}</div>
            <div className="prr-figure-note">Every report logged across Antique in this window.</div>
          </div>
          <div className="prr-figure">
            <div className="prr-figure-label">Confirmed Fire Incidents</div>
            <div className="prr-figure-value prr-figure-value--good">{counter.format(confirmedCount)}</div>
            <div className="prr-figure-note">{share(confirmedCount, totalReports)}% of intake reached a fire response.</div>
          </div>
          <div className="prr-figure">
            <div className="prr-figure-label">Administrative Outcomes</div>
            <div className="prr-figure-value prr-figure-value--warn">{counter.format(adminOutcomeCount)}</div>
            <div className="prr-figure-note">{share(adminOutcomeCount, totalReports)}% closed as false, duplicate, or rejected.</div>
          </div>
          <div className="prr-figure">
            <div className="prr-figure-label">Avg Response Speed</div>
            <div className="prr-figure-value prr-figure-value--info prr-figure-value--small">
              {formatMinutes(summary?.timingMetrics.avgResponseMinutes ?? null)}
            </div>
            <div className="prr-figure-note">Intake to first responder acknowledgement.</div>
          </div>
          <div className="prr-figure">
            <div className="prr-figure-label">Avg Time To Resolution</div>
            <div className="prr-figure-value prr-figure-value--info prr-figure-value--small">
              {formatMinutes(summary?.timingMetrics.avgResolutionMinutes ?? null)}
            </div>
            <div className="prr-figure-note">Intake to a resolved or closed record.</div>
          </div>
        </div>
      </section>

      <div className="prr-grid">
        <section className="prr-panel" aria-label="Classification breakdown">
          <div className="prr-section-head">
            <h3>Classification Breakdown</h3>
            <p>Incident types recorded in this coverage window.</p>
          </div>
          {fireTypeLedger.length > 0 ? (
            <dl className="prr-ledger">
              {fireTypeLedger.map(([type, count]) => (
                <div className="prr-ledger-row" key={type}>
                  <dt>{getFireTypeLabel(type)}</dt>
                  <dd>{counter.format(count)}</dd>
                  <span className="prr-bar prr-bar--red" aria-hidden="true"><span style={{ transform: `scaleX(${share(count, totalReports) / 100})` }} /></span>
                </div>
              ))}
            </dl>
          ) : (
            <div className="prr-state"><p>No classified incidents in this window.</p></div>
          )}
        </section>

        <section className="prr-panel" aria-label="Intake source breakdown">
          <div className="prr-section-head">
            <h3>Intake Source Breakdown</h3>
            <p>How the province received each report.</p>
          </div>
          <dl className="prr-ledger">
            {SOURCE_OPTIONS.map((option) => {
              const count = summary?.bySource[option.value] || 0;
              return (
                <div className="prr-ledger-row" key={option.value}>
                  <dt>{option.label}</dt>
                  <dd>{counter.format(count)}</dd>
                  <span className="prr-bar" aria-hidden="true"><span style={{ transform: `scaleX(${share(count, totalReports) / 100})` }} /></span>
                </div>
              );
            })}
            <div className="prr-ledger-row">
              <dt>Municipalities reporting</dt>
              <dd>{reportingMunicipalities} of {municipalityCount}</dd>
              <span className="prr-bar prr-bar--slate" aria-hidden="true"><span style={{ transform: `scaleX(${share(reportingMunicipalities, municipalityCount) / 100})` }} /></span>
            </div>
          </dl>
        </section>

        <section className="prr-panel" aria-label="Status ledger">
          <div className="prr-section-head">
            <h3>Status Ledger</h3>
            <p>Where every record stands at generation time.</p>
          </div>
          {statusLedger.length > 0 ? (
            <dl className="prr-ledger">
              {statusLedger.map(([status, count]) => (
                <div className="prr-ledger-row" key={status}>
                  <dt>{getStatusLabel(status)}</dt>
                  <dd>{counter.format(count)}</dd>
                  <span className="prr-bar prr-bar--slate" aria-hidden="true"><span style={{ transform: `scaleX(${share(count, totalReports) / 100})` }} /></span>
                </div>
              ))}
            </dl>
          ) : (
            <div className="prr-state"><p>No records to tally in this window.</p></div>
          )}
        </section>
      </div>

      <section className="prr-panel" aria-label="Antique municipal breakdown matrix" style={{ overflow: 'hidden' }}>
        <div className="prr-section-head">
          <h3>Antique Municipal Breakdown Matrix</h3>
          <p>Incident totals across every Antique municipality for this coverage window.</p>
        </div>
        {municipalities.length > 0 ? (
          <div className="prr-scroll">
            <table className="prr-table prr-table--matrix">
              <thead>
                <tr>
                  <th scope="col">Municipality</th>
                  <th scope="col" className="prr-num">Total Intake</th>
                  <th scope="col" className="prr-num">Confirmed Fires</th>
                  <th scope="col" className="prr-num">False / Duplicate</th>
                  <th scope="col" className="prr-num">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {municipalities.map((row) => (
                  <tr key={row.municipalityId}>
                    <td style={{ fontWeight: 700 }}>{row.municipalityName}</td>
                    <td className={row.total > 0 ? 'prr-num' : 'prr-num prr-num--zero'} style={row.total > 0 ? { fontWeight: 700 } : undefined}>{counter.format(row.total)}</td>
                    <td className={row.confirmed > 0 ? 'prr-num' : 'prr-num prr-num--zero'} style={row.confirmed > 0 ? { color: '#16865a', fontWeight: 700 } : undefined}>{counter.format(row.confirmed)}</td>
                    <td className={row.falseReport > 0 ? 'prr-num' : 'prr-num prr-num--zero'} style={row.falseReport > 0 ? { color: '#a35408', fontWeight: 700 } : undefined}>{counter.format(row.falseReport)}</td>
                    <td className={row.resolved > 0 ? 'prr-num' : 'prr-num prr-num--zero'} style={row.resolved > 0 ? { color: '#1d63ac', fontWeight: 700 } : undefined}>{counter.format(row.resolved)}</td>
                  </tr>
                ))}
                <tr className="prr-total-row">
                  <td>Province of Antique</td>
                  <td className="prr-num">{counter.format(municipalities.reduce((sum, row) => sum + row.total, 0))}</td>
                  <td className="prr-num">{counter.format(municipalities.reduce((sum, row) => sum + row.confirmed, 0))}</td>
                  <td className="prr-num">{counter.format(municipalities.reduce((sum, row) => sum + row.falseReport, 0))}</td>
                  <td className="prr-num">{counter.format(municipalities.reduce((sum, row) => sum + row.resolved, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="prr-state">
            <div className="prr-state-icon" aria-hidden="true"><i className="fa-solid fa-map-location-dot" /></div>
            <strong>No municipal totals yet</strong>
            <p>{summaryLoading ? 'Reading the provincial ledger…' : 'Generate the summary again once records exist for this coverage window.'}</p>
          </div>
        )}
      </section>

      <section className="prr-panel" aria-label="Incident record log" style={{ overflow: 'hidden' }}>
        <div className="prr-section-head">
          <h3>Incident Record Log</h3>
          <p>Every individual record in this coverage window, with its intake, response, and resolution timestamps.</p>
        </div>

        {recordsError && (
          <div className="prr-alert" role="alert" style={{ border: 0, borderRadius: 0, borderBottom: '1px solid #fecaca' }}>
            <span><strong>Record log unavailable.</strong> {recordsError}</span>
            <button type="button" className="no-print" onClick={() => setReloadToken((token) => token + 1)}>Retry</button>
          </div>
        )}

        {recordsLoading && records.length === 0 ? (
          <div aria-hidden="true">
            {Array.from({ length: 6 }, (_, row) => (
              <div className="prr-skeleton-row" key={row}>
                {Array.from({ length: 8 }, (_, cell) => <div className="prr-skeleton" key={cell} />)}
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          recordsError ? null : (
            <div className="prr-state">
              <div className="prr-state-icon" aria-hidden="true"><i className="fa-solid fa-folder-open" /></div>
              <strong>No incident records match this coverage</strong>
              <p>Widen the coverage dates or clear a filter, then generate the summary again.</p>
            </div>
          )
        ) : (
          <>
            <div className="prr-scroll prr-scroll--log">
              <table className="prr-table prr-table--log">
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Location</th>
                    <th scope="col">Incident</th>
                    <th scope="col">Source</th>
                    <th scope="col">Status</th>
                    <th scope="col">Date Submitted</th>
                    <th scope="col">Response Started</th>
                    <th scope="col">Date Resolved</th>
                    <th scope="col" className="prr-num">Time To Response</th>
                    <th scope="col">Latest Dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td><span className="prr-reference">{record.referenceNumber}</span></td>
                      <td>
                        <div className="prr-place">
                          <strong>{record.municipalityName}</strong>
                          <span>{record.barangay}</span>
                        </div>
                      </td>
                      <td>
                        <span className="prr-fire-type">{getFireTypeLabel(record.fireType)}</span>
                        {severityBadge(record.severity)}
                      </td>
                      <td><span className="prr-source">{record.reportSource === 'ALAB_APP' ? 'App' : 'Phone'}</span></td>
                      <td>{statusBadge(record.status)}</td>
                      <td>{dateCell(record.submittedAt, 'Not recorded')}</td>
                      <td>{dateCell(record.responseStartedAt, 'Awaiting response')}</td>
                      <td>{dateCell(record.resolvedAt, 'Still open')}</td>
                      <td className="prr-num">
                        <span className="prr-elapsed">{formatMinutes(elapsedMinutes(record.submittedAt, record.responseStartedAt))}</span>
                      </td>
                      <td><span className="prr-dispatch">{record.latestDispatchSummary || 'No dispatch recorded'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="prr-mobile-log">
              {records.map((record) => (
                <article className="prr-mobile-card" key={record.id}>
                  <div className="prr-mobile-top">
                    <span className="prr-reference">{record.referenceNumber}</span>
                    {statusBadge(record.status)}
                  </div>
                  <div className="prr-mobile-data">
                    <div>
                      <span className="prr-mobile-label">Location</span>
                      <div className="prr-place"><strong>{record.municipalityName}</strong><span>{record.barangay}</span></div>
                    </div>
                    <div>
                      <span className="prr-mobile-label">Incident</span>
                      <span className="prr-fire-type">{getFireTypeLabel(record.fireType)}</span>
                      {severityBadge(record.severity)}
                    </div>
                    <div>
                      <span className="prr-mobile-label">Date Submitted</span>
                      {dateCell(record.submittedAt, 'Not recorded')}
                    </div>
                    <div>
                      <span className="prr-mobile-label">Response Started</span>
                      {dateCell(record.responseStartedAt, 'Awaiting response')}
                    </div>
                    <div>
                      <span className="prr-mobile-label">Date Resolved</span>
                      {dateCell(record.resolvedAt, 'Still open')}
                    </div>
                    <div>
                      <span className="prr-mobile-label">Time To Response</span>
                      <span className="prr-elapsed">{formatMinutes(elapsedMinutes(record.submittedAt, record.responseStartedAt))}</span>
                    </div>
                  </div>
                  <span className="prr-dispatch">{record.latestDispatchSummary || 'No dispatch recorded'}</span>
                </article>
              ))}
            </div>

            <div className="prr-print-note">
              Printed record log covers records {counter.format(firstRow)}–{counter.format(lastRow)} of {counter.format(totalRecords)} in this
              coverage window. Raise the rows-per-page setting before printing to carry more records onto the official copy.
            </div>

            <div className="prr-foot no-print">
              <span aria-live="polite">
                Showing {counter.format(firstRow)}–{counter.format(lastRow)} of {counter.format(totalRecords)} records
              </span>
              <div className="prr-page-size">
                <label htmlFor="prr-page-size">Rows per page</label>
                <select
                  id="prr-page-size"
                  value={pageSize}
                  onChange={(event) => { setPageSize(Number(event.target.value) as 25 | 50 | 100); setPage(1); }}
                >
                  {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
              <nav className="prr-pagination" aria-label="Incident record pages">
                <button
                  type="button"
                  className="prr-page-button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={recordsLoading || page <= 1}
                >
                  <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="prr-page-button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={recordsLoading || page >= totalPages}
                >
                  Next <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
