import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAnalyticsQuery,
  getManilaMonthRange,
  getPreviousMonth,
  getNextMonth,
  normalizeAnalyticsSeries,
} from '../lib/provincial-bfp/dashboard-analytics.mjs';

test('analytics month controls preserve Philippine calendar boundaries', () => {
  assert.deepEqual(getManilaMonthRange('2028-02'), { from: '2028-02-01', to: '2028-02-29' });
  assert.equal(getPreviousMonth('2026-01'), '2025-12');
  assert.equal(getNextMonth('2026-12'), '2027-01');
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
