"use client";

import { useEffect, useState } from "react";

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
    stage: { REPORTED: "Naireport", ACKNOWLEDGED: "Nabaton sang BFP", RESPONDING: "Nagaresponde", ON_SCENE: "Ara na sa lugar", RESOLVED: "Naapula", CLOSED: "Sirado" },
  },
} as const;

const styles = `
  .rsi-card { margin-bottom:1rem; padding:1.05rem 1.1rem; border:1px solid #FAD4D1; border-radius:1.1rem; background:linear-gradient(180deg,#FFF8F7 0%,#FFFFFF 70%); box-shadow:0 10px 26px -22px rgba(185,28,28,.45); }
  .rsi-head { display:flex; align-items:center; gap:.8rem; }
  .rsi-head-icon { position:relative; flex:0 0 auto; width:2.75rem; height:2.75rem; display:grid; place-items:center; border-radius:.9rem; color:#fff; font-size:1.05rem; background:linear-gradient(135deg,#F04438,#B42318); box-shadow:0 10px 18px -10px rgba(180,35,24,.7); }
  .rsi-head-icon b { position:absolute; right:-.35rem; bottom:-.35rem; min-width:1.2rem; height:1.2rem; padding:0 .25rem; display:grid; place-items:center; border:2px solid #fff; border-radius:99px; background:#0F172A; color:#fff; font-size:.62rem; font-weight:850; }
  .rsi-head strong { display:block; color:#1E293B; font-size:.95rem; font-weight:850; }
  .rsi-head small { display:block; margin-top:.1rem; color:#64748B; font-size:.76rem; font-weight:650; }
  .rsi-chip { margin-left:auto; flex:0 0 auto; padding:.28rem .6rem; border-radius:99px; background:#FEE4E2; color:#B42318; font-size:.66rem; font-weight:850; white-space:nowrap; }
  .rsi-steps { position:relative; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); margin:1.05rem 0 .2rem; }
  .rsi-step { position:relative; display:grid; justify-items:center; gap:.35rem; text-align:center; }
  .rsi-step::before { content:""; position:absolute; top:1rem; left:-50%; width:100%; height:3px; background:#F1E4E3; z-index:0; }
  .rsi-step:first-child::before { display:none; }
  .rsi-step.done::before, .rsi-step.current::before { background:#F04438; }
  .rsi-step i { position:relative; z-index:1; width:2rem; height:2rem; display:grid; place-items:center; border-radius:50%; background:#F8EDEC; color:#C0A5A2; font-size:.78rem; }
  .rsi-step.done i { background:#F04438; color:#fff; }
  .rsi-step.current i { background:#fff; color:#D92D20; box-shadow:0 0 0 3px #F04438; animation:rsiPulse 1.6s ease-in-out infinite; }
  .rsi-step span { color:#94A3B8; font-size:.62rem; font-weight:750; line-height:1.2; }
  .rsi-step.done span, .rsi-step.current span { color:#1E293B; }
  .rsi-station { margin:.45rem 0 0; color:#475569; font-size:.72rem; font-weight:700; text-align:center; }
  .rsi-station i { color:#D92D20; margin-right:.3rem; }
  .rsi-photos-title { margin:1rem 0 .55rem; color:#475569; font-size:.72rem; font-weight:800; display:flex; align-items:center; gap:.4rem; }
  .rsi-photos { display:flex; gap:.55rem; overflow-x:auto; padding-bottom:.2rem; scrollbar-width:thin; }
  .rsi-photo { position:relative; flex:0 0 auto; width:5.4rem; height:5.4rem; padding:0; border:0; border-radius:.8rem; overflow:hidden; background:#F1F5F9; cursor:pointer; }
  .rsi-photo img { width:100%; height:100%; object-fit:cover; display:block; }
  .rsi-photo span { position:absolute; left:.3rem; bottom:.3rem; padding:.1rem .4rem; border-radius:99px; background:rgba(15,23,42,.72); color:#fff; font-size:.55rem; font-weight:800; }
  .rsi-photo:focus-visible, .rsi-btn:focus-visible, .rsi-x:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:2px; }
  @keyframes rsiPulse { 0%,100% { box-shadow:0 0 0 3px #F04438; } 50% { box-shadow:0 0 0 6px rgba(240,68,56,.25); } }

  .rsi-overlay { position:fixed; inset:0; z-index:1200; display:grid; place-items:center; padding:1rem; background:rgba(15,23,42,.55); backdrop-filter:blur(4px); animation:rsiFade .2s ease both; }
  .rsi-modal { position:relative; width:min(100%,24rem); padding:1.4rem 1.2rem 1.15rem; border-radius:1.4rem; background:#fff; text-align:center; box-shadow:0 30px 60px -30px rgba(15,23,42,.6); animation:rsiRise .32s cubic-bezier(.16,1,.3,1) both; }
  .rsi-x { position:absolute; top:.7rem; right:.7rem; width:2rem; height:2rem; border:0; border-radius:50%; background:#F1F5F9; color:#475569; cursor:pointer; }
  .rsi-hero { position:relative; width:4.6rem; height:4.6rem; margin:.2rem auto .8rem; display:grid; place-items:center; border-radius:50%; background:radial-gradient(circle,#FFE4E1 0%,#FFF5F4 70%); }
  .rsi-hero > i { font-size:2.1rem; background:linear-gradient(180deg,#FDB022 0%,#F04438 60%,#B42318 100%); -webkit-background-clip:text; background-clip:text; color:transparent; animation:rsiBounce .8s ease-in-out infinite; }
  .rsi-hero b { position:absolute; right:-.1rem; bottom:.1rem; width:1.7rem; height:1.7rem; display:grid; place-items:center; border:3px solid #fff; border-radius:50%; background:#0F172A; color:#fff; font-size:.7rem; }
  .rsi-modal h3 { margin:0; color:#0F172A; font-size:1.08rem; font-weight:850; }
  .rsi-modal p { margin:.35rem 0 0; color:#64748B; font-size:.82rem; font-weight:600; }
  .rsi-status { display:inline-flex; align-items:center; gap:.4rem; margin-top:.8rem; padding:.35rem .75rem; border-radius:99px; background:#FEF3F2; color:#B42318; font-size:.74rem; font-weight:850; }
  .rsi-mosaic { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.4rem; margin-top:.95rem; }
  .rsi-mosaic.one { grid-template-columns:1fr; }
  .rsi-mosaic .rsi-photo { width:100%; height:6.4rem; }
  .rsi-btn { width:100%; margin-top:1rem; min-height:2.9rem; border:0; border-radius:.95rem; background:linear-gradient(180deg,#F04438,#D92D20); color:#fff; font:inherit; font-size:.9rem; font-weight:850; cursor:pointer; box-shadow:0 12px 22px -14px rgba(217,45,32,.8); }
  .rsi-lightbox { position:fixed; inset:0; z-index:1300; display:grid; place-items:center; padding:1rem; background:rgba(2,6,23,.88); }
  .rsi-lightbox img { max-width:min(100%,46rem); max-height:78vh; border-radius:1rem; object-fit:contain; }
  .rsi-lightbox figcaption { margin-top:.6rem; color:#E2E8F0; font-size:.78rem; font-weight:700; text-align:center; }
  @keyframes rsiFade { from { opacity:0; } to { opacity:1; } }
  @keyframes rsiRise { from { opacity:0; transform:translateY(16px) scale(.97); } to { opacity:1; transform:none; } }
  @keyframes rsiBounce { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(-6px) scale(1.06); } }
  @media (prefers-reduced-motion:reduce) { .rsi-step.current i, .rsi-hero > i, .rsi-overlay, .rsi-modal { animation:none; } }
`;

function stageIndex(stage: SharedIncidentStage) {
  const index = STAGES.findIndex((item) => item.key === stage);
  return index < 0 ? 0 : index;
}

function PhotoLightbox({ photo, closeLabel, onClose }: { photo: { url: string; label: string }; closeLabel: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="rsi-lightbox" role="dialog" aria-modal="true" aria-label={photo.label} onClick={(event) => { event.stopPropagation(); onClose(); }}>
    <figure style={{ margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.label} />
      <figcaption>{photo.label}</figcaption>
    </figure>
    <button type="button" className="rsi-x" style={{ top: "1rem", right: "1rem" }} aria-label={closeLabel} onClick={onClose}><i className="fa-solid fa-xmark" /></button>
  </div>;
}

export function SharedIncidentCard({ incident, lang }: { incident: SharedIncident; lang: ResidentLanguage }) {
  const text = TEXT[lang] ?? TEXT.en;
  const [openPhoto, setOpenPhoto] = useState<{ url: string; label: string } | null>(null);
  const current = stageIndex(incident.stage);
  return <section className="rsi-card" aria-label={text.reportedBy(incident.reporterCount)}>
    <style>{styles}</style>
    <div className="rsi-head">
      <span className="rsi-head-icon" aria-hidden="true"><i className="fa-solid fa-users" /><b>{incident.reporterCount}</b></span>
      <div>
        <strong>{text.reportedBy(incident.reporterCount)}</strong>
        <small>{incident.stage === "REPORTED" ? text.waiting : text.handling}</small>
      </div>
      {!incident.viewerIsPrimary && <span className="rsi-chip">{text.alreadyReported}</span>}
    </div>
    <ol className="rsi-steps" style={{ listStyle: "none", padding: 0 }}>
      {STAGES.map((item, index) => <li key={item.key} className={`rsi-step ${index < current ? "done" : index === current ? "current" : ""}`}>
        <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
        <span>{text.stage[item.key]}</span>
      </li>)}
    </ol>
    {incident.stationName && current >= 2 && <p className="rsi-station"><i className="fa-solid fa-truck-fast" aria-hidden="true" />{incident.stationName}</p>}
    {incident.otherPhotos.length > 0 && <>
      <div className="rsi-photos-title"><i className="fa-solid fa-camera" aria-hidden="true" />{text.otherPhotos}</div>
      <div className="rsi-photos">
        {incident.otherPhotos.map((photo, index) => <button key={`${photo.url}-${index}`} type="button" className="rsi-photo" onClick={() => setOpenPhoto(photo)} aria-label={photo.label}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="" loading="lazy" />
          <span>{photo.label}</span>
        </button>)}
      </div>
    </>}
    {openPhoto && <PhotoLightbox photo={openPhoto} closeLabel={text.close} onClose={() => setOpenPhoto(null)} />}
  </section>;
}

/**
 * Tells a resident that their report joined an existing fire, or tells the
 * first reporter that more residents reported it. Shown once per change.
 */
export function SharedIncidentPopup({ reportId, incident, lang }: { reportId: string; incident: SharedIncident; lang: ResidentLanguage }) {
  const text = TEXT[lang] ?? TEXT.en;
  const [popup, setPopup] = useState<{ kind: "linked" } | { kind: "joined"; added: number } | null>(null);
  const [openPhoto, setOpenPhoto] = useState<{ url: string; label: string } | null>(null);

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
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !openPhoto) setPopup(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popup, openPhoto]);

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
      {photos.length > 0 && <div className={`rsi-mosaic ${photos.length === 1 ? "one" : ""}`}>
        {photos.map((photo, index) => <button key={`${photo.url}-${index}`} type="button" className="rsi-photo" onClick={() => setOpenPhoto(photo)} aria-label={photo.label}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="" />
          <span>{photo.label}</span>
        </button>)}
      </div>}
      <button type="button" className="rsi-btn" onClick={() => setPopup(null)}>{text.gotIt}</button>
    </div>
    {openPhoto && <PhotoLightbox photo={openPhoto} closeLabel={text.close} onClose={() => setOpenPhoto(null)} />}
  </div>;
}
