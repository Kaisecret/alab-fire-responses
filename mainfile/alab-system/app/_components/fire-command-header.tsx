"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  slotId: string;
  headingId?: string;
  title: string;
  icon?: string;
  checking?: boolean;
  lastCheckedAt?: Date | null;
  error?: string | null;
  onRefresh?: () => void;
  children?: ReactNode;
};

const styles = `
  .fire-command-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;width:100%;min-width:0;color:#0f172a}
  .fire-command-title{display:flex;align-items:center;gap:.75rem;min-width:0}
  .fire-command-icon{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border-radius:12px;background:#dc2626;color:#fff;font-size:1.2rem;box-shadow:0 3px 8px #dc262625}
  .fire-command-title h1{margin:0;font-size:clamp(1rem,1.5vw,1.35rem);font-weight:800;line-height:1.3;letter-spacing:-.025em}
  .fire-command-controls{display:flex;align-items:center;justify-content:flex-end;gap:.6rem;flex-wrap:wrap;min-width:0}
  .fire-command-status{display:flex;align-items:center;gap:.45rem;padding:.45rem .75rem;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#475569;font-size:.75rem;font-weight:700;white-space:nowrap}
  .fire-command-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px #10b98122}
  .fire-command-status.is-error .fire-command-dot{background:#f59e0b;box-shadow:0 0 0 3px #f59e0b22}
  .fire-command-refresh{display:grid;place-items:center;width:38px;height:38px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#475569;cursor:pointer}
  .fire-command-refresh:hover{border-color:#dc2626;color:#dc2626}
  .fire-command-refresh:focus-visible{outline:2px solid #dc2626;outline-offset:3px}
  .fire-command-refresh:disabled{cursor:wait;opacity:.65}
  .fire-command-fallback{margin-bottom:1rem}
  @media(max-width:640px){.fire-command-header{gap:.5rem;flex-wrap:wrap}.fire-command-title{gap:.5rem;flex:1;min-width:140px}.fire-command-icon{flex-basis:34px;width:34px;height:34px;border-radius:9px;font-size:1rem}.fire-command-status{padding:.35rem .5rem;font-size:.65rem}.fire-command-controls{gap:.35rem;max-width:100%}.fire-command-controls>button:not(.fire-command-refresh){min-width:0;max-width:100%;white-space:normal}.fire-command-refresh{width:34px;height:34px}}
  @media(prefers-reduced-motion:reduce){.fire-command-refresh .fa-spin{animation:none}}
`;

const subscribe = () => () => {};
const serverTarget = () => null;

export function FireCommandHeader({ slotId, headingId, title, icon = "fa-fire-flame-curved", checking = false, lastCheckedAt = null, error, onRefresh, children }: Props) {
  const target = useSyncExternalStore(subscribe, () => document.getElementById(slotId), serverTarget);
  const status = error ? "Live · update unavailable" : checking ? "Live · checking..." : lastCheckedAt ? "Live · checked just now" : "Live · connecting...";
  const header = <>
    <style>{styles}</style>
    <div className="fire-command-header">
      <div className="fire-command-title">
        <span className="fire-command-icon" aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
        <h1 id={headingId}>{title}</h1>
      </div>
      {(children || onRefresh) && <div className="fire-command-controls">
        {children}
        {onRefresh && <span className={`fire-command-status${error ? " is-error" : ""}`} role="status" title={lastCheckedAt ? `Last checked ${lastCheckedAt.toLocaleTimeString()}` : undefined}>
          <span className="fire-command-dot" aria-hidden="true" />{status}
        </span>}
        {onRefresh && <button className="fire-command-refresh" type="button" onClick={onRefresh} disabled={checking} aria-label="Live refresh" title="Live refresh">
          <i className={`fa-solid fa-arrows-rotate${checking ? " fa-spin" : ""}`} aria-hidden="true" />
        </button>}
      </div>}
    </div>
  </>;
  return target ? createPortal(header, target) : <header className="fire-command-fallback">{header}</header>;
}
