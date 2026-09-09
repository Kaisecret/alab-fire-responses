"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const REFRESH_INTERVAL_MS = 5_000;

export interface MunicipalIncident {
  id: string;
  referenceNumber: string;
  reportSource: "ALAB_APP" | "PHONE_CALL";
  residentName: string | null;
  fireType: string;
  status: string;
  barangay: string | null;
  landmark: string | null;
  submittedAt: string;
  latitude: number;
  longitude: number;
  calculatedSeverity: string | null;
  detectedBuildingDensity?: string | null;
  buildingDensityConfidence?: string | null;
  buildingDensityBuildingCount?: number | null;
  buildingDensityMinimumGapMeters?: number | null;
  accessScope: "ORIGIN" | "OBSERVER";
  originMunicipality: string;
}

interface MunicipalIncidentResponse {
  municipality?: string;
  incidents?: MunicipalIncident[];
  error?: string;
}

interface MunicipalIncidentFeedOptions {
  includeHistory?: boolean;
  autoRefresh?: boolean;
}

interface IncidentFeedCache {
  municipality: string;
  incidents: MunicipalIncident[];
  timestamp: number;
}

const FEED_CACHE_KEY = "alab_incident_feed_cache";
const memoryFeedCache: Record<string, IncidentFeedCache> = {};

function getCachedFeed(key: string): IncidentFeedCache | null {
  if (memoryFeedCache[key]) {
    return memoryFeedCache[key];
  }
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`${FEED_CACHE_KEY}_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored) as IncidentFeedCache;
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          const normalizedIncidents: MunicipalIncident[] = (parsed.incidents || []).map((inc) => ({
            ...inc,
            accessScope: inc.accessScope === "OBSERVER" ? "OBSERVER" : "ORIGIN",
            originMunicipality: inc.originMunicipality || parsed.municipality || "",
          }));
          const normalizedCache: IncidentFeedCache = {
            ...parsed,
            incidents: normalizedIncidents,
          };
          memoryFeedCache[key] = normalizedCache;
          return normalizedCache;
        }
      }
    } catch {}
  }
  return null;
}

function setCachedFeed(key: string, data: { municipality: string; incidents: MunicipalIncident[] }) {
  const cacheObj: IncidentFeedCache = {
    ...data,
    timestamp: Date.now(),
  };
  memoryFeedCache[key] = cacheObj;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`${FEED_CACHE_KEY}_${key}`, JSON.stringify(cacheObj));
    } catch {}
  }
}

export function useMunicipalIncidentFeed({ includeHistory = false, autoRefresh = true }: MunicipalIncidentFeedOptions = {}) {
  const cacheKey = includeHistory ? "all" : "active";
  const initialCache = useRef<IncidentFeedCache | null>(null);
  if (initialCache.current === null) {
    initialCache.current = getCachedFeed(cacheKey);
  }

  const [municipality, setMunicipality] = useState(initialCache.current?.municipality || "");
  const [incidents, setIncidents] = useState<MunicipalIncident[]>(initialCache.current?.incidents || []);
  const [loading, setLoading] = useState(!initialCache.current);
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(
    initialCache.current ? new Date(initialCache.current.timestamp) : null
  );
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async (manual = false) => {
    if (inFlight.current) return;

    inFlight.current = true;
    setChecking(true);
    if (manual) setRefreshing(true);

    try {
      const response = includeHistory
        ? await fetch("/api/municipal-bfp/incidents?scope=all", { cache: "no-store" })
        : await fetch("/api/municipal-bfp/incidents", { cache: "no-store" });
      const payload = (await response.json()) as MunicipalIncidentResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Unable to refresh the incident queue.");
      }

      if (!mounted.current) return;
      const newMuni = payload.municipality || "";
      const rawIncs = payload.incidents || [];
      const newIncs: MunicipalIncident[] = rawIncs.map((inc) => ({
        ...inc,
        accessScope: inc.accessScope === "OBSERVER" ? "OBSERVER" : "ORIGIN",
        originMunicipality: inc.originMunicipality || newMuni,
      }));
      setMunicipality(newMuni);
      setIncidents(newIncs);
      setError("");
      setLastCheckedAt(new Date());
      setCachedFeed(cacheKey, { municipality: newMuni, incidents: newIncs });
    } catch (caught) {
      if (mounted.current) {
        setError(caught instanceof Error ? caught.message : "Unable to refresh the incident queue.");
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setChecking(false);
        setRefreshing(false);
      }
      inFlight.current = false;
    }
  }, [includeHistory, cacheKey]);

  useEffect(() => {
    mounted.current = true;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    if (!autoRefresh) {
      return () => {
        mounted.current = false;
        window.clearTimeout(initialRefresh);
      };
    }
    const timer = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      mounted.current = false;
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [autoRefresh, refresh]);

  return { municipality, incidents, loading, checking, refreshing, error, lastCheckedAt, refresh };
}
