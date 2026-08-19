"use client";

import { useEffect, useMemo, useState } from "react";

import type { MunicipalIncident } from "./use-municipal-incident-feed";

type HistoryEvent = { status: string; message: string | null; createdAt: string };
type IncidentDetail = {
  id: string;
  referenceNumber: string;
  status: string;
  fireType: string;
  description: string | null;
  landmark: string | null;
  latitude: number;
  longitude: number;
  submittedAt: string;
  responseStartedAt: string | null;
  respondingStationName: string | null;
  residentName: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  address: string | null;
  barangay: string | null;
  municipality: string | null;
  photos: Array<{ url: string | null }>;
  history: HistoryEvent[];
};

const terminalStatuses = new Set(["RESOLVED", "CLOSED", "REJECTED", "FALSE_REPORT", "DUPLICATE"]);

function humanize(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.toLowerCase().split("_").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function MunicipalGisIncidentModal({ incidents, onClose }: { incidents: MunicipalIncident[]; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState(incidents[0]?.id ?? "");
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedSummary = useMemo(() => incidents.find((incident) => incident.id === selectedId) ?? incidents[0], [incidents, selectedId]);

  useEffect(() => {
    setSelectedId(incidents[0]?.id ?? "");
  }, [incidents]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setDetail(null);
    void (async () => {
      try {
        const response = await fetch(`/api/municipal-bfp/incidents/${selectedId}`, { cache: "no-store", signal: controller.signal });
        const payload = (await response.json()) as { incident?: IncidentDetail; error?: string };
        if (!response.ok) throw new Error(payload.error || "Unable to load incident details.");
        setDetail(payload.incident ?? null);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load incident details.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedId]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const completion = detail?.history.slice().reverse().find((event) => terminalStatuses.has(event.status));
  const incident = detail ?? selectedSummary;

  return (
    <div className="mbfp-gis-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="mbfp-gis-modal" role="dialog" aria-modal="true" aria-labelledby="municipal-gis-incident-title">
        <header className="mbfp-gis-modal-header">
          <div>
            <p className="mbfp-gis-modal-kicker">Municipality-secured incident record</p>
            <h2 id="municipal-gis-incident-title">{incidents.length > 1 ? `${incidents.length} reports at this location` : "Incident details"}</h2>
          </div>
          <button className="mbfp-gis-modal-close" type="button" onClick={onClose} aria-label="Close incident details"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        </header>

        {incidents.length > 1 && (
          <div className="mbfp-gis-modal-selector" aria-label="Reports at this reported location">
            {incidents.map((candidate) => (
              <button key={candidate.id} type="button" className={candidate.id === selectedId ? "is-selected" : ""} onClick={() => setSelectedId(candidate.id)}>
                <strong>{candidate.referenceNumber}</strong><span>{humanize(candidate.status)} · {formatDate(candidate.submittedAt)}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? <div className="mbfp-gis-modal-loading" role="status">Loading protected incident record…</div> : error ? <p className="mbfp-gis-modal-error" role="alert">{error}</p> : detail && (
          <div className="mbfp-gis-modal-body">
            <section className="mbfp-gis-modal-hero">
              <span className="mbfp-gis-modal-fire"><i className="fa-solid fa-fire" aria-hidden="true" /></span>
              <div><strong>{detail.referenceNumber}</strong><span className={`mbfp-gis-status status-${detail.status.toLowerCase()}`}>{humanize(detail.status)}</span></div>
              <p>Reported {formatDate(detail.submittedAt)}</p>
            </section>

            <div className="mbfp-gis-facts">
              <article><span>Resident</span><strong>{detail.residentName || [detail.firstName, detail.lastName].filter(Boolean).join(" ") || "Not recorded"}</strong></article>
              <article><span>Direct contact</span><strong>{detail.phone || "Not recorded"}</strong></article>
              <article><span>Reported location</span><strong>{[detail.barangay, detail.municipality].filter(Boolean).join(", ") || "Not recorded"}</strong></article>
              <article><span>Nearest landmark</span><strong>{detail.landmark || "Not recorded"}</strong></article>
              <article><span>GPS coordinates</span><strong>{Number.isFinite(detail.latitude) ? `${detail.latitude.toFixed(6)}, ${detail.longitude.toFixed(6)}` : "Not recorded"}</strong></article>
              <article><span>Fire classification</span><strong>{humanize(detail.fireType)}</strong></article>
              <article><span>Response started</span><strong>{formatDate(detail.responseStartedAt)}</strong></article>
              <article><span>Completed / closed</span><strong>{completion ? formatDate(completion.createdAt) : "Not completed"}</strong></article>
            </div>

            <section className="mbfp-gis-modal-section"><h3>Reported cause / description</h3><p>{detail.description || "No resident description was provided. This is a resident report, not a confirmed fire-cause assessment."}</p></section>

            <section className="mbfp-gis-modal-section"><h3>Status timeline</h3><ol className="mbfp-gis-timeline">{detail.history.length ? detail.history.map((event, index) => <li key={`${event.status}-${event.createdAt}-${index}`}><span /><div><strong>{humanize(event.status)}</strong><small>{formatDate(event.createdAt)}</small>{event.message && <p>{event.message}</p>}</div></li>) : <li><span /><div><strong>{humanize(detail.status)}</strong><small>{formatDate(detail.submittedAt)}</small></div></li>}</ol></section>

            {detail.photos.some((photo) => photo.url) && <section className="mbfp-gis-modal-section"><h3>Incident photo</h3><div className="mbfp-gis-photo-grid">{detail.photos.filter((photo) => photo.url).map((photo, index) => <a key={photo.url} href={photo.url!} target="_blank" rel="noreferrer" className="mbfp-gis-photo-link"><img src={photo.url!} alt={`Incident evidence ${index + 1}`} /><span>View incident photo <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></span></a>)}</div></section>}
          </div>
        )}
      </section>
    </div>
  );
}
