"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type { ProvincialWaterSourceRegistry, WaterSource } from "../../lib/water-sources/types";

const styles = `
  .prov-water { padding: 1.5rem clamp(1rem, 2vw, 2rem) 3rem; color: #172033; font-family: 'Plus Jakarta Sans', sans-serif; }
  .prov-water * { box-sizing: border-box; }
  .prov-water__header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1.25rem; }
  .prov-water__eyebrow { margin: 0 0 .4rem; color: #b42318; font-size: .7rem; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }
  .prov-water h1 { margin: 0; font-size: clamp(1.45rem, 2vw, 2rem); letter-spacing: -.035em; }
  .prov-water__badge { display: inline-flex; align-items: center; gap: .45rem; min-height: 40px; padding: .55rem .75rem; border: 1px solid #d0d5dd; border-radius: 9px; background: #fff; color: #475467; font-size: .75rem; font-weight: 800; white-space: nowrap; }

  /* ========== 4 CLEAN BFP KPI METRIC CARDS (PASTEL GRADIENT STYLE) ========== */
  .pbfp-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .pbfp-kpi-box {
    position: relative;
    border-radius: 11px;
    padding: 0.72rem 0.95rem 0.62rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    min-height: 98px;
  }
  .pbfp-kpi-box.red, .pbfp-kpi-box.is-red {
    background: linear-gradient(145deg, #FFE8E8 0%, #FFD6D6 100%);
    border: 1.5px solid #FFBEBE;
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.06);
  }
  .pbfp-kpi-box.blue, .pbfp-kpi-box.is-blue {
    background: linear-gradient(145deg, #E6EFFF 0%, #D2E3FD 100%);
    border: 1.5px solid #B8D3FD;
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.06);
  }
  .pbfp-kpi-box.purple, .pbfp-kpi-box.is-slate {
    background: linear-gradient(145deg, #F0E8FF 0%, #E2D3FD 100%);
    border: 1.5px solid #D0BCFD;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.06);
  }
  .pbfp-kpi-box.emerald, .pbfp-kpi-box.is-teal {
    background: linear-gradient(145deg, #E6FBF0 0%, #D1F7E2 100%);
    border: 1.5px solid #A7F3D0;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.06);
  }
  .pbfp-kpi-box:hover { transform: translateY(-2.5px); }
  .pbfp-kpi-box.red:hover, .pbfp-kpi-box.is-red:hover { border-color: #FFA3A3; box-shadow: 0 10px 22px -4px rgba(226, 54, 50, 0.2); }
  .pbfp-kpi-box.blue:hover, .pbfp-kpi-box.is-blue:hover { border-color: #91B8FA; box-shadow: 0 10px 22px -4px rgba(37, 99, 235, 0.2); }
  .pbfp-kpi-box.purple:hover, .pbfp-kpi-box.is-slate:hover { border-color: #B79BFB; box-shadow: 0 10px 22px -4px rgba(124, 58, 237, 0.2); }
  .pbfp-kpi-box.emerald:hover, .pbfp-kpi-box.is-teal:hover { border-color: #6EE7B7; box-shadow: 0 10px 22px -4px rgba(16, 185, 129, 0.2); }

  .pbfp-kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    margin-bottom: 0.25rem;
  }
  .pbfp-kpi-badge-icon {
    width: 1.95rem;
    height: 1.95rem;
    border-radius: 8px;
    background: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.95);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.88rem;
    flex-shrink: 0;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pbfp-kpi-box:hover .pbfp-kpi-badge-icon { transform: scale(1.06); }
  .pbfp-kpi-badge-icon.red, .pbfp-kpi-box.is-red .pbfp-kpi-badge-icon { color: #E23632; }
  .pbfp-kpi-badge-icon.blue, .pbfp-kpi-box.is-blue .pbfp-kpi-badge-icon { color: #2563EB; }
  .pbfp-kpi-badge-icon.purple, .pbfp-kpi-box.is-slate .pbfp-kpi-badge-icon { color: #7C3AED; }
  .pbfp-kpi-badge-icon.emerald, .pbfp-kpi-box.is-teal .pbfp-kpi-badge-icon { color: #059669; }

  .pbfp-kpi-trend-tag {
    font-size: 0.58rem;
    font-weight: 800;
    padding: 0.14rem 0.42rem;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    gap: 0.22rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .pbfp-kpi-trend-tag.red { color: #991B1B; background: #FDE8E8; }
  .pbfp-kpi-trend-tag.blue { color: #1E40AF; background: #DBEAFE; }
  .pbfp-kpi-trend-tag.purple { color: #5B21B6; background: #EDE9FE; }
  .pbfp-kpi-trend-tag.emerald { color: #065F46; background: #D1FAE5; }

  .pbfp-kpi-body {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
    margin: 0.08rem 0;
  }
  .pbfp-kpi-label {
    order: 2;
    font-size: 0.63rem;
    font-weight: 750;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pbfp-kpi-number {
    order: 1;
    font-size: 1.45rem;
    font-weight: 850;
    color: #0F172A;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .pbfp-kpi-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.35rem;
    padding-top: 0.32rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    font-size: 0.65rem;
    font-weight: 600;
  }
  .pbfp-kpi-box.red .pbfp-kpi-footer, .pbfp-kpi-box.is-red .pbfp-kpi-footer { color: #DC2626; border-top-color: #FED7D7; }
  .pbfp-kpi-box.blue .pbfp-kpi-footer, .pbfp-kpi-box.is-blue .pbfp-kpi-footer { color: #2563EB; border-top-color: #DCE7FC; }
  .pbfp-kpi-box.purple .pbfp-kpi-footer, .pbfp-kpi-box.is-slate .pbfp-kpi-footer { color: #7C3AED; border-top-color: #E9D8FD; }
  .pbfp-kpi-box.emerald .pbfp-kpi-footer, .pbfp-kpi-box.is-teal .pbfp-kpi-footer { color: #059669; border-top-color: #A7F3D0; }

  .pbfp-kpi-footer-subtext {
    font-weight: 600;
    opacity: 0.9;
  }
  .pbfp-kpi-footer i {
    font-size: 0.64rem;
    transition: transform 0.2s ease;
  }
  .pbfp-kpi-box:hover .pbfp-kpi-footer i {
    transform: translateX(3px);
  }

  /* Toolbar */
  .prov-water__toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; margin: 1.25rem 0 .85rem; }
  .prov-water__search-box { position: relative; width: min(380px, 100%); display: flex; align-items: center; }
  .prov-water__search-icon { position: absolute; left: .9rem; color: #98a2b3; font-size: .82rem; pointer-events: none; }
  .prov-water__search { min-height: 44px; width: 100%; padding: .7rem .85rem .7rem 2.35rem; border: 1px solid #d0d5dd; border-radius: 9px; background: #fff; color: #172033; font: inherit; font-size: .82rem; }
  .prov-water__filter-group { display: flex; flex-wrap: wrap; align-items: center; gap: .55rem; }
  .prov-water__filter-label { display: inline-flex; align-items: center; gap: .35rem; color: #475467; font-size: .78rem; font-weight: 750; }
  .prov-water__select { min-height: 44px; min-width: 240px; padding: .65rem 2.2rem .65rem .85rem; border: 1px solid #d0d5dd; border-radius: 9px; background: #fff; color: #172033; font: inherit; font-size: .82rem; font-weight: 650; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E"); background-position: right .75rem center; background-repeat: no-repeat; background-size: 1.15rem; }
  .prov-water__count-badge { display: inline-flex; align-items: center; gap: .45rem; min-height: 44px; padding: .55rem .85rem; border: 1px solid #d0d5dd; border-radius: 9px; background: #fff; color: #475467; font-size: .76rem; font-weight: 800; white-space: nowrap; }

  /* Water Cards Grid */
  .water-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(285px, 1fr)); gap: calc(.75rem + 5px); }
  .water-card { appearance: none; width: 100%; padding: 0; text-align: left; font: inherit; display: flex; flex-direction: column; min-height: 250px; color: inherit; background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; overflow: hidden; transition: border-color .18s, transform .18s, box-shadow .18s; position: relative; }
  .water-card:hover { border-color: #84c7c3; transform: translateY(-2px); box-shadow: 0 10px 28px rgba(15,23,42,.08); }
  .water-card:focus-visible { outline: 3px solid rgba(37,99,235,.35); outline-offset: 2px; }
  .water-card__main { display: flex; flex: 1; flex-direction: column; color: inherit; text-decoration: none; }
  .water-card__main:focus-visible { outline: 3px solid rgba(37,99,235,.35); outline-offset: -3px; }

  .water-card__head { display: flex; align-items: center; gap: .75rem; padding: 1rem; background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: #fff; cursor: pointer; }
  .water-card.is-other .water-card__head { background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); }
  .water-card__icon { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; border-radius: 10px; background: rgba(255,255,255,.18); font-size: 1.15rem; }
  .water-card__head-info { min-width: 0; flex: 1; }
  .water-card__title { margin: 0; font-size: .88rem; font-weight: 800; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
  .water-card__station { margin: .18rem 0 0; font-size: .7rem; opacity: .9; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .water-card__body { display: grid; gap: .55rem; padding: 1rem; flex: 1; cursor: pointer; }
  .water-card__row { display: flex; justify-content: space-between; gap: .75rem; font-size: .76rem; }
  .water-card__row span { color: #667085; }
  .water-card__row strong { text-align: right; font-weight: 750; color: #1e293b; }
  .water-card__origin { display: inline-flex; width: max-content; border-radius: 999px; background: #f1f5f9; color: #475569; padding: .22rem .55rem; font-size: .65rem; font-weight: 750; margin-top: .15rem; }

  /* 2 Action Buttons in Footer: 1st Go to map, 2nd Edit coordinates */
  .water-card__footer { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; padding: .65rem .85rem; background: #fafbfd; border-top: 1px solid #f1f5f9; }
  .water-card__btn { min-height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: .42rem; border-radius: 8px; font: inherit; font-size: .74rem; font-weight: 800; text-decoration: none; cursor: pointer; transition: all .18s; padding: .4rem .65rem; }
  .water-card__btn--map { background: #f0fdf4; color: #15803d; border: 1.5px solid #bbf7d0; }
  .water-card__btn--map:hover { background: #16a34a; color: #fff; border-color: #16a34a; transform: translateY(-1px); }
  .water-card__btn--edit { background: #f0fdfa; color: #0f766e; border: 1.5px solid #99f6e4; }
  .water-card__btn--edit:hover { background: #0f766e; color: #fff; border-color: #0f766e; transform: translateY(-1px); }

  .prov-water__empty { padding: 3.5rem 1rem; border: 1px dashed #d0d5dd; border-radius: 12px; background: #fff; color: #667085; text-align: center; font-size: .85rem; }

  /* Modal Dialog */
  .prov-water__backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1rem; background: rgba(15,23,42,.62); backdrop-filter: blur(2px); }
  .prov-water__dialog { width: min(620px, 100%); max-height: calc(100vh - 2rem); overflow: auto; border: 1px solid #e4e7ec; border-radius: 14px; background: #fff; box-shadow: 0 28px 90px rgba(15,23,42,.3); }
  .prov-water__dialog-head { display: flex; justify-content: space-between; gap: 1rem; padding: 1.2rem 1.25rem; border-bottom: 1px solid #e4e7ec; }
  .prov-water__dialog-head h2 { margin: .2rem 0 0; font-size: 1.05rem; line-height: 1.4; }
  .prov-water__dialog-head p { margin: 0; color: #0f766e; font-size: .7rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
  .prov-water__close { width: 44px; height: 44px; flex: 0 0 44px; border: 0; border-radius: 9px; background: #f2f4f7; color: #344054; cursor: pointer; }
  .prov-water__facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: .65rem; padding: 1rem 1.25rem; border-bottom: 1px solid #e4e7ec; }
  .prov-water__fact { padding: .75rem; border-radius: 9px; background: #f8fafc; }
  .prov-water__fact span { display: block; margin-bottom: .25rem; color: #667085; font-size: .66rem; font-weight: 700; }
  .prov-water__fact strong { display: block; font-size: .76rem; line-height: 1.4; word-break: break-word; }
  .prov-water__dialog form { padding: 1.2rem 1.25rem; }
  .prov-water__form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .85rem; }
  .prov-water__field { display: grid; gap: .35rem; }
  .prov-water__field label { color: #344054; font-size: .73rem; font-weight: 800; }
  .prov-water__field input { min-height: 44px; border: 1px solid #d0d5dd; border-radius: 8px; padding: .65rem .75rem; font: inherit; font-size: .82rem; }
  .prov-water__help { margin: .75rem 0 0; color: #667085; font-size: .72rem; line-height: 1.5; }
  .prov-water__error { margin: .75rem 0 0; color: #b42318; font-size: .76rem; font-weight: 750; }
  .prov-water__actions { display: flex; justify-content: flex-end; gap: .6rem; margin-top: 1rem; }
  .prov-water__action { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: .45rem; border: 1px solid #d0d5dd; border-radius: 9px; padding: .65rem 1rem; background: #fff; color: #344054; text-decoration: none; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }
  .prov-water__action--map { border-color: #bbf7d0; background: #f0fdf4; color: #15803d; }
  .prov-water__action--map:hover { background: #16a34a; color: #fff; border-color: #16a34a; }
  .prov-water__action--primary { border-color: #0f766e; background: #0f766e; color: #fff; }
  .prov-water__action--primary:hover { background: #115e59; }
  .prov-water__action:disabled { opacity: .6; cursor: wait; }

  @media (max-width: 760px) {
    .pbfp-kpi-row { grid-template-columns: 1fr 1fr; }
    .prov-water__toolbar { flex-direction: column; align-items: stretch; }
    .prov-water__search-box { width: 100%; }
    .prov-water__filter-group { flex-direction: column; align-items: stretch; }
    .prov-water__select { width: 100%; min-width: 0; }
    .prov-water__actions { flex-direction: column-reverse; }
    .prov-water__action { width: 100%; }
  }
  @media (max-width: 540px) {
    .pbfp-kpi-row { grid-template-columns: 1fr; }
    .prov-water__facts, .prov-water__form-grid { grid-template-columns: 1fr; }
    .water-card__footer { grid-template-columns: 1fr; }
  }
`;

export function ProvincialWaterSources() {
  const [registry, setRegistry] = useState<ProvincialWaterSourceRegistry | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState("ALL");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [selectedSource, setSelectedSource] = useState<WaterSource | null>(null);
  const [coordinateForm, setCoordinateForm] = useState({ latitude: "", longitude: "" });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/provincial-bfp/water-sources", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load the provincial registry.");
        return response.json();
      })
      .then((data: ProvincialWaterSourceRegistry) => {
        setRegistry(data);
      })
      .catch((reason) => {
        if (reason?.name !== "AbortError") {
          setError(reason instanceof Error ? reason.message : "Unable to load the provincial registry.");
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedSource) return;

    const page = document.querySelector<HTMLElement>("main.prov-water");
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="prov-water-edit-title"]');
    dialogRef.current = dialog;
    page?.setAttribute("inert", "");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = window.requestAnimationFrame(() => {
      dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedSource(null);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFirst);
      document.removeEventListener("keydown", handleKeyDown);
      page?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      dialogRef.current = null;
      openerRef.current?.focus();
    };
  }, [selectedSource]);

  const totalLocations = registry?.municipalities.reduce((sum, item) => sum + item.sourceCount, 0) ?? 0;
  const totalHydrants = registry?.municipalities.reduce((sum, item) => sum + item.fireHydrantCount, 0) ?? 0;
  const totalOtherSources = registry?.municipalities.reduce((sum, item) => sum + item.waterSourceCount, 0) ?? 0;
  const allSelected = selectedMunicipality === "ALL";

  const records = useMemo(() => {
    const value = query.trim().toLowerCase();
    return (registry?.sources ?? []).filter(
      (source) =>
        (selectedMunicipality === "ALL" || source.municipalityId === selectedMunicipality) &&
        (!value ||
          `${source.exactLocation} ${source.typeColor} ${source.municipalityName}`.toLowerCase().includes(value))
    );
  }, [query, registry, selectedMunicipality]);

  function openDetails(source: WaterSource) {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedSource(source);
    setCoordinateForm({ latitude: source.latitude.toFixed(7), longitude: source.longitude.toFixed(7) });
    setEditError("");
  }

  async function submitCoordinates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSource) return;
    setSaving(true);
    setEditError("");
    try {
      const response = await fetch("/api/provincial-bfp/water-sources", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: selectedSource.id,
          latitude: Number(coordinateForm.latitude),
          longitude: Number(coordinateForm.longitude),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update the coordinates.");
      const updated = result.source as WaterSource;
      setRegistry((current) =>
        current
          ? {
              ...current,
              sources: current.sources.map((source) => (source.id === updated.id ? updated : source)),
            }
          : current
      );
      setSelectedSource(updated);
      setCoordinateForm({ latitude: updated.latitude.toFixed(7), longitude: updated.longitude.toFixed(7) });
    } catch (reason) {
      setEditError(reason instanceof Error ? reason.message : "Unable to update the coordinates.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{styles}</style>
      <main className="prov-water">
        <header className="prov-water__header">
          <div>
            <p className="prov-water__eyebrow">Antique provincial overview</p>
            <h1>Water sources by municipality</h1>
            {/* 148 records from the BFP locator chart */}
          </div>
          <span className="prov-water__badge">
            <i className="fa-solid fa-file-shield" aria-hidden="true" /> BFP source register
          </span>
        </header>

        {/* 4 Pastel KPI Summary Cards (Compact Style) */}
        <section className="pbfp-kpi-row" aria-label="Provincial totals">
          {/* Card 1: Municipalities */}
          <div
            className="pbfp-kpi-box blue"
            onClick={() => {
              setSelectedMunicipality("ALL");
              setQuery("");
            }}
            role="button"
            tabIndex={0}
            aria-pressed={allSelected}
            title="Filter by all municipalities"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSelectedMunicipality("ALL");
                setQuery("");
              }
            }}
          >
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon blue">
                <i className="fa-solid fa-city" aria-hidden="true" />
              </div>
              <span className="pbfp-kpi-trend-tag blue">
                <i className="fa-solid fa-layer-group" /> Coverage
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Municipalities</span>
              <span className="pbfp-kpi-number">{registry?.municipalities.length ?? 0}</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Province-wide water network</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </div>

          {/* Card 2: Mapped Locations */}
          <div
            className="pbfp-kpi-box emerald"
            onClick={() => {
              setSelectedMunicipality("ALL");
              setQuery("");
            }}
            role="button"
            tabIndex={0}
            title="Filter by mapped locations"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSelectedMunicipality("ALL");
                setQuery("");
              }
            }}
          >
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon emerald">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
              </div>
              <span className="pbfp-kpi-trend-tag emerald">
                <i className="fa-solid fa-check" /> Verified
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Mapped Locations</span>
              <span className="pbfp-kpi-number">{totalLocations}</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Exact GPS coordinates</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </div>

          {/* Card 3: Fire Hydrants */}
          <div
            className="pbfp-kpi-box red"
            onClick={() => {
              setSelectedMunicipality("ALL");
              setQuery("");
            }}
            role="button"
            tabIndex={0}
            title="Filter by fire hydrants"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSelectedMunicipality("ALL");
                setQuery("");
              }
            }}
          >
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon red">
                <i className="fa-solid fa-fire-extinguisher" aria-hidden="true" />
              </div>
              <span className="pbfp-kpi-trend-tag red">
                <i className="fa-solid fa-triangle-exclamation" /> Priority
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Fire Hydrants</span>
              <span className="pbfp-kpi-number">{totalHydrants}</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Active municipal hydrants</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </div>

          {/* Card 4: Other Water Sources */}
          <div
            className="pbfp-kpi-box purple"
            onClick={() => {
              setSelectedMunicipality("ALL");
              setQuery("");
            }}
            role="button"
            tabIndex={0}
            title="Filter by other water sources"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSelectedMunicipality("ALL");
                setQuery("");
              }
            }}
          >
            <div className="pbfp-kpi-header">
              <div className="pbfp-kpi-badge-icon purple">
                <i className="fa-solid fa-droplet" aria-hidden="true" />
              </div>
              <span className="pbfp-kpi-trend-tag purple">
                <i className="fa-solid fa-water" /> Reserve
              </span>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-label">Other Sources</span>
              <span className="pbfp-kpi-number">{totalOtherSources}</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span className="pbfp-kpi-footer-subtext">Natural & open supply points</span>
              <i className="fa-solid fa-arrow-right" />
            </div>
          </div>
        </section>

        {error ? (
          <div className="prov-water__empty">{error}</div>
        ) : !registry ? (
          <div className="prov-water__empty">Loading the province-wide registry…</div>
        ) : (
          <>
            {/* Toolbar: Search input + Municipality Filter Select + Showing Badge */}
            <div className="prov-water__toolbar">
              <div className="prov-water__search-box">
                <i className="fa-solid fa-magnifying-glass prov-water__search-icon" aria-hidden="true" />
                <input
                  className="prov-water__search"
                  aria-label="Search selected municipality"
                  placeholder="Search location, type, or municipality…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="prov-water__filter-group">
                <label className="prov-water__filter-label" htmlFor="prov-water-muni-select">
                  <i className="fa-solid fa-filter" aria-hidden="true" /> Municipality:
                </label>
                <select
                  id="prov-water-muni-select"
                  className="prov-water__select"
                  value={selectedMunicipality}
                  onChange={(event) => {
                    setSelectedMunicipality(event.target.value);
                    setQuery("");
                  }}
                >
                  <option value="ALL">All municipalities ({totalLocations})</option>
                  {registry.municipalities.map((municipality) => (
                    <option key={municipality.municipalityId} value={municipality.municipalityId}>
                      {municipality.municipalityName} ({municipality.sourceCount})
                    </option>
                  ))}
                </select>
                <span className="prov-water__count-badge">
                  <i className="fa-solid fa-list-check" aria-hidden="true" /> Showing {records.length} location{records.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Cards Grid like in Municipal & Provincial Fire Trucks */}

            {/* Cards Grid like in Municipal & Provincial Fire Trucks */}
            {records.length === 0 ? (
              <div className="prov-water__empty">No water-source records found for this filter.</div>
            ) : (
              <section className="water-grid" aria-label="Provincial water sources">
                {records.map((source) => (
                  <div
                    key={source.id}
                    className={`water-card ${source.sourceKind !== "FIRE_HYDRANT" ? "is-other" : ""}`}
                  >
                    <Link
                      className="water-card__main"
                      href={`/provincial-bfp/gis-map?layer=water-sources&municipalityId=${source.municipalityId}&waterSource=${source.id}`}
                      aria-label={`View ${source.exactLocation} on map`}
                    >
                    {/* Head */}
                    <div className="water-card__head">
                      <span className="water-card__icon" aria-hidden="true">
                        <i className={source.sourceKind === "FIRE_HYDRANT" ? "fa-solid fa-fire-extinguisher" : "fa-solid fa-droplet"} />
                      </span>
                      <div className="water-card__head-info">
                        <h3 className="water-card__title" title={source.exactLocation}>
                          {source.exactLocation}
                        </h3>
                        <p className="water-card__station">
                          {source.municipalityName} · {source.sourceKind === "FIRE_HYDRANT" ? "Fire Hydrant" : "Water Source"}
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="water-card__body">
                      <div className="water-card__row">
                        <span>Type / color</span>
                        <strong>{source.typeColor}</strong>
                      </div>
                      <div className="water-card__row">
                        <span>Quantity</span>
                        <strong>{source.quantity} unit(s)</strong>
                      </div>
                      <div className="water-card__row">
                        <span>Coordinates</span>
                        <strong>{source.latitude.toFixed(7)}, {source.longitude.toFixed(7)}</strong>
                      </div>
                      <span className="water-card__origin">
                        {source.recordOrigin === "BFP_LOCATOR_CHART_2018" ? "BFP locator chart · 2018" : "Municipal entry"}
                      </span>
                    </div>
                    </Link>

                    {/* 2 Clickable Icons in Card Footer: 1st Go to map, 2nd Edit coordinates */}
                    <div className="water-card__footer">
                      <Link
                        className="water-card__btn water-card__btn--map"
                        href={`/provincial-bfp/gis-map?municipalityId=${source.municipalityId}&waterSource=${source.id}`}
                        title="View on map"
                        aria-label={`Go to map for ${source.exactLocation}`}
                      >
                        <i className="fa-solid fa-map-location-dot" aria-hidden="true" /> Go to map
                      </Link>
                      <button
                        type="button"
                        className="water-card__btn water-card__btn--edit"
                        onClick={() => openDetails(source)}
                        title="Edit coordinates"
                        aria-label={`Edit coordinates for ${source.exactLocation}`}
                      >
                        <i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Edit coordinates
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {/* Details & Coordinate Edit Dialog */}
      {selectedSource && (
        <div
          className="prov-water__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setSelectedSource(null);
          }}
        >
          <section className="prov-water__dialog" role="dialog" aria-modal="true" aria-labelledby="prov-water-edit-title">
            <header className="prov-water__dialog-head">
              <div>
                <p>
                  {selectedSource.sourceKind === "FIRE_HYDRANT" ? "Fire hydrant" : "Water source"} · {selectedSource.municipalityName}
                </p>
                <h2 id="prov-water-edit-title">{selectedSource.exactLocation}</h2>
              </div>
              <button
                className="prov-water__close"
                type="button"
                aria-label="Close details"
                onClick={() => setSelectedSource(null)}
                disabled={saving}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>
            <div className="prov-water__facts">
              <div className="prov-water__fact">
                <span>Type / color</span>
                <strong>{selectedSource.typeColor}</strong>
              </div>
              <div className="prov-water__fact">
                <span>Quantity</span>
                <strong>{selectedSource.quantity}</strong>
              </div>
              <div className="prov-water__fact">
                <span>Record source</span>
                <strong>{selectedSource.recordOrigin === "BFP_LOCATOR_CHART_2018" ? "BFP chart · 2018" : "Municipal entry"}</strong>
              </div>
            </div>
            <form onSubmit={submitCoordinates}>
              <div className="prov-water__form-grid">
                <div className="prov-water__field">
                  <label htmlFor="prov-water-latitude">Latitude</label>
                  <input
                    id="prov-water-latitude"
                    type="number"
                    step="0.0000001"
                    min="4"
                    max="22"
                    required
                    value={coordinateForm.latitude}
                    onChange={(event) => setCoordinateForm({ ...coordinateForm, latitude: event.target.value })}
                  />
                </div>
                <div className="prov-water__field">
                  <label htmlFor="prov-water-longitude">Longitude</label>
                  <input
                    id="prov-water-longitude"
                    type="number"
                    step="0.0000001"
                    min="116"
                    max="127"
                    required
                    value={coordinateForm.longitude}
                    onChange={(event) => setCoordinateForm({ ...coordinateForm, longitude: event.target.value })}
                  />
                </div>
              </div>
              <p className="prov-water__help">
                Edit coordinates only when the mapped point has been verified. Municipal users continue to control the location name and quantity.
              </p>
              {editError && <p className="prov-water__error" role="alert">{editError}</p>}
              <div className="prov-water__actions">
                <Link
                  className="prov-water__action prov-water__action--map"
                  href={`/provincial-bfp/gis-map?municipalityId=${selectedSource.municipalityId}&waterSource=${selectedSource.id}`}
                  title="View on map"
                >
                  <i className="fa-solid fa-map-location-dot" aria-hidden="true" /> Go to map (View on map)
                </Link>
                <button className="prov-water__action prov-water__action--primary" type="submit" disabled={saving}>
                  <i className="fa-solid fa-check" aria-hidden="true" /> {saving ? "Saving…" : "Save coordinates"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
