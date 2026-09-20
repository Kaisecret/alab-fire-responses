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
