"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  buildAnalyticsQuery,
  getNextMonth,
  getPreviousMonth,
  normalizeAnalyticsSeries,
} from "../../lib/provincial-bfp/dashboard-analytics.mjs";
import type { ProvincialReportSummary } from "../../lib/provincial-bfp/management/types";

type AnalyticsView = "TREND" | "MUNICIPALITIES" | "FIRE_TYPES";
type MunicipalityOption = { id: string; name: string };

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
    .pia-legend { justify-content:flex-start; }
    .pia-body { padding-inline:.8rem; }
    .pia-municipality-row { grid-template-columns:minmax(90px,125px) minmax(0,1fr) 28px; gap:.55rem; }
    .pia-fire-chart { gap:.4rem; padding-inline:0; }
    .pia-fire-label { font-size:.58rem; }
  }
  @media (prefers-reduced-motion:reduce) { .pia-stack-segment, .pia-fire-bar { animation:none; } .pia-stack span { transition:none; } }
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

function StatusLegend() {
  return <div className="pia-legend" aria-label="Incident status legend">
    <span><i style={{ background: STATUS_COLORS.active }} />Active</span>
    <span><i style={{ background: STATUS_COLORS.resolved }} />Resolved</span>
    <span><i style={{ background: STATUS_COLORS.verification }} />Verification</span>
    <span><i style={{ background: STATUS_COLORS.administrative }} />Administrative</span>
  </div>;
}

function MonthlyTrend({ summary }: { summary: ProvincialReportSummary }) {
  const { points, maxValue } = normalizeAnalyticsSeries(summary.dailyTrend);
  const width = 1000;
  const height = 285;
  const plot = { left: 42, right: 14, top: 12, bottom: 34 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const slotWidth = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.max(4, Math.min(22, slotWidth * .62));
  const gridValues = [0, .25, .5, .75, 1].map((part) => Math.round(maxValue * part));

  return <>
    <div className="pia-chart-caption">
      <div><h3>Daily incident activity</h3><p>Every submitted report, grouped by Philippine calendar day and current status.</p></div>
      <StatusLegend />
    </div>
    <svg className="pia-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily incident totals for the selected month">
      {gridValues.map((value) => {
        const y = plot.top + plotHeight - (value / maxValue) * plotHeight;
        return <g key={value}><line className="pia-grid-line" x1={plot.left} x2={width - plot.right} y1={y} y2={y} /><text className="pia-axis-label" x={plot.left - 9} y={y + 4} textAnchor="end">{value}</text></g>;
      })}
      {points.map((point, index) => {
        const x = plot.left + index * slotWidth + (slotWidth - barWidth) / 2;
        let used = 0;
        const segments = (["active", "resolved", "verification", "administrative"] as const).map((key) => {
          const value = point[key];
          const segmentHeight = (value / maxValue) * plotHeight;
          const y = plot.top + plotHeight - used - segmentHeight;
          used += segmentHeight;
          return <rect key={key} className="pia-stack-segment" x={x} y={y} width={barWidth} height={segmentHeight} fill={STATUS_COLORS[key]} rx={segmentHeight === used ? 4 : 0} />;
        });
        const showLabel = index === 0 || index === points.length - 1 || (index + 1) % 5 === 0;
        return <g key={point.date} tabIndex={0} aria-label={`${point.date}: ${point.total} reports`}>
          <title>{`${point.date}: ${point.total} total — ${point.active} active, ${point.resolved} resolved, ${point.verification} verification, ${point.administrative} administrative`}</title>
          {segments}
          {showLabel && <text className="pia-axis-label" x={x + barWidth / 2} y={height - 12} textAnchor="middle">{Number(point.date.slice(-2))}</text>}
        </g>;
      })}
    </svg>
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
  const [summary, setSummary] = useState<ProvincialReportSummary | null>(null);
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
    fetch(`/api/provincial-bfp/report-summaries?${buildAnalyticsQuery(month, effectiveMunicipality)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Unable to load incident analytics.");
        return body;
      })
      .then((body) => {
        setSummary(body.summary);
        setUpdatedAt(new Date().toISOString());
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load incident analytics.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, effectiveMunicipality, revision]);

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

    <div className="pia-metrics" aria-label="Selected month incident totals">
      <div className="pia-metric"><span>Submitted</span><strong>{totals.total}</strong></div>
      <div className="pia-metric"><span>Active</span><strong style={{ color: STATUS_COLORS.active }}>{totals.active}</strong></div>
      <div className="pia-metric"><span>Resolved</span><strong style={{ color: STATUS_COLORS.resolved }}>{totals.resolved}</strong></div>
      <div className="pia-metric"><span>Verification</span><strong style={{ color: STATUS_COLORS.verification }}>{totals.verification}</strong></div>
    </div>

    <div className="pia-body" aria-busy={loading}>
      {loading && <div className="pia-loading"><span><i className="fa-solid fa-spinner fa-spin" />Loading live analytics…</span></div>}
      {error ? <div className="pia-error" role="alert"><i className="fa-solid fa-chart-simple" /><strong>Incident analytics could not be loaded</strong><span>{error}</span><button type="button" className="pia-retry" onClick={() => setRevision((value) => value + 1)}>Retry</button></div>
        : summary && summary.totalReports === 0 ? <div className="pia-empty"><i className="fa-regular fa-calendar-check" /><strong>No incidents recorded for this selection</strong><span>Choose another month or municipality to review its activity.</span></div>
        : summary ? <>
            {view === "TREND" && <MonthlyTrend summary={summary} />}
            {view === "MUNICIPALITIES" && <MunicipalityComparison summary={summary} onSelect={selectMunicipality} />}
            {view === "FIRE_TYPES" && <FireTypeChart summary={summary} />}
          </> : null}
    </div>
    <p className="pia-sr" aria-live="polite">{loading ? "Loading incident analytics" : error ? error : `${totals.total} submitted reports loaded`}</p>
  </section>;
}
