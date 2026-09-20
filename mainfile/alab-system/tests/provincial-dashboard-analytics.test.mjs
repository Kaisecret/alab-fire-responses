import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAnalyticsQuery,
  getManilaMonthRange,
  getPreviousMonth,
  getNextMonth,
  getSameMonthLastYear,
  calculateComparisonChange,
  alignComparisonSeries,
  buildSmoothChartPath,
  buildGroupedBarLayout,
  normalizeAnalyticsSeries,
} from '../lib/provincial-bfp/dashboard-analytics.mjs';

test('analytics month controls preserve Philippine calendar boundaries', () => {
  assert.deepEqual(getManilaMonthRange('2028-02'), { from: '2028-02-01', to: '2028-02-29' });
  assert.equal(getPreviousMonth('2026-01'), '2025-12');
  assert.equal(getNextMonth('2026-12'), '2027-01');
  assert.equal(getSameMonthLastYear('2026-09'), '2025-09');
});

test('comparison change avoids misleading percentages when the baseline is zero', () => {
  assert.deepEqual(calculateComparisonChange(12, 10), { kind: 'percent', value: 20 });
  assert.deepEqual(calculateComparisonChange(0, 0), { kind: 'unchanged', value: 0 });
  assert.deepEqual(calculateComparisonChange(3, 0), { kind: 'new', value: 3 });
  assert.deepEqual(calculateComparisonChange(7, 10), { kind: 'percent', value: -30 });
});

test('comparison series aligns different calendar months by day number', () => {
  const result = alignComparisonSeries(
    [{ date: '2026-03-01', total: 4, active: 2, resolved: 1, verification: 1, administrative: 0 }],
    [{ date: '2026-02-01', total: 2, active: 1, resolved: 1, verification: 0, administrative: 0 }],
    [{ date: '2025-03-01', total: 5, active: 3, resolved: 2, verification: 0, administrative: 0 }],
    'total',
  );

  assert.deepEqual(result[0], {
    day: 1,
    currentDate: '2026-03-01',
    previousDate: '2026-02-01',
    lastYearDate: '2025-03-01',
    current: 4,
    previous: 2,
    lastYear: 5,
    breakdown: { active: 2, resolved: 1, verification: 1, administrative: 0 },
  });
  assert.equal(result.length, 31);
  assert.equal(result[28].previous, null);
});

test('smooth chart path uses bounded cubic curves instead of sharp line segments', () => {
  assert.equal(
    buildSmoothChartPath([{ x: 0, y: 30 }, { x: 10, y: 10 }, { x: 20, y: 20 }]),
    'M0 30 C5 30, 5 10, 10 10 C15 10, 15 20, 20 20',
  );
  assert.equal(
    buildSmoothChartPath([{ x: 0, y: 30 }, null, { x: 20, y: 20 }]),
    'M0 30 M20 20',
  );
});

test('grouped bar layout keeps comparison bars side by side within each day', () => {
  const bars = buildGroupedBarLayout(
    [{ current: 4, previous: 2, lastYear: null }],
    ['current', 'previous'],
    { left: 10, plotWidth: 30, plotHeight: 80, baselineY: 100, maxValue: 4 },
  );
  assert.deepEqual(bars, [
    { dayIndex: 0, key: 'current', value: 4, x: 15, y: 20, width: 9, height: 80 },
    { dayIndex: 0, key: 'previous', value: 2, x: 26, y: 60, width: 9, height: 40 },
  ]);
});

test('analytics query personalizes the same month for one municipality', () => {
  assert.equal(
    buildAnalyticsQuery('2026-09', '22222222-2222-4222-8222-222222222222'),
    'from=2026-09-01&to=2026-09-30&municipalityId=22222222-2222-4222-8222-222222222222',
  );
  assert.equal(buildAnalyticsQuery('2026-09', ''), 'from=2026-09-01&to=2026-09-30');
});

test('analytics series keeps zero days and derives a stable chart ceiling', () => {
  const result = normalizeAnalyticsSeries([
    { date: '2026-09-01', total: 0, active: 0, resolved: 0, verification: 0, administrative: 0 },
    { date: '2026-09-02', total: 9, active: 5, resolved: 2, verification: 1, administrative: 1 },
  ]);
  assert.equal(result.maxValue, 10);
  assert.equal(result.points.length, 2);
  assert.equal(result.points[0].total, 0);
  assert.equal(result.points[1].total, 9);
});
