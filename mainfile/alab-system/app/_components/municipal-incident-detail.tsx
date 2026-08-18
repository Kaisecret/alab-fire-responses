"use client";

import { useEffect, useState } from "react";
import { MunicipalIncidentMap } from "./municipal-incident-map";
import { BfpDataLoader } from "./bfp-data-loader";
import { fireReportStatusLabels, type FireReportStatus } from "../../lib/fire-reports/types";

type Incident = {
  id: string;
  referenceNumber: string;
  status: FireReportStatus;
  fireType: string;
  description: string;
  landmark: string | null;
  latitude: number;
  longitude: number;
  submittedAt: string;
  responseStartedAt: string | null;
  respondingStationName: string | null;
  residentName: string;
  phone: string;
  reporterIpAddress: string | null;
  reporterDeviceSummary: string | null;
  email: string;
  address: string | null;
  barangay: string;
  municipality: string;
  stationName: string | null;
  stationLatitude: number | null;
  stationLongitude: number | null;
  photos: Array<{ url: string | null }>;
  history: Array<{ status: FireReportStatus; message: string | null; createdAt: string }>;
  previousReports: Array<{ id: string; referenceNumber: string; status: FireReportStatus; submittedAt: string }>;
};

const detailStyles = `
  /* ========== MUNICIPAL INCIDENT DETAIL STYLES ========== */
  .mbfp-detail-shell {
    padding: 10px 1.5rem 2.5rem;
    max-width: 1640px;
    margin: 0 auto;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0F172A;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #EEF5FD;
    min-height: 100%;
  }

  /* Top Navigation & Breadcrumbs */
  .mbfp-detail-top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    margin-bottom: 0.25rem;
    flex-wrap: wrap;
  }

  .mbfp-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 1rem;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    color: #334155;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }

  .mbfp-back-btn:hover {
    background: #F8FAFC;
    border-color: #CBD5E1;
    color: #0F172A;
    transform: translateX(-2px);
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
  }

  .mbfp-telemetry-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.74rem;
    font-weight: 700;
    color: #059669;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 0.28rem 0.75rem;
    border-radius: 999px;
  }

  .mbfp-telemetry-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #059669;
    animation: mbfpTelPulse 1.8s infinite;
  }

  @keyframes mbfpTelPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.4; }
  }

  /* Incident Hero Command Banner */
  .mbfp-incident-hero {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    padding: 1.15rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.25rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
    flex-wrap: wrap;
  }

  .mbfp-hero-left {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .mbfp-hero-meta-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .mbfp-hero-ref-tag {
    font-family: 'JetBrains Mono', monospace, sans-serif;
    font-size: 0.8rem;
    font-weight: 800;
    color: #475569;
    background: #F1F5F9;
    padding: 0.22rem 0.6rem;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
  }

  .mbfp-hero-firetype-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: #FFF1F2;
    border: 1px solid #FECDD3;
    color: #E11D48;
    font-size: 0.74rem;
    font-weight: 800;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .mbfp-hero-title {
    font-size: clamp(1.4rem, 2vw, 1.8rem);
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.03em;
    line-height: 1.15;
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .mbfp-hero-time {
    font-size: 0.8rem;
    color: #64748B;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  /* Response Trigger Button */
  .mbfp-respond-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.75rem 1.45rem;
    border: none;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 850;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.28);
    color: #FFFFFF;
    background: #DC2626;
  }

  .mbfp-respond-btn:hover:not(:disabled) {
    background: #B91C1C;
    transform: translateY(-1.5px);
    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
  }

  .mbfp-respond-btn.active-responding {
    background: #059669;
    box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28);
    cursor: default;
  }

  .mbfp-respond-btn:disabled {
    opacity: 0.85;
  }

  /* 2-Column Tactical Layout Grid (Exact Provincial Spacing) */
  .mbfp-tactical-grid {
    display: grid;
    grid-template-columns: 1.15fr 0.95fr;
    gap: 10px;
    align-items: start;
  }

  /* Card Containers */
  .mbfp-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    padding: 1.15rem 1.35rem;
    margin-bottom: 10px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
  }

  .mbfp-card:last-child {
    margin-bottom: 0;
  }

  .mbfp-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.85rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #F1F5F9;
  }

  .mbfp-card-title {
    font-size: 1.05rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    letter-spacing: -0.02em;
  }

  .mbfp-card-title i {
    color: #DC2626;
  }

  /* Resident Profile Data Grid (Strictly 8px Spacing) */
  .mbfp-profile-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .mbfp-data-cell {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .mbfp-data-label {
    font-size: 0.7rem;
    font-weight: 800;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-data-value {
    font-size: 0.88rem;
    font-weight: 700;
    color: #0F172A;
    word-break: break-word;
  }

  .mbfp-phone-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #2563EB;
    font-weight: 800;
    text-decoration: none;
    transition: color 0.18s;
  }

  .mbfp-phone-link:hover {
    color: #1D4ED8;
    text-decoration: underline;
  }

  /* Incident Details Description Block */
  .mbfp-desc-box {
    background: #F8FAFC;
    border-left: 3.5px solid #DC2626;
    border-radius: 4px 10px 10px 4px;
    padding: 0.85rem 1.05rem;
    font-size: 0.88rem;
    line-height: 1.55;
    color: #334155;
    font-weight: 500;
    margin: 0;
  }

  /* Photo Evidence Card & Lightbox Trigger */
  .mbfp-photo-showcase {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid #E2E8F0;
    max-height: 320px;
    background: #0F172A;
  }

  .mbfp-photo-img {
    width: 100%;
    height: 100%;
    max-height: 320px;
    object-fit: cover;
    display: block;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s;
  }

  .mbfp-photo-showcase:hover .mbfp-photo-img {
    transform: scale(1.03);
    opacity: 0.9;
  }

  .mbfp-photo-overlay-badge {
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    color: #FFFFFF;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .mbfp-photo-click-hint {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    background: rgba(220, 38, 38, 0.9);
    backdrop-filter: blur(8px);
    color: #FFFFFF;
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  /* Response Timeline / History */
  .mbfp-timeline {
    list-style: none;
    padding: 0;
    margin: 0;
    position: relative;
  }

  .mbfp-timeline::before {
    content: '';
    position: absolute;
    top: 8px;
    bottom: 8px;
    left: 11px;
    width: 2px;
    background: #E2E8F0;
  }

  .mbfp-timeline-item {
    position: relative;
    padding-left: 2rem;
    margin-bottom: 8px;
  }

  .mbfp-timeline-item:last-child {
    margin-bottom: 0;
  }

  .mbfp-timeline-node {
    position: absolute;
    left: 5px;
    top: 3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 3px solid #DC2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
  }

  .mbfp-timeline-content {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
  }

  .mbfp-timeline-title {
    font-size: 0.84rem;
    font-weight: 800;
    color: #0F172A;
  }

  .mbfp-timeline-meta {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 600;
  }

  /* Right Column: Route Map Card */
  .mbfp-map-card-wrapper {
    position: sticky;
    top: 1rem;
  }

  .mbfp-route-stats-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 0.75rem 0.95rem;
    margin-top: 8px;
  }

  .mbfp-route-icon-box {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: #EFF6FF;
    color: #2563EB;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    flex-shrink: 0;
  }

  .mbfp-route-text-val {
    font-size: 0.82rem;
    font-weight: 700;
    color: #1E293B;
    line-height: 1.4;
  }

  /* Mission Loading State Skeleton */
  .mbfp-loading-shell {
    padding: 3rem 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }

  .mbfp-radar-scanner {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: #FFF1F2;
    border: 2px solid #FECDD3;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 1.5rem;
    box-shadow: 0 0 0 8px rgba(220, 38, 38, 0.08);
  }

  .mbfp-radar-inner-icon {
    font-size: 2.2rem;
    color: #DC2626;
    animation: mbfpRadarPulse 1.8s ease-in-out infinite;
  }

  .mbfp-radar-beam {
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #DC2626;
    animation: mbfpSpin 1.2s linear infinite;
  }

  @keyframes mbfpRadarPulse {
    0%, 100% { transform: scale(0.92); opacity: 0.9; }
    50% { transform: scale(1.08); opacity: 1; }
  }

  .mbfp-loading-title {
    font-size: 1.25rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0 0 0.45rem;
  }

  .mbfp-loading-subtext {
    font-size: 0.86rem;
    color: #64748B;
    font-weight: 500;
    margin: 0;
  }

  /* PHOTO LIGHTBOX MODAL POPUP */
  .mbfp-lightbox-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(12px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    animation: mbfpLightboxFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes mbfpLightboxFadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  .mbfp-lightbox-modal {
    background: #1E293B;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    max-width: 960px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.7);
    animation: mbfpModalZoom 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes mbfpModalZoom {
    0% { transform: scale(0.95) translateY(10px); }
    100% { transform: scale(1) translateY(0); }
  }

  .mbfp-lightbox-header {
    padding: 1rem 1.35rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: #FFFFFF;
  }

  .mbfp-lightbox-title {
    font-size: 0.95rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
  }

  .mbfp-lightbox-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #FFFFFF;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.18s ease;
  }

  .mbfp-lightbox-close-btn:hover {
    background: #DC2626;
  }

  .mbfp-lightbox-body {
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0F172A;
    overflow: auto;
    max-height: calc(90vh - 120px);
  }

  .mbfp-lightbox-body img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  }

  .mbfp-lightbox-footer {
    padding: 0.85rem 1.35rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #94A3B8;
    font-size: 0.8rem;
    background: #1E293B;
  }

  .mbfp-lightbox-open-external {
    color: #60A5FA;
    font-weight: 700;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-lightbox-open-external:hover {
    text-decoration: underline;
  }

  /* Responsive Adjustments */
  @media (max-width: 992px) {
    .mbfp-tactical-grid {
      grid-template-columns: 1fr;
    }
    .mbfp-map-card-wrapper {
      position: static;
    }
  }

  @media (max-width: 640px) {
    .mbfp-detail-shell {
      padding: 1rem 0.85rem 2.5rem;
    }
    .mbfp-profile-grid {
      grid-template-columns: 1fr;
    }
    .mbfp-respond-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;

export function MunicipalIncidentDetail({
  incidentId,
  onBack,
  onResponded,
}: {
  incidentId: string;
  onBack?: () => void;
  onResponded?: () => void;
}) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/municipal-bfp/incidents/${incidentId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load incident");
      setIncident(data.incident);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load incident.");
    }
  };

  useEffect(() => {
    load();
  }, [incidentId]);

  const respond = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/municipal-bfp/incidents/${incidentId}/respond`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start response");
      await load();
      onResponded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start response.");
    } finally {
      setSending(false);
    }
  };

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (error) {
    return (
      <>
        <style>{detailStyles}</style>
        <div className="mbfp-detail-shell">
          <div className="mbfp-detail-top-nav">
            {onBack && (
              <button className="mbfp-back-btn" onClick={onBack}>
                <i className="fa-solid fa-arrow-left" />
                <span>Back to Incident Queue</span>
              </button>
            )}
          </div>
          <div className="mbfp-card" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
            <p style={{ color: "#991B1B", fontWeight: 700, margin: 0 }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: "0.5rem" }} />
              {error}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Polished Mission Control Loading State (Attached In-Card BFP Fire Loader)
  if (!incident) {
    return (
      <>
        <style>{detailStyles}</style>
        <main className="mbfp-detail-shell">
          <div className="mbfp-card" style={{ padding: "3rem 1.5rem" }}>
            <BfpDataLoader
              theme="municipal"
              size="lg"
              title="Accessing Live Incident Telemetry…"
              subtitle="Connecting to municipal station GPS, caller verification, and tactical road routing."
              minHeight="340px"
            />
          </div>
        </main>
      </>
    );
  }

  const isResponding = incident.status === "RESPONDING";
  const evidencePhoto = incident.photos.find((p) => p.url)?.url;

  return (
    <>
      <style>{detailStyles}</style>
      <main className="mbfp-detail-shell">
        {/* Top Navigation Row */}
        <div className="mbfp-detail-top-nav">
          {onBack ? (
            <button className="mbfp-back-btn" onClick={onBack}>
              <i className="fa-solid fa-arrow-left" />
              <span>Back to Active Incidents</span>
            </button>
          ) : (
            <div />
          )}

          <div className="mbfp-telemetry-badge">
            <span className="mbfp-telemetry-dot" />
            <span>Live Incident Stream · {incident.barangay}, {incident.municipality}</span>
          </div>
        </div>

        {/* Hero Command Banner */}
        <header className="mbfp-incident-hero">
          <div className="mbfp-hero-left">
            <div className="mbfp-hero-meta-row">
              <span className="mbfp-hero-ref-tag">{incident.referenceNumber}</span>
              <span className="mbfp-hero-firetype-pill">
                <i className="fa-solid fa-fire" />
                <span>{incident.fireType.replaceAll("_", " ")}</span>
              </span>
            </div>
            <h1 className="mbfp-hero-title">
              <i className="fa-solid fa-tower-broadcast" style={{ color: "#DC2626", fontSize: "1.5rem" }} />
              <span>{fireReportStatusLabels[incident.status] || incident.status}</span>
            </h1>
            <div className="mbfp-hero-time">
              <i className="fa-regular fa-clock" />
              <span>Reported at {new Date(incident.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} on {new Date(incident.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <button
            className={`mbfp-respond-btn ${isResponding ? "active-responding" : ""}`}
            disabled={sending || isResponding}
            onClick={respond}
            aria-label="Acknowledge and initiate BFP response"
          >
            {sending ? (
              <>
                <i className="fa-solid fa-arrows-rotate spin" />
                <span>Dispatching Response…</span>
              </>
            ) : isResponding ? (
              <>
                <i className="fa-solid fa-truck-fast" />
                <span>BFP CURRENTLY RESPONDING</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-bell" />
                <span>ACKNOWLEDGE &amp; RESPOND</span>
              </>
            )}
          </button>
        </header>

        {/* Tactical 2-Column Grid */}
        <div className="mbfp-tactical-grid">
          {/* Left Column: Data & Photos */}
          <div>
            {/* Resident Profile Card */}
            <section className="mbfp-card" aria-labelledby="mbfp-resident-heading">
              <div className="mbfp-card-header">
                <h2 id="mbfp-resident-heading" className="mbfp-card-title">
                  <i className="fa-solid fa-id-card" />
                  <span>Resident emergency profile</span>
                </h2>
              </div>

              <div className="mbfp-profile-grid">
                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-regular fa-user" /> Resident Name
                  </span>
                  <span className="mbfp-data-value">{incident.residentName || "Anonymous Resident"}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-phone" /> Direct Contact
                  </span>
                  <span className="mbfp-data-value">
                    <a href={`tel:${incident.phone}`} className="mbfp-phone-link">
                      <i className="fa-solid fa-phone-volume" />
                      <span>{incident.phone || "No phone provided"}</span>
                    </a>
                  </span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-regular fa-map" /> Registered Address
                  </span>
                  <span className="mbfp-data-value">{incident.address || "Not specified"}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-location-dot" /> Reported Location
                  </span>
                  <span className="mbfp-data-value">{incident.barangay}, {incident.municipality}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-signs-post" /> Nearest Landmark
                  </span>
                  <span className="mbfp-data-value">{incident.landmark || "None provided by caller"}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-regular fa-clock" /> Verified Timestamp
                  </span>
                  <span className="mbfp-data-value">{new Date(incident.submittedAt).toLocaleString()}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-crosshairs" /> GPS coordinates
                  </span>
                  <span className="mbfp-data-value">{incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-network-wired" /> Public IP address
                  </span>
                  <span className="mbfp-data-value">{incident.reporterIpAddress || "Unavailable"}</span>
                </div>

                <div className="mbfp-data-cell">
                  <span className="mbfp-data-label">
                    <i className="fa-solid fa-mobile-screen-button" /> Device / browser
                  </span>
                  <span className="mbfp-data-value">{incident.reporterDeviceSummary || "Unavailable"}</span>
                </div>
              </div>
            </section>

            {/* Incident Details / Situation Report */}
            <section className="mbfp-card" aria-labelledby="mbfp-details-heading">
              <div className="mbfp-card-header">
                <h2 id="mbfp-details-heading" className="mbfp-card-title">
                  <i className="fa-solid fa-file-waveform" />
                  <span>Situation Report &amp; Description</span>
                </h2>
              </div>
              <p className="mbfp-desc-box">
                {incident.description || "No written description provided with initial transmission."}
              </p>
            </section>

            {/* Photo Evidence Section with Lightbox */}
            {evidencePhoto && (
              <section className="mbfp-card" aria-labelledby="mbfp-photo-heading">
                <div className="mbfp-card-header">
                  <h2 id="mbfp-photo-heading" className="mbfp-card-title">
                    <i className="fa-solid fa-camera" />
                    <span>Attached Evidence Photo</span>
                  </h2>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B" }}>
                    1 Photo Attached
                  </span>
                </div>

                <div
                  className="mbfp-photo-showcase"
                  onClick={() => setSelectedPhoto(evidencePhoto)}
                  role="button"
                  tabIndex={0}
                  aria-label="Click to enlarge photo evidence"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedPhoto(evidencePhoto);
                  }}
                >
                  <span className="mbfp-photo-click-hint">
                    <i className="fa-solid fa-magnifying-glass-plus" /> Click To Enlarge
                  </span>
                  <img
                    src={evidencePhoto}
                    alt="Resident fire evidence submission"
                    className="mbfp-photo-img"
                  />
                  <div className="mbfp-photo-overlay-badge">
                    <i className="fa-solid fa-expand" />
                    <span>Inspect High-Res Photo Evidence</span>
                  </div>
                </div>
              </section>
            )}

            {/* Timeline / Response History */}
            <section className="mbfp-card" aria-labelledby="mbfp-history-heading">
              <div className="mbfp-card-header">
                <h2 id="mbfp-history-heading" className="mbfp-card-title">
                  <i className="fa-solid fa-timeline" />
                  <span>Response History &amp; Status Logs</span>
                </h2>
              </div>

              <ol className="mbfp-timeline">
                {incident.history && incident.history.length > 0 ? (
                  incident.history.map((item, index) => (
                    <li key={`${item.createdAt}-${index}`} className="mbfp-timeline-item">
                      <span className="mbfp-timeline-node" />
                      <div className="mbfp-timeline-content">
                        <span className="mbfp-timeline-title">
                          {fireReportStatusLabels[item.status] || item.status}
                        </span>
                        <span className="mbfp-timeline-meta">
                          {new Date(item.createdAt).toLocaleString()} · {item.message || "Status updated in operational queue"}
                        </span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="mbfp-timeline-item">
                    <span className="mbfp-timeline-node" />
                    <div className="mbfp-timeline-content">
                      <span className="mbfp-timeline-title">Report Received</span>
                      <span className="mbfp-timeline-meta">
                        {new Date(incident.submittedAt).toLocaleString()} · Initial emergency report logged
                      </span>
                    </div>
                  </li>
                )}
              </ol>
            </section>
          </div>

          {/* Right Column: Live Route Map */}
          <div className="mbfp-map-card-wrapper">
            <section className="mbfp-card" aria-labelledby="mbfp-map-heading">
              <div className="mbfp-card-header">
                <h2 id="mbfp-map-heading" className="mbfp-card-title">
                  <i className="fa-solid fa-map-location-dot" />
                  <span>Tactical Route &amp; GIS Map</span>
                </h2>
              </div>

              <MunicipalIncidentMap incident={incident} />
            </section>
          </div>
        </div>
      </main>

      {/* Full Photo Evidence Lightbox Modal Popup */}
      {selectedPhoto && (
        <div
          className="mbfp-lightbox-backdrop"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged photo evidence modal"
        >
          <div className="mbfp-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <header className="mbfp-lightbox-header">
              <h3 className="mbfp-lightbox-title">
                <i className="fa-solid fa-image" style={{ color: "#DC2626" }} />
                <span>Incident Photo Evidence — {incident.referenceNumber}</span>
              </h3>
              <button
                className="mbfp-lightbox-close-btn"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Close photo modal"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </header>

            <div className="mbfp-lightbox-body">
              <img src={selectedPhoto} alt="Enlarged resident fire report evidence" />
            </div>

            <footer className="mbfp-lightbox-footer">
              <span>
                <i className="fa-solid fa-camera" style={{ marginRight: "0.4rem" }} />
                Uploaded by resident ({incident.residentName}) at {new Date(incident.submittedAt).toLocaleTimeString()}
              </span>
              <a
                href={selectedPhoto}
                target="_blank"
                rel="noreferrer"
                className="mbfp-lightbox-open-external"
              >
                <span>Open Original in New Tab</span>
                <i className="fa-solid fa-arrow-up-right-from-square" />
              </a>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
