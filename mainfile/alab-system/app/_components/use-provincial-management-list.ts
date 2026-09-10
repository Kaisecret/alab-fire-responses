"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReportFilters } from "../../lib/provincial-bfp/management/types";

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
    window.addEventListener("focus", visibleRefresh);
    const timer = window.setInterval(visibleRefresh, 60000);
    return () => { document.removeEventListener("visibilitychange", visibleRefresh); window.removeEventListener("focus", visibleRefresh); window.clearInterval(timer); };
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
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${endpoint}?${params}`, { signal: controller.signal, cache: "no-store" });
        if (controller.signal.aborted) return;
        if (res.status === 401 || res.status === 403) { setItems([]); setTotal(0); setUpdatedAt(null); }
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Unable to load records. Please retry.");
        if (controller.signal.aborted) return;
        setItems(body[dataKey] || body.items || []);
        setTotal(body.total || 0);
        setUpdatedAt(body.updatedAt || new Date().toISOString());
        const lastPage = Math.max(1, Math.ceil((body.total || 0) / pageSize));
        if (page > lastPage) setPage(lastPage);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load records.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [endpoint, filters, page, pageSize, dataKey, ready, revision]);

  return { items, total, updatedAt, page, pageSize, filters, loading, error, setPage, setPageSize, setFilters, setFilter, refresh };
}
