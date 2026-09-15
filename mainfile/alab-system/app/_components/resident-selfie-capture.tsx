"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Camera-only selfie capture for resident correction resubmission.
 * Mirrors the capture mechanism in signup-page.tsx (getUserMedia with a
 * front-facing camera, canvas frame grab, JPEG blob) but as an idiomatic
 * React component instead of that file's imperative DOM wiring — see
 * docs/superpowers/plans/2026-09-15-resident-correction-camera-selfie-plan.md.
 *
 * There is intentionally no upload/gallery/drag-drop path: the only way to
 * produce a file here is to open the camera and take a photo.
 */

const MAX_SELFIE_BYTES = 6 * 1024 * 1024; // keep in sync with lib/resident-applications/evidence.ts

type CaptureState = "idle" | "requesting" | "live" | "captured" | "error";

type ErrorKind = "permission-denied" | "no-camera" | "camera-busy" | "insecure-context" | "encoding-failed" | "unsupported";

const ERROR_COPY: Record<ErrorKind, { title: string; hint: string }> = {
  "permission-denied": {
    title: "Camera access was blocked",
    hint: "Allow camera access for this site in your browser settings, then try again.",
  },
  "no-camera": {
    title: "No camera was found",
    hint: "Connect or enable a camera on this device, then try again.",
  },
  "camera-busy": {
    title: "The camera is in use",
    hint: "Close any other app or tab using your camera, then try again.",
  },
  "insecure-context": {
    title: "Camera requires a secure connection",
    hint: "Open this page over HTTPS to use your camera.",
  },
  "encoding-failed": {
    title: "Could not process the photo",
    hint: "Please retake the selfie.",
  },
  unsupported: {
    title: "Camera is not supported",
    hint: "Try a different browser or device with camera support.",
  },
};

function classifyGetUserMediaError(error: unknown): ErrorKind {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "permission-denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-camera";
  if (name === "NotReadableError" || name === "AbortError") return "camera-busy";
  return "unsupported";
}

export type ResidentSelfieCaptureProps = {
  /** Called with the confirmed JPEG file, or null when the confirmed photo is cleared (e.g. retaken). */
  onCapture: (file: File | null) => void;
  disabled?: boolean;
};

export function ResidentSelfieCapture({ onCapture, disabled }: ResidentSelfieCaptureProps) {
  const [state, setState] = useState<CaptureState>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  // Holds a captured-but-unconfirmed frame until the resident taps "Use this photo".
  const pendingFileRef = useRef<File | null>(null);
  // Lets the Escape handler reach cancel() without re-subscribing on every render.
  const cancelRef = useRef<(() => void) | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const releasePreviewUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopStream();
      releasePreviewUrl();
    };
  }, [stopStream, releasePreviewUrl]);

  // The camera takes over the whole screen while open, so lock background
  // scrolling and let Escape close it the way the resident logout dialog does.
  const overlayOpen = state === "requesting" || state === "live" || state === "captured";
  useEffect(() => {
    if (!overlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelRef.current?.();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [overlayOpen]);

  const openCamera = useCallback(async () => {
    setErrorKind(null);
    releasePreviewUrl();
    setPreviewUrl(null);

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setState("error"); setErrorKind("insecure-context");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error"); setErrorKind("unsupported");
      return;
    }

    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      });
      if (!mountedRef.current) {
        // Permission resolved after unmount — release immediately, keep no reference.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setState("live");
      setAnnouncement("Camera preview is live. Center your face and take the photo.");
    } catch (error) {
      if (!mountedRef.current) return;
      setState("error");
      setErrorKind(classifyGetUserMediaError(error));
    }
  }, [releasePreviewUrl]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setState("error"); setErrorKind("encoding-failed");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!mountedRef.current) return;
      if (!blob || blob.size === 0) {
        setState("error"); setErrorKind("encoding-failed");
        return;
      }
      if (blob.size > MAX_SELFIE_BYTES) {
        setState("error"); setErrorKind("encoding-failed");
        return;
      }
      stopStream();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setPreviewUrl(url);
      setState("captured");
      setAnnouncement("Photo captured. Confirm to use it, or retake.");
      const file = new File([blob], `resident-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      pendingFileRef.current = file;
    }, "image/jpeg", 0.92);
  }, [stopStream]);

  // The photo is only committed to the form when the resident confirms it,
  // so a captured-but-unconfirmed frame never counts as a usable selfie.
  const confirmPhoto = useCallback(() => {
    const file = pendingFileRef.current;
    if (!file) return;
    onCapture(file);
    setState("idle");
    setAnnouncement("Selfie confirmed.");
  }, [onCapture]);

  const retake = useCallback(() => {
    releasePreviewUrl();
    setPreviewUrl(null);
    pendingFileRef.current = null;
    onCapture(null);
    setErrorKind(null);
    void openCamera();
  }, [onCapture, openCamera, releasePreviewUrl]);

  const cancel = useCallback(() => {
    stopStream();
    releasePreviewUrl();
    setPreviewUrl(null);
    onCapture(null);
    pendingFileRef.current = null;
    setState("idle");
  }, [onCapture, releasePreviewUrl, stopStream]);

  useEffect(() => { cancelRef.current = cancel; }, [cancel]);

  return (
    <div className="selfie-capture">
      <div aria-live="polite" className="sr-only">{announcement}</div>

      {state === "idle" && !previewUrl && (
        <button type="button" className="selfie-open-btn" onClick={() => void openCamera()} disabled={disabled}>
          <span className="selfie-camera-icon" aria-hidden="true">📷</span>
          Open camera
        </button>
      )}

      {/* Once confirmed the overlay closes and the photo stays visible in the
          form as a chip, so the resident can see and retake what they sent. */}
      {state === "idle" && previewUrl && (
        <button type="button" className="selfie-thumb" onClick={retake} disabled={disabled}>
          <img src={previewUrl} alt="Confirmed selfie" className="selfie-thumb-img" />
          <span className="selfie-thumb-meta">
            <span className="selfie-thumb-ok">✓ Selfie confirmed</span>
            <span className="selfie-thumb-hint">Tap to retake</span>
          </span>
        </button>
      )}

      {overlayOpen && (
        <div className="selfie-overlay" role="dialog" aria-modal="true" aria-label="Take a new selfie">
          <div className="selfie-overlay-stage">
            {state !== "captured" && (
              <video ref={videoRef} autoPlay playsInline muted className="selfie-overlay-video" />
            )}
            {state === "captured" && previewUrl && (
              <img src={previewUrl} alt="Captured selfie preview" className="selfie-overlay-video" />
            )}

            {state === "requesting" && (
              <div className="selfie-overlay-waiting">
                <span className="selfie-spinner" aria-hidden="true" />
                Requesting camera access…
              </div>
            )}

            {state === "live" && <div className="selfie-oval" aria-hidden="true" />}

            <div className="selfie-overlay-top">
              <p className="selfie-overlay-title">
                {state === "captured"
                  ? "Use this photo?"
                  : state === "requesting"
                    ? "Waiting for camera permission…"
                    : "Center your face in the oval"}
              </p>
              <button type="button" className="selfie-close" onClick={cancel} aria-label="Close camera">✕</button>
            </div>
          </div>

          <div className="selfie-overlay-bar">
            {state === "live" && (
              <>
                <span className="selfie-bar-side" />
                <button type="button" className="selfie-shutter" onClick={takePhoto} aria-label="Take photo" />
                <span className="selfie-bar-side selfie-bar-text">Camera only</span>
              </>
            )}
            {state === "captured" && (
              <>
                <button type="button" className="selfie-ghost-btn" onClick={retake} disabled={disabled}>Retake</button>
                <button type="button" className="selfie-use-btn" onClick={confirmPhoto} disabled={disabled}>Use this photo</button>
              </>
            )}
          </div>
        </div>
      )}

      {state === "error" && errorKind && (
        <div className="selfie-error" role="alert">
          <p className="selfie-error-title">{ERROR_COPY[errorKind].title}</p>
          <p className="selfie-error-hint">{ERROR_COPY[errorKind].hint}</p>
          <button type="button" className="selfie-primary-btn" onClick={() => void openCamera()} disabled={disabled}>Try again</button>
        </div>
      )}
    </div>
  );
}

export const residentSelfieCaptureStyles = `
.selfie-capture{display:grid;gap:.6rem}
.selfie-open-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;padding:1.1rem;border:1px dashed #ef9a91;border-radius:12px;background:#fff;font:800 .92rem inherit;color:#7f1d1d;cursor:pointer}
.selfie-open-btn:disabled{opacity:.6;cursor:not-allowed}
.selfie-camera-icon{font-size:1.2rem}
.selfie-spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:selfie-spin .8s linear infinite}
@keyframes selfie-spin{to{transform:rotate(360deg)}}

/* Confirmed-photo chip shown inline in the form once the overlay closes. */
.selfie-thumb{display:flex;align-items:center;gap:.8rem;width:100%;padding:.7rem;border:1px solid #bbf7d0;border-radius:14px;background:#f0fdf4;cursor:pointer;text-align:left;font:inherit}
.selfie-thumb:disabled{opacity:.6;cursor:not-allowed}
.selfie-thumb-img{width:56px;height:56px;border-radius:12px;object-fit:cover;background:#111;flex:none}
.selfie-thumb-meta{display:grid;gap:.15rem}
.selfie-thumb-ok{font-weight:850;font-size:.88rem;color:#16834b}
.selfie-thumb-hint{font-size:.78rem;color:#64748b}

/* Fullscreen camera. Fixed to the viewport so it covers the page and the
   resident bottom navigation; dvh keeps it correct with mobile browser bars. */
.selfie-overlay{position:fixed;inset:0;z-index:2000;display:grid;grid-template-rows:1fr auto;background:#000;animation:selfie-fade .18s ease-out}
@keyframes selfie-fade{from{opacity:0}to{opacity:1}}
.selfie-overlay-stage{position:relative;overflow:hidden;min-height:0}
.selfie-overlay-video{width:100%;height:100%;object-fit:cover;display:block;transform:scaleX(-1)}
.selfie-overlay-waiting{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:.7rem;color:#fff;font-weight:750;background:#000}
.selfie-oval{position:absolute;left:50%;top:46%;width:min(68vw,19rem);aspect-ratio:3/4;transform:translate(-50%,-50%);border:3px solid rgba(255,255,255,.9);border-radius:50%;box-shadow:0 0 0 100vmax rgba(0,0,0,.45);pointer-events:none}
.selfie-overlay-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:calc(.9rem + env(safe-area-inset-top)) 1rem .9rem;background:linear-gradient(180deg,rgba(0,0,0,.6),transparent)}
.selfie-overlay-title{margin:0;color:#fff;font-weight:800;font-size:.95rem;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.selfie-close{width:2.4rem;height:2.4rem;flex:none;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:1rem;font-weight:800;cursor:pointer;backdrop-filter:blur(8px)}
.selfie-overlay-bar{display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:1.1rem 1.2rem calc(1.4rem + env(safe-area-inset-bottom));background:#000}
.selfie-bar-side{flex:1;min-width:0}
.selfie-bar-text{color:rgba(255,255,255,.5);font-size:.75rem;font-weight:700;text-align:right}
.selfie-shutter{width:4.6rem;height:4.6rem;flex:none;border:5px solid rgba(255,255,255,.35);border-radius:50%;background:#fff;cursor:pointer;transition:transform .12s ease}
.selfie-shutter:active{transform:scale(.92)}
.selfie-ghost-btn,.selfie-use-btn{flex:1;padding:1rem;border-radius:13px;font:800 .95rem inherit;cursor:pointer}
.selfie-ghost-btn{border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff}
.selfie-use-btn{border:0;background:#db1b0d;color:#fff}
.selfie-ghost-btn:disabled,.selfie-use-btn:disabled{opacity:.55;cursor:not-allowed}
.selfie-primary-btn,.selfie-secondary-btn,.selfie-confirmed-btn{flex:1;padding:.85rem 1rem;border-radius:11px;font:800 .88rem inherit;cursor:pointer;border:1px solid transparent}
.selfie-primary-btn{background:#db1b0d;color:#fff}
.selfie-secondary-btn{background:#fff;border-color:#cbd5e1;color:#334155}
.selfie-secondary-btn:disabled{opacity:.6;cursor:not-allowed}
.selfie-confirmed-btn{background:#effcf4;border-color:#bbf7d0;color:#16834b;cursor:default}
.selfie-captured{display:grid;gap:.4rem}
.selfie-preview-img{width:100%;max-height:60vh;object-fit:cover;border-radius:14px;background:#111}
.selfie-error{padding:1rem;border:1px solid #fecaca;border-radius:12px;background:#fff1f2}
.selfie-error-title{margin:0 0 .3rem;font-weight:800;color:#7f1d1d}
.selfie-error-hint{margin:0 0 .7rem;color:#7f1d1d;font-size:.86rem;line-height:1.5}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;
