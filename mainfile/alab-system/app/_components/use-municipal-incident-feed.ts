"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const REFRESH_INTERVAL_MS = 5_000;

export interface MunicipalIncident {
  id: string;
  referenceNumber: string;
  residentName: string | null;
  fireType: string;
  status: string;
  barangay: string | null;
  landmark: string | null;
  submittedAt: string;
  latitude: number;
  longitude: number;
}

interface MunicipalIncidentResponse {
  municipality?: string;
  incidents?: MunicipalIncident[];
  error?: string;
}

export function useMunicipalIncidentFeed() {
  const [municipality, setMunicipality] = useState("");
  const [incidents, setIncidents] = useState<MunicipalIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async (manual = false) => {
    if (inFlight.current) return;

    inFlight.current = true;
    setChecking(true);
    if (manual) setRefreshing(true);

    try {
      const response = await fetch("/api/municipal-bfp/incidents", { cache: "no-store" });
      const payload = (await response.json()) as MunicipalIncidentResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Unable to refresh the incident queue.");
      }

      if (!mounted.current) return;
      setMunicipality(payload.municipality || "");
      setIncidents(payload.incidents || []);
      setError("");
      setLastCheckedAt(new Date());
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
  }, []);

  useEffect(() => {
    mounted.current = true;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    void refresh();
    const timer = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  return { municipality, incidents, loading, checking, refreshing, error, lastCheckedAt, refresh };
}
