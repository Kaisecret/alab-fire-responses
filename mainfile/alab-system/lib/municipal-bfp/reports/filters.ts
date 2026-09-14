import type {
  MunicipalReportFilters,
  MunicipalReportPeriod,
} from "./types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_PAGE_SIZES = new Set([25, 50, 100]);
const ALLOWED_PERIODS = new Set<MunicipalReportPeriod>([
  "THIS_MONTH",
  "THIS_WEEK",
  "LAST_MONTH",
  "THIS_YEAR",
  "CUSTOM",
  "ALL",
]);
const ALLOWED_REPORT_SOURCES = new Set(["ALAB_APP", "PHONE_CALL"]);
const ALLOWED_FIRE_TYPES = new Set(["HOUSE_BUILDING", "GRASS", "FOREST", "VEHICLE", "OTHER"]);
const ALLOWED_SEVERITIES = new Set(["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN"]);
const ALLOWED_STATUSES = new Set([
  "SUBMITTED",
  "PENDING_VERIFICATION",
  "UNDER_VERIFICATION",
  "VERIFIED",
  "CONFIRMED",
  "RESPONDING",
  "FIRETRUCK_DISPATCHED",
  "RESPONDER_ARRIVED",
  "UNDER_CONTROL",
  "RESOLVED",
  "REJECTED",
  "FALSE_REPORT",
  "DUPLICATE",
  "NEEDS_MORE_INFO",
  "CLOSED",
]);

export const CONFIRMED_STATUSES = [
  "CONFIRMED",
  "VERIFIED",
  "RESPONDING",
  "FIRETRUCK_DISPATCHED",
  "RESPONDER_ARRIVED",
  "UNDER_CONTROL",
  "RESOLVED",
  "CLOSED",
] as const;

export const RESOLVED_STATUSES = ["RESOLVED", "CLOSED"] as const;

export const ADMINISTRATIVE_STATUSES = ["FALSE_REPORT", "DUPLICATE", "REJECTED"] as const;

function cleanString(value: unknown, maxLength = 100): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function parseUuid(value: unknown): string | undefined {
  const str = cleanString(value, 1000);
  if (!str) return undefined;
  if (!UUID_REGEX.test(str)) {
    throw new Error("INVALID_UUID");
  }
  return str;
}

function parseDateString(value: unknown): string | undefined {
  const str = cleanString(value, 1000);
  if (!str) return undefined;
  const date = new Date(str);
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(str) ||
    Number.isNaN(date.getTime()) ||
    new Date(str.slice(0, 10)).toISOString().slice(0, 10) !== str.slice(0, 10)
  ) {
    throw new Error("INVALID_DATE");
  }
  return str;
}

function getParam(params: URLSearchParams | Record<string, unknown>, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    const val = params.get(key);
    return val !== null ? val : undefined;
  }
  const raw = params[key];
  if (Array.isArray(raw)) return typeof raw[0] === "string" ? raw[0] : undefined;
  return typeof raw === "string" ? raw : undefined;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function getPhilippineDateParts(date = new Date()): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 for Sun, 1 for Mon...
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);

  let year = 2026;
  let month = 9;
  let day = 14;
  let weekdayStr = "Mon";

  for (const p of parts) {
    if (p.type === "year") year = Number(p.value);
    if (p.type === "month") month = Number(p.value);
    if (p.type === "day") day = Number(p.value);
    if (p.type === "weekday") weekdayStr = p.value;
  }

  const daysMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = daysMap[weekdayStr] ?? 1;

  return { year, month, day, dayOfWeek };
}

export function resolvePeriodDates(
  period: MunicipalReportPeriod = "THIS_MONTH",
  customFrom?: string,
  customTo?: string,
): { from?: string; to?: string } {
  if (period === "ALL") {
    return { from: undefined, to: undefined };
  }

  if (period === "CUSTOM") {
    return { from: customFrom, to: customTo };
  }

  const { year, month, day, dayOfWeek } = getPhilippineDateParts();

  switch (period) {
    case "THIS_MONTH": {
      const from = `${year}-${pad2(month)}-01`;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
      return { from, to };
    }
    case "LAST_MONTH": {
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      const from = `${prevYear}-${pad2(prevMonth)}-01`;
      const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
      const to = `${prevYear}-${pad2(prevMonth)}-${pad2(lastDay)}`;
      return { from, to };
    }
    case "THIS_WEEK": {
      // Monday through Sunday
      // In JS: 0=Sun, 1=Mon, ..., 6=Sat
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mondayDate = new Date(Date.UTC(year, month - 1, day + diffToMonday));
      const sundayDate = new Date(Date.UTC(year, month - 1, day + diffToMonday + 6));

      const from = `${mondayDate.getUTCFullYear()}-${pad2(mondayDate.getUTCMonth() + 1)}-${pad2(mondayDate.getUTCDate())}`;
      const to = `${sundayDate.getUTCFullYear()}-${pad2(sundayDate.getUTCMonth() + 1)}-${pad2(sundayDate.getUTCDate())}`;
      return { from, to };
    }
    case "THIS_YEAR": {
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;
      return { from, to };
    }
    default:
      return { from: undefined, to: undefined };
  }
}

export function parseMunicipalReportFilters(
  rawParams: URLSearchParams | Record<string, unknown>,
): MunicipalReportFilters {
  const pageRaw = getParam(rawParams, "page");
  const pageSizeRaw = getParam(rawParams, "pageSize");

  let page = 1;
  if (pageRaw !== undefined && pageRaw !== "") {
    const parsedPage = Number(pageRaw);
    if (!Number.isSafeInteger(parsedPage) || parsedPage > 21474836 || parsedPage < 1) {
      throw new Error("INVALID_PAGE");
    }
    page = parsedPage;
  }

  let pageSize: 25 | 50 | 100 = 25;
  if (pageSizeRaw !== undefined && pageSizeRaw !== "") {
    const parsedPageSize = Number(pageSizeRaw);
    if (!ALLOWED_PAGE_SIZES.has(parsedPageSize)) {
      throw new Error("INVALID_PAGE_SIZE");
    }
    pageSize = parsedPageSize as 25 | 50 | 100;
  }

  const periodRaw = cleanString(getParam(rawParams, "period"), 20);
  let period: MunicipalReportPeriod | undefined;
  if (periodRaw) {
    if (!ALLOWED_PERIODS.has(periodRaw as MunicipalReportPeriod)) {
      throw new Error("INVALID_PERIOD");
    }
    period = periodRaw as MunicipalReportPeriod;
  }

  let from = parseDateString(getParam(rawParams, "from"));
  let to = parseDateString(getParam(rawParams, "to"));

  if (period && period !== "CUSTOM") {
    const resolved = resolvePeriodDates(period);
    from = resolved.from;
    to = resolved.to;
  } else if (!period && !from && !to) {
    // Default to THIS_MONTH when no period or date parameters are provided
    period = "THIS_MONTH";
    const resolved = resolvePeriodDates("THIS_MONTH");
    from = resolved.from;
    to = resolved.to;
  }

  if (from && to && new Date(from) > new Date(to)) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const barangayId = parseUuid(getParam(rawParams, "barangayId"));
  const search = cleanString(getParam(rawParams, "search"), 100);
  const status = cleanString(getParam(rawParams, "status"), 50);
  if (status && !ALLOWED_STATUSES.has(status)) {
    throw new Error("INVALID_REPORT_STATUS");
  }

  const fireType = cleanString(getParam(rawParams, "fireType"), 50);
  if (fireType && !ALLOWED_FIRE_TYPES.has(fireType)) {
    throw new Error("INVALID_FIRE_TYPE");
  }

  const severity = cleanString(getParam(rawParams, "severity"), 50);
  if (severity && !ALLOWED_SEVERITIES.has(severity)) {
    throw new Error("INVALID_SEVERITY");
  }

  const sourceRaw = getParam(rawParams, "reportSource");
  let reportSource: "ALAB_APP" | "PHONE_CALL" | undefined;
  if (sourceRaw !== undefined && sourceRaw !== "") {
    if (!ALLOWED_REPORT_SOURCES.has(sourceRaw)) {
      throw new Error("INVALID_REPORT_SOURCE");
    }
    reportSource = sourceRaw as "ALAB_APP" | "PHONE_CALL";
  }

  return {
    page,
    pageSize,
    period,
    from,
    to,
    barangayId,
    status,
    fireType,
    severity,
    reportSource,
    search,
  };
}

// Date-only inputs represent whole Philippine calendar days. Timestamp inputs
// preserve their explicit timezone and exact endpoint.
export function dateBoundarySql(parameter: string, value: string, end = false): string {
  return value.length === 10
    ? `((${parameter}::date${end ? " + interval '1 day'" : ""})::timestamp at time zone 'Asia/Manila')`
    : `${parameter}::timestamptz`;
}

export function municipalReportWhere(
  municipalityId: string,
  filters: MunicipalReportFilters,
): { clauses: string[]; values: unknown[] } {
  const clauses: string[] = ["fr.municipality_id = $1"];
  const values: unknown[] = [municipalityId];

  for (const [value, column] of [
    [filters.barangayId, "fr.barangay_id"],
    [filters.status, "fr.status"],
    [filters.reportSource, "fr.report_source"],
    [filters.fireType, "fr.fire_type"],
    [filters.severity, "coalesce(fr.calculated_severity, 'UNKNOWN')"],
  ]) {
    if (value) {
      values.push(value);
      clauses.push(`${column} = $${values.length}`);
    }
  }

  for (const [value, end] of [
    [filters.from, false],
    [filters.to, true],
  ] as const) {
    if (value) {
      values.push(value);
      clauses.push(
        `fr.submitted_at ${end ? (value.length === 10 ? "<" : "<=") : ">="} ${dateBoundarySql(
          `$${values.length}`,
          value,
          end,
        )}`,
      );
    }
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const param = `$${values.length}`;
    clauses.push(
      `(fr.reference_number ilike ${param} or fr.description ilike ${param} or coalesce(b.name, fr.address_label) ilike ${param})`,
    );
  }

  return { clauses, values };
}
