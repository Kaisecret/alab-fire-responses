"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProvincialIncidentSummary } from "../../lib/intermunicipality/provincial";

export const REFRESH_INTERVAL_MS = 5_000;

export type ProvincialIncidentFeedState = {
  rows: ProvincialIncidentSummary[];
  incidents: ProvincialIncidentSummary[];
  loading: boolean;
  checking: boolean;
  error: string;
  lastCheckedAt: Date | null;
  refresh: (manual?: boolean) => Promise<void>;
};

export function useProvincialIncidentFeed(options: {
  includeHistory?: boolean;
} = {}): ProvincialIncidentFeedState {
  const includeHistory = options.includeHistory ?? false;
  // Keep protected records inside this mounted view, never in a cross-account cache.
  const [rows, setRows] = useState<ProvincialIncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const abortRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const controller = new AbortController();
    abortRequest.current = controller;
    setChecking(true);

    try {
      const url = includeHistory
        ? "/api/provincial-bfp/incidents?scope=all"
        : "/api/provincial-bfp/incidents";
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return;
      if (!res.ok) {
        if (mounted.current && (res.status === 401 || res.status === 403)) {
          setRows([]);
          setLastCheckedAt(null);
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch provincial incidents (${res.status})`);
      }
      const data = await res.json();
      if (!mounted.current || controller.signal.aborted) return;

      const incidentRows: ProvincialIncidentSummary[] = Array.isArray(data.incidents)
        ? data.incidents
        : [];
      setRows(incidentRows);
      setError("");
      setLastCheckedAt(new Date());
    } catch (err) {
      if (!mounted.current || controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Live telemetry sync error.");
    } finally {
      if (mounted.current && !controller.signal.aborted) {
        setLoading(false);
        setChecking(false);
      }
      if (abortRequest.current === controller) inFlight.current = false;
    }
  }, [includeHistory]);

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
      abortRequest.current?.abort();
      inFlight.current = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return {
    rows,
    incidents: rows,
    loading,
    checking,
    error,
    lastCheckedAt,
    refresh,
  };
}
