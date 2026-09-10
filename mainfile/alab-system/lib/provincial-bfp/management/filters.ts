import type { ManagementFilters, ReportFilters } from "./types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_PAGE_SIZES = new Set([25, 50, 100]);
const ALLOWED_REPORT_SOURCES = new Set(["ALAB_APP", "PHONE_CALL"]);

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
  // Verify date validity
  const date = new Date(str);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(str) || Number.isNaN(date.getTime()) || new Date(str.slice(0, 10)).toISOString().slice(0, 10) !== str.slice(0, 10)) {
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

export function parseManagementFilters(
  rawParams: URLSearchParams | Record<string, unknown>,
): ManagementFilters {
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

  const municipalityId = parseUuid(getParam(rawParams, "municipalityId"));
  const stationId = parseUuid(getParam(rawParams, "stationId"));
  const barangayId = parseUuid(getParam(rawParams, "barangayId"));
  const search = cleanString(getParam(rawParams, "search"), 100);
  const status = cleanString(getParam(rawParams, "status"), 50);
  const from = parseDateString(getParam(rawParams, "from"));
  const to = parseDateString(getParam(rawParams, "to"));

  if (from && to && new Date(from) > new Date(to)) throw new Error("INVALID_DATE_RANGE");

  return {
    municipalityId,
    stationId,
    barangayId,
    search,
    status,
    from,
    to,
    page,
    pageSize,
  };
}

export function parseReportFilters(
  rawParams: URLSearchParams | Record<string, unknown>,
): ReportFilters {
  const base = parseManagementFilters(rawParams);
  const sourceRaw = getParam(rawParams, "reportSource");

  let reportSource: "ALAB_APP" | "PHONE_CALL" | undefined;
  if (sourceRaw !== undefined && sourceRaw !== "") {
    if (!ALLOWED_REPORT_SOURCES.has(sourceRaw)) {
      throw new Error("INVALID_REPORT_SOURCE");
    }
    reportSource = sourceRaw as "ALAB_APP" | "PHONE_CALL";
  }

  const fireType = cleanString(getParam(rawParams, "fireType"), 50);
  const severity = cleanString(getParam(rawParams, "severity"), 50);
  if (fireType && !["HOUSE_BUILDING", "GRASS", "FOREST", "VEHICLE", "OTHER"].includes(fireType)) throw new Error("INVALID_FIRE_TYPE");
  if (severity && !["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN"].includes(severity)) throw new Error("INVALID_SEVERITY");
  if (base.status && !["SUBMITTED", "UNDER_VERIFICATION", "CONFIRMED", "REJECTED", "FALSE_REPORT", "DUPLICATE", "NEEDS_MORE_INFO", "CLOSED", "PENDING_VERIFICATION", "VERIFIED", "RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED", "UNDER_CONTROL", "RESOLVED"].includes(base.status)) throw new Error("INVALID_REPORT_STATUS");


  return {
    ...base,
    reportSource,
    fireType,
    severity,
  };
}

// Date-only inputs represent whole Philippine calendar days. Timestamp inputs
// preserve their explicit timezone and exact endpoint.
export function dateBoundarySql(parameter: string, value: string, end = false): string {
  return value.length === 10
    ? `((${parameter}::date${end ? " + interval '1 day'" : ""})::timestamp at time zone 'Asia/Manila')`
    : `${parameter}::timestamptz`;
}

export function reportWhere(filters: ReportFilters): { clauses: string[]; values: unknown[] } {
  const clauses = ["m.province = 'Antique'"];
  const values: unknown[] = [];
  for (const [value, column] of [
    [filters.municipalityId, "fr.municipality_id"], [filters.barangayId, "fr.barangay_id"],
    [filters.status, "fr.status"], [filters.reportSource, "fr.report_source"],
    [filters.fireType, "fr.fire_type"], [filters.severity, "coalesce(fr.calculated_severity, 'UNKNOWN')"],
  ]) {
    if (value) { values.push(value); clauses.push(`${column} = $${values.length}`); }
  }
  if (filters.stationId) {
    values.push(filters.stationId);
    clauses.push(`exists (select 1 from incident_dispatches fd join incident_dispatch_stations fs on fs.dispatch_id = fd.id where fd.fire_report_id = fr.id and fs.station_id = $${values.length})`);
  }
  for (const [value, end] of [[filters.from, false], [filters.to, true]] as const) {
    if (value) { values.push(value); clauses.push(`fr.submitted_at ${end ? (value.length === 10 ? '<' : '<=') : '>='} ${dateBoundarySql(`$${values.length}`, value, end)}`); }
  }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    const param = `$${values.length}`;
    clauses.push(`(fr.reference_number ilike ${param} or m.name ilike ${param} or fr.description ilike ${param} or exists (select 1 from barangays fb where fb.id = fr.barangay_id and fb.name ilike ${param}))`);
  }
  return { clauses, values };
}
