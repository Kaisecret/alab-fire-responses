'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { AnalyticsRange, ProvincialAnalytics } from '../../lib/provincial-bfp/analytics';
import { ProvincialRequestError, requestProvincialJson } from '../../lib/provincial-bfp/client-request';
import { FireCommandHeader } from './fire-command-header';
import { Heatmap, HEAT_RAMP, MunicipalityStageRows, Sparkline, StageBar, TrendBars, bucketLabel, formatMinutes } from './provincial-analytics-charts';
import styles from './provincial-analytics.module.css';

const RANGES: Array<{ value: AnalyticsRange; label: string; compare: string }> = [
  { value: 'today', label: 'Today', compare: 'yesterday' },
  { value: '7d', label: '7 days', compare: 'previous 7 days' },
  { value: '30d', label: '30 days', compare: 'previous 30 days' },
  { value: 'ytd', label: 'Year to date', compare: 'same period last year' },
];

const FIRE_TYPES: Record<string, { label: string; color: string }> = {
  HOUSE_BUILDING: { label: 'House/Building', color: 'var(--series-1)' },
  GRASS: { label: 'Grass', color: 'var(--series-2)' },
  OTHER: { label: 'Rubbish', color: 'var(--series-3)' },
  VEHICLE: { label: 'Vehicle', color: 'var(--series-4)' },
  FOREST: { label: 'Forest', color: 'var(--series-5)' },
};

const LEVELS: Record<string, { label: string; color: string; icon: string }> = {
  LOW: { label: 'Low', color: 'var(--good)', icon: 'fa-circle-check' },
  MODERATE: { label: 'Moderate', color: 'var(--warning)', icon: 'fa-circle-exclamation' },
  HIGH: { label: 'High', color: 'var(--serious)', icon: 'fa-triangle-exclamation' },
  CRITICAL: { label: 'Critical', color: 'var(--critical)', icon: 'fa-fire' },
};

const percent = (value: number | null) => (value == null ? '—' : `${Math.round(value * 100)}%`);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** A change pill. Lower is better for every headline here, so up reads as worse. */
function Delta({ change, unit, label }: { change: number | null; unit: string; label: string }) {
  if (change == null) return null;
  const tone = change === 0 ? styles.same : change < 0 ? styles.better : styles.worse;
  const arrow = change === 0 ? '=' : change < 0 ? '▼' : '▲';
  return <span className={`${styles.delta} ${tone}`} title={label}>{arrow} {Math.abs(change)}{unit}</span>;
}

function useAnalytics(range: AnalyticsRange, municipalityId: string) {
  const [data, setData] = useState<ProvincialAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const key = `${range}|${municipalityId}|${revision}`;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ range });
    if (municipalityId) params.set('municipalityId', municipalityId);
    requestProvincialJson<{ analytics: ProvincialAnalytics }>(`/api/provincial-bfp/analytics?${params}`, { signal: controller.signal })
      .then((body) => { setData(body.analytics); setError(null); })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof ProvincialRequestError ? reason.message : 'Unable to load provincial analytics. Please retry.');
      })
      .finally(() => { if (!controller.signal.aborted) setSettledKey(key); });
    return () => controller.abort();
  }, [range, municipalityId, key]);

  const loading = settledKey !== key;

  // Monitoring page: refresh every minute while visible, and on return.
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);

  return { data, error, loading, refresh };
}

function useUpdatedLabel(generatedAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!generatedAt) return { text: 'Loading…', stale: true };
  const minutes = Math.floor((now - new Date(generatedAt).getTime()) / 60000);
  return { text: minutes < 1 ? 'Live · updated just now' : `Live · updated ${minutes} min ago`, stale: minutes >= 3 };
}

export function ProvincialAnalyticsPage() {
  const router = useRouter();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [municipalityId, setMunicipalityId] = useState('');
  const [tableView, setTableView] = useState(false);
  const { data, error, loading, refresh } = useAnalytics(range, municipalityId);
  const updated = useUpdatedLabel(data?.generatedAt);
  const compare = RANGES.find((item) => item.value === range)!.compare;

  // Restore the filters from a shared or reloaded link.
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const savedRange = params.get('range') as AnalyticsRange | null;
      if (savedRange && RANGES.some((item) => item.value === savedRange)) setRange(savedRange);
      if (params.get('municipalityId')) setMunicipalityId(params.get('municipalityId')!);
    };
    restore();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (range === '30d') url.searchParams.delete('range'); else url.searchParams.set('range', range);
    if (municipalityId) url.searchParams.set('municipalityId', municipalityId); else url.searchParams.delete('municipalityId');
    window.history.replaceState(null, '', url);
  }, [range, municipalityId]);

  const headline = data?.headline;
  const noIncidents = data != null && headline!.incidents === 0;

  return (
    <>
      <FireCommandHeader slotId="provincial-fire-command-header" title="Provincial Fire Response Intelligence & Analytics" icon="fa-chart-pie" />
      <div className={styles.page}>
        <div className={styles.filters}>
          <div className={styles.segment} role="group" aria-label="Period">
            {RANGES.map((item) => (
              <button key={item.value} type="button" aria-pressed={range === item.value} onClick={() => setRange(item.value)}>{item.label}</button>
            ))}
          </div>
          <label className={styles.select}>
            <span>Municipality</span>
            <select value={municipalityId} onChange={(event) => setMunicipalityId(event.target.value)}>
              <option value="">All municipalities</option>
              {data?.allMunicipalities.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.name}</option>)}
            </select>
          </label>
          <span className={styles.spacer} />
          <span className={`${styles.live} ${updated.stale ? styles.stale : ''}`} aria-live="polite">{updated.text}</span>
          <button type="button" className={styles.button} aria-pressed={tableView} onClick={() => setTableView((value) => !value)}>
            <i className="fa-solid fa-table" aria-hidden="true" /> Table view
          </button>
          <Link className={`${styles.button} ${styles.primary}`} href="/provincial-bfp/reports">
            <i className="fa-solid fa-file-export" aria-hidden="true" /> Export report
          </Link>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <span>{error}</span>
            <button type="button" className={styles.button} onClick={refresh}>Retry</button>
          </div>
        )}

        {!data && loading && (
          <>
            <div className={styles.kpis}>{[0, 1, 2, 3].map((key) => <div key={key} className={styles.skeleton} />)}</div>
            <div className={styles.grid21}><div className={styles.skeleton} style={{ height: 320 }} /><div className={styles.skeleton} style={{ height: 320 }} /></div>
          </>
        )}

        {data && headline && (
          <>
            <section className={styles.kpis} aria-label="Headline numbers">
              <div className={`${styles.card} ${styles.kpi}`}>
                <span className={styles.label}>Fire incidents</span>
                <div className={styles.value}>{headline.incidents}<small>{headline.incidents === 1 ? 'incident' : 'incidents'}</small></div>
                <div className={styles.meta}>
                  <Delta change={headline.incidents - headline.previousIncidents} unit="" label={`Compared with ${compare}`} />
                  vs {compare}
                </div>
                <div className={styles.meta}>{headline.activeNow} active now · {headline.pendingVerification} pending verification</div>
                <Sparkline values={data.trend.map((point) => point.incidents)} />
              </div>
              <div className={`${styles.card} ${styles.kpi}`}>
                <span className={styles.label}>Median response time</span>
                <span className={styles.kpiIcon} style={{ background: '#EFF6FF', color: '#2563EB' }} aria-hidden="true"><i className="fa-solid fa-stopwatch" /></span>
                <div className={styles.value}>{headline.medianArrivalMinutes ?? '—'}{headline.medianArrivalMinutes != null && <small>min</small>}</div>
                <div className={styles.meta}>
                  <Delta
                    change={headline.medianArrivalMinutes != null && headline.previousMedianArrivalMinutes != null
                      ? Math.round((headline.medianArrivalMinutes - headline.previousMedianArrivalMinutes) * 10) / 10 : null}
                    unit=" min" label={`Compared with ${compare}`} />
                  report → responder arrived
                </div>
                <div className={styles.meta}>
                  {headline.arrivalsMeasured
                    ? `Slowest 10%: ${formatMinutes(headline.slowestTenthArrivalMinutes)} · ${plural(headline.arrivalsMeasured, 'arrival')} recorded`
                    : 'No responder arrivals recorded yet'}
                </div>
              </div>
              <div className={`${styles.card} ${styles.kpi}`}>
                <span className={styles.label}>High &amp; critical danger</span>
                <span className={styles.kpiIcon} style={{ background: '#FEF2F2', color: '#DC2626' }} aria-hidden="true"><i className="fa-solid fa-triangle-exclamation" /></span>
                <div className={styles.value}>{headline.highDangerShare == null ? '—' : Math.round(headline.highDangerShare * 100)}{headline.highDangerShare != null && <small>%</small>}</div>
                <div className={styles.meta}>
                  <Delta change={headline.highDangerChangePoints} unit=" pts" label={`Compared with ${compare}`} />
                  {headline.highDangerIncidents} of {plural(headline.incidents, 'incident')}
                </div>
                <div className={styles.split} style={{ height: 10 }} aria-hidden="true">
                  {data.danger.levels.map((level) => (level.incidents ? <div key={level.level} style={{ flex: level.incidents, background: LEVELS[level.level].color }} /> : null))}
                </div>
              </div>
              <div className={`${styles.card} ${styles.kpi}`}>
                <span className={styles.label}>False or rejected reports</span>
                <span className={styles.kpiIcon} style={{ background: '#F1F5F9', color: '#475569' }} aria-hidden="true"><i className="fa-solid fa-ban" /></span>
                <div className={styles.value}>{headline.falseReportShare == null ? '—' : Math.round(headline.falseReportShare * 100)}{headline.falseReportShare != null && <small>%</small>}</div>
                <div className={styles.meta}>
                  <Delta change={headline.falseReportChangePoints} unit=" pts" label={`Compared with ${compare}`} />
                  {headline.falseReports} of {plural(headline.uniqueReports, 'report')}
                </div>
                <div className={styles.meta}>+ {plural(headline.duplicatesMerged, 'duplicate')} merged into existing incidents</div>
              </div>
            </section>

            <section className={styles.grid21}>
              <div className={styles.card}>
                <SectionHead icon="fa-stopwatch" title="Response time by stage" tag="Incident timeline" sub="Median minutes between status changes, from report to resolution" />
                {data.responseStages.some((stage) => stage.medianMinutes != null)
                  ? <StageBar stages={data.responseStages} />
                  : <p className={styles.empty}>No status changes were recorded for incidents in this period.</p>}
                <MunicipalityStageRows rows={data.municipalities} />
              </div>
              <div className={styles.card}>
                <SectionHead icon="fa-chart-column" title="Incident trend" sub={`Fire incidents per ${data.bucket} · hover a ${data.bucket} for details`} />
                {noIncidents ? <p className={styles.empty}>No fire incidents in this period.</p> : tableView ? (
                  <table className={styles.table}>
                    <thead><tr><th>{data.bucket}</th><th>Incidents</th><th>High or critical</th></tr></thead>
                    <tbody>{data.trend.filter((point) => point.incidents > 0).map((point) => (
                      <tr key={point.bucket}><td>{point.bucket}</td><td>{point.incidents}</td><td>{point.highDanger}</td></tr>
                    ))}</tbody>
                  </table>
                ) : <TrendBars points={data.trend} bucket={data.bucket} />}
                {!noIncidents && (() => {
                  const busiest = data.trend.reduce((best, point) => (point.incidents > best.incidents ? point : best), data.trend[0]);
                  return (
                    <div className={styles.minis}>
                      <div className={styles.mini}><small>Busiest {data.bucket}</small><b>{bucketLabel(busiest.bucket, data.bucket, true)} · {busiest.incidents}</b></div>
                      <div className={styles.mini}><small>Average per {data.bucket}</small><b>{Math.round((headline.incidents / Math.max(data.trend.length, 1)) * 10) / 10}</b></div>
                    </div>
                  );
                })()}
              </div>
            </section>

            <section>
              <div className={styles.card}>
                <SectionHead icon="fa-map-location-dot" title="Where fires happen" tag="Municipal summary" sub={"Select a row to open that municipality's incident reports"} />
                {data.municipalities.length === 0 ? <p className={styles.empty}>No fire incidents in this period.</p> : (
                  <table className={styles.table}>
                    <thead><tr><th>Municipality</th><th>Incidents</th><th>High &amp; critical</th><th>Median arrival</th><th>Active now</th><th>Assistance asked</th></tr></thead>
                    <tbody>
                      {data.municipalities.map((row) => {
                        const open = () => router.push(`/provincial-bfp/incident-reports?municipalityId=${row.id}`);
                        const most = Math.max(...data.municipalities.map((item) => item.incidents), 1);
                        return (
                          <tr key={row.id} tabIndex={0} onClick={open} onKeyDown={(event) => { if (event.key === 'Enter') open(); }}>
                            <td className={styles.name}>{row.name}</td>
                            <td><span className={styles.inbar}><i style={{ width: `${(row.incidents / most) * 7}rem` }} />{row.incidents}</span></td>
                            <td>{row.highDangerShare != null && row.highDangerShare >= 0.4
                              ? <span className={styles.pill} style={{ background: '#FEF2F2', color: '#B91C1C' }}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {percent(row.highDangerShare)}</span>
                              : percent(row.highDangerShare)}</td>
                            <td>{formatMinutes(row.medianArrivalMinutes)}</td>
                            <td>{row.activeNow
                              ? <span className={styles.pill} style={{ background: '#FFF1F2', color: '#E23632' }}><i className="fa-solid fa-circle" style={{ fontSize: '.45rem' }} aria-hidden="true" /> {row.activeNow} active</span>
                              : <span className={styles.dash}>—</span>}</td>
                            <td>{row.assistanceAsked || <span className={styles.dash}>—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className={styles.grid21}>
              <div className={styles.card}>
                <SectionHead icon="fa-calendar-week" title="When fires happen" sub="Day of week and hour, in Antique time" />
                {noIncidents ? <p className={styles.empty}>No fire incidents in this period.</p> : tableView ? (
                  <table className={styles.table}>
                    <thead><tr><th>Day</th><th>Hour</th><th>Incidents</th></tr></thead>
                    <tbody>{[...data.heatmap].sort((a, b) => b.incidents - a.incidents).map((cell) => (
                      <tr key={`${cell.day}-${cell.hour}`}><td>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][cell.day - 1]}</td><td>{cell.hour}:00</td><td>{cell.incidents}</td></tr>
                    ))}</tbody>
                  </table>
                ) : (
                  <>
                    <Heatmap cells={data.heatmap} />
                    <div className={styles.scale}>Fewer <div>{HEAT_RAMP.slice(1).map((color) => <i key={color} style={{ background: color }} />)}</div> More</div>
                  </>
                )}
                {!noIncidents && <WhenSummary cells={data.heatmap} />}
              </div>
              <div className={styles.card}>
                <SectionHead icon="fa-location-dot" title="Top barangays" sub="Most incidents, by PSA barangay boundary" />
                {data.barangays.length === 0 ? <p className={styles.empty}>No incidents with a barangay in this period.</p> : (
                  <div className={styles.ranked}>
                    {data.barangays.map((row, index) => (
                      <div key={`${row.municipality}-${row.barangay}`}>
                        <span className={styles.rank}>{index + 1}</span>
                        <span>{row.barangay}<em>{row.municipality}</em></span>
                        <b className={styles.right}>{row.incidents}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.grid11}>
              <div className={styles.card}>
                <SectionHead icon="fa-shield-halved" title="Level of Danger" tag="AHP + rules" sub="Danger mix and the conditions that raised the level" />
                {noIncidents ? <p className={styles.empty}>No fire incidents in this period.</p> : (
                  <>
                    <div className={styles.dangerBar} aria-hidden="true">
                      {data.danger.levels.map((level) => (level.incidents ? <div key={level.level} style={{ flex: level.incidents, background: LEVELS[level.level].color }} /> : null))}
                    </div>
                    <div className={styles.levels}>
                      {data.danger.levels.map((level) => (
                        <div key={level.level}>
                          <span><i className={`fa-solid ${LEVELS[level.level].icon}`} style={{ color: LEVELS[level.level].color }} aria-hidden="true" />{LEVELS[level.level].label}</span>
                          <b>{level.incidents}</b>
                          <small>{percent(level.incidents / Math.max(headline.incidents, 1))}</small>
                        </div>
                      ))}
                    </div>
                    <div className={styles.factors}>
                      <span className={styles.label}>Conditions in High &amp; critical incidents</span>
                      {data.danger.conditions.length === 0
                        ? <p className={styles.empty}>No High or Critical incidents in this period.</p>
                        : data.danger.conditions.map((condition) => (
                          <div key={condition.key} className={styles.factor}>
                            <span>{condition.label} <em>· {condition.criterion}</em></span>
                            <b>{percent(condition.share)}</b>
                            <div className={styles.factorTrack}><div style={{ width: `${condition.share * 100}%` }} /></div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
              <div className={styles.card}>
                <SectionHead icon="fa-handshake-angle" title="Inter-municipality coordination" sub="Assistance requests, backup calls and alarm levels" />
                <div className={styles.minis}>
                  <div className={styles.mini}>
                    <small>Assistance requests</small><b>{data.coordination.assistanceRequests}</b>
                    <small>{data.coordination.accepted} accepted · {data.coordination.partiallyAccepted} partial · {data.coordination.rejected} rejected</small>
                  </div>
                  <div className={styles.mini}><small>Median time to respond</small><b>{formatMinutes(data.coordination.medianResponseMinutes)}</b></div>
                </div>
                <span className={styles.label} style={{ marginTop: '.85rem' }}>Alarm levels declared</span>
                <div className={styles.alarms}>
                  {data.coordination.alarms.map((alarm) => (
                    <div key={alarm.level}><small>{['', '', '2nd', '3rd', '4th'][alarm.level]} alarm</small><b>{alarm.declared}</b></div>
                  ))}
                </div>
                <p className={styles.sub} style={{ marginTop: '.6rem' }}>
                  {plural(data.coordination.backupCalls, 'backup call')} from responders · {data.coordination.backupCallsForwarded} forwarded to the province
                </p>
                <span className={styles.label} style={{ marginTop: '.85rem' }}>Gave the most help</span>
                {data.coordination.topHelpers.length === 0 ? <p className={styles.empty}>No assistance was given in this period.</p> : (
                  <div className={styles.helpers}>
                    {data.coordination.topHelpers.map((helper) => <div key={helper.name}><span>{helper.name}</span><b>{plural(helper.responses, 'response')}</b></div>)}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.grid11}>
              <div className={styles.card}>
                <SectionHead icon="fa-fire" title="Fire type" sub="One incident can have up to 3 kinds of fire" />
                {data.fireTypes.counts.length === 0 ? <p className={styles.empty}>No fire incidents in this period.</p> : (
                  <div className={styles.bars}>
                    {data.fireTypes.counts.map((row) => {
                      const most = data.fireTypes.counts[0].incidents;
                      const type = FIRE_TYPES[row.type] ?? { label: row.type, color: 'var(--faint)' };
                      return (
                        <div key={row.type} className={styles.bar}>
                          <span>{type.label}</span>
                          <div style={{ width: `${(row.incidents / most) * 100}%`, background: type.color }} />
                          <b>{row.incidents}</b>
                        </div>
                      );
                    })}
                  </div>
                )}
                {data.fireTypes.multiType > 0 && (
                  <p className={styles.note}>
                    {plural(data.fireTypes.multiType, 'incident')} had more than one fire type
                    {data.fireTypes.topCombination && `, most often ${data.fireTypes.topCombination.types.map((type) => FIRE_TYPES[type]?.label ?? type).join(' + ')}`}.
                  </p>
                )}
              </div>
              <div className={styles.card}>
                <SectionHead icon="fa-mobile-screen-button" title="How fires are reported" sub="Resident app vs phone calls logged by Municipal BFP" />
                {data.reporting.app + data.reporting.phone === 0 ? <p className={styles.empty}>No fire incidents in this period.</p> : (
                  <>
                    <div className={styles.split} aria-hidden="true">
                      {data.reporting.app > 0 && <div style={{ flex: data.reporting.app, background: 'var(--series-1)' }} />}
                      {data.reporting.phone > 0 && <div style={{ flex: data.reporting.phone, background: 'var(--series-2)' }} />}
                    </div>
                    <div className={styles.legendRow}><span><i className={styles.swatch} style={{ background: 'var(--series-1)' }} />Resident app</span><b>{data.reporting.app}</b></div>
                    <div className={styles.legendRow}><span><i className={styles.swatch} style={{ background: 'var(--series-2)' }} />Phone call</span><b>{data.reporting.phone}</b></div>
                  </>
                )}
                <div className={styles.minis}>
                  <div className={styles.mini}><small>Reports per incident</small><b>{data.reporting.reportsPerIncident ?? '—'}</b></div>
                  <div className={styles.mini}><small>App reports with photos</small><b>{percent(data.reporting.photoShare)}</b></div>
                  <div className={styles.mini}><small>GPS within 50 m</small><b>{percent(data.reporting.preciseGpsShare)}</b></div>
                  <div className={styles.mini}><small>Median time to verify</small><b>{formatMinutes(data.reporting.medianVerifyMinutes)}</b></div>
                </div>
              </div>
            </section>

            <p className={styles.footnote}>
              Analytics summarize recorded data. Verification, dispatch and response decisions stay with BFP personnel.
            </p>
          </>
        )}
      </div>
    </>
  );
}

function SectionHead({ icon, title, tag, sub }: { icon: string; title: string; tag?: string; sub: string }) {
  return (
    <header className={styles.head}>
      <span className={styles.icon} aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <div>
        <h2>{title}{tag && <span className={styles.tag}>{tag}</span>}</h2>
        <p className={styles.sub}>{sub}</p>
      </div>
    </header>
  );
}

function WhenSummary({ cells }: { cells: ProvincialAnalytics['heatmap'] }) {
  const total = cells.reduce((sum, cell) => sum + cell.incidents, 0);
  const byHour = Array.from({ length: 24 }, (_, hour) => cells.filter((cell) => cell.hour === hour).reduce((sum, cell) => sum + cell.incidents, 0));
  const byDay = Array.from({ length: 7 }, (_, day) => cells.filter((cell) => cell.day === day + 1).reduce((sum, cell) => sum + cell.incidents, 0));
  // The busiest 3-hour window, so one odd hour does not decide it.
  const windows = byHour.map((_, hour) => byHour[hour] + byHour[(hour + 1) % 24] + byHour[(hour + 2) % 24]);
  const start = windows.indexOf(Math.max(...windows));
  const hourName = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
  const night = byHour.filter((_, hour) => hour >= 22 || hour < 5).reduce((sum, value) => sum + value, 0);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return (
    <div className={`${styles.minis} ${styles.minis3}`}>
      <div className={styles.mini}><small>Busiest time</small><b>{hourName(start)}–{hourName((start + 3) % 24)}</b></div>
      <div className={styles.mini}><small>Busiest day</small><b>{days[byDay.indexOf(Math.max(...byDay))]}</b></div>
      <div className={styles.mini}><small>At night (10 PM–5 AM)</small><b>{percent(total ? night / total : null)}</b></div>
    </div>
  );
}
