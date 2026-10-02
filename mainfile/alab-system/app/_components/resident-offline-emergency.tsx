"use client";

import { useEffect, useMemo, useState } from "react";

import {
  BFP_HOTLINES,
  formatHotline,
  hotlineForMunicipality,
  hotlineHref,
  type BfpHotline,
} from "../../lib/bfp-hotlines";
import { useResidentLanguage, type ResidentLanguage } from "../_lib/resident-i18n";

/*
 * When the resident has no internet, a report cannot be sent, but a phone
 * call still works. This sheet offers their own municipality's fire station
 * first, 911, and every BFP Antique number, because the resident may be in
 * another town (registered in Anini-y, but at a fire in San Jose).
 *
 * Other pages open it with: window.dispatchEvent(new Event(OPEN_BFP_HOTLINES)).
 */
export const OPEN_BFP_HOTLINES = "alab:show-bfp-hotlines";

/** The resident's registered municipality, kept so it is known offline. */
const HOME_MUNICIPALITY_KEY = "alab_resident_home_municipality";

const TEXT: Record<ResidentLanguage, {
  offlineTitle: string; callTitle: string; offlineBody: string; callBody: string; yourStation: string;
  national: string; allNumbers: string; hideNumbers: string; search: string; close: string; pill: string; noMatch: string; yours: string;
}> = {
  en: {
    offlineTitle: "No internet", callTitle: "Call BFP",
    offlineBody: "Your report cannot be sent right now. A phone call still works.",
    callBody: "Call the fire station nearest to the fire.",
    yourStation: "Your registered station", national: "National emergency hotline",
    allNumbers: "All BFP Antique numbers", hideNumbers: "Hide", search: "Search town or station",
    close: "Close", pill: "Call BFP (offline)", noMatch: "No station found", yours: "Yours",
  },
  tl: {
    offlineTitle: "Walang internet", callTitle: "Tumawag sa BFP",
    offlineBody: "Hindi maipadala ang ulat ngayon. Gumagana pa rin ang tawag.",
    callBody: "Tawagan ang pinakamalapit na fire station sa sunog.",
    yourStation: "Istasyon ng iyong bayan", national: "National emergency hotline",
    allNumbers: "Lahat ng numero ng BFP Antique", hideNumbers: "Itago", search: "Hanapin ang bayan o istasyon",
    close: "Isara", pill: "Tumawag sa BFP (offline)", noMatch: "Walang nakitang istasyon", yours: "Iyo",
  },
  hil: {
    offlineTitle: "Wala sang internet", callTitle: "Tawagi ang BFP",
    offlineBody: "Indi mapadala ang report subong. Mapanawag ka gihapon.",
    callBody: "Tawagi ang pinakamalapit nga fire station sa sunog.",
    yourStation: "Istasyon sang imo banwa", national: "National emergency hotline",
    allNumbers: "Tanan nga numero sang BFP Antique", hideNumbers: "Itago", search: "Pangitaa ang banwa ukon istasyon",
    close: "Isira", pill: "Tawagi ang BFP (offline)", noMatch: "Wala sang istasyon", yours: "Imo",
  },
};

function readHomeMunicipality(): string | null {
  try {
    return localStorage.getItem(HOME_MUNICIPALITY_KEY);
  } catch {
    return null;
  }
}

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const styles = `
  .offline-emergency-backdrop { position: fixed; inset: 0; z-index: 10001; display: flex; align-items: flex-end; justify-content: center; padding: 1rem; background: rgba(15, 23, 42, 0.62); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: offlineFadeIn 0.25s ease both; }
  .offline-emergency-sheet { position: relative; width: 100%; max-width: 28rem; max-height: calc(100dvh - 2rem); display: flex; flex-direction: column; overflow: hidden; border-radius: 1.5rem; background: #FFFFFF; color: #0F172A; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35); font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; animation: offlineSlideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .offline-sheet-accent { height: 5px; flex: 0 0 auto; background: linear-gradient(90deg, #DC2626, #EA580C, #F59E0B, #DC2626); background-size: 200% 100%; animation: offlineStripeMove 3s linear infinite; }
  .offline-sheet-scroll { overflow-y: auto; padding: 1.25rem 1.2rem 1.2rem; display: grid; gap: 0.85rem; }
  .offline-sheet-close { position: absolute; top: 0.9rem; right: 0.9rem; z-index: 1; width: 2.1rem; height: 2.1rem; display: grid; place-items: center; border: 1px solid #E2E8F0; border-radius: 50%; background: #F8FAFC; color: #475569; font-size: 1.25rem; line-height: 1; cursor: pointer; }
  .offline-header { display: flex; align-items: flex-start; gap: 0.85rem; padding-right: 2.2rem; }
  .offline-icon-box { flex: 0 0 auto; width: 2.75rem; height: 2.75rem; display: grid; place-items: center; border-radius: 0.85rem; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; }
  .offline-icon-box svg { width: 1.3rem; height: 1.3rem; }
  .offline-header h3 { margin: 0; font-size: 1.1rem; font-weight: 850; }
  .offline-header p { margin: 0.25rem 0 0; color: #475569; font-size: 0.84rem; line-height: 1.45; }
  .offline-call-btn { display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem 0.95rem; border-radius: 1rem; text-decoration: none; transition: transform 0.15s ease; }
  .offline-call-btn:active { transform: scale(0.98); }
  .offline-call-btn .offline-call-icon { flex: 0 0 auto; width: 2.6rem; height: 2.6rem; display: grid; place-items: center; border-radius: 50%; }
  .offline-call-btn .offline-call-icon svg { width: 1.15rem; height: 1.15rem; }
  .offline-call-text { display: grid; gap: 0.1rem; min-width: 0; }
  .offline-call-text small { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.85; }
  .offline-call-text strong { font-size: 0.98rem; font-weight: 850; line-height: 1.25; }
  .offline-call-text span { font-size: 0.86rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .offline-call-bfp { background: linear-gradient(135deg, #DC2626, #B91C1C); color: #FFFFFF; box-shadow: 0 12px 24px -14px rgba(185, 28, 28, 0.9); }
  .offline-call-bfp .offline-call-icon { background: rgba(255, 255, 255, 0.18); }
  .offline-call-911 { background: #0F172A; color: #FFFFFF; }
  .offline-call-911 .offline-call-icon { background: rgba(255, 255, 255, 0.12); }
  .offline-all-toggle { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%; padding: 0.8rem 0.95rem; border: 1px solid #E2E8F0; border-radius: 0.9rem; background: #F8FAFC; color: #0F172A; font: inherit; font-size: 0.88rem; font-weight: 800; cursor: pointer; }
  .offline-all-toggle span:last-child { color: #DC2626; font-size: 0.8rem; }
  .offline-search { width: 100%; padding: 0.7rem 0.85rem; border: 1px solid #CBD5E1; border-radius: 0.75rem; font: inherit; font-size: 0.88rem; }
  .offline-search:focus { outline: 3px solid rgba(220, 38, 38, 0.18); border-color: #DC2626; }
  .offline-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
  .offline-list a { display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 0.75rem; border: 1px solid #E2E8F0; border-radius: 0.8rem; background: #FFFFFF; color: #0F172A; text-decoration: none; }
  .offline-list a.is-home { border-color: #FCA5A5; background: #FFF5F5; }
  .offline-list-text { display: grid; gap: 0.05rem; min-width: 0; flex: 1; }
  .offline-list-text strong { font-size: 0.86rem; font-weight: 800; }
  .offline-list-text span { color: #475569; font-size: 0.8rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .offline-list-tag { padding: 0.15rem 0.5rem; border-radius: 999px; background: #DC2626; color: #fff; font-size: 0.66rem; font-weight: 800; }
  .offline-list-call { flex: 0 0 auto; width: 2.2rem; height: 2.2rem; display: grid; place-items: center; border-radius: 50%; background: #FEF2F2; color: #DC2626; }
  .offline-list-call svg { width: 1rem; height: 1rem; }
  .offline-empty { margin: 0; color: #64748B; font-size: 0.82rem; text-align: center; }
  .offline-minimized-pill { position: fixed; left: 50%; bottom: calc(5.4rem + env(safe-area-inset-bottom, 0px)); z-index: 10000; transform: translateX(-50%); display: flex; align-items: center; gap: 0.55rem; padding: 0.6rem 1rem; border: 0; border-radius: 999px; background: #DC2626; color: #FFFFFF; font: inherit; font-size: 0.82rem; font-weight: 800; box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4); cursor: pointer; animation: offlineFloatIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .offline-minimized-pill svg { width: 1rem; height: 1rem; }
  .offline-min-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #FEF08A; box-shadow: 0 0 8px #FACC15; animation: offlineDotBlink 1.2s ease-in-out infinite; }
  @keyframes offlineSlideUp { from { opacity: 0; transform: translateY(2.5rem) scale(0.96); } to { opacity: 1; transform: none; } }
  @keyframes offlineFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes offlineStripeMove { from { background-position: 0% 0%; } to { background-position: 200% 0%; } }
  @keyframes offlineDotBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes offlineFloatIn { from { opacity: 0; transform: translate(-50%, 1rem); } to { opacity: 1; transform: translate(-50%, 0); } }
  @media (max-width: 600px) {
    .offline-emergency-backdrop { padding: 0.5rem 0.5rem calc(4.5rem + env(safe-area-inset-bottom, 0px)); }
    .offline-emergency-sheet { max-height: calc(100dvh - 5.5rem); border-radius: 1.25rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .offline-emergency-backdrop, .offline-emergency-sheet, .offline-sheet-accent, .offline-min-dot, .offline-minimized-pill { animation: none; }
  }
`;

function HotlineLink({ hotline, home, yoursLabel }: { hotline: BfpHotline; home: boolean; yoursLabel: string }) {
  return (
    <li>
      <a href={hotlineHref(hotline.phone)} className={home ? "is-home" : undefined} aria-label={`Call ${hotline.name}, ${formatHotline(hotline.phone)}`}>
        <span className="offline-list-text">
          <strong>{hotline.name}</strong>
          <span>{formatHotline(hotline.phone)}</span>
        </span>
        {home && <span className="offline-list-tag">{yoursLabel}</span>}
        <span className="offline-list-call"><PhoneIcon /></span>
      </a>
    </li>
  );
}

export function ResidentOfflineEmergency() {
  const { lang } = useResidentLanguage();
  const text = TEXT[lang] ?? TEXT.en;
  const [isOffline, setIsOffline] = useState(false);
  const [openedByRequest, setOpenedByRequest] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [homeMunicipality, setHomeMunicipality] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => queueMicrotask(() => setIsOffline(!navigator.onLine));
    sync();
    queueMicrotask(() => setHomeMunicipality(readHomeMunicipality()));

    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setOpenedByRequest(false);
      setIsDismissed(false);
    };
    const handleOpen = () => {
      setOpenedByRequest(true);
      setIsDismissed(false);
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener(OPEN_BFP_HOTLINES, handleOpen);

    // Learn the registered municipality while online, so it is known offline.
    if (navigator.onLine) {
      void fetch("/api/resident/profile", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { profile?: { municipality?: string } } | null) => {
          const municipality = data?.profile?.municipality;
          if (!municipality || !hotlineForMunicipality(municipality)) return;
          try {
            localStorage.setItem(HOME_MUNICIPALITY_KEY, municipality);
          } catch {
            // Storage can be blocked; the full list still works.
          }
          setHomeMunicipality(municipality);
        })
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener(OPEN_BFP_HOTLINES, handleOpen);
    };
  }, []);

  const home = useMemo(() => hotlineForMunicipality(homeMunicipality), [homeMunicipality]);
  const listed = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = BFP_HOTLINES.filter((hotline) => !term
      || hotline.name.toLowerCase().includes(term)
      || hotline.municipality.toLowerCase().includes(term));
    // The resident's own station first; the rest stay in the poster's order.
    return home ? [...matches.filter((hotline) => hotline.id === home.id), ...matches.filter((hotline) => hotline.id !== home.id)] : matches;
  }, [query, home]);

  const visible = isOffline || openedByRequest;
  if (!visible) return null;
  const expanded = showAll || !home || query.length > 0;

  return (
    <>
      <style>{styles}</style>
      {isDismissed ? (
        <button type="button" className="offline-minimized-pill" onClick={() => setIsDismissed(false)}>
          <span className="offline-min-dot" aria-hidden="true" />
          <PhoneIcon />
          <span>{text.pill}</span>
        </button>
      ) : (
        <div
          className="offline-emergency-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offlineEmergencyTitle"
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            if (isOffline) setIsDismissed(true);
            else setOpenedByRequest(false);
          }}
        >
          <aside className="offline-emergency-sheet">
            <div className="offline-sheet-accent" />
            <button
              type="button"
              className="offline-sheet-close"
              onClick={() => (isOffline ? setIsDismissed(true) : setOpenedByRequest(false))}
              aria-label={text.close}
            >
              ×
            </button>
            <div className="offline-sheet-scroll">
              <div className="offline-header">
                <div className="offline-icon-box"><PhoneIcon /></div>
                <div>
                  <h3 id="offlineEmergencyTitle">{isOffline ? text.offlineTitle : text.callTitle}</h3>
                  <p>{isOffline ? text.offlineBody : text.callBody}</p>
                </div>
              </div>

              {home && (
                <a href={hotlineHref(home.phone)} className="offline-call-btn offline-call-bfp" id="offlineBtnBfp">
                  <span className="offline-call-icon"><PhoneIcon /></span>
                  <span className="offline-call-text">
                    <small>{text.yourStation}</small>
                    <strong>{home.name}</strong>
                    <span>{formatHotline(home.phone)}</span>
                  </span>
                </a>
              )}

              <a href="tel:911" className="offline-call-btn offline-call-911" id="offlineBtn911">
                <span className="offline-call-icon"><PhoneIcon /></span>
                <span className="offline-call-text">
                  <small>{text.national}</small>
                  <strong>911</strong>
                </span>
              </a>

              {home && (
                <button
                  type="button"
                  className="offline-all-toggle"
                  aria-expanded={expanded}
                  onClick={() => {
                    if (expanded) {
                      setShowAll(false);
                      setQuery("");
                    } else {
                      setShowAll(true);
                    }
                  }}
                >
                  <span>{text.allNumbers}</span>
                  <span>{expanded ? text.hideNumbers : `${BFP_HOTLINES.length}`}</span>
                </button>
              )}

              {expanded && (
                <>
                  {!home && <strong style={{ fontSize: "0.88rem" }}>{text.allNumbers}</strong>}
                  <input
                    type="search"
                    className="offline-search"
                    placeholder={text.search}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label={text.search}
                  />
                  {listed.length === 0 ? (
                    <p className="offline-empty">{text.noMatch}</p>
                  ) : (
                    <ul className="offline-list">
                      {listed.map((hotline) => (
                        <HotlineLink key={hotline.id} hotline={hotline} home={hotline.id === home?.id} yoursLabel={text.yours} />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
