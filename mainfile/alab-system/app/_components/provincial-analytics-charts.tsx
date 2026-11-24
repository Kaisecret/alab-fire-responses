'use client';

import React, { useState } from 'react';

import type { ProvincialAnalytics } from '../../lib/provincial-bfp/analytics';
import styles from './provincial-analytics.module.css';

export function formatMinutes(minutes: number | null) {
  if (minutes == null) return '—';
  if (minutes >= 120) return `${Math.round((minutes / 60) * 10) / 10} h`;
  return `${minutes} min`;
}

export function bucketLabel(bucket: string, kind: string, long = false) {
  if (kind === 'hour') {
    const hour = Number(bucket.slice(11, 13));
    return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
  }
  const [year, month, day] = bucket.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day || 1));
  return date.toLocaleDateString('en-PH', kind === 'month'
    ? { month: 'short', timeZone: 'UTC', ...(long ? { year: 'numeric' } : {}) }
    : { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Incidents per bucket as columns, with the average and a hover tooltip. */
export function TrendBars({ points, bucket }: { points: ProvincialAnalytics['trend']; bucket: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const height = 230;
  const left = 28;
  const right = 8;
  const top = 18;
  const bottom = 26;
  const max = Math.max(2, ...points.map((point) => point.incidents));
  const step = (width - left - right) / Math.max(points.length, 1);
  const barWidth = Math.max(2, Math.min(22, step - 3));
  const y = (value: number) => top + (height - top - bottom) * (1 - value / max);
  const average = points.reduce((sum, point) => sum + point.incidents, 0) / Math.max(points.length, 1);
  const ticks = [0, Math.round(max / 2), max];
  const labelEvery = Math.ceil(points.length / 8);
  const active = hover == null ? null : points[hover];

  return (
    <div className={styles.chart} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Fire incidents per ${bucket}, highest ${max}`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? '#CBD5E1' : '#EDF1F6'} />
            <text x={left - 8} y={y(tick) + 4} textAnchor="end" fontSize="10" fontWeight="700" fill="#94A3B8">{tick}</text>
          </g>
        ))}
        {points.map((point, index) => {
          const x = left + index * step + (step - barWidth) / 2;
          const barTop = y(point.incidents);
          return (
            <g key={point.bucket}>
              {point.incidents > 0 && (
                <path
                  d={`M${x},${y(0)} V${barTop + 3} Q${x},${barTop} ${x + 3},${barTop} H${x + barWidth - 3} Q${x + barWidth},${barTop} ${x + barWidth},${barTop + 3} V${y(0)} Z`}
                  fill={hover === index ? '#1c5cab' : 'var(--series-1)'}
                />
              )}
              <rect x={left + index * step} y={top} width={step} height={height - top - bottom} fill="transparent"
                onMouseEnter={() => setHover(index)} />
              {index % labelEvery === 0 && (
                <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="#94A3B8">
                  {bucketLabel(point.bucket, bucket)}
                </text>
              )}
            </g>
          );
        })}
        {average > 0 && (
          <>
            <line x1={left} x2={width - right} y1={y(average)} y2={y(average)} stroke="#64748B" strokeDasharray="4 4" />
            <text x={left + 4} y={y(average) - 5} fontSize="10" fontWeight="800" fill="#64748B">avg {Math.round(average * 10) / 10}</text>
          </>
        )}
      </svg>
      {active && hover != null && (
        <div className={styles.tooltip} style={{ left: `${((left + hover * step + step / 2) / width) * 100}%`, top: `${(y(active.incidents) / height) * 100}%` }}>
          <b>{bucketLabel(active.bucket, bucket, true)}</b>
          {active.incidents} {active.incidents === 1 ? 'incident' : 'incidents'} · {active.highDanger} High or Critical
        </div>
      )}
    </div>
  );
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const HEAT_RAMP = ['#F4F7FB', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#104281'];
const hourName = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;

/** Incidents by day of week (Monday first) and hour of day, in Antique time. */
export function Heatmap({ cells }: { cells: ProvincialAnalytics['heatmap'] }) {
  const [hover, setHover] = useState<{ day: number; hour: number; incidents: number } | null>(null);
  const count = (day: number, hour: number) => cells.find((cell) => cell.day === day && cell.hour === hour)?.incidents ?? 0;
  const max = Math.max(1, ...cells.map((cell) => cell.incidents));
  const shade = (value: number) => HEAT_RAMP[value === 0 ? 0 : Math.max(1, Math.ceil((value / max) * (HEAT_RAMP.length - 1)))];
  return (
    <div className={styles.chart} onMouseLeave={() => setHover(null)}>
      <div className={styles.heat} role="grid" aria-label="Incidents by day of week and hour">
        <span />
        {Array.from({ length: 24 }, (_, hour) => (
          <span key={hour} className={styles.hour}>{hour % 3 === 0 ? hourName(hour).replace(' ', '').toLowerCase() : ''}</span>
        ))}
        {DAYS.map((name, index) => (
          <React.Fragment key={name}>
            <span className={styles.day}>{name}</span>
            {Array.from({ length: 24 }, (_, hour) => {
              const value = count(index + 1, hour);
              return (
                <button key={hour} type="button" className={styles.cell} style={{ background: shade(value) }}
                  aria-label={`${name} ${hourName(hour)}: ${value} incidents`}
                  onMouseEnter={() => setHover({ day: index + 1, hour, incidents: value })}
                  onFocus={() => setHover({ day: index + 1, hour, incidents: value })} />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      {hover && (
        <div className={styles.tooltip} style={{ left: `${((hover.hour + 1.9) / 26) * 100}%`, top: `${hover.day * 23 + 4}px` }}>
          <b>{DAYS[hover.day - 1]} {hourName(hover.hour)}–{hourName((hover.hour + 1) % 24)}</b>
          {hover.incidents} {hover.incidents === 1 ? 'incident' : 'incidents'}
        </div>
      )}
    </div>
  );
}

/** Share of incidents per Level of Danger, as a ring with the total in the middle. */
export function DangerDonut({ total, segments }: {
  total: number; segments: Array<{ key: string; label: string; value: number; color: string }>;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const gap = segments.filter((segment) => segment.value > 0).length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className={styles.donut}>
      <svg viewBox="0 0 140 140" role="img" aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="16" />
        {total > 0 && segments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const dash = Math.max(0, length - gap);
          const arc = (
            <circle key={segment.key} cx="70" cy="70" r={radius} fill="none" stroke={segment.color} strokeWidth="16"
              strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)">
              <title>{`${segment.label}: ${segment.value}`}</title>
            </circle>
          );
          offset += length;
          return segment.value > 0 ? arc : null;
        })}
      </svg>
      <div className={styles.donutCenter}>
        <b>{total}</b>
        <small>{total === 1 ? 'incident' : 'incidents'}</small>
      </div>
    </div>
  );
}
