import assert from "node:assert/strict";
import test from "node:test";

import {
  analyticsPeriod,
  bucketKey,
  dangerConditionOf,
  fillTrend,
  periodBuckets,
  rateChange,
  summarizeDangerConditions,
} from "../lib/provincial-bfp/analytics-rules.mjs";

// 2026-10-07 21:30 in Antique (UTC+8).
const now = new Date("2026-10-07T13:30:00Z");

test("periods start at Manila midnight and compare with the same span before", () => {
  const today = analyticsPeriod("today", now);
  assert.equal(today.from.toISOString(), "2026-10-06T16:00:00.000Z");
  assert.equal(today.previousFrom.toISOString(), "2026-10-05T16:00:00.000Z");
  assert.equal(today.previousTo.toISOString(), "2026-10-06T13:30:00.000Z", "yesterday until the same time");
  assert.equal(today.bucket, "hour");

  const month = analyticsPeriod("30d", now);
  assert.equal(month.from.toISOString(), "2026-09-07T16:00:00.000Z", "30 calendar days including today");
  assert.equal(month.previousTo.getTime() - month.previousFrom.getTime(), month.to.getTime() - month.from.getTime());
  assert.equal(month.bucket, "day");

  const ytd = analyticsPeriod("ytd", now);
  assert.equal(ytd.from.toISOString(), "2025-12-31T16:00:00.000Z");
  assert.equal(ytd.previousFrom.toISOString(), "2024-12-31T16:00:00.000Z");
  assert.equal(ytd.bucket, "month");
  assert.throws(() => analyticsPeriod("90d", now), /INVALID_ANALYTICS_RANGE/);
});

test("trend buckets follow the Manila calendar and fill quiet days with zero", () => {
  assert.equal(bucketKey("2026-10-06T16:30:00Z", "day"), "2026-10-07");
  assert.equal(bucketKey("2026-10-06T16:30:00Z", "hour"), "2026-10-07T00");
  assert.equal(periodBuckets(analyticsPeriod("7d", now)).length, 7);
  assert.equal(periodBuckets(analyticsPeriod("today", now)).length, 22, "midnight to 9 PM");
  assert.deepEqual(periodBuckets(analyticsPeriod("ytd", now)).slice(0, 2), ["2026-01", "2026-02"]);
  assert.equal(periodBuckets(analyticsPeriod("ytd", now)).length, 10);

  const filled = fillTrend([{ bucket: "2026-10-05", incidents: 2, highDanger: 1 }], analyticsPeriod("7d", now));
  assert.equal(filled.length, 7);
  assert.deepEqual(filled.find((day) => day.bucket === "2026-10-05"), { bucket: "2026-10-05", incidents: 2, highDanger: 1 });
  assert.deepEqual(filled[0], { bucket: "2026-10-01", incidents: 0, highDanger: 0 });
});

test("saved danger factors map back to the paper's criteria", () => {
  assert.equal(dangerConditionOf("Dikit-dikit na kabahayan (High conflagration risk)"), "HOUSE_DENSITY");
  assert.equal(dangerConditionOf("Vehicle fire among closely built houses"), "HOUSE_DENSITY");
  assert.equal(dangerConditionOf("Light combustible materials (Kahoy/Kawayan/Nipa)"), "STRUCTURE_MATERIAL");
  assert.equal(dangerConditionOf("Makipot na kalsada (1-lane passage)"), "ROUTE_ACCESS");
  assert.equal(dangerConditionOf("Dead-end o baradong daan"), "ROUTE_ACCESS");
  assert.equal(dangerConditionOf("Malakas ang hangin (31 km/h - mabilis kumalat ang apoy)"), "WIND");
  assert.equal(dangerConditionOf("Matinding init at tuyong panahon (35°C, 40% RH)"), "WEATHER");
  assert.equal(dangerConditionOf("Nearest mapped building 40 m away (occupancy unverified)"), "NEAR_HOUSES");
  assert.equal(dangerConditionOf("Magkakalayo na bahay (> 15m)"), null, "a condition that lowers danger is not listed");
  assert.equal(dangerConditionOf("Semi-concrete structure"), null);
});

test("each incident counts once per condition", () => {
  const summary = summarizeDangerConditions([
    ["Dikit-dikit na kabahayan (High conflagration risk)", "Makipot na kalsada (1-lane passage)", "Dead-end o baradong daan"],
    ["Dikit-dikit na kabahayan (High conflagration risk)"],
    [],
    null,
  ]);
  assert.deepEqual(summary.map(({ key, incidents, share }) => [key, incidents, share]), [
    ["HOUSE_DENSITY", 2, 0.5],
    ["ROUTE_ACCESS", 1, 0.25],
  ]);
  assert.deepEqual(summarizeDangerConditions([]), []);
});

test("rate changes are in percentage points and need both periods", () => {
  assert.equal(rateChange(0.31, 0.27), 4);
  assert.equal(rateChange(0.07, 0.09), -2);
  assert.equal(rateChange(null, 0.2), null);
});

test("response times use the first time each status was reached and skip missing or backwards stages", async () => {
  const { percentile, median, summarizeResponseTimes } = await import("../lib/provincial-bfp/analytics-rules.mjs");
  assert.equal(median([10, 1, 2]), 2);
  assert.equal(percentile([1, 2, 10], 0.9), 8.4, "matches Postgres percentile_cont");
  assert.equal(median([]), null);

  const at = (minutes) => new Date(Date.UTC(2026, 9, 7, 0, minutes)).toISOString();
  const summary = summarizeResponseTimes([
    { submittedAt: at(0), verifiedAt: at(2), dispatchedAt: at(4), arrivedAt: at(12), controlledAt: at(30), resolvedAt: at(60) },
    { submittedAt: at(0), verifiedAt: at(3), dispatchedAt: at(5), arrivedAt: at(20), controlledAt: null, resolvedAt: null },
    { submittedAt: at(0), verifiedAt: at(1), dispatchedAt: null, arrivedAt: null, controlledAt: null, resolvedAt: null },
    { submittedAt: at(10), verifiedAt: at(5), dispatchedAt: null, arrivedAt: null, controlledAt: null, resolvedAt: null },
  ]);
  assert.deepEqual(summary.stages.map((stage) => [stage.key, stage.medianMinutes, stage.incidents]), [
    ["VERIFY", 2, 3],
    ["DISPATCH", 2, 2],
    ["TRAVEL", 11.5, 2],
    ["CONTROL", 18, 1],
    ["RESOLVE", 30, 1],
  ]);
  assert.deepEqual(summary.arrival, { medianMinutes: 16, slowestTenthMinutes: 19.2, incidents: 2 });
});
