const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function parseMonth(month) {
  const match = MONTH_PATTERN.exec(String(month));
  if (!match) throw new Error('INVALID_MONTH');
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new Error('INVALID_MONTH');
  return { year, monthNumber };
}

function formatMonth(year, monthNumber) {
  return `${String(year).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}`;
}

export function getManilaMonthRange(month) {
  const { year, monthNumber } = parseMonth(month);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    from: `${formatMonth(year, monthNumber)}-01`,
    to: `${formatMonth(year, monthNumber)}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function getPreviousMonth(month) {
  const { year, monthNumber } = parseMonth(month);
  return monthNumber === 1 ? formatMonth(year - 1, 12) : formatMonth(year, monthNumber - 1);
}

export function getNextMonth(month) {
  const { year, monthNumber } = parseMonth(month);
  return monthNumber === 12 ? formatMonth(year + 1, 1) : formatMonth(year, monthNumber + 1);
}

export function getSameMonthLastYear(month) {
  const { year, monthNumber } = parseMonth(month);
  return formatMonth(year - 1, monthNumber);
}

export function calculateComparisonChange(current, baseline) {
  const currentValue = Math.max(0, Number(current) || 0);
  const baselineValue = Math.max(0, Number(baseline) || 0);
  if (baselineValue === 0) {
    return currentValue === 0
      ? { kind: 'unchanged', value: 0 }
      : { kind: 'new', value: currentValue };
  }
  return {
    kind: 'percent',
    value: Math.round(((currentValue - baselineValue) / baselineValue) * 100),
  };
}

export function hasRecordedActivity(trend) {
  return Array.isArray(trend) && trend.some((day) => (Number(day?.total) || 0) > 0);
}

/*
 * `through` (YYYY-MM-DD) ends the current month at today, and `omit` lists
 * periods with no reports at all. Both become null so the chart leaves a gap
 * instead of drawing a flat zero that reads as "no fires".
 */
export function alignComparisonSeries(current, previous, lastYear, metric = 'total', options = {}) {
  const series = [current, previous, lastYear].map((items) => Array.isArray(items) ? items : []);
  const omit = new Set(Array.isArray(options.omit) ? options.omit : []);
  const through = typeof options.through === 'string' ? options.through : null;
  const valueOf = (key, point) => {
    if (!point || omit.has(key)) return null;
    if (key === 'current' && through && String(point.date) > through) return null;
    return Math.max(0, Number(point[metric]) || 0);
  };
  const currentDate = series[0][0]?.date;
  const currentMonthMatch = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(currentDate ?? ''));
  const calendarLength = currentMonthMatch
    ? new Date(Date.UTC(Number(currentMonthMatch[1]), Number(currentMonthMatch[2]), 0)).getUTCDate()
    : 0;
  const keys = ['current', 'previous', 'lastYear'];
  const length = Math.max(calendarLength, ...series.map((items, index) => omit.has(keys[index]) ? 0 : items.length));
  return Array.from({ length }, (_, index) => {
    const currentPoint = series[0][index] ?? null;
    const previousPoint = series[1][index] ?? null;
    const lastYearPoint = series[2][index] ?? null;
    return {
      day: index + 1,
      currentDate: currentPoint?.date ?? null,
      previousDate: previousPoint?.date ?? null,
      lastYearDate: lastYearPoint?.date ?? null,
      current: valueOf('current', currentPoint),
      previous: valueOf('previous', previousPoint),
      lastYear: valueOf('lastYear', lastYearPoint),
      breakdown: valueOf('current', currentPoint) !== null ? {
        active: Math.max(0, Number(currentPoint.active) || 0),
        resolved: Math.max(0, Number(currentPoint.resolved) || 0),
        verification: Math.max(0, Number(currentPoint.verification) || 0),
        administrative: Math.max(0, Number(currentPoint.administrative) || 0),
      } : null,
    };
  });
}

export function buildCumulativeSeries(points, keys) {
  const running = Object.fromEntries(keys.map((key) => [key, 0]));
  return (Array.isArray(points) ? points : []).map((point) => {
    const next = { ...point };
    for (const key of keys) {
      if (point[key] === null || point[key] === undefined) {
        next[key] = null;
        continue;
      }
      running[key] += Math.max(0, Number(point[key]) || 0);
      next[key] = running[key];
    }
    return next;
  });
}

/*
 * Counts and shares of each fire type per period. A period passed as null
 * (no records) stays null so the chart can say so instead of drawing zeros.
 */
export function buildFireTypeComparison(fireTypes, periods) {
  const keys = ['current', 'previous', 'lastYear'];
  const totals = {};
  for (const key of keys) {
    const counts = periods?.[key];
    totals[key] = counts ? fireTypes.reduce((sum, [id]) => sum + Math.max(0, Number(counts[id]) || 0), 0) : null;
  }
  let max = 0;
  const rows = fireTypes.map(([id, label]) => {
    const row = { id, label };
    for (const key of keys) {
      const counts = periods?.[key];
      if (!counts) {
        row[key] = null;
        continue;
      }
      const count = Math.max(0, Number(counts[id]) || 0);
      max = Math.max(max, count);
      row[key] = { count, share: totals[key] ? Math.round((count / totals[key]) * 100) : 0 };
    }
    return row;
  });
  return { rows, max, totals };
}

/*
 * Ranks municipalities with reports and groups the rest. `previous` is null
 * when last month has no records, so no change is claimed against it.
 */
export function buildMunicipalityRanking(current, previous) {
  const rows = Array.isArray(current) ? current : [];
  const previousTotals = Array.isArray(previous)
    ? new Map(previous.map((row) => [row.municipalityId, Math.max(0, Number(row.total) || 0)]))
    : null;
  const total = rows.reduce((sum, row) => sum + Math.max(0, Number(row.total) || 0), 0);
  const count = (value) => Math.max(0, Number(value) || 0);
  const ranked = rows
    .filter((row) => count(row.total) > 0)
    .sort((a, b) => count(b.total) - count(a.total) || String(a.municipalityName).localeCompare(String(b.municipalityName)))
    .map((row, index) => ({
      rank: index + 1,
      id: row.municipalityId,
      name: row.municipalityName,
      total: count(row.total),
      share: total ? Math.round((count(row.total) / total) * 100) : 0,
      segments: {
        active: count(row.active),
        resolved: count(row.resolved),
        verification: count(row.verification),
        administrative: count(row.administrative),
      },
      delta: previousTotals ? count(row.total) - (previousTotals.get(row.municipalityId) ?? 0) : null,
    }));
  const quiet = rows
    .filter((row) => count(row.total) === 0)
    .map((row) => ({ id: row.municipalityId, name: row.municipalityName }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return { ranked, quiet, total, max: Math.max(0, ...ranked.map((row) => row.total)) };
}

function formatChartNumber(value) {
  return String(Number(Number(value).toFixed(2)));
}

export function buildSmoothChartPath(points) {
  let path = '';
  let previous = null;
  for (const point of Array.isArray(points) ? points : []) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      previous = null;
      continue;
    }
    if (!previous) {
      path += `${path ? ' ' : ''}M${formatChartNumber(point.x)} ${formatChartNumber(point.y)}`;
    } else {
      const middleX = (previous.x + point.x) / 2;
      path += ` C${formatChartNumber(middleX)} ${formatChartNumber(previous.y)}, ${formatChartNumber(middleX)} ${formatChartNumber(point.y)}, ${formatChartNumber(point.x)} ${formatChartNumber(point.y)}`;
    }
    previous = point;
  }
  return path;
}

export function buildGroupedBarLayout(points, keys, geometry) {
  const safePoints = Array.isArray(points) ? points : [];
  const safeKeys = Array.isArray(keys) ? keys : [];
  if (safePoints.length === 0 || safeKeys.length === 0) return [];
  const slotWidth = geometry.plotWidth / safePoints.length;
  const gap = safeKeys.length > 1 ? 2 : 0;
  const availableWidth = Math.min(28, slotWidth * 0.7);
  const barWidth = Math.max(2, Math.floor((availableWidth - gap * (safeKeys.length - 1)) / safeKeys.length));
  const groupWidth = barWidth * safeKeys.length + gap * (safeKeys.length - 1);
  const bars = [];
  safePoints.forEach((point, dayIndex) => {
    const groupStart = geometry.left + slotWidth * dayIndex + (slotWidth - groupWidth) / 2;
    safeKeys.forEach((key, keyIndex) => {
      const rawValue = point?.[key];
      if (rawValue === null || rawValue === undefined) return;
      const value = Math.max(0, Number(rawValue) || 0);
      const height = geometry.maxValue > 0 ? (value / geometry.maxValue) * geometry.plotHeight : 0;
      bars.push({
        dayIndex,
        key,
        value,
        x: Number((groupStart + keyIndex * (barWidth + gap)).toFixed(2)),
        y: Number((geometry.baselineY - height).toFixed(2)),
        width: barWidth,
        height: Number(height.toFixed(2)),
      });
    });
  });
  return bars;
}

export function buildAnalyticsQuery(month, municipalityId = '') {
  const range = getManilaMonthRange(month);
  const params = new URLSearchParams(range);
  if (municipalityId) params.set('municipalityId', municipalityId);
  return params.toString();
}

export function normalizeAnalyticsSeries(series) {
  const points = Array.isArray(series)
    ? series.map((point) => ({
        date: String(point.date),
        total: Math.max(0, Number(point.total) || 0),
        active: Math.max(0, Number(point.active) || 0),
        resolved: Math.max(0, Number(point.resolved) || 0),
        verification: Math.max(0, Number(point.verification) || 0),
        administrative: Math.max(0, Number(point.administrative) || 0),
      }))
    : [];
  const peak = Math.max(0, ...points.map((point) => point.total));
  const step = peak <= 10 ? 2 : peak <= 25 ? 5 : peak <= 50 ? 10 : 25;
  return { points, maxValue: Math.max(step, Math.ceil(peak / step) * step) };
}
