"use client";

import { useEffect, useState, type TouchEvent } from "react";

import type { ResidentLanguage } from "../_lib/resident-i18n";

export type SharedIncidentStage = "REPORTED" | "ACKNOWLEDGED" | "RESPONDING" | "ON_SCENE" | "RESOLVED" | "CLOSED";

export type SharedIncident = {
  primaryReference: string;
  status: string;
  stage: SharedIncidentStage;
  stationName: string | null;
  acknowledgedAt: string | null;
  respondingAt: string | null;
  reporterCount: number;
  viewerIsPrimary: boolean;
  history: Array<{ next_status: string; resident_message: string | null; created_at: string }>;
  otherPhotos: Array<{ url: string; label: string; submittedAt: string }>;
};

const STAGES: Array<{ key: Exclude<SharedIncidentStage, "CLOSED">; icon: string }> = [
  { key: "REPORTED", icon: "fa-paper-plane" },
  { key: "ACKNOWLEDGED", icon: "fa-shield-halved" },
  { key: "RESPONDING", icon: "fa-truck-fast" },
  { key: "ON_SCENE", icon: "fa-fire-extinguisher" },
  { key: "RESOLVED", icon: "fa-circle-check" },
];

const TEXT = {
  en: {
    reportedBy: (n: number) => `Reported by ${n} residents`,
    handling: "BFP is handling this fire",
    waiting: "Waiting for BFP",
    alreadyReported: "Already reported",
    otherPhotos: "Photos from other reporters",
    linkedTitle: "This fire is already reported",
    linkedBody: "Your photos were added. BFP is on it.",
    joinedTitle: (n: number) => n === 1 ? "1 more resident reported this fire" : `${n} more residents reported this fire`,
    joinedBody: "Their photos help BFP see the fire.",
    gotIt: "Got it",
    close: "Close",
    previous: "Previous photo",
    next: "Next photo",
    open: "View full photo",
    stage: { REPORTED: "Reported", ACKNOWLEDGED: "BFP acknowledged", RESPONDING: "Responding", ON_SCENE: "On scene", RESOLVED: "Resolved", CLOSED: "Closed" },
  },
  tl: {
    reportedBy: (n: number) => `Iniulat ng ${n} residente`,
    handling: "Hinahawakan na ito ng BFP",
    waiting: "Hinihintay ang BFP",
    alreadyReported: "Naiulat na",
    otherPhotos: "Larawan ng ibang nag-ulat",
    linkedTitle: "Naiulat na ang sunog na ito",
    linkedBody: "Naidagdag ang iyong mga larawan. Kumikilos na ang BFP.",
    joinedTitle: (n: number) => `${n} pang residente ang nag-ulat ng sunog na ito`,
    joinedBody: "Nakatutulong sa BFP ang kanilang mga larawan.",
    gotIt: "Sige",
    close: "Isara",
    previous: "Nakaraang larawan",
    next: "Susunod na larawan",
    open: "Tingnan ang buong larawan",
    stage: { REPORTED: "Naiulat", ACKNOWLEDGED: "Natanggap ng BFP", RESPONDING: "Tumutugon", ON_SCENE: "Nasa lugar na", RESOLVED: "Naapula", CLOSED: "Sarado" },
  },
  hil: {
    reportedBy: (n: number) => `Ginreport sang ${n} ka residente`,
    handling: "Ginaasikaso na ini sang BFP",
    waiting: "Ginahulat ang BFP",
    alreadyReported: "Naireport na",
    otherPhotos: "Litrato sang iban nga nagreport",
    linkedTitle: "Naireport na ini nga sunog",
    linkedBody: "Gin-dugang ang imo mga litrato. Nagahulag na ang BFP.",
    joinedTitle: (n: number) => `${n} pa ka residente ang nagreport sini nga sunog`,
    joinedBody: "Nagabulig sa BFP ang ila mga litrato.",
    gotIt: "Sige",
    close: "Isira",
    previous: "Nauna nga litrato",
    next: "Masunod nga litrato",
    open: "Tan-awa ang bilog nga litrato",
    stage: { REPORTED: "Naireport", ACKNOWLEDGED: "Nabaton sang BFP", RESPONDING: "Nagaresponde", ON_SCENE: "Ara na sa lugar", RESOLVED: "Naapula", CLOSED: "Sirado" },
  },
} as const;

const styles = `
  .rsi-card { margin-bottom:1.1rem; padding:1.15rem 1.05rem 1.1rem; border:1px solid #FAD4D1; border-radius:1.15rem; background:linear-gradient(180deg,#FFF8F7 0%,#FFFFFF 70%); box-shadow:0 10px 26px -22px rgba(185,28,28,.45); }
  .rsi-head { display:flex; align-items:center; flex-wrap:wrap; gap:.85rem; }
  .rsi-head-text { flex:1 1 9rem; min-width:0; }
  .rsi-head-icon { position:relative; flex:0 0 auto; width:2.75rem; height:2.75rem; display:grid; place-items:center; border-radius:.9rem; color:#fff; font-size:1.05rem; background:linear-gradient(135deg,#F04438,#B42318); box-shadow:0 10px 18px -10px rgba(180,35,24,.7); }
  .rsi-head-icon b { position:absolute; right:-.35rem; bottom:-.35rem; min-width:1.2rem; height:1.2rem; padding:0 .25rem; display:grid; place-items:center; border:2px solid #fff; border-radius:99px; background:#0F172A; color:#fff; font-size:.62rem; font-weight:850; }
  .rsi-head strong { display:block; color:#1E293B; font-size:.95rem; font-weight:850; line-height:1.3; }
  .rsi-head small { display:block; margin-top:.2rem; color:#64748B; font-size:.76rem; font-weight:650; }
  .rsi-chip { margin-left:auto; flex:0 0 auto; padding:.3rem .65rem; border-radius:99px; background:#FEE4E2; color:#B42318; font-size:.66rem; font-weight:850; white-space:nowrap; }
  .rsi-steps { position:relative; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:.15rem; margin:1.25rem 0 .35rem; padding:0; list-style:none; }
  .rsi-step { position:relative; display:grid; justify-items:center; align-content:start; gap:.45rem; text-align:center; }
  .rsi-step::before { content:""; position:absolute; top:1rem; left:-50%; width:100%; height:3px; background:#F1E4E3; z-index:0; }
  .rsi-step:first-child::before { display:none; }
  .rsi-step.done::before, .rsi-step.current::before { background:#F04438; }
  .rsi-step i { position:relative; z-index:1; width:2rem; height:2rem; display:grid; place-items:center; border-radius:50%; background:#F8EDEC; color:#C0A5A2; font-size:.78rem; }
  .rsi-step.done i { background:#F04438; color:#fff; }
  .rsi-step.current i { background:#fff; color:#D92D20; box-shadow:0 0 0 3px #F04438; animation:rsiPulse 1.6s ease-in-out infinite; }
  .rsi-step span { color:#94A3B8; font-size:.62rem; font-weight:750; line-height:1.25; padding:0 .1rem; }
  .rsi-step.done span, .rsi-step.current span { color:#1E293B; }
  .rsi-station { margin:.6rem 0 0; color:#475569; font-size:.72rem; font-weight:700; text-align:center; }
  .rsi-station i { color:#D92D20; margin-right:.3rem; }
  .rsi-photos-title { margin:1.2rem 0 .65rem; color:#475569; font-size:.74rem; font-weight:800; display:flex; align-items:center; gap:.45rem; }
  @keyframes rsiPulse { 0%,100% { box-shadow:0 0 0 3px #F04438; } 50% { box-shadow:0 0 0 6px rgba(240,68,56,.25); } }

  /* Photo viewer: the whole photo is always visible, never cropped. */
  .rsi-viewer { position:relative; }
  .rsi-stage { position:relative; display:block; width:100%; aspect-ratio:4 / 3; padding:0; border:0; border-radius:1rem; overflow:hidden; background:radial-gradient(circle at 50% 40%,#1E293B 0%,#0B1220 75%); cursor:zoom-in; touch-action:pan-y; }
  .rsi-viewer.wide .rsi-stage { aspect-ratio:16 / 10; }
  .rsi-stage img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; display:block; animation:rsiPhotoIn .25s ease both; }
  .rsi-tag { position:absolute; left:.55rem; bottom:.55rem; padding:.2rem .55rem; border-radius:99px; background:rgba(15,23,42,.72); color:#fff; font-size:.62rem; font-weight:800; pointer-events:none; }
  .rsi-count { position:absolute; right:.55rem; top:.55rem; padding:.2rem .55rem; border-radius:99px; background:rgba(15,23,42,.72); color:#fff; font-size:.62rem; font-weight:800; font-variant-numeric:tabular-nums; pointer-events:none; }
  .rsi-zoom { position:absolute; right:.55rem; bottom:.55rem; width:1.9rem; height:1.9rem; display:grid; place-items:center; border-radius:50%; background:rgba(15,23,42,.72); color:#fff; font-size:.72rem; pointer-events:none; }
  .rsi-arrow { position:absolute; top:50%; z-index:1; width:2.1rem; height:2.1rem; margin-top:-1.05rem; display:grid; place-items:center; border:0; border-radius:50%; background:rgba(255,255,255,.88); color:#0F172A; font-size:.8rem; cursor:pointer; box-shadow:0 6px 14px -8px rgba(2,6,23,.6); }
  .rsi-viewer .rsi-arrow { top:calc(50% - 2.1rem); }
  .rsi-viewer.single .rsi-arrow { display:none; }
  .rsi-arrow.prev { left:.5rem; }
  .rsi-arrow.next { right:.5rem; }
  .rsi-thumbs { display:flex; gap:.5rem; margin-top:.6rem; padding:.1rem .1rem .2rem; overflow-x:auto; scrollbar-width:thin; }
  .rsi-thumb { flex:0 0 auto; width:3.6rem; height:3.6rem; padding:0; border:2px solid transparent; border-radius:.75rem; overflow:hidden; background:#0F172A; cursor:pointer; opacity:.7; transition:opacity .15s ease, border-color .15s ease; }
  .rsi-thumb img { width:100%; height:100%; object-fit:contain; display:block; }
  .rsi-thumb.active { border-color:#F04438; opacity:1; }
  .rsi-stage:focus-visible, .rsi-thumb:focus-visible, .rsi-arrow:focus-visible, .rsi-btn:focus-visible, .rsi-x:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:2px; }
  @keyframes rsiPhotoIn { from { opacity:0; } to { opacity:1; } }

  /* "Already reported" popup */
  .rsi-overlay { position:fixed; inset:0; z-index:1200; display:flex; align-items:center; justify-content:center; padding:max(1.25rem, env(safe-area-inset-top)) 1.1rem max(1.25rem, env(safe-area-inset-bottom)); overflow-y:auto; background:rgba(15,23,42,.55); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:rsiFade .2s ease both; }
  .rsi-modal { position:relative; width:100%; max-width:24rem; max-height:calc(100dvh - 2.5rem); margin:auto; padding:1.6rem 1.25rem 1.3rem; overflow-y:auto; border-radius:1.4rem; background:#fff; text-align:center; box-shadow:0 30px 60px -30px rgba(15,23,42,.6); animation:rsiRise .32s cubic-bezier(.16,1,.3,1) both; }
  .rsi-x { position:absolute; top:.75rem; right:.75rem; z-index:2; width:2.1rem; height:2.1rem; border:0; border-radius:50%; background:#F1F5F9; color:#475569; cursor:pointer; }
  .rsi-hero { position:relative; width:4.4rem; height:4.4rem; margin:.15rem auto 1rem; display:grid; place-items:center; border-radius:50%; background:radial-gradient(circle,#FFE4E1 0%,#FFF5F4 70%); }
  .rsi-hero > i { font-size:2rem; background:linear-gradient(180deg,#FDB022 0%,#F04438 60%,#B42318 100%); -webkit-background-clip:text; background-clip:text; color:transparent; animation:rsiBounce .8s ease-in-out infinite; }
  .rsi-hero b { position:absolute; right:-.1rem; bottom:.1rem; width:1.7rem; height:1.7rem; display:grid; place-items:center; border:3px solid #fff; border-radius:50%; background:#0F172A; color:#fff; font-size:.7rem; }
  .rsi-modal h3 { margin:0 1.6rem; color:#0F172A; font-size:1.1rem; font-weight:850; line-height:1.3; }
  .rsi-modal p { max-width:19rem; margin:.55rem auto 0; color:#64748B; font-size:.84rem; font-weight:600; line-height:1.5; }
  .rsi-status { display:inline-flex; align-items:center; gap:.45rem; margin-top:1rem; padding:.4rem .85rem; border-radius:99px; background:#FEF3F2; color:#B42318; font-size:.75rem; font-weight:850; }
  .rsi-modal .rsi-viewer { margin-top:1.15rem; text-align:left; }
  .rsi-btn { width:100%; margin-top:1.3rem; min-height:3rem; border:0; border-radius:.95rem; background:linear-gradient(180deg,#F04438,#D92D20); color:#fff; font:inherit; font-size:.92rem; font-weight:850; cursor:pointer; box-shadow:0 12px 22px -14px rgba(217,45,32,.8); }
  @media (max-height:700px) {
    .rsi-modal { padding-top:1.2rem; }
    .rsi-hero { width:3.6rem; height:3.6rem; margin-bottom:.7rem; }
    .rsi-hero > i { font-size:1.6rem; }
    .rsi-modal .rsi-stage { aspect-ratio:16 / 10; }
  }

  /* Full-screen photo */
  .rsi-lightbox { position:fixed; inset:0; z-index:1300; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:max(3.6rem, env(safe-area-inset-top)) .9rem max(1.25rem, env(safe-area-inset-bottom)); background:rgba(2,6,23,.92); touch-action:pan-y; animation:rsiFade .2s ease both; }
  .rsi-lightbox figure { margin:0; display:grid; justify-items:center; gap:.65rem; }
  .rsi-lightbox img { display:block; max-width:min(calc(100vw - 1.8rem),56rem); max-height:calc(100dvh - 8.5rem); border-radius:.9rem; object-fit:contain; animation:rsiPhotoIn .25s ease both; }
  .rsi-lightbox figcaption { color:#E2E8F0; font-size:.78rem; font-weight:700; text-align:center; }
  .rsi-lightbox .rsi-x { position:fixed; top:max(1rem, env(safe-area-inset-top)); right:1rem; width:2.5rem; height:2.5rem; background:rgba(255,255,255,.14); color:#fff; }
  .rsi-lightbox-controls { display:flex; align-items:center; justify-content:center; gap:1rem; min-height:2.6rem; }
  .rsi-lightbox .rsi-arrow { position:static; flex:0 0 auto; width:2.6rem; height:2.6rem; margin:0; }
  @keyframes rsiFade { from { opacity:0; } to { opacity:1; } }
  @keyframes rsiRise { from { opacity:0; transform:translateY(16px) scale(.97); } to { opacity:1; transform:none; } }
  @keyframes rsiBounce { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(-6px) scale(1.06); } }
  @media (prefers-reduced-motion:reduce) { .rsi-step.current i, .rsi-hero > i, .rsi-overlay, .rsi-modal, .rsi-stage img, .rsi-lightbox, .rsi-lightbox img { animation:none; } }
`;

type Photo = { url: string; label: string };
type Text = (typeof TEXT)[keyof typeof TEXT];

function stageIndex(stage: SharedIncidentStage) {
  const index = STAGES.findIndex((item) => item.key === stage);
  return index < 0 ? 0 : index;
}

/** Left/right swipe on touch screens moves between photos. */
function useSwipe(onPrevious: () => void, onNext: () => void) {
  const [start, setStart] = useState<number | null>(null);
  return {
    onTouchStart: (event: TouchEvent) => setStart(event.touches[0]?.clientX ?? null),
    onTouchEnd: (event: TouchEvent) => {
      if (start === null) return;
      const distance = (event.changedTouches[0]?.clientX ?? start) - start;
      setStart(null);
      if (Math.abs(distance) < 40) return;
      if (distance > 0) onPrevious();
      else onNext();
    },
  };
}

function PhotoLightbox({ photos, startIndex, text, onClose }: { photos: Photo[]; startIndex: number; text: Text; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const many = photos.length > 1;
  const previous = () => setIndex((value) => (value - 1 + photos.length) % photos.length);
  const next = () => setIndex((value) => (value + 1) % photos.length);
  const swipe = useSwipe(previous, next);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && photos.length > 1) setIndex((value) => (value - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight" && photos.length > 1) setIndex((value) => (value + 1) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, photos.length]);
  const photo = photos[index] ?? photos[0];
  if (!photo) return null;
  return <div className="rsi-lightbox" role="dialog" aria-modal="true" aria-label={photo.label} onClick={(event) => { event.stopPropagation(); onClose(); }} {...swipe}>
    <figure onClick={(event) => event.stopPropagation()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={photo.url} src={photo.url} alt={photo.label} />
      <div className="rsi-lightbox-controls">
        {many && <button type="button" className="rsi-arrow prev" aria-label={text.previous} onClick={previous}><i className="fa-solid fa-chevron-left" /></button>}
        <figcaption>{photo.label}{many ? ` · ${index + 1}/${photos.length}` : ""}</figcaption>
        {many && <button type="button" className="rsi-arrow next" aria-label={text.next} onClick={next}><i className="fa-solid fa-chevron-right" /></button>}
      </div>
    </figure>
    <button type="button" className="rsi-x" aria-label={text.close} onClick={(event) => { event.stopPropagation(); onClose(); }}><i className="fa-solid fa-xmark" /></button>
  </div>;
}

/** One large photo shown whole, with thumbnails and swipe for the rest. */
function PhotoViewer({ photos, text, wide = false, onOpen }: { photos: Photo[]; text: Text; wide?: boolean; onOpen: (index: number) => void }) {
  const [index, setIndex] = useState(0);
  const many = photos.length > 1;
  const current = Math.min(index, photos.length - 1);
  const previous = () => setIndex((current - 1 + photos.length) % photos.length);
  const next = () => setIndex((current + 1) % photos.length);
  const swipe = useSwipe(previous, next);
  const photo = photos[current];
  if (!photo) return null;
  return <div className={`rsi-viewer${wide ? " wide" : ""}${many ? "" : " single"}`}>
    <button type="button" className="rsi-stage" onClick={() => onOpen(current)} aria-label={`${text.open}: ${photo.label}`} {...swipe}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={photo.url} src={photo.url} alt="" />
      <span className="rsi-tag">{photo.label}</span>
      {many && <span className="rsi-count">{current + 1}/{photos.length}</span>}
      <span className="rsi-zoom" aria-hidden="true"><i className="fa-solid fa-expand" /></span>
    </button>
    {many && <>
      <button type="button" className="rsi-arrow prev" aria-label={text.previous} onClick={previous}><i className="fa-solid fa-chevron-left" /></button>
      <button type="button" className="rsi-arrow next" aria-label={text.next} onClick={next}><i className="fa-solid fa-chevron-right" /></button>
      <div className="rsi-thumbs">
        {photos.map((item, itemIndex) => <button key={`${item.url}-${itemIndex}`} type="button" className={`rsi-thumb${itemIndex === current ? " active" : ""}`} onClick={() => setIndex(itemIndex)} aria-label={`${item.label} ${itemIndex + 1}`} aria-pressed={itemIndex === current}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="" loading="lazy" />
        </button>)}
      </div>
    </>}
  </div>;
}

export function SharedIncidentCard({ incident, lang }: { incident: SharedIncident; lang: ResidentLanguage }) {
  const text = TEXT[lang] ?? TEXT.en;
  const [openAt, setOpenAt] = useState<number | null>(null);
  const current = stageIndex(incident.stage);
  return <section className="rsi-card" aria-label={text.reportedBy(incident.reporterCount)}>
    <style>{styles}</style>
    <div className="rsi-head">
      <span className="rsi-head-icon" aria-hidden="true"><i className="fa-solid fa-users" /><b>{incident.reporterCount}</b></span>
      <div className="rsi-head-text">
        <strong>{text.reportedBy(incident.reporterCount)}</strong>
        <small>{incident.stage === "REPORTED" ? text.waiting : text.handling}</small>
      </div>
      {!incident.viewerIsPrimary && <span className="rsi-chip">{text.alreadyReported}</span>}
    </div>
    <ol className="rsi-steps">
      {STAGES.map((item, index) => <li key={item.key} className={`rsi-step ${index < current ? "done" : index === current ? "current" : ""}`}>
        <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
        <span>{text.stage[item.key]}</span>
      </li>)}
    </ol>
    {incident.stationName && current >= 2 && <p className="rsi-station"><i className="fa-solid fa-truck-fast" aria-hidden="true" />{incident.stationName}</p>}
    {incident.otherPhotos.length > 0 && <>
      <div className="rsi-photos-title"><i className="fa-solid fa-camera" aria-hidden="true" />{text.otherPhotos}</div>
      <PhotoViewer photos={incident.otherPhotos} text={text} wide onOpen={setOpenAt} />
    </>}
    {openAt !== null && <PhotoLightbox photos={incident.otherPhotos} startIndex={openAt} text={text} onClose={() => setOpenAt(null)} />}
  </section>;
}

/**
 * Tells a resident that their report joined an existing fire, or tells the
 * first reporter that more residents reported it. Shown once per change.
 */
export function SharedIncidentPopup({ reportId, incident, lang }: { reportId: string; incident: SharedIncident; lang: ResidentLanguage }) {
  const text = TEXT[lang] ?? TEXT.en;
  const [popup, setPopup] = useState<{ kind: "linked" } | { kind: "joined"; added: number } | null>(null);
  const [openAt, setOpenAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (!incident.viewerIsPrimary) {
        const key = `alab_linked_seen_${reportId}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          queueMicrotask(() => setPopup({ kind: "linked" }));
        }
        return;
      }
      const key = `alab_incident_reporters_${reportId}`;
      const seen = Number(localStorage.getItem(key) || "1");
      if (incident.reporterCount > seen) {
        localStorage.setItem(key, String(incident.reporterCount));
        queueMicrotask(() => setPopup({ kind: "joined", added: incident.reporterCount - seen }));
      }
    } catch {
      // Storage can be unavailable in private windows; the card still shows.
    }
  }, [reportId, incident.viewerIsPrimary, incident.reporterCount]);

  useEffect(() => {
    if (!popup) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && openAt === null) setPopup(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popup, openAt]);

  if (!popup) return null;
  const photos = popup.kind === "joined" ? incident.otherPhotos.slice(-4) : incident.otherPhotos.slice(0, 4);
  const stage = STAGES.find((item) => item.key === incident.stage) ?? STAGES[0];
  return <div className="rsi-overlay" role="presentation" onClick={() => setPopup(null)}>
    <style>{styles}</style>
    <div className="rsi-modal" role="dialog" aria-modal="true" aria-labelledby="rsi-popup-title" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="rsi-x" aria-label={text.close} onClick={() => setPopup(null)}><i className="fa-solid fa-xmark" /></button>
      <div className="rsi-hero" aria-hidden="true"><i className="fa-solid fa-fire-flame-curved" /><b><i className="fa-solid fa-users" /></b></div>
      <h3 id="rsi-popup-title">{popup.kind === "linked" ? text.linkedTitle : text.joinedTitle(popup.added)}</h3>
      <p>{popup.kind === "linked" ? text.linkedBody : text.joinedBody}</p>
      <span className="rsi-status"><i className={`fa-solid ${stage.icon}`} aria-hidden="true" />{text.stage[incident.stage]}{incident.stationName && stageIndex(incident.stage) >= 2 ? ` · ${incident.stationName}` : ""}</span>
      {photos.length > 0 && <PhotoViewer photos={photos} text={text} onOpen={setOpenAt} />}
      <button type="button" className="rsi-btn" onClick={() => setPopup(null)}>{text.gotIt}</button>
    </div>
    {openAt !== null && <PhotoLightbox photos={photos} startIndex={openAt} text={text} onClose={() => setOpenAt(null)} />}
  </div>;
}
