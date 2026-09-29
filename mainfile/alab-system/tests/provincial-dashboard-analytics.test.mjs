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
  buildCumulativeSeries,
  buildFireTypeComparison,
  buildMunicipalityRanking,
  hasRecordedActivity,
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

test('a comparison period with no reports is detected from every status, not one measure', () => {
  assert.equal(hasRecordedActivity([]), false);
  assert.equal(hasRecordedActivity(null), false);
  assert.equal(hasRecordedActivity([{ date: '2025-09-01', total: 0, resolved: 0 }]), false);
  // A month with reports still counts when the selected measure is zero.
  assert.equal(hasRecordedActivity([{ date: '2026-08-01', total: 2, resolved: 0 }]), true);
});

test('periods without records and days after today are left out instead of drawn as zero', () => {
  const current = [
    { date: '2026-09-01', total: 3, active: 1, resolved: 2, verification: 0, administrative: 0 },
    { date: '2026-09-02', total: 0, active: 0, resolved: 0, verification: 0, administrative: 0 },
    { date: '2026-09-03', total: 0, active: 0, resolved: 0, verification: 0, administrative: 0 },
  ];
  const previous = [{ date: '2026-08-01', total: 0 }, { date: '2026-08-02', total: 0 }, { date: '2026-08-03', total: 0 }];
  const result = alignComparisonSeries(current, previous, previous, 'total', {
    through: '2026-09-02',
    omit: ['previous', 'lastYear'],
  });
  const firstDays = result.slice(0, 3);
  assert.deepEqual(firstDays.map((point) => point.current), [3, 0, null]);
  assert.equal(result[2].breakdown, null);
  assert.deepEqual(firstDays.map((point) => point.previous), [null, null, null]);
  assert.deepEqual(firstDays.map((point) => point.lastYear), [null, null, null]);
  // Dates stay so the tooltip can still name the day.
  assert.equal(result[0].previousDate, '2026-08-01');
});

test('running totals accumulate each period and stop where the period stops', () => {
  const points = [
    { day: 1, current: 3, previous: 1, lastYear: null },
    { day: 2, current: 0, previous: 2, lastYear: null },
    { day: 3, current: null, previous: 0, lastYear: null },
  ];
  const result = buildCumulativeSeries(points, ['current', 'previous', 'lastYear']);
  assert.deepEqual(result.map((point) => point.current), [3, 3, null]);
  assert.deepEqual(result.map((point) => point.previous), [1, 3, 3]);
  assert.deepEqual(result.map((point) => point.lastYear), [null, null, null]);
  assert.equal(result[0].day, 1);
  assert.equal(points[1].current, 0, 'input points are not mutated');
});

test('a hidden comparison period does not stretch the month', () => {
  const september = Array.from({ length: 30 }, (_, index) => ({ date: `2026-09-${String(index + 1).padStart(2, '0')}`, total: 0 }));
  const august = Array.from({ length: 31 }, (_, index) => ({ date: `2026-08-${String(index + 1).padStart(2, '0')}`, total: 0 }));
  assert.equal(alignComparisonSeries(september, august, [], 'total', { omit: ['previous', 'lastYear'] }).length, 30);
  assert.equal(alignComparisonSeries(september, august, [], 'total').length, 31);
});

test('fire type comparison gives counts and shares per period and skips periods without records', () => {
  const types = [['HOUSE_BUILDING', 'House / building'], ['GRASS', 'Grass'], ['VEHICLE', 'Vehicle']];
  const result = buildFireTypeComparison(types, {
    current: { HOUSE_BUILDING: 6, GRASS: 2 },
    previous: { HOUSE_BUILDING: 1, VEHICLE: 3 },
    lastYear: null,
  });
  assert.deepEqual(result.rows[0], {
    id: 'HOUSE_BUILDING',
    label: 'House / building',
    current: { count: 6, share: 75 },
    previous: { count: 1, share: 25 },
    lastYear: null,
  });
  assert.deepEqual(result.rows[2].current, { count: 0, share: 0 });
  assert.equal(result.max, 6);
  assert.deepEqual(result.totals, { current: 8, previous: 4, lastYear: null });
});

test('municipality ranking lists active towns first and folds quiet towns into one group', () => {
  const row = (municipalityId, municipalityName, total, active = total) => ({
    municipalityId, municipalityName, total, active, resolved: 0, verification: total - active, administrative: 0,
  });
  const result = buildMunicipalityRanking(
    [row('b', 'Barbaza', 0), row('h', 'Hamtic', 14, 10), row('s', 'San Jose', 1), row('a', 'Anini-y', 0)],
    [row('h', 'Hamtic', 4), row('s', 'San Jose', 1)],
  );
  assert.deepEqual(result.ranked.map((item) => [item.rank, item.name, item.total, item.share, item.delta]), [
    [1, 'Hamtic', 14, 93, 10],
    [2, 'San Jose', 1, 7, 0],
  ]);
  assert.deepEqual(result.ranked[0].segments, { active: 10, resolved: 0, verification: 4, administrative: 0 });
  assert.deepEqual(result.quiet.map((item) => item.name), ['Anini-y', 'Barbaza']);
  assert.equal(result.total, 15);
  assert.equal(result.max, 14);
  // Without last month's records there is nothing to compare against.
  assert.equal(buildMunicipalityRanking([row('h', 'Hamtic', 2)], null).ranked[0].delta, null);
});
