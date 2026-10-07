// Pure rules for the provincial analytics page, kept free of database code so
// the period math and Level of Danger grouping are unit-tested.

/** Antique is UTC+8 all year (no daylight saving). */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const ANALYTICS_RANGES = ["today", "7d", "30d", "ytd"];

export const ANALYTICS_RANGE_LABELS = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  ytd: "Year to date",
};

/** UTC instant of 00:00 Manila time on the Manila calendar day containing `instant`. */
function manilaStartOfDay(instant) {
  const local = instant.getTime() + MANILA_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - MANILA_OFFSET_MS);
}

function manilaStartOfYear(instant, yearsBack = 0) {
  const year = new Date(instant.getTime() + MANILA_OFFSET_MS).getUTCFullYear() - yearsBack;
  return new Date(Date.UTC(year, 0, 1) - MANILA_OFFSET_MS);
}

/**
 * The window a range covers, ending now, and the window just before it of
 * the same length for comparison. Year to date compares with the same part
 * of last year.
 */
export function analyticsPeriod(range, now = new Date()) {
  if (!ANALYTICS_RANGES.includes(range)) throw new Error("INVALID_ANALYTICS_RANGE");
  const to = new Date(now);
  if (range === "ytd") {
    const from = manilaStartOfYear(to);
    const previousFrom = manilaStartOfYear(to, 1);
    const previousTo = new Date(previousFrom.getTime() + (to.getTime() - from.getTime()));
    return { range, from, to, previousFrom, previousTo, bucket: "month" };
  }
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const from = new Date(manilaStartOfDay(to).getTime() - (days - 1) * DAY_MS);
  // The same span one period earlier: today until now compares with
  // yesterday until the same time.
  const previousFrom = new Date(from.getTime() - days * DAY_MS);
  const previousTo = new Date(previousFrom.getTime() + (to.getTime() - from.getTime()));
  return { range, from, to, previousFrom, previousTo, bucket: range === "today" ? "hour" : "day" };
}

/** Manila-local bucket key ("2026-10-07", "2026-10-07T13", "2026-10") for an instant. */
export function bucketKey(instant, bucket) {
  const local = new Date(new Date(instant).getTime() + MANILA_OFFSET_MS).toISOString();
  if (bucket === "month") return local.slice(0, 7);
  if (bucket === "hour") return local.slice(0, 13);
  return local.slice(0, 10);
}

/** Every bucket in the period, oldest first, so days without fires show as zero. */
export function periodBuckets(period) {
  const keys = [];
  let cursor = new Date(period.from);
  while (cursor < period.to) {
    const key = bucketKey(cursor, period.bucket);
    if (keys[keys.length - 1] !== key) keys.push(key);
    if (period.bucket === "hour") cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
    else if (period.bucket === "day") cursor = new Date(cursor.getTime() + DAY_MS);
    else {
      const local = new Date(cursor.getTime() + MANILA_OFFSET_MS);
      cursor = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - MANILA_OFFSET_MS);
    }
  }
  return keys;
}

export function fillTrend(rows, period) {
  const byKey = new Map(rows.map((row) => [row.bucket, row]));
  return periodBuckets(period).map((bucket) => ({
    bucket,
    incidents: byKey.get(bucket)?.incidents ?? 0,
    highDanger: byKey.get(bucket)?.highDanger ?? 0,
  }));
}

/**
 * The Level of Danger criteria from the paper. Each saved factor text names
 * the condition that raised the level; this maps it back to its criterion.
 */
export const DANGER_CONDITIONS = [
  { key: "HOUSE_DENSITY", label: "Houses are close together", criterion: "house density",
    pattern: /dikit-dikit|closely built houses/i },
  { key: "STRUCTURE_MATERIAL", label: "Light or flammable materials", criterion: "structure material",
    pattern: /light combustible|flammable materials/i },
  { key: "ROUTE_ACCESS", label: "Narrow, blocked or off-road access", criterion: "route accessibility",
    pattern: /makipot|dead-end|baradong|malayo sa kalsada|narrow or blocked road/i },
  { key: "WIND", label: "Strong wind", criterion: "wind",
    pattern: /hangin|gale|fire with wind/i },
  { key: "WEATHER", label: "Extreme heat and dry weather", criterion: "weather conditions",
    pattern: /matinding init|tuyong panahon/i },
  { key: "NEAR_HOUSES", label: "Houses near a grass or forest fire", criterion: "distance to nearest houses",
    pattern: /nearest mapped building \d/i },
];

export function dangerConditionOf(factor) {
  return DANGER_CONDITIONS.find((condition) => condition.pattern.test(String(factor)))?.key ?? null;
}

/**
 * How often each condition appeared among High and Critical incidents. An
 * incident counts once per condition even when several factors name it.
 */
export function summarizeDangerConditions(factorLists) {
  const total = factorLists.length;
  const counts = new Map();
  for (const factors of factorLists) {
    const seen = new Set((Array.isArray(factors) ? factors : []).map(dangerConditionOf).filter(Boolean));
    for (const key of seen) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return DANGER_CONDITIONS
    .map(({ key, label, criterion }) => ({ key, label, criterion, incidents: counts.get(key) ?? 0 }))
    .filter((condition) => condition.incidents > 0)
    .map((condition) => ({ ...condition, share: total ? condition.incidents / total : 0 }))
    .sort((a, b) => b.incidents - a.incidents);
}

/** Change against the previous period in points, for rates already in 0-1. */
export function rateChange(current, previous) {
  if (current == null || previous == null) return null;
  return Math.round((current - previous) * 1000) / 10;
}

/** Value at percentile p (0-1) with linear interpolation, like Postgres percentile_cont. */
export function percentile(values, p) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export const median = (values) => percentile(values, 0.5);

/**
 * The Incident Timeline stages, each measured from the status that ends the
 * stage before it. The first time an incident reaches a status counts.
 */
export const RESPONSE_STAGES = [
  { key: "VERIFY", label: "Submitted → Verified", from: "submittedAt", to: "verifiedAt" },
  { key: "DISPATCH", label: "Verified → Firetruck dispatched", from: "verifiedAt", to: "dispatchedAt" },
  { key: "TRAVEL", label: "Dispatched → Responder arrived", from: "dispatchedAt", to: "arrivedAt" },
  { key: "CONTROL", label: "Arrived → Under control", from: "arrivedAt", to: "controlledAt" },
  { key: "RESOLVE", label: "Under control → Resolved", from: "controlledAt", to: "resolvedAt" },
];

function minutesBetween(from, to) {
  if (!from || !to) return null;
  const minutes = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
}

const round1 = (value) => (value == null ? null : Math.round(value * 10) / 10);

/** Median minutes per stage and from report to arrival, for a set of incident timelines. */
export function summarizeResponseTimes(timelines) {
  const stages = RESPONSE_STAGES.map(({ key, label, from, to }) => {
    const minutes = timelines.map((timeline) => minutesBetween(timeline[from], timeline[to])).filter((value) => value != null);
    return { key, label, medianMinutes: round1(median(minutes)), incidents: minutes.length };
  });
  const arrival = timelines.map((timeline) => minutesBetween(timeline.submittedAt, timeline.arrivedAt)).filter((value) => value != null);
  return {
    stages,
    arrival: {
      medianMinutes: round1(median(arrival)),
      slowestTenthMinutes: round1(percentile(arrival, 0.9)),
      incidents: arrival.length,
    },
  };
}
