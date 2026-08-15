'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

type MunicipalStationStatus = {
  name: string;
  status: 'READY' | 'RESPONDING' | 'MUTUAL_AID' | 'STANDBY';
  activeIncidents: number;
  availableTrucks: number;
  totalTrucks: number;
  dutyResponders: number;
};

const municipalReadinessData: MunicipalStationStatus[] = [
  { name: 'San Jose de Buenavista', status: 'RESPONDING', activeIncidents: 1, availableTrucks: 4, totalTrucks: 5, dutyResponders: 16 },
  { name: 'Sibalom', status: 'RESPONDING', activeIncidents: 1, availableTrucks: 2, totalTrucks: 3, dutyResponders: 12 },
  { name: 'Tibiao', status: 'RESPONDING', activeIncidents: 1, availableTrucks: 1, totalTrucks: 2, dutyResponders: 9 },
  { name: 'Hamtic', status: 'MUTUAL_AID', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 10 },
  { name: 'Bugasong', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 8 },
  { name: 'Pandan', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 10 },
  { name: 'Culasi', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 11 },
  { name: 'Barbaza', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 2, dutyResponders: 8 },
  { name: 'Tobias Fornier', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 9 },
  { name: 'Patnongon', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 8 },
  { name: 'Anini-y', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 7 },
  { name: 'Belison', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 6 },
  { name: 'Caluya', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 8 },
  { name: 'Laua-an', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 7 },
  { name: 'Libertad', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 7 },
  { name: 'San Remigio', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 8 },
  { name: 'Sebaste', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 6 },
  { name: 'Valderrama', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 7 },
];

const dashboardStyles = `
  .pbfp-dash-clean {
    padding: 10px 1.5rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #EEF5FD;
    min-height: 100%;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  /* ========== 4 PASTEL KPI METRIC CARDS ROW ========== */
  .pbfp-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .pbfp-kpi-box {
    position: relative;
    border-radius: 14px;
    padding: 0.85rem 0.95rem 0.75rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    animation: pbfpCardReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-kpi-box:nth-child(1) { animation-delay: 0.05s; }
  .pbfp-kpi-box:nth-child(2) { animation-delay: 0.1s; }
  .pbfp-kpi-box:nth-child(3) { animation-delay: 0.15s; }
  .pbfp-kpi-box:nth-child(4) { animation-delay: 0.2s; }

  /* Distinct Pastel Gradient Themes */
  .pbfp-kpi-box.red {
    background: linear-gradient(145deg, #FFE8E8 0%, #FFD6D6 100%);
    border: 1.5px solid #FFBEBE;
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.06);
  }
  .pbfp-kpi-box.amber {
    background: linear-gradient(145deg, #FFF5DE 0%, #FFE8BA 100%);
    border: 1.5px solid #FFDC99;
    box-shadow: 0 4px 16px rgba(217, 119, 6, 0.06);
  }
  .pbfp-kpi-box.blue {
    background: linear-gradient(145deg, #E6EFFF 0%, #D2E3FD 100%);
    border: 1.5px solid #B8D3FD;
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.06);
  }
  .pbfp-kpi-box.purple {
    background: linear-gradient(145deg, #F0E8FF 0%, #E2D3FD 100%);
    border: 1.5px solid #D0BCFD;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.06);
  }

  /* Hover Lift & Refined Shadow */
  .pbfp-kpi-box:hover {
    transform: translateY(-3px);
  }
  .pbfp-kpi-box.red:hover {
    border-color: #FFA3A3;
    box-shadow: 0 10px 22px -4px rgba(226, 54, 50, 0.2);
  }
  .pbfp-kpi-box.amber:hover {
    border-color: #FFCF70;
    box-shadow: 0 10px 22px -4px rgba(217, 119, 6, 0.2);
  }
  .pbfp-kpi-box.blue:hover {
    border-color: #91B8FA;
    box-shadow: 0 10px 22px -4px rgba(37, 99, 235, 0.2);
  }
  .pbfp-kpi-box.purple:hover {
    border-color: #B79BFB;
    box-shadow: 0 10px 22px -4px rgba(124, 58, 237, 0.2);
  }

  .pbfp-kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    margin-bottom: 0.45rem;
  }

  /* Pure White Squircle Icon Wrapper */
  .pbfp-kpi-badge-icon {
    width: 2.35rem;
    height: 2.35rem;
    border-radius: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
  }

  .pbfp-kpi-box:hover .pbfp-kpi-badge-icon {
    transform: scale(1.08);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  }

  .pbfp-kpi-badge-icon.red { color: #E23632; }
  .pbfp-kpi-badge-icon.amber { color: #D97706; }
  .pbfp-kpi-badge-icon.blue { color: #2563EB; }
  .pbfp-kpi-badge-icon.purple { color: #7C3AED; }

  .pbfp-kpi-badge-img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  /* Pure White Trend/Status Pill Badge */
  .pbfp-kpi-trend-tag {
    font-size: 0.62rem;
    font-weight: 700;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  }

  .pbfp-kpi-trend-tag.red { color: #E23632; border: 1px solid #FFCDCD; }
  .pbfp-kpi-trend-tag.amber { color: #D97706; border: 1px solid #FFE0A3; }
  .pbfp-kpi-trend-tag.blue { color: #2563EB; border: 1px solid #BFD7FE; }
  .pbfp-kpi-trend-tag.purple { color: #7C3AED; border: 1px solid #D5C4FE; }

  .pbfp-kpi-body {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
  }

  .pbfp-kpi-label {
    font-size: 0.74rem;
    font-weight: 700;
    color: #1E293B;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pbfp-kpi-number {
    font-size: 1.6rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.05;
    letter-spacing: -0.02em;
  }

  .pbfp-kpi-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.55rem;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    font-size: 0.7rem;
    font-weight: 600;
  }

  .pbfp-kpi-box.red .pbfp-kpi-footer { color: #DC2626; border-top-color: #FED7D7; }
  .pbfp-kpi-box.amber .pbfp-kpi-footer { color: #D97706; border-top-color: #FEEBC8; }
  .pbfp-kpi-box.blue .pbfp-kpi-footer { color: #2563EB; border-top-color: #DCE7FC; }
  .pbfp-kpi-box.purple .pbfp-kpi-footer { color: #7C3AED; border-top-color: #E9D8FD; }

  .pbfp-kpi-footer-subtext {
    font-weight: 600;
    opacity: 0.9;
  }

  .pbfp-kpi-footer i {
    font-size: 0.72rem;
    transition: transform 0.2s ease;
  }

  .pbfp-kpi-box:hover .pbfp-kpi-footer i {
    transform: translateX(3px);
  }

  /* ========== TWO COLUMN SECTION ========== */
  .pbfp-main-grid {
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    gap: 10px;
    align-items: stretch;
  }

  /* LEFT CARD: MUNICIPAL READINESS TABLE */
  .pbfp-table-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    animation: pbfpCardReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-card-header {
    padding: 1.1rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid #F1F5F9;
  }

  .pbfp-card-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pbfp-card-header-icon-badge {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: #FFF1F2;
    border: 1px solid #FFE4E6;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .pbfp-card-header-icon-img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  .pbfp-card-title-group {
    display: flex;
    flex-direction: column;
  }

  .pbfp-card-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    line-height: 1.2;
  }

  .pbfp-card-subtitle {
    font-size: 0.76rem;
    color: #64748B;
    font-weight: 600;
    margin-top: 2px;
  }

  .pbfp-search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 999px;
    padding: 0.42rem 0.95rem;
    width: 200px;
    transition: border-color 0.15s, background 0.15s;
  }

  .pbfp-search-box:focus-within {
    border-color: #E23632;
    background: #FFFFFF;
  }

  .pbfp-search-box i {
    color: #94A3B8;
    font-size: 0.8rem;
  }

  .pbfp-search-input {
    border: none;
    outline: none;
    font-size: 0.8rem;
    width: 100%;
    background: transparent;
    color: #0F172A;
    font-weight: 600;
    font-family: inherit;
  }

  .pbfp-search-input::placeholder {
    color: #94A3B8;
    font-weight: 500;
  }

  /* NO-SCROLL Table styling with auto-fitting columns */
  .pbfp-table-container {
    width: 100%;
    overflow: hidden;
  }

  .pbfp-clean-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    table-layout: auto;
  }

  .pbfp-clean-table th {
    background: #FFFFFF;
    color: #64748B;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.8rem 0.9rem;
    text-align: left;
    border-bottom: 1px solid #F1F5F9;
    white-space: nowrap;
  }

  .pbfp-clean-table td {
    padding: 0.8rem 0.9rem;
    border-bottom: 1px solid #F8FAFC;
    color: #0F172A;
    font-weight: 500;
    vertical-align: middle;
    white-space: nowrap;
  }

  .pbfp-clean-table tr:hover td {
    background: #FAFAFA;
  }

  .pbfp-muni-bold {
    font-weight: 700;
    color: #0F172A;
    font-size: 0.84rem;
  }

  /* Status Badges */
  .pbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .pbfp-status-pill.responding {
    background: #FFF1F2;
    color: #E23632;
    border: 1px solid #FFE4E6;
  }

  .pbfp-status-pill.mutual-aid {
    background: #FFFBEB;
    color: #D97706;
    border: 1px solid #FEF3C7;
  }

  .pbfp-status-pill.ready {
    background: #ECFDF5;
    color: #059669;
    border: 1px solid #D1FAE5;
  }

  .pbfp-incidents-count {
    font-weight: 800;
    color: #E23632;
  }

  .pbfp-incidents-zero {
    color: #94A3B8;
    font-weight: 500;
  }

  /* Table Pagination Footer */
  .pbfp-table-footer {
    padding: 0.8rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #F1F5F9;
    font-size: 0.78rem;
    color: #475569;
    font-weight: 600;
    background: #FFFFFF;
  }

  .pbfp-pagination {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-page-btn {
    min-width: 28px;
    height: 28px;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    background: #FFFFFF;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s;
  }

  .pbfp-page-btn:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #CBD5E1;
  }

  .pbfp-page-btn.active {
    border-color: #E23632;
    background: #FFF1F2;
    color: #E23632;
    font-weight: 800;
  }

  .pbfp-page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* RIGHT CARD: ACTIVE INCIDENTS */
  .pbfp-incidents-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
    padding: 1.15rem 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    height: 100%;
    animation: pbfpCardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-incidents-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.2rem;
  }

  .pbfp-incidents-title {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-incidents-title i {
    color: #E23632;
    font-size: 1rem;
  }

  .pbfp-view-all-link {
    font-size: 0.8rem;
    font-weight: 700;
    color: #E23632;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    transition: opacity 0.15s;
  }

  .pbfp-view-all-link:hover {
    opacity: 0.8;
  }

  .pbfp-incidents-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    justify-content: space-between;
  }

  .pbfp-incident-box {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1.05rem 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.45rem;
    flex: 1;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s;
  }

  .pbfp-incident-box:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 26px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.06);
    border-color: #CBD5E1;
  }

  .pbfp-incident-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .pbfp-incident-name {
    font-size: 0.88rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-alarm-pill {
    color: #FFFFFF;
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }

  .pbfp-alarm-pill.red {
    background: #E23632;
  }

  .pbfp-alarm-pill.orange {
    background: #D97706;
  }

  .pbfp-incident-desc {
    font-size: 0.78rem;
    color: #475569;
    font-weight: 500;
    line-height: 1.45;
  }

  .pbfp-incident-bottom-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.73rem;
    color: #64748B;
    padding-top: 0.45rem;
    border-top: 1px solid #F8FAFC;
  }

  .pbfp-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-meta-item i {
    color: #94A3B8;
    font-size: 0.75rem;
  }

  .pbfp-meta-item i.fa-location-dot {
    color: #E23632;
  }

  @media (max-width: 1200px) {
    .pbfp-kpi-row {
      grid-template-columns: repeat(2, 1fr);
    }
    .pbfp-main-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .pbfp-dash-clean {
      padding: 0.9rem;
      gap: 0.9rem;
    }
    .pbfp-kpi-row {
      grid-template-columns: 1fr;
    }
  }

  @keyframes pbfpCardReveal {
    0% {
      opacity: 0;
      transform: translateY(16px) scale(0.97);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

function FastNumber({ value, duration = 650 }: { value: string | number; duration?: number }) {
  const [display, setDisplay] = useState<string>(() => {
    if (typeof value === 'number') return '0';
    return String(value).replace(/\d+/g, '0');
  });

  useEffect(() => {
    let startTimestamp: number | null = null;
    const strVal = String(value);
    const matches = strVal.match(/\d+/g);
    if (!matches) {
      return;
    }

    const targets = matches.map(Number);
    let frameId: number;

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const progress = Math.min((now - startTimestamp) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      let matchIndex = 0;
      const currentText = strVal.replace(/\d+/g, () => {
        const target = targets[matchIndex];
        const current = Math.round(target * ease);
        matchIndex++;
        return String(current);
      });

      setDisplay(currentText);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplay(strVal);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <span>{String(value).match(/\d+/g) ? display : String(value)}</span>;
}

export function ProvincialBfpDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredStations = municipalReadinessData.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStations.length / pageSize) || 1;
  const paginatedStations = filteredStations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="pbfp-dash-clean">
        {/* ===== 4 PASTEL STAT CARDS ROW ===== */}
        <section className="pbfp-kpi-row" aria-label="Provincial KPI Metrics">
          {/* Card 1: Active Incidents */}
          <Link href="/provincial-bfp/incidents" className="pbfp-kpi-box red">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon red">
                <img
                  src="/images/fire logo.webp"
                  alt="Fire Icon"
                  className="pbfp-kpi-badge-img"
                />
              </div>
              <span className="pbfp-kpi-trend-tag red">
                <i className="fa-solid fa-triangle-exclamation" /> Priority
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Active Province Incidents</span>
              <span className="pbfp-kpi-number"><FastNumber value={3} /></span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Live Operations</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          {/* Card 2: Municipal Stations Online */}
          <Link href="/provincial-bfp/municipal-status" className="pbfp-kpi-box amber">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon amber">
                <i className="fa-solid fa-building" />
              </div>
              <span className="pbfp-kpi-trend-tag amber">
                <i className="fa-solid fa-circle-check" /> 100% Online
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Municipal Stations Online</span>
              <span className="pbfp-kpi-number"><FastNumber value="18 / 18" /></span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">All Stations Connected</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          {/* Card 3: Total Fire Trucks */}
          <Link href="/provincial-bfp/firetrucks-stations" className="pbfp-kpi-box blue">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon blue">
                <i className="fa-solid fa-truck" />
              </div>
              <span className="pbfp-kpi-trend-tag blue">
                <i className="fa-solid fa-shield-halved" /> Fleet Ready
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Total Fire Trucks</span>
              <span className="pbfp-kpi-number"><FastNumber value={42} /></span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Fleet Assets Total</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          {/* Card 4: Assistance Requests */}
          <Link href="/provincial-bfp/assistance-requests" className="pbfp-kpi-box purple">
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon purple">
                <i className="fa-solid fa-handshake" />
              </div>
              <span className="pbfp-kpi-trend-tag purple">
                <i className="fa-solid fa-tower-broadcast" /> Mutual Aid
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Assistance Requests</span>
              <span className="pbfp-kpi-number"><FastNumber value={1} /></span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Inter-Station Link</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>
        </section>

        {/* ===== TWO-COLUMN MAIN SECTION ===== */}
        <div className="pbfp-main-grid">
          {/* LEFT: Municipal Readiness Table (No Side Scroll + Page Size 8) */}
          <section className="pbfp-table-card">
            <div className="pbfp-card-header">
              <div className="pbfp-card-header-left">
                <div className="pbfp-card-header-icon-badge">
                  <img
                    src="/images/fire logo.webp"
                    alt="Fire Logo"
                    className="pbfp-card-header-icon-img"
                  />
                </div>
                <div className="pbfp-card-title-group">
                  <h2 className="pbfp-card-title">Municipal Readiness</h2>
                  <span className="pbfp-card-subtitle">
                    Station Status ({filteredStations.length} Municipalities)
                  </span>
                </div>
              </div>
              <div className="pbfp-search-box">
                <i className="fa-solid fa-magnifying-glass" />
                <input
                  type="text"
                  placeholder="Search municipality…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pbfp-search-input"
                  aria-label="Search municipality"
                />
              </div>
            </div>

            <div className="pbfp-table-container">
              <table className="pbfp-clean-table">
                <thead>
                  <tr>
                    <th>MUNICIPALITY</th>
                    <th>STATUS</th>
                    <th>INCIDENTS</th>
                    <th>TRUCKS READY</th>
                    <th>DUTY RESPONDERS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStations.map((station) => (
                    <tr key={station.name}>
                      <td className="pbfp-muni-bold">{station.name}</td>
                      <td>
                        {station.status === 'RESPONDING' && (
                          <span className="pbfp-status-pill responding">
                            <i className="fa-solid fa-fire" /> RESPONDING
                          </span>
                        )}
                        {station.status === 'MUTUAL_AID' && (
                          <span className="pbfp-status-pill mutual-aid">
                            <i className="fa-solid fa-handshake" /> MUTUAL AID
                          </span>
                        )}
                        {station.status === 'READY' && (
                          <span className="pbfp-status-pill ready">
                            <i className="fa-solid fa-check" /> READY
                          </span>
                        )}
                      </td>
                      <td>
                        {station.activeIncidents > 0 ? (
                          <span className="pbfp-incidents-count">{station.activeIncidents} Active</span>
                        ) : (
                          <span className="pbfp-incidents-zero">0</span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#0F172A' }}>{station.availableTrucks}</strong>
                        <span style={{ color: '#94A3B8' }}> / {station.totalTrucks}</span>
                      </td>
                      <td>
                        <span style={{ color: '#0F172A', fontWeight: 600 }}>{station.dutyResponders} crew</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Clean Pagination Footer */}
            <div className="pbfp-table-footer">
              <span>
                Showing <strong>{paginatedStations.length}</strong> of <strong>{filteredStations.length}</strong> municipalities
              </span>
              <div className="pbfp-pagination">
                <button
                  type="button"
                  className="pbfp-page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <i className="fa-solid fa-chevron-left" />
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`pbfp-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="pbfp-page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT: Active Incidents Card */}
          <section className="pbfp-incidents-card">
            <div className="pbfp-incidents-header">
              <div className="pbfp-incidents-title">
                <i className="fa-solid fa-triangle-exclamation" />
                <span>Active Incidents</span>
              </div>
              <Link href="/provincial-bfp/incidents" prefetch={true} className="pbfp-view-all-link">
                View All &rarr;
              </Link>
            </div>

            <div className="pbfp-incidents-list">
              {/* Incident 1: San Jose */}
              <div className="pbfp-incident-box">
                <div className="pbfp-incident-header">
                  <span className="pbfp-incident-name">Brgy. Funda-Dalipe, San Jose</span>
                  <span className="pbfp-alarm-pill red">2nd Alarm</span>
                </div>
                <p className="pbfp-incident-desc">
                  Commercial structure fire near trade center. 3 engines deployed, mutual aid requested.
                </p>
                <div className="pbfp-incident-bottom-meta">
                  <span className="pbfp-meta-item">
                    <i className="fa-solid fa-location-dot" /> Assigned: San Jose BFP Station
                  </span>
                  <span className="pbfp-meta-item">
                    <i className="fa-regular fa-clock" /> Reported: 24m ago
                  </span>
                </div>
              </div>

              {/* Incident 2: Sibalom */}
              <div className="pbfp-incident-box">
                <div className="pbfp-incident-header">
                  <span className="pbfp-incident-name">Brgy. Bari, Sibalom</span>
                  <span className="pbfp-alarm-pill red">1st Alarm</span>
                </div>
                <p className="pbfp-incident-desc">
                  Residential fire response underway. Tanker reinforcement en route.
                </p>
                <div className="pbfp-incident-bottom-meta">
                  <span className="pbfp-meta-item">
                    <i className="fa-solid fa-location-dot" /> Assigned: Sibalom BFP Station
                  </span>
                  <span className="pbfp-meta-item">
                    <i className="fa-regular fa-clock" /> Reported: 48m ago
                  </span>
                </div>
              </div>

              {/* Incident 3: Tibiao */}
              <div className="pbfp-incident-box">
                <div className="pbfp-incident-header">
                  <span className="pbfp-incident-name">Brgy. Alegre, Tibiao</span>
                  <span className="pbfp-alarm-pill orange">Under Control</span>
                </div>
                <p className="pbfp-incident-desc">
                  Grass fire near highway. Overhauling operations in progress.
                </p>
                <div className="pbfp-incident-bottom-meta">
                  <span className="pbfp-meta-item">
                    <i className="fa-solid fa-location-dot" /> Assigned: Tibiao BFP Station
                  </span>
                  <span className="pbfp-meta-item">
                    <i className="fa-regular fa-clock" /> Reported: 1h 15m ago
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
