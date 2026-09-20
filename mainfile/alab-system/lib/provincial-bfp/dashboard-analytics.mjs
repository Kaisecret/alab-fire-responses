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

export function alignComparisonSeries(current, previous, lastYear, metric = 'total') {
  const series = [current, previous, lastYear].map((items) => Array.isArray(items) ? items : []);
  const currentDate = series[0][0]?.date;
  const currentMonthMatch = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(currentDate ?? ''));
  const calendarLength = currentMonthMatch
    ? new Date(Date.UTC(Number(currentMonthMatch[1]), Number(currentMonthMatch[2]), 0)).getUTCDate()
    : 0;
  const length = Math.max(calendarLength, ...series.map((items) => items.length));
  return Array.from({ length }, (_, index) => {
    const currentPoint = series[0][index] ?? null;
    const previousPoint = series[1][index] ?? null;
    const lastYearPoint = series[2][index] ?? null;
    return {
      day: index + 1,
      currentDate: currentPoint?.date ?? null,
      previousDate: previousPoint?.date ?? null,
      lastYearDate: lastYearPoint?.date ?? null,
      current: currentPoint ? Math.max(0, Number(currentPoint[metric]) || 0) : null,
      previous: previousPoint ? Math.max(0, Number(previousPoint[metric]) || 0) : null,
      lastYear: lastYearPoint ? Math.max(0, Number(lastYearPoint[metric]) || 0) : null,
      breakdown: currentPoint ? {
        active: Math.max(0, Number(currentPoint.active) || 0),
        resolved: Math.max(0, Number(currentPoint.resolved) || 0),
        verification: Math.max(0, Number(currentPoint.verification) || 0),
        administrative: Math.max(0, Number(currentPoint.administrative) || 0),
      } : null,
    };
  });
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
