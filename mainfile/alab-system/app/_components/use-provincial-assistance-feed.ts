"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProvincialAssistanceRequest } from "../../lib/intermunicipality/provincial";

export const REFRESH_INTERVAL_MS = 5_000;

export type ProvincialAssistanceFeedState = {
  rows: ProvincialAssistanceRequest[];
  assistanceRequests: ProvincialAssistanceRequest[];
  requests: ProvincialAssistanceRequest[];
  loading: boolean;
  checking: boolean;
  isRefreshing: boolean;
  error: string;
  lastCheckedAt: Date | null;
  lastUpdated: Date | null;
  refresh: (manual?: boolean) => Promise<void>;
};

interface FeedCache {
  assistanceRequests: ProvincialAssistanceRequest[];
  timestamp: number;
}

const FEED_CACHE_KEY = "alab_provincial_assistance_feed_cache";
const memoryFeedCache: Record<string, FeedCache> = {};

function getCachedFeed(key: string): FeedCache | null {
  if (memoryFeedCache[key]) return memoryFeedCache[key];
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`${FEED_CACHE_KEY}_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored) as FeedCache;
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          memoryFeedCache[key] = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return null;
}

function setCachedFeed(key: string, assistanceRequests: ProvincialAssistanceRequest[]) {
  const cacheObj: FeedCache = { assistanceRequests, timestamp: Date.now() };
  memoryFeedCache[key] = cacheObj;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`${FEED_CACHE_KEY}_${key}`, JSON.stringify(cacheObj));
    } catch {}
  }
}

export function useProvincialAssistanceFeed(options: {
  includeClosed?: boolean;
} = {}): ProvincialAssistanceFeedState {
  const includeClosed = options.includeClosed ?? false;
  const cacheKey = includeClosed ? "all" : "active";

  const [rows, setRows] = useState<ProvincialAssistanceRequest[]>(() => {
    return getCachedFeed(cacheKey)?.assistanceRequests || [];
  });
  const [loading, setLoading] = useState(() => {
    return !getCachedFeed(cacheKey);
  });
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(() => {
    const cached = getCachedFeed(cacheKey);
    return cached ? new Date(cached.timestamp) : null;
  });
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async (manual = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (manual) {
      setChecking(true);
    } else {
      setChecking(true);
    }

    try {
      const url = includeClosed
        ? "/api/provincial-bfp/assistance-requests?scope=all"
        : "/api/provincial-bfp/assistance-requests";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch assistance requests (${res.status})`);
      }
      const data = await res.json();
      if (!mounted.current) return;

      const requestRows: ProvincialAssistanceRequest[] = Array.isArray(data.assistanceRequests)
        ? data.assistanceRequests
        : [];
      setRows(requestRows);
      setCachedFeed(cacheKey, requestRows);
      setError("");
      setLastCheckedAt(new Date());
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : "Live assistance sync error.");
    } finally {
      if (mounted.current) {
        setLoading(false);
        setChecking(false);
      }
      inFlight.current = false;
    }
  }, [includeClosed, cacheKey]);

  useEffect(() => {
    mounted.current = true;
    const initialTimer = setTimeout(() => {
      void refresh();
    }, 0);

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            void refresh();
          }
        }, REFRESH_INTERVAL_MS);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined") {
        if (document.visibilityState === "visible") {
          void refresh();
          startPolling();
        } else {
          stopPolling();
        }
      }
    };

    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      startPolling();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      mounted.current = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return {
    rows,
    assistanceRequests: rows,
    requests: rows,
    loading,
    checking,
    isRefreshing: checking,
    error,
    lastCheckedAt,
    lastUpdated: lastCheckedAt,
    refresh,
  };
}
