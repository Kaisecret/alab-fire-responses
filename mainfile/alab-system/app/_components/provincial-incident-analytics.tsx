"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  alignComparisonSeries,
  buildGroupedBarLayout,
  buildAnalyticsQuery,
  buildCumulativeSeries,
  buildFireTypeComparison,
  buildMunicipalityRanking,
  buildSmoothChartPath,
  calculateComparisonChange,
  getNextMonth,
  getPreviousMonth,
  getSameMonthLastYear,
  hasRecordedActivity,
} from "../../lib/provincial-bfp/dashboard-analytics.mjs";
import type { ProvincialReportSummary } from "../../lib/provincial-bfp/management/types";

type AnalyticsView = "TREND" | "MUNICIPALITIES" | "FIRE_TYPES";
type ComparisonMode = "NONE" | "PREVIOUS" | "LAST_YEAR" | "BOTH";
type TrendMetric = "total" | "active" | "resolved" | "verification" | "administrative";
type TrendChartStyle = "CUMULATIVE" | "LINE" | "BAR";
type MunicipalityOption = { id: string; name: string };

type ComparisonSummaries = {
  previous: ProvincialReportSummary | null;
  lastYear: ProvincialReportSummary | null;
};

type AlignedTrendPoint = {
  day: number;
  currentDate: string | null;
  previousDate: string | null;
  lastYearDate: string | null;
  current: number | null;
  previous: number | null;
  lastYear: number | null;
  breakdown: { active: number; resolved: number; verification: number; administrative: number } | null;
};

type GroupedTrendBar = {
  dayIndex: number;
  key: "current" | "previous" | "lastYear";
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const STATUS_COLORS = {
  active: "#D92D20",
  resolved: "#087F5B",
  verification: "#D97706",
  administrative: "#64748B",
} as const;

const FIRE_TYPES = [
  ["HOUSE_BUILDING", "House / building"],
  ["GRASS", "Grass"],
  ["FOREST", "Forest"],
  ["VEHICLE", "Vehicle"],
  ["OTHER", "Rubbish"],
] as const;

const styles = `
  .pia-shell { background:#fff; border:1px solid #DCE4EE; border-radius:18px; overflow:hidden; box-shadow:0 16px 36px -28px rgba(20,35,59,.42); }
  .pia-head { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:1rem 1.5rem; align-items:start; padding:1.25rem 1.35rem 1rem; border-bottom:1px solid #E7EDF4; }
  .pia-title-row { display:flex; align-items:center; gap:.8rem; }
  .pia-icon { width:42px; height:42px; display:grid; place-items:center; flex:0 0 auto; border-radius:12px; color:#fff; background:#14233B; box-shadow:0 8px 18px -10px rgba(20,35,59,.65); }
  .pia-title { margin:0; color:#14233B; font-size:1.08rem; font-weight:800; letter-spacing:-.018em; }
  .pia-subtitle { display:block; margin-top:.16rem; color:#718096; font-size:.76rem; font-weight:600; }
  .pia-updated { display:inline-flex; align-items:center; gap:.35rem; margin-top:.45rem; color:#087F5B; font-size:.68rem; font-weight:750; }
  .pia-updated::before { content:""; width:6px; height:6px; border-radius:50%; background:#10A77A; }
  .pia-controls { display:flex; align-items:end; gap:.65rem; flex-wrap:wrap; justify-content:flex-end; }
  .pia-field { display:grid; gap:.3rem; }
  .pia-field label { color:#52627A; font-size:.66rem; font-weight:750; }
  .pia-select, .pia-month { min-height:38px; border:1px solid #D5DFEB; border-radius:10px; background:#F8FAFC; color:#14233B; padding:.45rem .7rem; font:inherit; font-size:.76rem; font-weight:650; outline:none; }
  .pia-select { min-width:188px; }
  .pia-select:focus-visible, .pia-month:focus-visible, .pia-tab:focus-visible, .pia-month-step:focus-visible, .pia-retry:focus-visible { outline:3px solid rgba(37,99,235,.23); outline-offset:2px; }
  .pia-month-control { display:flex; align-items:center; gap:.3rem; }
  .pia-month-step { width:38px; height:38px; border:1px solid #D5DFEB; border-radius:10px; background:#fff; color:#52627A; cursor:pointer; }
  .pia-month-step:disabled { opacity:.4; cursor:not-allowed; }
  .pia-month-picker { position:relative; }
  button.pia-month { display:inline-flex; align-items:center; justify-content:space-between; gap:.6rem; min-width:158px; cursor:pointer; text-align:left; }
  button.pia-month i { color:#64748B; }
  button.pia-month[aria-expanded="true"] { border-color:#94A3B8; background:#fff; }
  .pia-month-popover { position:absolute; z-index:20; top:calc(100% + 6px); right:0; width:276px; padding:.8rem; border:1px solid #DCE4EE; border-radius:14px; background:#fff; box-shadow:0 22px 44px -24px rgba(20,35,59,.5); }
  .pia-month-popover-head { display:grid; grid-template-columns:34px minmax(0,1fr) 34px; gap:.4rem; align-items:center; margin-bottom:.7rem; }
  .pia-year-step { height:34px; border:1px solid #DCE4EE; border-radius:9px; background:#fff; color:#52627A; cursor:pointer; }
  .pia-year-step:disabled { opacity:.35; cursor:not-allowed; }
  .pia-year-select { height:34px; border:1px solid #DCE4EE; border-radius:9px; background:#F8FAFC; color:#14233B; font:inherit; font-size:.82rem; font-weight:800; text-align:center; text-align-last:center; cursor:pointer; }
  .pia-month-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.35rem; }
  .pia-month-cell { min-height:38px; border:1px solid transparent; border-radius:9px; background:#F8FAFC; color:#14233B; font:inherit; font-size:.74rem; font-weight:750; cursor:pointer; transition:background .15s ease,color .15s ease; }
  .pia-month-cell:hover:not(:disabled) { background:#EAF0F6; }
  .pia-month-cell.current { border-color:#F3B4AE; color:#B42318; }
  .pia-month-cell.selected { border-color:#14233B; background:#14233B; color:#fff; }
  .pia-month-cell:disabled { background:transparent; color:#C3CBD5; cursor:not-allowed; }
  .pia-month-popover-foot { display:flex; justify-content:space-between; gap:.5rem; margin-top:.7rem; padding-top:.6rem; border-top:1px solid #EDF1F6; }
  .pia-month-link { border:0; background:transparent; color:#B42318; padding:.2rem 0; font:inherit; font-size:.7rem; font-weight:800; cursor:pointer; }
  .pia-month-link:disabled { color:#C3CBD5; cursor:not-allowed; }
  .pia-year-step:focus-visible, .pia-year-select:focus-visible, .pia-month-cell:focus-visible, .pia-month-link:focus-visible { outline:3px solid rgba(37,99,235,.23); outline-offset:2px; }
  .pia-toolbar { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.75rem 1.35rem; background:#F8FAFC; border-bottom:1px solid #E7EDF4; }
  .pia-tabs { display:inline-flex; align-items:center; gap:.25rem; padding:.25rem; border-radius:11px; background:#EAF0F6; }
  .pia-tab { border:0; border-radius:8px; background:transparent; color:#5C6B80; padding:.55rem .85rem; font-size:.72rem; font-weight:750; cursor:pointer; }
  .pia-tab.active { background:#14233B; color:#fff; box-shadow:0 3px 8px rgba(20,35,59,.16); }
  .pia-scope { color:#718096; font-size:.7rem; font-weight:650; text-align:right; }
  .pia-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); border-bottom:1px solid #E7EDF4; }
  .pia-metric { padding:.85rem 1.25rem; border-right:1px solid #EDF1F6; }
  .pia-metric:last-child { border-right:0; }
  .pia-metric span { display:block; color:#718096; font-size:.64rem; font-weight:750; text-transform:uppercase; letter-spacing:.035em; }
  .pia-metric strong { display:block; margin-top:.2rem; color:#14233B; font-size:1.16rem; font-weight:850; font-variant-numeric:tabular-nums; }
  .pia-body { position:relative; min-height:330px; padding:1rem 1.35rem 1.15rem; }
  .pia-loading { position:absolute; inset:0; z-index:2; display:grid; place-items:center; background:rgba(255,255,255,.78); backdrop-filter:blur(2px); color:#5C6B80; font-size:.76rem; font-weight:700; }
  .pia-loading i { margin-right:.4rem; color:#D92D20; }
  .pia-error, .pia-empty { min-height:280px; display:grid; place-items:center; align-content:center; gap:.55rem; text-align:center; color:#64748B; }
  .pia-error i, .pia-empty i { font-size:1.55rem; color:#94A3B8; }
  .pia-error strong, .pia-empty strong { color:#14233B; font-size:.88rem; }
  .pia-retry { border:0; border-radius:8px; background:#14233B; color:#fff; padding:.5rem .8rem; font-size:.72rem; font-weight:750; cursor:pointer; }
  .pia-chart-caption { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; margin-bottom:.85rem; }
  .pia-chart-caption h3 { margin:0; color:#14233B; font-size:.9rem; font-weight:800; }
  .pia-chart-caption p { margin:.2rem 0 0; color:#7B889A; font-size:.68rem; }
  .pia-chart-head-actions { display:flex; align-items:center; justify-content:flex-end; gap:.85rem; flex-wrap:wrap; }
  .pia-view-switch { display:inline-flex; align-items:center; gap:.2rem; padding:.2rem; border:1px solid #DCE5EF; border-radius:10px; background:#F3F6FA; }
  .pia-view-btn { display:inline-flex; align-items:center; justify-content:center; gap:.35rem; min-height:31px; border:0; border-radius:7px; background:transparent; color:#64748B; padding:.38rem .62rem; font-size:.65rem; font-weight:800; cursor:pointer; transition:background .18s ease,color .18s ease,box-shadow .18s ease; }
  .pia-view-btn.active { background:#fff; color:#D92D20; box-shadow:0 5px 14px -9px rgba(20,35,59,.65); }
  .pia-legend { display:flex; align-items:center; justify-content:flex-end; gap:.75rem; flex-wrap:wrap; }
  .pia-legend span { display:inline-flex; align-items:center; gap:.35rem; color:#64748B; font-size:.64rem; font-weight:700; }
  .pia-legend i { width:8px; height:8px; border-radius:3px; }
  .pia-svg { display:block; width:100%; height:auto; min-height:250px; overflow:visible; }
  .pia-grid-line { stroke:#E7EDF4; stroke-width:1; }
  .pia-axis-label { fill:#8290A3; font-size:10px; font-weight:650; }
  .pia-stack-segment { transform-box:fill-box; transform-origin:center bottom; animation:piaBarIn .42s cubic-bezier(.16,1,.3,1) both; }
  @keyframes piaBarIn { from { transform:scaleY(0); opacity:.3; } to { transform:scaleY(1); opacity:1; } }
  .pia-rank-list { display:grid; gap:.45rem; margin:0; padding:0; list-style:none; }
  .pia-rank-list li { position:relative; }
  .pia-rank-row { display:grid; grid-template-columns:30px minmax(140px,210px) minmax(0,1fr) 38px 44px 104px 12px; grid-template-areas:"rank name bar total share delta go"; align-items:center; gap:.85rem; padding:.65rem .8rem; border:1px solid #EDF1F6; border-radius:12px; background:#fff; color:inherit; text-decoration:none; transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease; }
  .pia-rank-row.no-delta { grid-template-columns:30px minmax(140px,210px) minmax(0,1fr) 38px 44px 12px; grid-template-areas:"rank name bar total share go"; }
  .pia-rank-row:hover, .pia-rank-row.is-active { border-color:#D5DFEB; box-shadow:0 12px 26px -20px rgba(20,35,59,.5); transform:translateY(-1px); }
  .pia-rank-row:focus-visible { outline:3px solid rgba(37,99,235,.23); outline-offset:2px; }
  .pia-rank-badge { grid-area:rank; width:26px; height:26px; display:grid; place-items:center; border-radius:8px; background:#F1F5F9; color:#52627A; font-size:.7rem; font-weight:850; }
  .pia-rank-badge.top { background:#FEF3F2; color:#B42318; }
  .pia-rank-name { grid-area:name; min-width:0; color:#14233B; font-size:.76rem; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .pia-rank-bar { grid-area:bar; display:block; height:12px; }
  .pia-rank-fill { display:flex; gap:2px; height:100%; min-width:6px; transform-origin:left center; animation:piaGrowX .5s cubic-bezier(.16,1,.3,1) both; }
  .pia-rank-fill span { min-width:3px; border-radius:3px; }
  .pia-rank-fill span:first-child { border-top-left-radius:6px; border-bottom-left-radius:6px; }
  .pia-rank-fill span:last-child { border-top-right-radius:6px; border-bottom-right-radius:6px; }
  .pia-rank-total { grid-area:total; color:#14233B; font-size:.86rem; font-weight:850; text-align:right; font-variant-numeric:tabular-nums; }
  .pia-rank-share { grid-area:share; color:#7B889A; font-size:.68rem; font-weight:750; text-align:right; font-variant-numeric:tabular-nums; }
  .pia-rank-delta { grid-area:delta; justify-self:end; display:inline-flex; align-items:center; gap:.3rem; padding:.2rem .5rem; border-radius:999px; background:#F1F5F9; color:#64748B; font-size:.62rem; font-weight:800; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .pia-rank-delta.up { background:#FEF3F2; color:#B42318; }
  .pia-rank-delta.down { background:#ECFDF3; color:#087F5B; }
  .pia-rank-go { grid-area:go; color:#C3CBD5; font-size:.62rem; }
  .pia-rank-tooltip { position:absolute; z-index:4; top:calc(100% - 2px); left:250px; width:238px; padding:.7rem .8rem; border:1px solid rgba(210,220,232,.92); border-radius:12px; background:rgba(255,255,255,.97); box-shadow:0 18px 38px -20px rgba(20,35,59,.48); pointer-events:none; }
  .pia-rank-tooltip-hint { color:#7B889A; font-size:.6rem; font-weight:700; }
  .pia-quiet { margin-top:1rem; padding:.85rem 1rem; border:1px dashed #D5DFEB; border-radius:12px; background:#F8FAFC; }
  .pia-quiet-title { display:flex; align-items:center; gap:.45rem; margin-bottom:.65rem; color:#52627A; font-size:.7rem; font-weight:800; }
  .pia-quiet-title i { color:#087F5B; }
  .pia-quiet-chips { display:flex; flex-wrap:wrap; gap:.4rem; }
  .pia-quiet-chip { padding:.32rem .68rem; border:1px solid #E2E8F0; border-radius:999px; background:#fff; color:#52627A; font-size:.66rem; font-weight:700; text-decoration:none; transition:border-color .15s ease,color .15s ease; }
  .pia-quiet-chip:hover { border-color:#CBD5E1; color:#14233B; }
  .pia-quiet-chip:focus-visible { outline:3px solid rgba(37,99,235,.23); outline-offset:2px; }
  @keyframes piaGrowX { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  .pia-fire-chart { display:grid; grid-template-columns:repeat(5,minmax(65px,1fr)); align-items:end; gap:1rem; min-height:250px; padding:1.25rem .5rem 0; border-bottom:1px solid #DDE5EE; }
  .pia-fire-column { position:relative; display:grid; grid-template-rows:1fr auto; height:230px; gap:.65rem; text-align:center; border-radius:12px; outline:none; cursor:default; }
  .pia-fire-column:focus-visible { box-shadow:0 0 0 3px rgba(37,99,235,.23); }
  .pia-fire-bar-wrap { display:flex; align-items:end; justify-content:center; gap:3px; min-height:0; }
  .pia-fire-bar { position:relative; width:min(46px,42%); min-height:2px; border-radius:4px 4px 0 0; background:#516985; animation:piaBarIn .42s cubic-bezier(.16,1,.3,1) both; transition:opacity .16s ease; }
  .pia-fire-bar.is-comparison { width:min(20px,18%); opacity:.82; }
  /* filter, not opacity: the bar entrance animation holds opacity at 1 */
  .pia-fire-chart:has(.is-active) .pia-fire-column:not(.is-active) .pia-fire-bar { filter:grayscale(.55) opacity(.45); }
  .pia-fire-bar strong { position:absolute; left:50%; top:-1.35rem; transform:translateX(-50%); color:#14233B; font-size:.74rem; font-variant-numeric:tabular-nums; }
  .pia-fire-label { color:#65748A; font-size:.64rem; font-weight:700; line-height:1.25; }
  .pia-fire-label small { display:block; margin-top:.12rem; color:#94A3B8; font-size:.58rem; font-weight:700; font-variant-numeric:tabular-nums; }
  .pia-trend-tools.pia-fire-tools { justify-content:flex-end; margin-top:0; }
  .pia-fire-tooltip { position:absolute; z-index:4; top:8%; left:calc(50% + 36px); width:236px; padding:.7rem .8rem; border:1px solid rgba(210,220,232,.92); border-radius:12px; background:rgba(255,255,255,.97); box-shadow:0 18px 38px -20px rgba(20,35,59,.48); text-align:left; pointer-events:none; }
  .pia-fire-column:nth-last-child(-n+2) .pia-fire-tooltip { left:auto; right:calc(50% + 36px); }
  .pia-fire-tooltip .pia-tooltip-row strong { white-space:nowrap; }
  .pia-trend-tools { display:flex; align-items:end; justify-content:space-between; gap:1rem; margin:.2rem 0 1rem; }
  .pia-tool-group { display:grid; gap:.35rem; }
  .pia-tool-label { color:#7B889A; font-size:.62rem; font-weight:800; letter-spacing:.045em; text-transform:uppercase; }
  .pia-metric-select { min-height:36px; min-width:160px; border:1px solid #D7E0EB; border-radius:10px; background:#fff; color:#14233B; padding:.4rem 2rem .4rem .7rem; font:inherit; font-size:.72rem; font-weight:750; outline:none; }
  .pia-compare-switch { display:flex; align-items:center; gap:.2rem; padding:.22rem; border:1px solid #DDE5EE; border-radius:11px; background:#F4F7FA; }
  .pia-compare-btn { min-height:31px; border:0; border-radius:8px; background:transparent; color:#64748B; padding:.42rem .68rem; font-size:.66rem; font-weight:750; cursor:pointer; transition:background .18s ease,color .18s ease,box-shadow .18s ease; }
  .pia-compare-btn.active { background:#fff; color:#14233B; box-shadow:0 4px 12px -8px rgba(20,35,59,.55); }
  .pia-chart-stage { position:relative; min-width:680px; min-height:320px; overflow:hidden; border:1px solid #E7EDF4; border-radius:16px; background:linear-gradient(180deg,#FCFDFE 0%,#F7FAFC 100%); box-shadow:inset 0 1px 0 rgba(255,255,255,.9); }
  .pia-chart-stage::before { content:""; position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 18% 0%,rgba(217,45,32,.055),transparent 34%); }
  .pia-line-chart { position:relative; z-index:1; display:block; width:100%; height:auto; }
  .pia-chart-scroll { overflow-x:auto; padding-bottom:.15rem; scrollbar-width:thin; }
  .pia-current-area { animation:piaAreaIn .7s cubic-bezier(.16,1,.3,1) both; }
  .pia-chart-series { transform-box:fill-box; transform-origin:center; animation:piaSeriesIn .42s cubic-bezier(.16,1,.3,1) both; }
  .pia-trend-line { fill:none; stroke-linecap:round; stroke-linejoin:round; vector-effect:non-scaling-stroke; }
  .pia-line-marker { vector-effect:non-scaling-stroke; transition:r .16s ease,opacity .16s ease; }
  .pia-trend-bar { transform-box:fill-box; transform-origin:center bottom; animation:piaBarRise .46s cubic-bezier(.16,1,.3,1) both; transition:opacity .16s ease; }
  .pia-trend-bar:hover { opacity:1!important; }
  .pia-hover-point { vector-effect:non-scaling-stroke; filter:drop-shadow(0 3px 5px rgba(20,35,59,.2)); }
  .pia-hit-point:focus { outline:none; }
  .pia-crosshair { stroke:#94A3B8; stroke-width:1; stroke-dasharray:3 4; vector-effect:non-scaling-stroke; }
  .pia-tooltip { position:absolute; z-index:4; top:18px; width:218px; padding:.8rem .85rem; border:1px solid rgba(210,220,232,.92); border-radius:13px; background:rgba(255,255,255,.96); box-shadow:0 18px 38px -20px rgba(20,35,59,.48); backdrop-filter:blur(12px); pointer-events:none; }
  .pia-tooltip-date { color:#14233B; font-size:.72rem; font-weight:850; }
  .pia-tooltip-row { display:flex; align-items:center; justify-content:space-between; gap:.7rem; margin-top:.46rem; color:#64748B; font-size:.66rem; font-weight:700; }
  .pia-tooltip-row span { display:inline-flex; align-items:center; gap:.38rem; }
  .pia-tooltip-row i { width:8px; height:8px; border-radius:50%; }
  .pia-tooltip-row strong { color:#14233B; font-size:.72rem; font-variant-numeric:tabular-nums; }
  .pia-tooltip-divider { height:1px; margin:.62rem 0 .5rem; background:#E8EDF3; }
  .pia-tooltip-breakdown { display:grid; grid-template-columns:1fr 1fr; gap:.35rem .65rem; color:#7B889A; font-size:.59rem; font-weight:700; }
  .pia-period-legend i { display:block; width:20px; height:3px; border-radius:5px; }
  .pia-period-legend .is-empty { color:#9AA6B6; }
  .pia-period-legend .is-empty i { background:transparent!important; border-top:2px dashed #C3CCD8; height:0; }
  .pia-period-legend em { font-style:normal; font-weight:650; }
  .pia-axis-line { stroke:#C6D1DE; stroke-width:1.25; }
  .pia-today-line { stroke:#94A3B8; stroke-width:1; stroke-dasharray:2 5; }
  .pia-today-label { fill:#64748B; font-size:10px; font-weight:750; }
  .pia-end-label { fill:#14233B; font-size:12px; font-weight:850; font-variant-numeric:tabular-nums; paint-order:stroke; stroke:#FCFDFE; stroke-width:4px; stroke-linejoin:round; }
  .pia-no-records { display:flex; align-items:center; gap:.45rem; margin:-.35rem 0 .8rem; padding:.5rem .7rem; border:1px dashed #D5DFEB; border-radius:10px; background:#F8FAFC; color:#64748B; font-size:.66rem; font-weight:650; }
  .pia-no-records i { color:#94A3B8; }
  .pia-insight-change { display:inline-flex!important; align-items:center; gap:.3rem; margin-top:.25rem!important; color:#64748B!important; font-size:.63rem!important; font-weight:750!important; text-transform:none!important; letter-spacing:0!important; }
  .pia-insight-change.up { color:#B42318!important; }
  .pia-insight-change.down { color:#087F5B!important; }
  @keyframes piaSeriesIn { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
  @keyframes piaBarRise { from { transform:scaleY(0); opacity:.25; } to { transform:scaleY(1); } }
  @keyframes piaAreaIn { from { opacity:0; } to { opacity:1; } }
  .pia-sr { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
  @media (max-width:780px) {
    .pia-head { grid-template-columns:1fr; }
    .pia-controls { justify-content:stretch; align-items:stretch; }
    .pia-field { flex:1 1 180px; }
    .pia-select { width:100%; min-width:0; }
    .pia-month-control { display:grid; grid-template-columns:38px minmax(0,1fr) 38px; }
    .pia-month { width:100%; }
    .pia-toolbar { align-items:stretch; flex-direction:column; }
    .pia-tabs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); }
    .pia-tab { padding-inline:.35rem; }
    .pia-scope { text-align:left; }
    .pia-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .pia-metric:nth-child(2) { border-right:0; }
    .pia-metric:nth-child(-n+2) { border-bottom:1px solid #EDF1F6; }
    .pia-chart-caption { align-items:flex-start; flex-direction:column; }
    .pia-chart-head-actions { align-items:flex-start; justify-content:flex-start; }
    .pia-legend { justify-content:flex-start; }
    .pia-body { padding-inline:.8rem; }
    .pia-rank-row, .pia-rank-row.no-delta { grid-template-columns:26px minmax(0,1fr) 34px auto; grid-template-areas:"rank name total delta" ". bar bar bar"; gap:.45rem .6rem; }
    .pia-rank-share, .pia-rank-go { display:none; }
    .pia-rank-tooltip { left:1rem; }
    .pia-fire-chart { gap:.4rem; padding-inline:0; }
    .pia-fire-label { font-size:.58rem; }
    .pia-trend-tools { align-items:stretch; flex-direction:column; }
    .pia-compare-switch { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
    .pia-compare-btn { padding-inline:.3rem; }
    .pia-metric-select { width:100%; }
    .pia-chart-stage { min-height:270px; }
  }
  @media (prefers-reduced-motion:reduce) { .pia-stack-segment, .pia-fire-bar, .pia-current-area, .pia-chart-series, .pia-trend-bar, .pia-rank-fill { animation:none; } .pia-rank-row, .pia-compare-btn, .pia-view-btn, .pia-line-marker, .pia-trend-bar { transition:none; } }
`;

function currentManilaMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

function currentManilaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" })
    .format(new Date(`${month}-01T00:00:00+08:00`));
}

function summarizeTrend(summary: ProvincialReportSummary | null) {
  const trend = summary?.dailyTrend ?? [];
  const total = trend.reduce((sum, day) => sum + day.total, 0);
  const peak = trend.reduce((best, day) => day.total > best.value ? { date: day.date, value: day.total } : best, { date: "", value: 0 });
  return { total, peak };
}

function changePresentation(change: { kind: string; value: number }) {
  if (change.kind === "new") return { label: "New activity", className: "up" };
  if (change.kind === "unchanged") return { label: "No change", className: "" };
  return {
    label: `${change.value > 0 ? "+" : ""}${change.value}%`,
    className: change.value > 0 ? "up" : change.value < 0 ? "down" : "",
  };
}

function StatusLegend() {
  return <div className="pia-legend" aria-label="Incident status legend">
    <span><i style={{ background: STATUS_COLORS.active }} />Active</span>
    <span><i style={{ background: STATUS_COLORS.resolved }} />Resolved</span>
    <span><i style={{ background: STATUS_COLORS.verification }} />Verification</span>
    <span><i style={{ background: STATUS_COLORS.administrative }} />Administrative</span>
  </div>;
}

const PERIOD_COLORS = {
  current: "#D92D20",
  previous: "#2563EB",
  lastYear: "#0E9384",
} as const;

const TREND_METRICS: Array<{ value: TrendMetric; label: string }> = [
  { value: "total", label: "All incidents" },
  { value: "active", label: "Active" },
  { value: "resolved", label: "Resolved" },
  { value: "verification", label: "Verification" },
  { value: "administrative", label: "Administrative" },
];

function formatChartDate(date: string | null) {
  if (!date) return "Not in this month";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })
    .format(new Date(`${date}T00:00:00+08:00`));
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PICKER_YEARS_BACK = 5;

// Replaces the browser month input, whose year list is hard to scroll back
// through: arrows or the year list jump years, and months after `max` are off.
function MonthPicker({ value, max, onChange }: { value: string; max: string; onChange: (month: string) => void }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => Number(value.slice(0, 4)));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const maxYear = Number(max.slice(0, 4));
  const minYear = maxYear - PICKER_YEARS_BACK;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
  const lastYearMonth = getSameMonthLastYear(value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (month: string) => {
    onChange(month);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return <div className="pia-month-picker" ref={rootRef}>
    <button
      ref={triggerRef}
      id="pia-month"
      type="button"
      className="pia-month"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => {
        if (!open) setViewYear(Number(value.slice(0, 4)));
        setOpen(!open);
      }}
    >
      <span>{monthLabel(value)}</span>
      <i className="fa-regular fa-calendar" aria-hidden="true" />
    </button>
    {open && <div className="pia-month-popover" role="dialog" aria-label="Choose incident month">
      <div className="pia-month-popover-head">
        <button type="button" className="pia-year-step" aria-label="Previous year" disabled={viewYear <= minYear} onClick={() => setViewYear(viewYear - 1)}><i className="fa-solid fa-chevron-left" /></button>
        <select className="pia-year-select" aria-label="Year" value={viewYear} onChange={(event) => setViewYear(Number(event.target.value))}>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <button type="button" className="pia-year-step" aria-label="Next year" disabled={viewYear >= maxYear} onClick={() => setViewYear(viewYear + 1)}><i className="fa-solid fa-chevron-right" /></button>
      </div>
      <div className="pia-month-grid">
        {MONTH_NAMES.map((name, index) => {
          const month = `${viewYear}-${String(index + 1).padStart(2, "0")}`;
          return <button
            key={name}
            type="button"
            className={`pia-month-cell ${month === value ? "selected" : ""} ${month === max ? "current" : ""}`}
            disabled={month > max}
            aria-pressed={month === value}
            aria-label={monthLabel(month)}
            onClick={() => choose(month)}
          >{name}</button>;
        })}
      </div>
      <div className="pia-month-popover-foot">
        <button type="button" className="pia-month-link" onClick={() => choose(max)}>This month</button>
        <button type="button" className="pia-month-link" disabled={Number(lastYearMonth.slice(0, 4)) < minYear} onClick={() => choose(lastYearMonth)}>Same month last year</button>
      </div>
    </div>}
  </div>;
}

function ComparisonSwitch({ value, onChange }: { value: ComparisonMode; onChange: (value: ComparisonMode) => void }) {
  return <div className="pia-tool-group">
    <span className="pia-tool-label">Compare with</span>
    <div className="pia-compare-switch" role="group" aria-label="Select comparison periods">
      {([
        ["NONE", "Current only"],
        ["PREVIOUS", "Last month"],
        ["LAST_YEAR", "Last year"],
        ["BOTH", "Both"],
      ] as const).map(([mode, label]) => <button key={mode} type="button" className={`pia-compare-btn ${value === mode ? "active" : ""}`} aria-pressed={value === mode} onClick={() => onChange(mode)}>{label}</button>)}
    </div>
  </div>;
}

function MonthlyTrend({
  summary,
  previousSummary,
  lastYearSummary,
  month,
  comparisonMode,
  chartStyle,
  metric,
  onComparisonMode,
  onChartStyle,
  onMetric,
}: {
  summary: ProvincialReportSummary;
  previousSummary: ProvincialReportSummary | null;
  lastYearSummary: ProvincialReportSummary | null;
  month: string;
  comparisonMode: ComparisonMode;
  chartStyle: TrendChartStyle;
  metric: TrendMetric;
  onComparisonMode: (value: ComparisonMode) => void;
  onChartStyle: (value: TrendChartStyle) => void;
  onMetric: (value: TrendMetric) => void;
}) {
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [today] = useState(currentManilaDate);
  // A period with no reports at all is shown as "No records", never as a
  // flat zero line, and the current month stops at today.
  const previousHasRecords = hasRecordedActivity(previousSummary?.dailyTrend);
  const lastYearHasRecords = hasRecordedActivity(lastYearSummary?.dailyTrend);
  const dailyPoints = alignComparisonSeries(
    summary.dailyTrend,
    previousSummary?.dailyTrend ?? [],
    lastYearSummary?.dailyTrend ?? [],
    metric,
    {
      through: today,
      omit: [...(previousHasRecords ? [] : ["previous"]), ...(lastYearHasRecords ? [] : ["lastYear"])],
    },
  ) as AlignedTrendPoint[];
  const cumulative = chartStyle === "CUMULATIVE";
  const points = (cumulative
    ? buildCumulativeSeries(dailyPoints, ["current", "previous", "lastYear"])
    : dailyPoints) as AlignedTrendPoint[];
  const width = 1000;
  const height = 330;
  const plot = { left: 48, right: 22, top: 24, bottom: 42 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const showPrevious = comparisonMode === "PREVIOUS" || comparisonMode === "BOTH";
  const showLastYear = comparisonMode === "LAST_YEAR" || comparisonMode === "BOTH";
  const visibleKeys: Array<"current" | "previous" | "lastYear"> = [
    "current",
    ...(showPrevious && previousHasRecords ? ["previous" as const] : []),
    ...(showLastYear && lastYearHasRecords ? ["lastYear" as const] : []),
  ];
  const peak = Math.max(0, ...points.flatMap((point) => visibleKeys.map((key) => point[key] ?? 0)));
  const maxValue = peak <= 4 ? 4 : peak <= 8 ? 8 : peak <= 20 ? Math.ceil(peak / 4) * 4 : Math.ceil(peak / 20) * 20;
  const gridValues = [0, .25, .5, .75, 1].map((part) => Math.round(maxValue * part));
  const xFor = (index: number) => plot.left + (index / Math.max(points.length - 1, 1)) * plotWidth;
  const yFor = (value: number) => plot.top + plotHeight - (value / maxValue) * plotHeight;
  const pathFor = (key: "current" | "previous" | "lastYear") => buildSmoothChartPath(points.map((point, index) => {
    const value = point[key];
    return value === null ? null : { x: xFor(index), y: yFor(value) };
  }));
  const currentPath = pathFor("current");
  const currentValues = points.filter((point) => point.current !== null);
  const areaPath = currentValues.length
    ? `${currentPath} L${xFor(currentValues.length - 1).toFixed(2)} ${(plot.top + plotHeight).toFixed(2)} L${xFor(0).toFixed(2)} ${(plot.top + plotHeight).toFixed(2)} Z`
    : "";
  const activePoint = activeDay ? points[activeDay - 1] : null;
  const metricLabel = TREND_METRICS.find((item) => item.value === metric)?.label ?? "Incidents";
  const periodSeries = [
    { key: "current" as const, dateKey: "currentDate" as const, label: monthLabel(month), color: PERIOD_COLORS.current, dash: undefined, visible: true, hasRecords: true },
    { key: "previous" as const, dateKey: "previousDate" as const, label: monthLabel(getPreviousMonth(month)), color: PERIOD_COLORS.previous, dash: "8 7", visible: showPrevious, hasRecords: previousHasRecords },
    { key: "lastYear" as const, dateKey: "lastYearDate" as const, label: monthLabel(getSameMonthLastYear(month)), color: PERIOD_COLORS.lastYear, dash: "2 7", visible: showLastYear, hasRecords: lastYearHasRecords },
  ].filter((series) => series.visible);
  const drawnSeries = periodSeries.filter((series) => series.hasRecords);
  const emptySeries = periodSeries.filter((series) => !series.hasRecords);
  const lastIndexOf = (key: "current" | "previous" | "lastYear") => {
    for (let index = points.length - 1; index >= 0; index--) if (points[index][key] !== null) return index;
    return -1;
  };
  const todayIndex = points.findIndex((point) => point.currentDate === today);
  const barSlotWidth = plotWidth / Math.max(points.length, 1);
  const barXFor = (index: number) => plot.left + (index + .5) * barSlotWidth;
  const bars = buildGroupedBarLayout(points, visibleKeys, {
    left: plot.left,
    plotWidth,
    plotHeight,
    baselineY: plot.top + plotHeight,
    maxValue,
  }) as GroupedTrendBar[];
  const hoverXFor = (index: number) => chartStyle === "BAR" ? barXFor(index) : xFor(index);

  return <>
    <div className="pia-chart-caption">
      <div><h3>Incident trend comparison</h3><p>{cumulative
        ? "Running total of the selected measure by day of the month, compared with last month and last year."
        : "Compare the same daily measure across the selected month, previous month, and last year."}</p></div>
      <div className="pia-chart-head-actions">
        <div className="pia-view-switch" role="group" aria-label="Select graph style">
          {([[
            "CUMULATIVE", "fa-arrow-trend-up", "Running total",
          ], [
            "LINE", "fa-chart-line", "Daily line",
          ], [
            "BAR", "fa-chart-simple", "Daily bars",
          ]] as const).map(([value, icon, label]) => <button key={value} type="button" className={`pia-view-btn ${chartStyle === value ? "active" : ""}`} aria-pressed={chartStyle === value} onClick={() => onChartStyle(value)}><i className={`fa-solid ${icon}`} aria-hidden="true" />{label}</button>)}
        </div>
        <div className="pia-legend pia-period-legend" aria-label="Comparison period legend">
          {periodSeries.map((series) => <span key={series.key} className={series.hasRecords ? "" : "is-empty"}><i style={{ background: series.color }} />{series.label}{!series.hasRecords && <em>· no records</em>}</span>)}
        </div>
      </div>
    </div>
    <div className="pia-trend-tools">
      <div className="pia-tool-group">
        <label className="pia-tool-label" htmlFor="pia-trend-metric">Measure</label>
        <select id="pia-trend-metric" className="pia-metric-select" value={metric} onChange={(event) => onMetric(event.target.value as TrendMetric)}>
          {TREND_METRICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      <ComparisonSwitch value={comparisonMode} onChange={onComparisonMode} />
    </div>
    {emptySeries.length > 0 && <p className="pia-no-records"><i className="fa-regular fa-circle-question" aria-hidden="true" />
      No reports were recorded in {emptySeries.map((series) => series.label).join(" or ")}, so {emptySeries.length > 1 ? "these periods are" : "this period is"} not drawn.
    </p>}
    <div className="pia-chart-scroll">
      <div className="pia-chart-stage">
        <svg
          className="pia-line-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${metricLabel} by day with period comparison`}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const viewX = ((event.clientX - rect.left) / rect.width) * width;
            const index = chartStyle === "BAR"
              ? Math.floor((viewX - plot.left) / barSlotWidth)
              : Math.round(((viewX - plot.left) / plotWidth) * Math.max(points.length - 1, 1));
            setActiveDay(Math.min(points.length, Math.max(1, index + 1)));
          }}
          onPointerLeave={() => setActiveDay(null)}
        >
          <defs>
            <linearGradient id="pia-current-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={PERIOD_COLORS.current} stopOpacity=".24" />
              <stop offset="72%" stopColor={PERIOD_COLORS.current} stopOpacity=".045" />
              <stop offset="100%" stopColor={PERIOD_COLORS.current} stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridValues.map((value) => {
            const y = yFor(value);
            return <g key={value}><line className="pia-grid-line" x1={plot.left} x2={width - plot.right} y1={y} y2={y} /><text className="pia-axis-label" x={plot.left - 10} y={y + 4} textAnchor="end">{value}</text></g>;
          })}
          <line className="pia-axis-line" x1={plot.left} x2={width - plot.right} y1={plot.top + plotHeight} y2={plot.top + plotHeight} />
          {todayIndex >= 0 && todayIndex < points.length - 1 && <g>
            <line className="pia-today-line" x1={hoverXFor(todayIndex)} x2={hoverXFor(todayIndex)} y1={plot.top} y2={plot.top + plotHeight} />
            <text className="pia-today-label" x={hoverXFor(todayIndex) + 6} y={plot.top + 10}>Today</text>
          </g>}
          <g className="pia-chart-series" key={`${chartStyle}-${metric}-${comparisonMode}`}>
            {chartStyle !== "BAR" ? <>
              {areaPath && <path className="pia-current-area" d={areaPath} fill="url(#pia-current-fill)" />}
              {drawnSeries.slice().reverse().map((series) => <path key={series.key} className="pia-trend-line" d={pathFor(series.key)} stroke={series.color} strokeWidth={series.key === "current" ? 3 : 2.25} strokeDasharray={series.dash} opacity={series.key === "current" ? 1 : .88} />)}
              {!cumulative && drawnSeries.flatMap((series) => points.map((point, index) => {
                const value = point[series.key];
                return value !== null && value > 0 ? <circle key={`${series.key}-${point.day}`} className="pia-line-marker" cx={xFor(index)} cy={yFor(value)} r="4" fill="#fff" stroke={series.color} strokeWidth="2" opacity={series.key === "current" ? 1 : .85} /> : null;
              }))}
              {cumulative && drawnSeries.map((series) => {
                const index = lastIndexOf(series.key);
                const value = index >= 0 ? points[index][series.key] : null;
                if (value === null) return null;
                const x = xFor(index);
                const nearRight = x > width - plot.right - 40;
                return <g key={`${series.key}-end`}>
                  <circle className="pia-line-marker" cx={x} cy={yFor(value)} r="4.5" fill="#fff" stroke={series.color} strokeWidth="2.5" />
                  <text className="pia-end-label" x={nearRight ? x - 9 : x + 9} y={yFor(value) - 8} textAnchor={nearRight ? "end" : "start"}>{value}</text>
                </g>;
              })}
            </> : bars.map((bar) => {
              const color = PERIOD_COLORS[bar.key];
              return <rect key={`${bar.key}-${bar.dayIndex}`} className="pia-trend-bar" x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx={Math.min(4, bar.width / 2)} fill={color} opacity={bar.key === "current" ? .94 : .7} />;
            })}
          </g>
          {points.map((point, index) => {
            const x = chartStyle === "BAR" ? barXFor(index) : xFor(index);
            const showLabel = point.day === 1 || point.day === points.length || point.day % 5 === 0;
            return <g key={point.day}>
              {showLabel && <text className="pia-axis-label" x={x} y={height - 14} textAnchor="middle">{point.day}</text>}
              <circle className="pia-hit-point" cx={x} cy={point.current === null ? plot.top + plotHeight : yFor(point.current)} r="9" fill="transparent" tabIndex={0} aria-label={`${formatChartDate(point.currentDate)}: ${point.current ?? 0} ${metricLabel.toLowerCase()}`} onFocus={() => setActiveDay(point.day)} onBlur={() => setActiveDay(null)} />
            </g>;
          })}
          {activePoint && <>
            <line className="pia-crosshair" x1={hoverXFor(activeDay! - 1)} x2={hoverXFor(activeDay! - 1)} y1={plot.top} y2={plot.top + plotHeight} />
            {drawnSeries.map((series) => {
              const value = activePoint[series.key];
              return value !== null && chartStyle !== "BAR" ? <circle key={series.key} className="pia-hover-point" cx={hoverXFor(activeDay! - 1)} cy={yFor(value)} r={series.key === "current" ? 5 : 4} fill="#fff" stroke={series.color} strokeWidth="3" /> : null;
            })}
          </>}
        </svg>
        {activePoint && <div className="pia-tooltip" style={{ left: `${(hoverXFor(activeDay! - 1) / width) * 100}%`, transform: activeDay! > points.length * .68 ? "translateX(-100%)" : activeDay! > points.length * .32 ? "translateX(-50%)" : "none" }}>
          <div className="pia-tooltip-date">Day {activePoint.day} {cumulative ? "running total" : "comparison"}</div>
          {periodSeries.map((series) => <div className="pia-tooltip-row" key={series.key}>
            <span><i style={{ background: series.color }} />{formatChartDate(activePoint[series.dateKey])}</span>
            <strong>{!series.hasRecords ? "No records" : activePoint[series.key] ?? "—"}</strong>
          </div>)}
          {activePoint.breakdown && <><div className="pia-tooltip-divider" /><div className="pia-tooltip-breakdown">
            <span>Active {activePoint.breakdown.active}</span>
            <span>Resolved {activePoint.breakdown.resolved}</span>
            <span>Verification {activePoint.breakdown.verification}</span>
            <span>Administrative {activePoint.breakdown.administrative}</span>
          </div></>}
        </div>}
      </div>
    </div>
  </>;
}

const STATUS_KEYS = ["active", "resolved", "verification", "administrative"] as const;
const STATUS_LABELS = { active: "Active", resolved: "Resolved", verification: "Verification", administrative: "Administrative" } as const;

type RankedMunicipality = {
  rank: number;
  id: string;
  name: string;
  total: number;
  share: number;
  segments: Record<(typeof STATUS_KEYS)[number], number>;
  delta: number | null;
};

function MunicipalityComparison({
  summary,
  previousSummary,
  month,
  onSelect,
}: {
  summary: ProvincialReportSummary;
  previousSummary: ProvincialReportSummary | null;
  month: string;
  onSelect: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const previousHasRecords = hasRecordedActivity(previousSummary?.dailyTrend);
  const ranking = buildMunicipalityRanking(
    summary.byMunicipality,
    previousHasRecords ? previousSummary?.byMunicipality ?? [] : null,
  ) as { ranked: RankedMunicipality[]; quiet: Array<{ id: string; name: string }>; total: number; max: number };
  const previousMonthName = monthLabel(getPreviousMonth(month)).split(" ")[0];
  const leader = ranking.ranked[0];
  const deltaText = (delta: number) => delta === 0 ? `Same as ${previousMonthName.slice(0, 3)}` : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} vs ${previousMonthName.slice(0, 3)}`;
  return <>
    <div className="pia-chart-caption">
      <div>
        <h3>Incidents by municipality</h3>
        <p>
          {ranking.ranked.length} of {summary.byMunicipality.length} municipalities reported incidents in {monthLabel(month)}
          {leader ? ` · ${leader.name} leads with ${leader.total} (${leader.share}%)` : ""}
          {!previousHasRecords ? ` · no ${previousMonthName} records to compare` : ""}.
        </p>
      </div>
      <StatusLegend />
    </div>
    <ol className="pia-rank-list" onPointerLeave={() => setActiveId(null)}>
      {ranking.ranked.map((row) => <li key={row.id}>
        <Link
          href="#municipal-incident-analytics"
          className={`pia-rank-row ${previousHasRecords ? "" : "no-delta"} ${activeId === row.id ? "is-active" : ""}`}
          onClick={() => onSelect(row.id)}
          onPointerEnter={() => setActiveId(row.id)}
          onFocus={() => setActiveId(row.id)}
          onBlur={() => setActiveId(null)}
          aria-label={`Rank ${row.rank}, ${row.name}: ${row.total} reports, ${row.share}% of Antique${row.delta !== null ? `, ${deltaText(row.delta)}` : ""}. Show its trend.`}
        >
          <span className={`pia-rank-badge ${row.rank <= 3 ? "top" : ""}`}>{row.rank}</span>
          <span className="pia-rank-name">{row.name}</span>
          <span className="pia-rank-bar" aria-hidden="true">
            <span className="pia-rank-fill" style={{ width: `${(row.total / Math.max(1, ranking.max)) * 100}%` }}>
              {STATUS_KEYS.filter((key) => row.segments[key] > 0).map((key) => <span key={key} style={{ flex: `${row.segments[key]} 1 0`, background: STATUS_COLORS[key] }} />)}
            </span>
          </span>
          <span className="pia-rank-total">{row.total}</span>
          <span className="pia-rank-share">{row.share}%</span>
          {row.delta !== null && <span className={`pia-rank-delta ${row.delta > 0 ? "up" : row.delta < 0 ? "down" : ""}`}>
            {row.delta !== 0 && <i className={`fa-solid ${row.delta > 0 ? "fa-arrow-up" : "fa-arrow-down"}`} aria-hidden="true" />}
            {deltaText(row.delta)}
          </span>}
          <i className="fa-solid fa-chevron-right pia-rank-go" aria-hidden="true" />
        </Link>
        {activeId === row.id && <div className="pia-rank-tooltip" role="tooltip">
          <div className="pia-tooltip-date">{row.name} · {row.total} {row.total === 1 ? "report" : "reports"}</div>
          {STATUS_KEYS.map((key) => <div className="pia-tooltip-row" key={key}>
            <span><i style={{ background: STATUS_COLORS[key] }} />{STATUS_LABELS[key]}</span>
            <strong>{row.segments[key]}</strong>
          </div>)}
          <div className="pia-tooltip-divider" />
          <div className="pia-rank-tooltip-hint">Click to open its trend</div>
        </div>}
      </li>)}
    </ol>
    {ranking.quiet.length > 0 && <div className="pia-quiet">
      <div className="pia-quiet-title"><i className="fa-regular fa-circle-check" aria-hidden="true" />No reports in {monthLabel(month)} · {ranking.quiet.length} {ranking.quiet.length === 1 ? "municipality" : "municipalities"}</div>
      <div className="pia-quiet-chips">
        {ranking.quiet.map((item) => <Link key={item.id} href="#municipal-incident-analytics" className="pia-quiet-chip" onClick={() => onSelect(item.id)}>{item.name}</Link>)}
      </div>
    </div>}
  </>;
}

function FireTypeChart({
  summary,
  previousSummary,
  lastYearSummary,
  month,
  comparisonMode,
  onComparisonMode,
}: {
  summary: ProvincialReportSummary;
  previousSummary: ProvincialReportSummary | null;
  lastYearSummary: ProvincialReportSummary | null;
  month: string;
  comparisonMode: ComparisonMode;
  onComparisonMode: (value: ComparisonMode) => void;
}) {
  const [activeType, setActiveType] = useState<string | null>(null);
  const showPrevious = comparisonMode === "PREVIOUS" || comparisonMode === "BOTH";
  const showLastYear = comparisonMode === "LAST_YEAR" || comparisonMode === "BOTH";
  const previousHasRecords = hasRecordedActivity(previousSummary?.dailyTrend);
  const lastYearHasRecords = hasRecordedActivity(lastYearSummary?.dailyTrend);
  const periods = [
    { key: "current" as const, label: monthLabel(month), color: PERIOD_COLORS.current, visible: true, hasRecords: true },
    { key: "previous" as const, label: monthLabel(getPreviousMonth(month)), color: PERIOD_COLORS.previous, visible: showPrevious, hasRecords: previousHasRecords },
    { key: "lastYear" as const, label: monthLabel(getSameMonthLastYear(month)), color: PERIOD_COLORS.lastYear, visible: showLastYear, hasRecords: lastYearHasRecords },
  ].filter((period) => period.visible);
  const drawn = periods.filter((period) => period.hasRecords);
  const empty = periods.filter((period) => !period.hasRecords);
  const comparison = buildFireTypeComparison(FIRE_TYPES, {
    current: summary.byFireType,
    previous: showPrevious && previousHasRecords ? previousSummary?.byFireType ?? {} : null,
    lastYear: showLastYear && lastYearHasRecords ? lastYearSummary?.byFireType ?? {} : null,
  }) as {
    rows: Array<{ id: string; label: string } & Record<"current" | "previous" | "lastYear", { count: number; share: number } | null>>;
    max: number;
  };
  const max = Math.max(1, comparison.max);
  return <>
    <div className="pia-chart-caption">
      <div><h3>Incidents by fire type</h3><p>Fire classifications for the selected municipality and month{drawn.length > 1 ? ", beside the periods you compare with" : ""}. Hover a type for its share.</p></div>
      <div className="pia-legend pia-period-legend" aria-label="Fire type period legend">
        {periods.map((period) => <span key={period.key} className={period.hasRecords ? "" : "is-empty"}><i style={{ background: period.color }} />{period.label}{!period.hasRecords && <em>· no records</em>}</span>)}
      </div>
    </div>
    <div className="pia-trend-tools pia-fire-tools">
      <ComparisonSwitch value={comparisonMode} onChange={onComparisonMode} />
    </div>
    {empty.length > 0 && <p className="pia-no-records"><i className="fa-regular fa-circle-question" aria-hidden="true" />
      No reports were recorded in {empty.map((period) => period.label).join(" or ")}, so {empty.length > 1 ? "these periods are" : "this period is"} not drawn.
    </p>}
    <div className="pia-fire-chart" role="group" aria-label="Incident totals grouped by fire type" onPointerLeave={() => setActiveType(null)}>
      {comparison.rows.map((row) => {
        const current = row.current ?? { count: 0, share: 0 };
        const summaryText = periods.map((period) => {
          const value = row[period.key];
          return value ? `${value.count} in ${period.label}` : `no records in ${period.label}`;
        }).join(", ");
        return <div
          key={row.id}
          className={`pia-fire-column ${activeType === row.id ? "is-active" : ""}`}
          tabIndex={0}
          aria-label={`${row.label}: ${summaryText}`}
          onPointerEnter={() => setActiveType(row.id)}
          onFocus={() => setActiveType(row.id)}
          onBlur={() => setActiveType(null)}
        >
          <div className="pia-fire-bar-wrap">
            {drawn.map((period) => {
              const value = row[period.key];
              if (!value) return null;
              return <div
                key={period.key}
                className={`pia-fire-bar ${period.key === "current" ? "" : "is-comparison"}`}
                style={{ height: `${(value.count / max) * 100}%`, background: period.color }}
              >
                {period.key === "current" && <strong>{value.count}</strong>}
              </div>;
            })}
          </div>
          <span className="pia-fire-label">{row.label}<small>{current.share}% of {monthLabel(month).split(" ")[0]}</small></span>
          {activeType === row.id && <div className="pia-fire-tooltip" role="tooltip">
            <div className="pia-tooltip-date">{row.label}</div>
            {periods.map((period) => {
              const value = row[period.key];
              return <div className="pia-tooltip-row" key={period.key}>
                <span><i style={{ background: period.color }} />{period.label}</span>
                <strong>{value ? `${value.count} · ${value.share}%` : "No records"}</strong>
              </div>;
            })}
          </div>}
        </div>;
      })}
    </div>
  </>;
}

export function ProvincialIncidentAnalytics({ municipalities }: { municipalities: MunicipalityOption[] }) {
  const [currentMonth] = useState(currentManilaMonth);
  const [month, setMonth] = useState(currentMonth);
  const [municipalityId, setMunicipalityId] = useState("");
  const [view, setView] = useState<AnalyticsView>("TREND");
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("BOTH");
  const [trendChartStyle, setTrendChartStyle] = useState<TrendChartStyle>("CUMULATIVE");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("total");
  const [summary, setSummary] = useState<ProvincialReportSummary | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonSummaries>({ previous: null, lastYear: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const effectiveMunicipality = view === "MUNICIPALITIES" ? "" : municipalityId;
  const selectedName = municipalities.find((item) => item.id === municipalityId)?.name;

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });
    const loadSummary = async (selectedMonth: string) => {
      const response = await fetch(`/api/provincial-bfp/report-summaries?${buildAnalyticsQuery(selectedMonth, effectiveMunicipality)}`, { cache: "no-store", signal: controller.signal });
      const body = await response.json().catch(() => ({})) as { summary?: ProvincialReportSummary; error?: string };
      if (!response.ok || !body.summary) throw new Error(body.error || "Unable to load incident analytics.");
      return body.summary;
    };
    Promise.all([
      loadSummary(month),
      loadSummary(getPreviousMonth(month)),
      loadSummary(getSameMonthLastYear(month)),
    ])
      .then(([current, previous, lastYear]) => {
        setSummary(current);
        setComparisons({ previous, lastYear });
        setUpdatedAt(new Date().toISOString());
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load incident analytics.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, effectiveMunicipality, revision]);

  const currentStats = useMemo(() => summarizeTrend(summary), [summary]);
  const previousStats = useMemo(() => summarizeTrend(comparisons.previous), [comparisons.previous]);
  const lastYearStats = useMemo(() => summarizeTrend(comparisons.lastYear), [comparisons.lastYear]);
  const previousChange = changePresentation(calculateComparisonChange(currentStats.total, previousStats.total));
  const lastYearChange = changePresentation(calculateComparisonChange(currentStats.total, lastYearStats.total));
  const trendHasData = currentStats.total + previousStats.total + lastYearStats.total > 0;

  const totals = useMemo(() => {
    const trend = summary?.dailyTrend ?? [];
    return trend.reduce((result, day) => ({
      total: result.total + day.total,
      active: result.active + day.active,
      resolved: result.resolved + day.resolved,
      verification: result.verification + day.verification,
    }), { total: 0, active: 0, resolved: 0, verification: 0 });
  }, [summary]);

  const selectMunicipality = (id: string) => {
    setMunicipalityId(id);
    setView("TREND");
  };

  return <section id="municipal-incident-analytics" className="pia-shell" aria-labelledby="pia-heading">
    <style>{styles}</style>
    <div className="pia-head">
      <div className="pia-title-row">
        <div className="pia-icon"><i className="fa-solid fa-chart-column" aria-hidden="true" /></div>
        <div>
          <h2 id="pia-heading" className="pia-title">Municipal incident analytics</h2>
          <span className="pia-subtitle">Monthly incident activity across Antique, personalized by municipality</span>
          {updatedAt && <span className="pia-updated">Updated {new Date(updatedAt).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" })}</span>}
        </div>
      </div>
      <div className="pia-controls">
        <div className="pia-field">
          <label htmlFor="pia-municipality">Municipality</label>
          <select id="pia-municipality" className="pia-select" value={municipalityId} onChange={(event) => setMunicipalityId(event.target.value)} disabled={view === "MUNICIPALITIES"}>
            <option value="">All Antique</option>
            {municipalities.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.name}</option>)}
          </select>
        </div>
        <div className="pia-field">
          <label htmlFor="pia-month">Incident month</label>
          <div className="pia-month-control">
            <button type="button" className="pia-month-step" aria-label="Previous month" onClick={() => setMonth(getPreviousMonth(month))}><i className="fa-solid fa-chevron-left" /></button>
            <MonthPicker value={month} max={currentMonth} onChange={setMonth} />
            <button type="button" className="pia-month-step" aria-label="Next month" disabled={month >= currentMonth} onClick={() => setMonth(getNextMonth(month))}><i className="fa-solid fa-chevron-right" /></button>
          </div>
        </div>
      </div>
    </div>

    <div className="pia-toolbar">
      <div className="pia-tabs" role="group" aria-label="Select analytics graph">
        {([['TREND', 'Monthly trend'], ['MUNICIPALITIES', 'By municipality'], ['FIRE_TYPES', 'Fire types']] as const).map(([id, label]) => <button key={id} type="button" className={`pia-tab ${view === id ? "active" : ""}`} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}
      </div>
      <span className="pia-scope">{monthLabel(month)} · {view === "MUNICIPALITIES" ? "All Antique municipalities" : selectedName ?? "All Antique"}</span>
    </div>

    <div className="pia-metrics" aria-label="Selected month comparison insights">
      <div className="pia-metric"><span>Incidents this month</span><strong>{currentStats.total}</strong><small className="pia-insight-change">{monthLabel(month)}</small></div>
      <div className="pia-metric"><span>Compared with last month</span><strong>{previousChange.label}</strong><small className={`pia-insight-change ${previousChange.className}`}>{previousStats.total ? `${previousStats.total} in` : "No reports in"} {monthLabel(getPreviousMonth(month))}</small></div>
      <div className="pia-metric"><span>Compared with last year</span><strong>{lastYearChange.label}</strong><small className={`pia-insight-change ${lastYearChange.className}`}>{lastYearStats.total ? `${lastYearStats.total} in` : "No reports in"} {monthLabel(getSameMonthLastYear(month))}</small></div>
      <div className="pia-metric"><span>Peak incident day</span><strong>{currentStats.peak.value}</strong><small className="pia-insight-change">{currentStats.peak.date ? formatChartDate(currentStats.peak.date) : "No activity"}</small></div>
    </div>

    <div className="pia-body" aria-busy={loading}>
      {loading && <div className="pia-loading"><span><i className="fa-solid fa-spinner fa-spin" />Loading live analytics…</span></div>}
      {error ? <div className="pia-error" role="alert"><i className="fa-solid fa-chart-simple" /><strong>Incident analytics could not be loaded</strong><span>{error}</span><button type="button" className="pia-retry" onClick={() => setRevision((value) => value + 1)}>Retry</button></div>
        : summary && ((view === "TREND" && !trendHasData) || (view !== "TREND" && summary.totalReports === 0)) ? <div className="pia-empty"><i className="fa-regular fa-calendar-check" /><strong>No incidents recorded for this selection</strong><span>Choose another month or municipality to review its activity.</span></div>
        : summary ? <>
            {view === "TREND" && <MonthlyTrend summary={summary} previousSummary={comparisons.previous} lastYearSummary={comparisons.lastYear} month={month} comparisonMode={comparisonMode} chartStyle={trendChartStyle} metric={trendMetric} onComparisonMode={setComparisonMode} onChartStyle={setTrendChartStyle} onMetric={setTrendMetric} />}
            {view === "MUNICIPALITIES" && <MunicipalityComparison summary={summary} previousSummary={comparisons.previous} month={month} onSelect={selectMunicipality} />}
            {view === "FIRE_TYPES" && <FireTypeChart summary={summary} previousSummary={comparisons.previous} lastYearSummary={comparisons.lastYear} month={month} comparisonMode={comparisonMode} onComparisonMode={setComparisonMode} />}
          </> : null}
    </div>
    <p className="pia-sr" aria-live="polite">{loading ? "Loading incident analytics" : error ? error : `${totals.total} submitted reports loaded`}</p>
  </section>;
}
