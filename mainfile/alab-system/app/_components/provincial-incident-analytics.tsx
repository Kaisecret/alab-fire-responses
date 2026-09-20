"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  alignComparisonSeries,
  buildGroupedBarLayout,
  buildAnalyticsQuery,
  buildSmoothChartPath,
  calculateComparisonChange,
  getNextMonth,
  getPreviousMonth,
  getSameMonthLastYear,
} from "../../lib/provincial-bfp/dashboard-analytics.mjs";
import type { ProvincialReportSummary } from "../../lib/provincial-bfp/management/types";

type AnalyticsView = "TREND" | "MUNICIPALITIES" | "FIRE_TYPES";
type ComparisonMode = "NONE" | "PREVIOUS" | "LAST_YEAR" | "BOTH";
type TrendMetric = "total" | "active" | "resolved" | "verification" | "administrative";
type TrendChartStyle = "LINE" | "BAR";
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
  ["OTHER", "Other"],
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
  .pia-select:focus-visible, .pia-month:focus-visible, .pia-tab:focus-visible, .pia-month-step:focus-visible, .pia-retry:focus-visible, .pia-municipality-row:focus-visible { outline:3px solid rgba(37,99,235,.23); outline-offset:2px; }
  .pia-month-control { display:flex; align-items:center; gap:.3rem; }
  .pia-month-step { width:38px; height:38px; border:1px solid #D5DFEB; border-radius:10px; background:#fff; color:#52627A; cursor:pointer; }
  .pia-month-step:disabled { opacity:.4; cursor:not-allowed; }
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
  .pia-municipality-list { display:grid; gap:.55rem; max-height:430px; overflow:auto; padding-right:.35rem; }
  .pia-municipality-row { display:grid; grid-template-columns:minmax(130px,180px) minmax(0,1fr) 34px; gap:.85rem; align-items:center; padding:.35rem .15rem; border-radius:9px; text-decoration:none; }
  .pia-municipality-row:hover { background:#F8FAFC; }
  .pia-municipality-name { color:#14233B; font-size:.72rem; font-weight:750; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .pia-stack { display:flex; height:18px; overflow:hidden; border-radius:6px; background:#EDF2F7; }
  .pia-stack span { min-width:0; transition:width .35s ease; }
  .pia-total { color:#14233B; font-size:.72rem; font-weight:850; text-align:right; font-variant-numeric:tabular-nums; }
  .pia-fire-chart { display:grid; grid-template-columns:repeat(5,minmax(65px,1fr)); align-items:end; gap:1rem; min-height:250px; padding:1.25rem .5rem 0; border-bottom:1px solid #DDE5EE; }
  .pia-fire-column { display:grid; grid-template-rows:1fr auto; height:230px; gap:.65rem; text-align:center; }
  .pia-fire-bar-wrap { display:flex; align-items:end; justify-content:center; min-height:0; }
  .pia-fire-bar { position:relative; width:min(62px,72%); min-height:3px; border-radius:9px 9px 3px 3px; background:#516985; animation:piaBarIn .42s cubic-bezier(.16,1,.3,1) both; }
  .pia-fire-bar strong { position:absolute; left:50%; top:-1.35rem; transform:translateX(-50%); color:#14233B; font-size:.74rem; }
  .pia-fire-label { color:#65748A; font-size:.64rem; font-weight:700; line-height:1.25; }
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
    .pia-municipality-row { grid-template-columns:minmax(90px,125px) minmax(0,1fr) 28px; gap:.55rem; }
    .pia-fire-chart { gap:.4rem; padding-inline:0; }
    .pia-fire-label { font-size:.58rem; }
    .pia-trend-tools { align-items:stretch; flex-direction:column; }
    .pia-compare-switch { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
    .pia-compare-btn { padding-inline:.3rem; }
    .pia-metric-select { width:100%; }
    .pia-chart-stage { min-height:270px; }
  }
  @media (prefers-reduced-motion:reduce) { .pia-stack-segment, .pia-fire-bar, .pia-current-area, .pia-chart-series, .pia-trend-bar { animation:none; } .pia-stack span, .pia-compare-btn, .pia-view-btn, .pia-line-marker, .pia-trend-bar { transition:none; } }
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
  previous: "#1F5F8B",
  lastYear: "#7C5CFC",
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
  const points = alignComparisonSeries(
    summary.dailyTrend,
    previousSummary?.dailyTrend ?? [],
    lastYearSummary?.dailyTrend ?? [],
    metric,
  ) as AlignedTrendPoint[];
  const width = 1000;
  const height = 330;
  const plot = { left: 48, right: 22, top: 24, bottom: 42 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const showPrevious = comparisonMode === "PREVIOUS" || comparisonMode === "BOTH";
  const showLastYear = comparisonMode === "LAST_YEAR" || comparisonMode === "BOTH";
  const visibleKeys: Array<"current" | "previous" | "lastYear"> = [
    "current",
    ...(showPrevious ? ["previous" as const] : []),
    ...(showLastYear ? ["lastYear" as const] : []),
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
    { key: "current" as const, dateKey: "currentDate" as const, label: monthLabel(month), color: PERIOD_COLORS.current, dash: undefined, visible: true },
    { key: "previous" as const, dateKey: "previousDate" as const, label: monthLabel(getPreviousMonth(month)), color: PERIOD_COLORS.previous, dash: "8 7", visible: showPrevious },
    { key: "lastYear" as const, dateKey: "lastYearDate" as const, label: monthLabel(getSameMonthLastYear(month)), color: PERIOD_COLORS.lastYear, dash: "2 7", visible: showLastYear },
  ].filter((series) => series.visible);
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
      <div><h3>Incident trend comparison</h3><p>Compare the same daily measure across the selected month, previous month, and last year.</p></div>
      <div className="pia-chart-head-actions">
        <div className="pia-view-switch" role="group" aria-label="Select graph style">
          {([[
            "LINE", "fa-chart-line", "Smooth line",
          ], [
            "BAR", "fa-chart-simple", "Bar graph",
          ]] as const).map(([value, icon, label]) => <button key={value} type="button" className={`pia-view-btn ${chartStyle === value ? "active" : ""}`} aria-pressed={chartStyle === value} onClick={() => onChartStyle(value)}><i className={`fa-solid ${icon}`} aria-hidden="true" />{label}</button>)}
        </div>
        <div className="pia-legend pia-period-legend" aria-label="Comparison period legend">
          {periodSeries.map((series) => <span key={series.key}><i style={{ background: series.color }} />{series.label}</span>)}
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
      <div className="pia-tool-group">
        <span className="pia-tool-label">Compare with</span>
        <div className="pia-compare-switch" role="group" aria-label="Select comparison periods">
          {([
            ["NONE", "Current only"],
            ["PREVIOUS", "Last month"],
            ["LAST_YEAR", "Last year"],
            ["BOTH", "Both"],
          ] as const).map(([value, label]) => <button key={value} type="button" className={`pia-compare-btn ${comparisonMode === value ? "active" : ""}`} aria-pressed={comparisonMode === value} onClick={() => onComparisonMode(value)}>{label}</button>)}
        </div>
      </div>
    </div>
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
          <g className="pia-chart-series" key={`${chartStyle}-${metric}-${comparisonMode}`}>
            {chartStyle === "LINE" ? <>
              {areaPath && <path className="pia-current-area" d={areaPath} fill="url(#pia-current-fill)" />}
              {periodSeries.slice().reverse().map((series) => <path key={series.key} className="pia-trend-line" d={pathFor(series.key)} stroke={series.color} strokeWidth={series.key === "current" ? 3.5 : 2.25} strokeDasharray={series.dash} opacity={series.key === "current" ? 1 : .82} />)}
              {periodSeries.flatMap((series) => points.map((point, index) => {
                const value = point[series.key];
                return value !== null && value > 0 ? <circle key={`${series.key}-${point.day}`} className="pia-line-marker" cx={xFor(index)} cy={yFor(value)} r="3.25" fill="#fff" stroke={series.color} strokeWidth="2" opacity={series.key === "current" ? 1 : .78} /> : null;
              }))}
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
            {periodSeries.map((series) => {
              const value = activePoint[series.key];
              return value !== null && chartStyle === "LINE" ? <circle key={series.key} className="pia-hover-point" cx={hoverXFor(activeDay! - 1)} cy={yFor(value)} r={series.key === "current" ? 5 : 4} fill="#fff" stroke={series.color} strokeWidth="3" /> : null;
            })}
          </>}
        </svg>
        {activePoint && <div className="pia-tooltip" style={{ left: `${(hoverXFor(activeDay! - 1) / width) * 100}%`, transform: activeDay! > points.length * .68 ? "translateX(-100%)" : activeDay! > points.length * .32 ? "translateX(-50%)" : "none" }}>
          <div className="pia-tooltip-date">Day {activePoint.day} comparison</div>
          {periodSeries.map((series) => <div className="pia-tooltip-row" key={series.key}>
            <span><i style={{ background: series.color }} />{formatChartDate(activePoint[series.dateKey])}</span>
            <strong>{activePoint[series.key] ?? "—"}</strong>
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

function MunicipalityComparison({ summary, onSelect }: { summary: ProvincialReportSummary; onSelect: (id: string) => void }) {
  const rows = [...summary.byMunicipality].sort((a, b) => b.total - a.total || a.municipalityName.localeCompare(b.municipalityName));
  const max = Math.max(1, ...rows.map((row) => row.total));
  return <>
    <div className="pia-chart-caption">
      <div><h3>Incidents by municipality</h3><p>All 18 municipalities are ranked by submitted reports for the selected month.</p></div>
      <StatusLegend />
    </div>
    <div className="pia-municipality-list">
      {rows.map((row) => {
        const values = (["active", "resolved", "verification", "administrative"] as const).map((key) => ({ key, value: row[key] }));
        return <Link
          key={row.municipalityId}
          href="#municipal-incident-analytics"
          className="pia-municipality-row"
          onClick={() => onSelect(row.municipalityId)}
          aria-label={`Show ${row.municipalityName} analytics, ${row.total} reports`}
        >
          <span className="pia-municipality-name">{row.municipalityName}</span>
          <span className="pia-stack" aria-hidden="true">
            {values.map(({ key, value }) => <span key={key} style={{ width: `${(value / max) * 100}%`, background: STATUS_COLORS[key] }} />)}
          </span>
          <span className="pia-total">{row.total}</span>
        </Link>;
      })}
    </div>
  </>;
}

function FireTypeChart({ summary }: { summary: ProvincialReportSummary }) {
  const values = FIRE_TYPES.map(([id, label]) => ({ id, label, value: summary.byFireType[id] ?? 0 }));
  const max = Math.max(1, ...values.map((item) => item.value));
  return <>
    <div className="pia-chart-caption">
      <div><h3>Incidents by fire type</h3><p>Fire classifications for the selected municipality and month.</p></div>
      <div className="pia-legend"><span><i style={{ background: "#516985" }} />Submitted reports</span></div>
    </div>
    <div className="pia-fire-chart" role="img" aria-label="Incident totals grouped by fire type">
      {values.map((item) => <div className="pia-fire-column" key={item.id} title={`${item.label}: ${item.value}`}>
        <div className="pia-fire-bar-wrap"><div className="pia-fire-bar" style={{ height: `${Math.max(2, (item.value / max) * 100)}%` }}><strong>{item.value}</strong></div></div>
        <span className="pia-fire-label">{item.label}</span>
      </div>)}
    </div>
  </>;
}

export function ProvincialIncidentAnalytics({ municipalities }: { municipalities: MunicipalityOption[] }) {
  const [currentMonth] = useState(currentManilaMonth);
  const [month, setMonth] = useState(currentMonth);
  const [municipalityId, setMunicipalityId] = useState("");
  const [view, setView] = useState<AnalyticsView>("TREND");
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("BOTH");
  const [trendChartStyle, setTrendChartStyle] = useState<TrendChartStyle>("LINE");
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
            <input id="pia-month" className="pia-month" type="month" value={month} max={currentMonth} onChange={(event) => event.target.value && setMonth(event.target.value)} />
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
      <div className="pia-metric"><span>Compared with last month</span><strong>{previousChange.label}</strong><small className={`pia-insight-change ${previousChange.className}`}>{previousStats.total} in {monthLabel(getPreviousMonth(month))}</small></div>
      <div className="pia-metric"><span>Compared with last year</span><strong>{lastYearChange.label}</strong><small className={`pia-insight-change ${lastYearChange.className}`}>{lastYearStats.total} in {monthLabel(getSameMonthLastYear(month))}</small></div>
      <div className="pia-metric"><span>Peak incident day</span><strong>{currentStats.peak.value}</strong><small className="pia-insight-change">{currentStats.peak.date ? formatChartDate(currentStats.peak.date) : "No activity"}</small></div>
    </div>

    <div className="pia-body" aria-busy={loading}>
      {loading && <div className="pia-loading"><span><i className="fa-solid fa-spinner fa-spin" />Loading live analytics…</span></div>}
      {error ? <div className="pia-error" role="alert"><i className="fa-solid fa-chart-simple" /><strong>Incident analytics could not be loaded</strong><span>{error}</span><button type="button" className="pia-retry" onClick={() => setRevision((value) => value + 1)}>Retry</button></div>
        : summary && ((view === "TREND" && !trendHasData) || (view !== "TREND" && summary.totalReports === 0)) ? <div className="pia-empty"><i className="fa-regular fa-calendar-check" /><strong>No incidents recorded for this selection</strong><span>Choose another month or municipality to review its activity.</span></div>
        : summary ? <>
            {view === "TREND" && <MonthlyTrend summary={summary} previousSummary={comparisons.previous} lastYearSummary={comparisons.lastYear} month={month} comparisonMode={comparisonMode} chartStyle={trendChartStyle} metric={trendMetric} onComparisonMode={setComparisonMode} onChartStyle={setTrendChartStyle} onMetric={setTrendMetric} />}
            {view === "MUNICIPALITIES" && <MunicipalityComparison summary={summary} onSelect={selectMunicipality} />}
            {view === "FIRE_TYPES" && <FireTypeChart summary={summary} />}
          </> : null}
    </div>
    <p className="pia-sr" aria-live="polite">{loading ? "Loading incident analytics" : error ? error : `${totals.total} submitted reports loaded`}</p>
  </section>;
}
