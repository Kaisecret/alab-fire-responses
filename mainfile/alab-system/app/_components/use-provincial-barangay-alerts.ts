"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BarangayAlert, BarangayResourceCommand } from "../../lib/intermunicipality/barangay-alert-types";

const ENDPOINT = "/api/provincial-bfp/barangay-alerts";
const POLL_INTERVAL_MS = 5_000;
const UPDATE_EVENT = "provincial-barangay-alerts-updated";
// The provincial sidebar listens for this to count open alerts.
const COUNT_EVENT = "provincial-incident-clusters";

function announceCount(count: number) {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(COUNT_EVENT, { detail: count }));
  }
}

export function useProvincialBarangayAlerts() {
  // Protected records live only for this mounted session.
  const [alerts, setAlerts] = useState<BarangayAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const mounted = useRef(true);
  const pollRequest = useRef<AbortController | null>(null);
  const actionRequests = useRef(new Set<AbortController>());

  const refresh = useCallback(async () => {
    if (!mounted.current || document.visibilityState !== "visible" || pollRequest.current || actionRequests.current.size > 0) return;
    const controller = new AbortController();
    pollRequest.current = controller;
    setChecking(true);
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store", signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAlerts([]);
          setLastCheckedAt(null);
          announceCount(0);
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unable to refresh multiple incident alerts.");
      }
      const data = await res.json();
      if (!mounted.current || controller.signal.aborted) return;
      const next: BarangayAlert[] = Array.isArray(data.alerts) ? data.alerts : [];
      setAlerts(next);
      announceCount(next.length);
      setLastCheckedAt(new Date());
      setError("");
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Barangay coordination sync failed.");
      }
    } finally {
      if (pollRequest.current === controller) {
        pollRequest.current = null;
        if (mounted.current) {
          setLoading(false);
          setChecking(false);
        }
      }
    }
  }, []);

  const mutate = useCallback(async (method: "PATCH" | "POST", payload: object) => {
    // A response started before the officer acted cannot undo that action.
    pollRequest.current?.abort();
    pollRequest.current = null;
    const controller = new AbortController();
    actionRequests.current.add(controller);
    let changedSnapshot = false;
    if (mounted.current) setChecking(false);
    try {
      const res = await fetch(ENDPOINT, {
        method, cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!mounted.current || controller.signal.aborted) throw new Error("The request was interrupted.");
      const data = await res.json().catch(() => ({}));
      if (!mounted.current || controller.signal.aborted) throw new Error("The request was interrupted.");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAlerts([]);
          setLastCheckedAt(null);
        }
        changedSnapshot = res.status === 409;
        throw new Error(data.error || "Unable to save barangay coordination.");
      }
      return data;
    } finally {
      actionRequests.current.delete(controller);
      if (changedSnapshot) void refresh();
    }
  }, [refresh]);

  const acknowledge = useCallback(async (alert: BarangayAlert) => {
    const incidentIds = [...alert.incidentIds];
    const data = await mutate("PATCH", { alertId: alert.id, incidentIds });
    if (data.acknowledged !== true) throw new Error("Acknowledgment was not confirmed. Please try again.");
    // Keep the group available for resource coordination. A newly arrived fire
    // remains unacknowledged even if it was polled while PATCH was in flight.
    const snapshot = [...incidentIds].sort().join(",");
    setAlerts(current => current.map(row => row.id === alert.id && [...row.incidentIds].sort().join(",") === snapshot
      ? { ...row, acknowledgedAt: new Date().toISOString() } : row));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(UPDATE_EVENT));
  }, [mutate]);

  const submitCommand = useCallback(async (command: BarangayResourceCommand) => {
    await mutate("POST", command);
    await refresh();
    if (typeof window !== "undefined") window.dispatchEvent(new Event(UPDATE_EVENT));
  }, [mutate, refresh]);

  useEffect(() => {
    mounted.current = true;
    const actions = actionRequests.current;
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
      else {
        pollRequest.current?.abort();
        pollRequest.current = null;
        setChecking(false);
      }
    };
    const onUpdated = () => {
      // A sibling view has just saved; discard polls started before its save.
      pollRequest.current?.abort();
      pollRequest.current = null;
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(UPDATE_EVENT, onUpdated);
    return () => {
      mounted.current = false;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      pollRequest.current?.abort();
      pollRequest.current = null;
      actions.forEach(controller => controller.abort());
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(UPDATE_EVENT, onUpdated);
    };
  }, [refresh]);

  return { alerts, loading, checking, error, lastCheckedAt, refresh, acknowledge, submitCommand };
}
