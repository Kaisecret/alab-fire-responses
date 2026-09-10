"use client";

import { useCallback, useRef } from "react";

/** Reuse an operation key after a failed or interrupted response. */
export function useManagementMutation() {
  const operation = useRef<{ fingerprint: string; requestId: string } | null>(null);
  return useCallback((url: string, init: RequestInit) => {
    const fingerprint = JSON.stringify([url, init.method, init.body]);
    if (operation.current?.fingerprint !== fingerprint) {
      operation.current = { fingerprint, requestId: crypto.randomUUID() };
    }
    const headers = new Headers(init.headers);
    headers.set("x-request-id", operation.current.requestId);
    return fetch(url, { ...init, headers, cache: "no-store" });
  }, []);
}
