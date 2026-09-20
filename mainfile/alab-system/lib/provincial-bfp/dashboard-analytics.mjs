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
