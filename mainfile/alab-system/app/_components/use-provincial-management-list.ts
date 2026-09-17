"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReportFilters } from "../../lib/provincial-bfp/management/types";
import { ProvincialRequestError, requestProvincialJson } from "../../lib/provincial-bfp/client-request";

type Filters = Partial<ReportFilters>;
const filterKeys = ["municipalityId", "stationId", "barangayId", "search", "status", "from", "to", "reportSource", "fireType", "severity"] as const;

export function useProvincialManagementList<T>({ endpoint, initialFilters = {}, dataKey = "items" }: {
  endpoint: string; initialFilters?: Filters; dataKey?: string;
}) {
  const defaults = useRef(initialFilters);
  const [filters, updateFilters] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(initialFilters.page || 1);
  const [pageSize, updatePageSize] = useState<25 | 50 | 100>(initialFilters.pageSize || 25);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const hasRows = useRef(false);

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const restored: Record<string, string | number | undefined> = { ...defaults.current };
      for (const key of filterKeys) if (params.has(key)) restored[key] = params.get(key) || undefined;
      updateFilters(restored as Filters);
      const requestedPage = Number(params.get("page") || 1);
      setPage(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
      const size = Number(params.get("pageSize") || 25);
      updatePageSize(size === 50 || size === 100 ? size : 25);
      setReady(true);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  const setFilters = useCallback((next: Filters | ((previous: Filters) => Filters)) => {
    updateFilters(previous => {
      const result = typeof next === "function" ? next(previous) : next;
      if (result.municipalityId !== previous.municipalityId) return { ...result, stationId: undefined, barangayId: undefined };
      return result;
    });
    setPage(1);
  }, []);
  const setFilter = useCallback((key: keyof ReportFilters, value: string) => {
    setFilters(previous => ({ ...previous, [key]: value || undefined }));
  }, [setFilters]);
  const setPageSize = useCallback((size: 25 | 50 | 100) => { updatePageSize(size); setPage(1); }, []);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    const visibleRefresh = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", visibleRefresh);
    const timer = window.setInterval(visibleRefresh, 60000);
    return () => { document.removeEventListener("visibilitychange", visibleRefresh); window.clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const url = new URL(window.location.href);
    for (const key of filterKeys) {
      const value = filters[key];
      url.searchParams.delete(key);
      if (value && value !== "ALL") { params.set(key, value); url.searchParams.set(key, value); }
    }
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    window.history.replaceState(window.history.state, "", url);
    const timer = window.setTimeout(async () => {
      // Only the first load empties the table. A background refresh keeps the
      // rows on screen, so the page does not flash while it re-reads.
      setLoading(!hasRows.current);
      setError(null);
      try {
        const body = await requestProvincialJson<Record<string, unknown> & { items?: T[]; total?: number; updatedAt?: string }>(
          `${endpoint}?${params}`, { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const records = body[dataKey] ?? body.items;
        if (!Array.isArray(records)) throw new Error("The server returned invalid records. Please retry.");
        setItems(records as T[]);
        hasRows.current = (records as T[]).length > 0;
        setTotal(body.total || 0);
        setUpdatedAt(body.updatedAt || new Date().toISOString());
        const lastPage = Math.max(1, Math.ceil((body.total || 0) / pageSize));
        if (page > lastPage) setPage(lastPage);
      } catch (cause) {
        if (!controller.signal.aborted) {
          if (cause instanceof ProvincialRequestError && (cause.status === 401 || cause.status === 403)) {
            setItems([]); hasRows.current = false; setTotal(0); setUpdatedAt(null);
          }
          setError(cause instanceof Error ? cause.message : "Unable to load records.");
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [endpoint, filters, page, pageSize, dataKey, ready, revision]);

  return { items, total, updatedAt, page, pageSize, filters, loading, error, setPage, setPageSize, setFilters, setFilter, refresh };
}
