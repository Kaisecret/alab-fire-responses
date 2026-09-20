const READINESS_FILTERS = new Set(["ALL", "RESPONDING", "READY"]);

export function filterMunicipalityReadiness(items, query = "", status = "ALL") {
  if (!Array.isArray(items)) return [];
  const normalizedQuery = String(query).trim().toLocaleLowerCase("en-PH");
  const normalizedStatus = READINESS_FILTERS.has(status) ? status : "ALL";

  return items.filter((item) => {
    const responding = Number(item?.activeIncidentCount) > 0;
    const matchesStatus = normalizedStatus === "ALL"
      || (normalizedStatus === "RESPONDING" ? responding : !responding);
    const matchesQuery = !normalizedQuery
      || String(item?.name ?? "").toLocaleLowerCase("en-PH").includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });
}

export function paginateMunicipalityReadiness(items, page = 1, pageSize = 8) {
  const safeItems = Array.isArray(items) ? items : [];
  const safePageSize = Math.max(1, Math.trunc(Number(pageSize)) || 8);
  const totalPages = Math.max(1, Math.ceil(safeItems.length / safePageSize));
  const visiblePage = Math.min(Math.max(1, Math.trunc(Number(page)) || 1), totalPages);
  const startIndex = (visiblePage - 1) * safePageSize;
  const pageItems = safeItems.slice(startIndex, startIndex + safePageSize);

  return {
    items: pageItems,
    visiblePage,
    totalPages,
    rangeStart: pageItems.length > 0 ? startIndex + 1 : 0,
    rangeEnd: pageItems.length > 0 ? startIndex + pageItems.length : 0,
  };
}

export function summarizeMunicipalityReadiness(items) {
  const safeItems = Array.isArray(items) ? items : [];
  const responding = safeItems.filter(item => Number(item?.activeIncidentCount) > 0).length;
  return { total: safeItems.length, responding, ready: safeItems.length - responding };
}
