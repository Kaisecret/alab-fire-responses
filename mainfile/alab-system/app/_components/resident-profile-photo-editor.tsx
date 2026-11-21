"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_RESIDENT_PHOTO, RESIDENT_PHOTO_CHANGED } from "../_lib/resident-profile-photo";
import { lockBodyScroll } from "../_lib/body-scroll-lock";
import { useResidentText } from "../_lib/resident-text";
import { RESIDENT_TEXT } from "../_content/resident-text";
import { shrinkPhoto } from "../_lib/shrink-photo";
import { ResidentSelfieCapture, residentSelfieCaptureStyles, trapDialogFocus } from "./resident-selfie-capture";

type Props = { currentPhoto: string | null; onClose: () => void };

export function ResidentProfilePhotoEditor({ currentPhoto, onClose }: Props) {
  const tx = useResidentText(RESIDENT_TEXT);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const opener = document.activeElement as HTMLElement | null;
    const unlockScroll = lockBodyScroll(document.body);
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      // The camera dialog owns its own Escape/focus handling while it is open.
      if (dialogRef.current?.querySelector(".selfie-overlay")) return;
      if (event.key === "Escape" && !busyRef.current) onClose();
      else if (dialogRef.current) trapDialogFocus(event, dialogRef.current, document.activeElement);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      unlockScroll();
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose]);

  const selectPhoto = useCallback((selected: File | null) => {
    setError("");
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    if (selected && (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size > 20 * 1024 * 1024 || !selected.size)) {
      setError("Choose a JPG, PNG, or WebP photo smaller than 20 MB.");
      setFile(null);
      return;
    }
    if (selected) {
      previewRef.current = URL.createObjectURL(selected);
      setPreview(previewRef.current);
    }
    setFile(selected);
  }, []);

  const save = async (remove = false) => {
    if (busyRef.current || (!remove && !file)) return;
    busyRef.current = true;
    setBusy(true); setError("");
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      let body: FormData | undefined;
      if (!remove && file) {
        const prepared = await shrinkPhoto(file, { maxSize: 1024, maxBytes: 1024 * 1024 });
        if (controller.signal.aborted || !mountedRef.current) return;
        if (prepared.size > 3 * 1024 * 1024) throw new Error("This photo is too large. Choose a smaller image or take a new photo.");
        body = new FormData(); body.set("photo", prepared);
      }
      const response = await fetch("/api/resident/profile/photo", { method: remove ? "DELETE" : "POST", body, signal: controller.signal });
      const result = await response.json().catch(() => ({})) as { photoUrl?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save your photo. Please try again.");
      if (!remove && !result.photoUrl) throw new Error("Your photo was saved, but the preview could not load. Please reload your profile.");
      if (!mountedRef.current) return;
      window.dispatchEvent(new CustomEvent(RESIDENT_PHOTO_CHANGED, { detail: { photoUrl: result.photoUrl ?? null } }));
      onClose();
    } catch (cause) {
      if (mountedRef.current) setError(controller.signal.aborted ? "The upload timed out. Please try again." : cause instanceof Error ? cause.message : "Unable to save your photo. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  return <div className="rpp-backdrop">
    <style>{residentSelfieCaptureStyles}{styles}</style>
    <section ref={dialogRef} className="rpp-dialog" role="dialog" aria-modal="true" aria-labelledby="rpp-title">
      <button ref={closeRef} className="rpp-close" type="button" disabled={busy} onClick={onClose} aria-label={tx("Close photo editor")}>×</button>
      <h2 id="rpp-title">{tx("Your profile photo")}</h2>
      <p>{tx("Take a new photo or choose one from your device.")}</p>
      <img className="rpp-preview" src={preview || currentPhoto || DEFAULT_RESIDENT_PHOTO} alt={tx("Profile photo preview")} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={event => {
        const selected = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (selected) { setCameraKey(value => value + 1); selectPhoto(selected); }
      }} />
      <button className="rpp-choose" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>{tx("Choose from device")}</button>
      <ResidentSelfieCapture key={cameraKey} onCapture={selectPhoto} disabled={busy} />
      <p className="rpp-hint">{tx("JPG, PNG, or WebP. Large photos are resized automatically.")}</p>
      {error && <p className="rpp-error" role="alert">{tx(error)}</p>}
      <button className="rpp-save" type="button" disabled={busy || !file} onClick={() => void save()}>{busy ? tx("Saving…") : tx("Save photo")}</button>
      {currentPhoto && <button className="rpp-remove" type="button" disabled={busy} onClick={() => void save(true)}>{tx("Use default photo")}</button>}
    </section>
  </div>;
}

const styles = `
.rpp-backdrop{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:1rem;background:rgba(15,23,42,.65);overflow:auto}
.rpp-dialog{position:relative;width:min(100%,26rem);max-height:calc(100dvh - 2rem);overflow-y:auto;padding:1.8rem;border-radius:20px;background:#fff;color:#1e293b;font-family:inherit;box-shadow:0 24px 80px rgba(0,0,0,.25)}
.rpp-dialog h2{margin:0 2rem .4rem 0;font-size:1.4rem;font-weight:800}.rpp-dialog>p{margin:0 0 1rem;color:#64748b;line-height:1.5;font-size:.9rem}
.rpp-close{position:absolute;right:.8rem;top:.7rem;width:2.5rem;height:2.5rem;border:0;background:transparent;font-size:1.7rem;color:#475569;cursor:pointer}
.rpp-preview{display:block;width:8rem;height:8rem;object-fit:cover;border-radius:50%;margin:1rem auto 1.3rem;background:#e2e8f0;border:3px solid #f1f5f9}
.rpp-choose,.rpp-save,.rpp-remove{width:100%;min-height:48px;padding:.8rem 1rem;border-radius:12px;font:inherit;font-size:.9rem;font-weight:750;cursor:pointer}
.rpp-choose{background:#f8fafc;color:#334155;border:1px solid #cbd5e1;margin-bottom:.6rem}.rpp-save{background:#d91b10;color:#fff;border:0;margin-top:.8rem}.rpp-remove{border:0;background:transparent;color:#64748b;margin-top:.3rem}
.rpp-dialog>p.rpp-hint{font-size:.76rem;margin:.9rem 0 0}.rpp-dialog>p.rpp-error{color:#b91c1c;background:#fef2f2;border-radius:10px;padding:.7rem;margin-top:.8rem}
.rpp-dialog button:disabled{opacity:.55;cursor:wait}.rpp-dialog button:focus-visible{outline:3px solid #f59e0b;outline-offset:3px}
@media (max-width:640px){.rpp-backdrop{place-items:end stretch;padding:0}.rpp-dialog{width:100%;max-height:92dvh;padding:1.5rem 1rem calc(1rem + env(safe-area-inset-bottom));border-radius:24px 24px 0 0}}
`;
