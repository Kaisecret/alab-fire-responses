"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { WaterSource } from "../../lib/water-sources/types";
import type { WaterSourceMapGroup } from "../../lib/water-sources/map-positions";

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;

/**
 * How far down the map a focused pin is parked, in pixels from the top.
 *
 * The details card opens above the pin, so centering the pin would push the
 * card off the top of the map. Parking it this low leaves room for the card.
 */
const PIN_PARKING_DEPTH_PX = 470;

/** The pin is drawn 48px tall from its tip; the card's arrow sits just above it. */
const CARD_OFFSET_ABOVE_TIP_PX = -42;

/**
 * Fly the map to a water source, leaving room above the pin for its card.
 *
 * The flight is the zoom animation a registry card hands off to. People who
 * asked their system for less motion get a plain jump instead.
 */
export function flyToWaterSource(map: LeafletMap, point: [number, number], approximate: boolean) {
  const zoom = Math.max(map.getZoom(), approximate ? 13 : 17);
  const height = map.getSize().y;
  const lift = Math.max(0, Math.min(height / 2 - 48, PIN_PARKING_DEPTH_PX - height / 2));
  const center = map.unproject(map.project(point, zoom).subtract([0, lift]), zoom);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  map.flyTo(center, zoom, { animate: !reduceMotion, duration: 1.2, easeLinearity: 0.2 });
}

const styles = `
  .water-map-popup .leaflet-popup-content-wrapper{padding:0;border-radius:0;background:transparent;box-shadow:none}
  .water-map-popup .leaflet-popup-content{margin:0;min-height:0;font-size:16px;line-height:1.4}
  .water-map-popup .leaflet-popup-tip-container{display:none}
  .water-map-pop{position:relative;color:#132238;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;text-align:left;transform-origin:50% 100%;animation:water-map-pop .42s cubic-bezier(.18,1.3,.4,1) both}
  .water-map-pop__card{display:flex;overflow:hidden;max-height:var(--water-map-pop-max-height,520px);flex-direction:column;border:1px solid rgba(15,118,110,.16);border-radius:18px;background:#fff;box-shadow:0 24px 54px -14px rgba(15,23,42,.45),0 4px 12px rgba(15,23,42,.08)}
  .water-map-pop__card:focus{outline:none}
  .water-map-pop__card:focus-visible{outline:2px solid #0f766e;outline-offset:2px}
  .water-map-pop__header{display:flex;align-items:center;gap:.7rem;padding:.8rem .85rem .75rem 1rem;border-bottom:1px solid #e5edf6}
  .water-map-pop__badge{display:grid;flex:0 0 38px;width:38px;height:38px;place-items:center;border-radius:12px;background:linear-gradient(135deg,#14b8a6,#0f766e);color:#fff;font-size:.95rem;box-shadow:0 10px 20px -10px rgba(15,118,110,.8)}
  .water-map-pop__heading{flex:1;min-width:0}
  .water-map-pop__kicker{margin:0 0 .12rem;color:#0f766e;font-size:.62rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
  .water-map-pop__heading h2{margin:0;color:#15213a;font-size:1.05rem;font-weight:800;letter-spacing:-.02em}
  .water-map-pop__close{display:grid;flex:0 0 auto;width:2.1rem;height:2.1rem;place-items:center;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#475569;font-size:.9rem;cursor:pointer;transition:border-color .15s ease,color .15s ease}
  .water-map-pop__close:hover{border-color:#5eead4;color:#0f766e}
  .water-map-pop__close:focus-visible{outline:2px solid #0f766e;outline-offset:2px}
  .water-map-pop__body{overflow:auto;padding:.85rem 1rem 1rem;overscroll-behavior:contain}
  .water-map-pop__hero{display:grid;grid-template-columns:auto 1fr;gap:.75rem;align-items:center;padding:.75rem .8rem;border:1px solid #bfe4dd;border-radius:14px;background:#f0fdfa}
  .water-map-pop__icon{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;background:#0f766e;color:#fff;font-size:1.05rem;box-shadow:0 10px 22px rgba(15,118,110,.22)}
  .water-map-pop__kind{margin:0 0 .12rem;color:#0f766e;font-size:.64rem;font-weight:850;letter-spacing:.07em;text-transform:uppercase}
  .water-map-pop__location{margin:0;color:#132238;font-size:.9rem;font-weight:750;line-height:1.4;overflow-wrap:anywhere}
  .water-map-pop__facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:.5rem;margin-top:.65rem}
  .water-map-pop__fact{display:flex;align-items:flex-start;gap:.55rem;min-width:0;padding:.55rem .6rem;border:1px solid #e1e8f0;border-radius:11px;background:#fff;box-shadow:0 6px 16px -14px rgba(15,23,42,.45)}
  .water-map-pop__fact>div{min-width:0}
  .water-map-pop__fact-icon{display:grid;flex:0 0 auto;width:28px;height:28px;place-items:center;border-radius:9px;font-size:.75rem;line-height:1}
  .water-map-pop__fact-icon.red{background:#fef2f2;color:#b91c1c}
  .water-map-pop__fact-icon.blue{background:#eff6ff;color:#1d4ed8}
  .water-map-pop__fact-icon.teal{background:#f0fdfa;color:#0f766e}
  .water-map-pop__fact>div>span{display:block;margin-bottom:.12rem;color:#64748b;font-size:.6rem;font-weight:800;letter-spacing:.045em;text-transform:uppercase}
  .water-map-pop__fact>div>strong{display:block;color:#24314a;font-size:.8rem;line-height:1.3;overflow-wrap:anywhere}
  .water-map-pop__warning{margin:.65rem 0 0;padding:.7rem .8rem;border:1px solid #fcd34d;border-radius:12px;background:#fffbeb;color:#78350f;font-size:.75rem;line-height:1.5}
  .water-map-pop__select{width:100%;margin-top:.6rem;padding:.5rem .6rem;border:1px solid #d5dfeb;border-radius:9px;background:#fff;color:#132238;font:inherit;font-size:.78rem}
  .water-map-pop__origin{display:inline-flex;align-items:center;gap:.4rem;margin-top:.7rem;padding:.42rem .6rem;border-radius:9px;background:#f1f5f9;color:#64748b;font-size:.68rem;font-weight:700}
  .water-map-pop__origin i{color:#0f766e}
  .water-map-pop__arrow{position:absolute;left:50%;bottom:-8px;width:16px;height:16px;margin-left:-8px;border-right:1px solid rgba(15,118,110,.16);border-bottom:1px solid rgba(15,118,110,.16);background:#fff;transform:rotate(45deg);box-shadow:6px 6px 12px -6px rgba(15,23,42,.25)}
  @keyframes water-map-pop{from{opacity:0;transform:translateY(18px) scale(.5)}to{opacity:1;transform:none}}
  @media(prefers-reduced-motion:reduce){.water-map-pop{animation:none}}
`;

function Fact({ icon, tone, label, children }: { icon: string; tone: "red" | "blue" | "teal"; label: string; children: ReactNode }) {
  return (
    <article className="water-map-pop__fact">
      <span className={`water-map-pop__fact-icon ${tone}`} aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <div><span>{label}</span><strong>{children}</strong></div>
    </article>
  );
}

type WaterSourceMapPopupProps = {
  leafletRef: RefObject<LeafletModule | null>;
  mapRef: RefObject<LeafletMap | null>;
  source: WaterSource;
  group: WaterSourceMapGroup;
  network: "municipal" | "provincial";
  onSelect: (source: WaterSource) => void;
  onClose: () => void;
};

/**
 * A water source's details, opened on the map over its own pin.
 *
 * It replaces a full-screen dialog that dimmed the page and hid the very map
 * the source was found on. The card rides a Leaflet popup, so it follows the
 * pin through pans and zooms, and a click on the map closes it.
 */
export function WaterSourceMapPopup({ leafletRef, mapRef, source, group, network, onSelect, onClose }: WaterSourceMapPopupProps) {
  const [node] = useState(() => document.createElement("div"));
  const popupRef = useRef<import("leaflet").Popup | null>(null);
  const onCloseRef = useRef(onClose);
  const [latitude, longitude] = group.point;

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useLayoutEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const size = map.getSize();
    const width = Math.max(240, Math.min(380, size.x - 32));
    node.style.setProperty("--water-map-pop-max-height", `${Math.max(220, size.y - 120)}px`);
    const popup = L.popup({
      className: "water-map-popup",
      offset: [0, CARD_OFFSET_ABOVE_TIP_PX],
      minWidth: width,
      maxWidth: width,
      closeButton: false,
      autoPanPadding: [16, 16],
    })
      .setLatLng([latitude, longitude])
      .setContent(node);
    popup.on("remove", () => onCloseRef.current());
    popup.openOn(map);
    popupRef.current = popup;
    return () => {
      popup.off("remove");
      popup.remove();
      popupRef.current = null;
    };
  }, [leafletRef, mapRef, node, latitude, longitude]);

  // Another source from the same approximate group can change the card's size.
  useLayoutEffect(() => {
    popupRef.current?.update();
  }, [source.id]);

  useEffect(() => {
    node.querySelector<HTMLElement>("[role='dialog']")?.focus({ preventScroll: true });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [node]);

  const isHydrant = source.sourceKind === "FIRE_HYDRANT";

  return createPortal(
    <div className="water-map-pop">
      <style>{styles}</style>
      <section className="water-map-pop__card" role="dialog" aria-labelledby="water-source-popup-title" tabIndex={-1}>
        <header className="water-map-pop__header">
          <span className="water-map-pop__badge" aria-hidden="true"><i className="fa-solid fa-droplet" /></span>
          <div className="water-map-pop__heading">
            <p className="water-map-pop__kicker">Mapped {network} water network</p>
            <h2 id="water-source-popup-title">Water source details</h2>
          </div>
          <button className="water-map-pop__close" type="button" aria-label="Close water source details" onClick={onClose}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>
        <div className="water-map-pop__body">
          <section className="water-map-pop__hero">
            <span className="water-map-pop__icon"><i className={`fa-solid ${isHydrant ? "fa-fire-extinguisher" : "fa-droplet"}`} aria-hidden="true" /></span>
            <div>
              <p className="water-map-pop__kind">
                {isHydrant ? "Fire hydrant" : "Water source"}
                {network === "provincial" ? ` · ${source.municipalityName}` : ""}
              </p>
              <h3 className="water-map-pop__location">{source.exactLocation}</h3>
            </div>
          </section>
          <div className="water-map-pop__facts">
            <Fact icon="fa-palette" tone="red" label="Type / color">{source.typeColor}</Fact>
            <Fact icon="fa-hashtag" tone="blue" label="Quantity">{source.quantity}</Fact>
            <Fact icon="fa-arrows-up-down" tone="teal" label="Recorded latitude">{source.latitude.toFixed(7)}</Fact>
            <Fact icon="fa-arrows-left-right" tone="teal" label="Recorded longitude">{source.longitude.toFixed(7)}</Fact>
          </div>
          {group.approximate && (
            <div className="water-map-pop__warning" role="note">
              {`The recorded coordinates appear far outside ${source.municipalityName}. This marker shows the approximate municipality center only; the source’s exact location needs field verification by Provincial BFP.`}
              {group.sources.length > 1 && (
                <select
                  className="water-map-pop__select"
                  aria-label="Choose a hydrant needing coordinate verification"
                  value={source.id}
                  onChange={(event) => {
                    const next = group.sources.find((item) => item.id === event.target.value);
                    if (next) onSelect(next);
                  }}
                >
                  {group.sources.map((item) => <option key={item.id} value={item.id}>{item.exactLocation}</option>)}
                </select>
              )}
            </div>
          )}
          <span className="water-map-pop__origin">
            <i className="fa-solid fa-file-shield" aria-hidden="true" />
            {source.recordOrigin === "BFP_LOCATOR_CHART_2018" ? "BFP locator chart · 2018" : "Municipal entry"}
          </span>
        </div>
      </section>
      <span className="water-map-pop__arrow" aria-hidden="true" />
    </div>,
    node,
  );
}
