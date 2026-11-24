'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { AnalyticsRange, ProvincialAnalytics } from '../../lib/provincial-bfp/analytics';
import { fireTypeRows } from '../../lib/provincial-bfp/fire-type-rows';
import { ProvincialRequestError, requestProvincialJson } from '../../lib/provincial-bfp/client-request';
import { FireCommandHeader } from './fire-command-header';
import { DangerDonut, Heatmap, HEAT_RAMP, TrendBars, bucketLabel, formatMinutes } from './provincial-analytics-charts';
import styles from './provincial-analytics.module.css';

const RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'ytd', label: 'Year to date' },
];

const FIRE_TYPES: Record<string, { label: string; color: string }> = {
  HOUSE_BUILDING: { label: 'House/Building', color: 'var(--series-1)' },
  GRASS: { label: 'Grass', color: 'var(--series-2)' },
  OTHER: { label: 'Rubbish', color: 'var(--series-3)' },
  VEHICLE: { label: 'Vehicle', color: 'var(--series-4)' },
  FOREST: { label: 'Forest', color: 'var(--series-5)' },
};

const LEVELS: Record<string, { label: string; color: string; soft: string; icon: string }> = {
  LOW: { label: 'Low', color: '#0ca30c', soft: '#E7F6E7', icon: 'fa-circle-check' },
  MODERATE: { label: 'Moderate', color: '#E0A008', soft: '#FEF6E1', icon: 'fa-circle-exclamation' },
  HIGH: { label: 'High', color: '#E5703F', soft: '#FDEEE7', icon: 'fa-triangle-exclamation' },
  CRITICAL: { label: 'Critical', color: '#d03b3b', soft: '#FBE9E9', icon: 'fa-fire' },
};

/** One icon per Level of Danger criterion from the paper. */
const CONDITION_ICONS: Record<string, string> = {
  HOUSE_DENSITY: 'fa-house-chimney',
  STRUCTURE_MATERIAL: 'fa-cubes-stacked',
  ROUTE_ACCESS: 'fa-road',
  WIND: 'fa-wind',
  WEATHER: 'fa-temperature-high',
  NEAR_HOUSES: 'fa-house-fire',
};

const percent = (value: number | null) => (value == null ? '—' : `${Math.round(value * 100)}%`);

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className={styles.stat}><small>{label}</small><b>{value}</b></div>;
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

export function ProvincialAnalyticsPage() {
  const router = useRouter();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [municipalityId, setMunicipalityId] = useState('');
  const { data, error, loading, refresh } = useAnalytics(range, municipalityId);

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
        <div className={styles.toolbar}>
          <div className={styles.segment} role="group" aria-label="Period">
            {RANGES.map((item) => (
              <button key={item.value} type="button" aria-pressed={range === item.value} onClick={() => setRange(item.value)}>{item.label}</button>
            ))}
          </div>
          <label className={styles.select}>
            <i className="fa-solid fa-location-dot" aria-hidden="true" />
            <span className={styles.srOnly}>Municipality</span>
            <select value={municipalityId} onChange={(event) => setMunicipalityId(event.target.value)}>
              <option value="">All municipalities</option>
              {data?.allMunicipalities.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.name}</option>)}
            </select>
          </label>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <span>{error}</span>
            <button type="button" className={styles.button} onClick={refresh}>Retry</button>
          </div>
        )}

        {!data && loading && (
          <div className={styles.grid21}><div className={styles.skeleton} style={{ height: 320 }} /><div className={styles.skeleton} style={{ height: 320 }} /></div>
        )}

        {data && headline && (
          <>
            <section className={styles.grid21}>
              <div className={styles.card}>
                {(() => {
                  const busiest = data.trend.reduce((best, point) => (point.incidents > best.incidents ? point : best), data.trend[0]);
                  return <SectionHead icon="fa-chart-column" title="Incident trend"
                    meta={noIncidents || !busiest ? `per ${data.bucket}` : `busiest ${bucketLabel(busiest.bucket, data.bucket, true)} · ${busiest.incidents}`} />;
                })()}
                {noIncidents ? <p className={styles.empty}>No fire incidents.</p> : <TrendBars points={data.trend} bucket={data.bucket} />}
              </div>
              <div className={styles.card}>
                <SectionHead icon="fa-calendar-week" title="When fires happen" meta="Antique time" />
                {noIncidents ? <p className={styles.empty}>No fire incidents.</p> : (
                  <>
                    <Heatmap cells={data.heatmap} />
                    <div className={styles.scale}>Fewer <div>{HEAT_RAMP.slice(1).map((color) => <i key={color} style={{ background: color }} />)}</div> More</div>
                    <WhenSummary cells={data.heatmap} />
                  </>
                )}
              </div>
            </section>

            <section className={styles.card}>
              <SectionHead icon="fa-map-location-dot" title="By municipality" meta="click a row to open reports" />
              {data.municipalities.length === 0 ? <p className={styles.empty}>No fire incidents.</p> : (
                <table className={styles.table}>
                  <thead><tr><th>Municipality</th><th>Incidents</th><th>High &amp; critical</th><th>Active</th><th aria-label="Open" /></tr></thead>
                  <tbody>
                    {data.municipalities.map((row) => {
                      const open = () => router.push(`/provincial-bfp/incident-reports?municipalityId=${row.id}`);
                      const most = Math.max(...data.municipalities.map((item) => item.incidents), 1);
                      return (
                        <tr key={row.id} tabIndex={0} onClick={open} onKeyDown={(event) => { if (event.key === 'Enter') open(); }}>
                          <td className={styles.name}>{row.name}</td>
                          <td><span className={styles.inbar}><i style={{ width: `${(row.incidents / most) * 100}%` }} /><b>{row.incidents}</b></span></td>
                          <td>{row.highDangerShare != null && row.highDangerShare >= 0.4
                            ? <span className={`${styles.pill} ${styles.pillHot}`}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {percent(row.highDangerShare)}</span>
                            : row.highDangerShare == null ? <span className={styles.dash}>—</span> : percent(row.highDangerShare)}</td>
                          <td>{row.activeNow
                            ? <span className={`${styles.pill} ${styles.pillLive}`}><i className={styles.liveDot} aria-hidden="true" /> {row.activeNow}</span>
                            : <span className={styles.dash}>—</span>}</td>
                          <td className={styles.go}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <section className={styles.grid11}>
              <div className={styles.card}>
                <SectionHead icon="fa-shield-halved" title="Level of Danger" />
                {noIncidents ? <p className={styles.empty}>No fire incidents.</p> : (
                  <>
                    {(() => {
                      const rated = data.danger.levels.reduce((sum, level) => sum + level.incidents, 0);
                      return (
                        <div className={styles.dangerTop}>
                          <DangerDonut total={rated} segments={data.danger.levels.map((level) => ({
                            key: level.level, label: LEVELS[level.level].label, value: level.incidents, color: LEVELS[level.level].color,
                          }))} />
                          <ul className={styles.levelList}>
                            {data.danger.levels.map((level) => (
                              <li key={level.level} style={{ '--level': LEVELS[level.level].color, '--level-soft': LEVELS[level.level].soft } as React.CSSProperties}>
                                <span className={styles.levelIcon} aria-hidden="true"><i className={`fa-solid ${LEVELS[level.level].icon}`} /></span>
                                <span className={styles.levelName}>{LEVELS[level.level].label}</span>
                                <b>{level.incidents}</b>
                                <small>{percent(rated ? level.incidents / rated : null)}</small>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                    {data.danger.conditions.length > 0 && (
                      <div className={styles.factors}>
                        <span className={styles.label}>Top danger factors</span>
                        {data.danger.conditions.map((condition) => (
                          <div key={condition.key} className={styles.factor} title={condition.criterion}>
                            <span className={styles.factorIcon} aria-hidden="true"><i className={`fa-solid ${CONDITION_ICONS[condition.key] ?? 'fa-circle-info'}`} /></span>
                            <div>
                              <div className={styles.factorHead}>
                                <span>{condition.label}</span>
                                <b>{condition.incidents}/{data.danger.highDangerIncidents}</b>
                              </div>
                              <div className={styles.factorTrack}><div style={{ width: `${condition.share * 100}%` }} /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className={styles.card}>
                <SectionHead icon="fa-handshake-angle" title="Coordination" />
                <div className={styles.stats}>
                  <Stat label="Assistance requests" value={data.coordination.assistanceRequests} />
                  <Stat label="Accepted" value={data.coordination.accepted + data.coordination.partiallyAccepted} />
                  <Stat label="Median reply" value={formatMinutes(data.coordination.medianResponseMinutes)} />
                  <Stat label="Backup calls" value={data.coordination.backupCalls} />
                </div>
                <span className={styles.label}>Alarm levels</span>
                <div className={styles.alarms}>
                  {data.coordination.alarms.map((alarm) => (
                    <div key={alarm.level} data-level={alarm.level}><b>{alarm.declared}</b><small>{['', '', '2nd', '3rd', '4th'][alarm.level]} alarm</small></div>
                  ))}
                </div>
                {data.coordination.topHelpers.length > 0 && (
                  <>
                    <span className={styles.label}>Gave the most help</span>
                    <div className={styles.helpers}>
                      {data.coordination.topHelpers.map((helper) => <div key={helper.name}><span>{helper.name}</span><b>{helper.responses}</b></div>)}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className={styles.grid111}>
              <div className={styles.card}>
                <SectionHead icon="fa-location-dot" title="Top barangays" />
                {data.barangays.length === 0 ? <p className={styles.empty}>No barangay data.</p> : (
                  <div className={styles.ranked}>
                    {data.barangays.map((row, index) => (
                      <div key={`${row.municipality}-${row.barangay}`}>
                        <span className={styles.rank}>{index + 1}</span>
                        <span className={styles.rankName}>{row.barangay}<em>{row.municipality}</em>
                          <i className={styles.rankBar} style={{ width: `${(row.incidents / data.barangays[0].incidents) * 100}%` }} aria-hidden="true" />
                        </span>
                        <b className={styles.right}>{row.incidents}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.card}>
                <SectionHead icon="fa-fire" title="Fire type"
                  meta={data.fireTypes.multiType > 0 ? `${data.fireTypes.multiType} with 2+ types` : undefined} />
                {data.fireTypes.counts.length === 0 ? <p className={styles.empty}>No fire incidents.</p> : (
                  <div className={styles.bars}>
                    {fireTypeRows(data.fireTypes.counts, Object.keys(FIRE_TYPES)).map((row, _index, rows) => {
                      const most = Math.max(rows[0].incidents, 1);
                      const type = FIRE_TYPES[row.type] ?? { label: row.type, color: 'var(--faint)' };
                      return (
                        <div key={row.type} className={styles.bar}>
                          <span>{type.label}</span>
                          <div className={styles.barTrack}><div style={{ width: `${(row.incidents / most) * 100}%`, background: type.color }} /></div>
                          <b>{row.incidents}</b>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className={styles.card}>
                <SectionHead icon="fa-mobile-screen-button" title="How fires are reported" />
                {data.reporting.app + data.reporting.phone === 0 ? <p className={styles.empty}>No fire incidents.</p> : (
                  <>
                    <div className={styles.split} aria-hidden="true">
                      {data.reporting.app > 0 && <div style={{ flex: data.reporting.app, background: 'var(--series-1)' }} />}
                      {data.reporting.phone > 0 && <div style={{ flex: data.reporting.phone, background: 'var(--series-2)' }} />}
                    </div>
                    <div className={styles.legend}>
                      <span><i className={styles.swatch} style={{ background: 'var(--series-1)' }} />Resident app <b>{data.reporting.app}</b></span>
                      <span><i className={styles.swatch} style={{ background: 'var(--series-2)' }} />Phone call <b>{data.reporting.phone}</b></span>
                    </div>
                  </>
                )}
                <div className={styles.stats}>
                  <Stat label="With photos" value={percent(data.reporting.photoShare)} />
                  <Stat label="Time to verify" value={formatMinutes(data.reporting.medianVerifyMinutes)} />
                </div>
              </div>
            </section>

            <p className={styles.footnote}>Decision support only. BFP personnel make the final call.</p>
          </>
        )}
      </div>
    </>
  );
}

function SectionHead({ icon, title, meta }: { icon: string; title: string; meta?: string }) {
  return (
    <header className={styles.head}>
      <span className={styles.icon} aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <h2>{title}</h2>
      {meta && <span className={styles.meta}>{meta}</span>}
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
    <div className={`${styles.stats} ${styles.stats3}`}>
      <Stat label="Peak hours" value={`${hourName(start)}–${hourName((start + 3) % 24)}`} />
      <Stat label="Busiest day" value={days[byDay.indexOf(Math.max(...byDay))]} />
      <Stat label="At night" value={percent(total ? night / total : null)} />
    </div>
  );
}
