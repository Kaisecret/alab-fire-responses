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
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

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

export type CameraAttemptCoordinator = ReturnType<typeof createCameraAttemptCoordinator>;

/** Coordinates async permission and encoding work without tying it to React. */
export function createCameraAttemptCoordinator() {
  let currentAttempt = 0;
  let encodingAttempt: number | null = null;

  return {
    begin() {
      currentAttempt += 1;
      encodingAttempt = null;
      return currentAttempt;
    },
    cancel() {
      currentAttempt += 1;
      encodingAttempt = null;
    },
    isCurrent(attempt: number) {
      return attempt === currentAttempt;
    },
    beginEncoding(attempt: number) {
      if (attempt !== currentAttempt || encodingAttempt !== null) return false;
      encodingAttempt = attempt;
      return true;
    },
    finishEncoding(attempt: number) {
      if (attempt !== currentAttempt || encodingAttempt !== attempt) return false;
      encodingAttempt = null;
      return true;
    },
  };
}

export function stopMediaStream(stream: Pick<MediaStream, "getTracks"> | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Stops a permission result that belongs to a dialog the resident already closed. */
export function settleRequestedStream(
  coordinator: CameraAttemptCoordinator,
  attempt: number,
  stream: Pick<MediaStream, "getTracks">,
) {
  if (coordinator.isCurrent(attempt)) return true;
  stopMediaStream(stream);
  return false;
}

export function hasUsableVideoFrame(
  video: Pick<HTMLVideoElement, "readyState" | "videoWidth" | "videoHeight">,
) {
  return video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
}

/** Keeps keyboard focus inside the full-screen camera dialog. */
export function trapDialogFocus(
  event: Pick<KeyboardEvent, "key" | "shiftKey" | "preventDefault">,
  dialog: Pick<HTMLElement, "querySelectorAll">,
  activeElement: Element | null,
) {
  if (event.key !== "Tab") return false;
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  if (focusable.length === 0) {
    event.preventDefault();
    return true;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

export function restoreDialogFocus(
  opener: Pick<HTMLElement, "focus" | "isConnected"> | null,
  fallback: Pick<HTMLElement, "focus" | "isConnected"> | null,
) {
  const target = opener?.isConnected ? opener : fallback;
  if (!target?.isConnected) return false;
  target.focus();
  return true;
}

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
  const [frameReady, setFrameReady] = useState(false);
  const [encoding, setEncoding] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(true);
  const coordinatorRef = useRef(createCameraAttemptCoordinator());
  const currentAttemptRef = useRef(0);
  // Holds a captured-but-unconfirmed frame until the resident taps "Use this photo".
  const pendingFileRef = useRef<File | null>(null);
  // Lets the Escape handler reach cancel() without re-subscribing on every render.
  const cancelRef = useRef<(() => void) | null>(null);

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
  }, []);

  const releasePreviewUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    const coordinator = coordinatorRef.current;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      coordinator.cancel();
      stopStream();
      releasePreviewUrl();
    };
  }, [stopStream, releasePreviewUrl]);

  // The camera takes over the whole screen while open, so lock background
  // scrolling, contain focus, and restore it to the control that opened it.
  const overlayOpen = state === "requesting" || state === "live" || state === "captured";
  useEffect(() => {
    if (!overlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    const opener = openerRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelRef.current?.();
        return;
      }
      if (overlayRef.current) {
        trapDialogFocus(event, overlayRef.current, document.activeElement);
      }
    };
    window.addEventListener("keydown", handleDialogKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKey);
      if (mountedRef.current) {
        const fallback = rootRef.current?.querySelector<HTMLElement>(".selfie-open-btn,.selfie-retake-btn") ?? null;
        restoreDialogFocus(opener, fallback);
      }
    };
  }, [overlayOpen]);

  const openCamera = useCallback(async () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      openerRef.current = document.activeElement;
    }
    setErrorKind(null);
    releasePreviewUrl();
    setPreviewUrl(null);
    pendingFileRef.current = null;
    setFrameReady(false);
    setEncoding(false);

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setState("error"); setErrorKind("insecure-context");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error"); setErrorKind("unsupported");
      return;
    }

    const attempt = coordinatorRef.current.begin();
    currentAttemptRef.current = attempt;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      });
      const accepted = settleRequestedStream(coordinatorRef.current, attempt, stream);
      if (!mountedRef.current || !accepted) {
        if (!mountedRef.current && accepted) stopMediaStream(stream);
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setState("live");
      setAnnouncement("Camera preview is loading.");
    } catch (error) {
      if (!mountedRef.current || !coordinatorRef.current.isCurrent(attempt)) return;
      stopStream();
      setState("error");
      setErrorKind(classifyGetUserMediaError(error));
    }
  }, [releasePreviewUrl, stopStream]);

  const updateFrameReadiness = useCallback(() => {
    const ready = Boolean(videoRef.current && hasUsableVideoFrame(videoRef.current));
    setFrameReady(ready);
    if (ready) setAnnouncement("Camera preview is live. Center your face and take the photo.");
  }, []);

  useEffect(() => {
    if (state !== "captured" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [state]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const attempt = currentAttemptRef.current;
    if (!video || !hasUsableVideoFrame(video) || !coordinatorRef.current.beginEncoding(attempt)) return;
    setEncoding(true);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      coordinatorRef.current.finishEncoding(attempt);
      setEncoding(false);
      stopStream();
      setState("error"); setErrorKind("encoding-failed");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      canvas.toBlob((blob) => {
        if (!coordinatorRef.current.finishEncoding(attempt) || !mountedRef.current) return;
        setEncoding(false);
        stopStream();
        if (!blob || blob.size === 0 || blob.size > MAX_SELFIE_BYTES) {
          setState("error"); setErrorKind("encoding-failed");
          return;
        }
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPreviewUrl(url);
        setState("captured");
        setAnnouncement("Photo captured. Confirm to use it, or retake.");
        const file = new File([blob], `resident-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
        pendingFileRef.current = file;
      }, "image/jpeg", 0.92);
    } catch {
      if (!coordinatorRef.current.finishEncoding(attempt)) return;
      setEncoding(false);
      stopStream();
      setState("error");
      setErrorKind("encoding-failed");
    }
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
    coordinatorRef.current.cancel();
    stopStream();
    releasePreviewUrl();
    setPreviewUrl(null);
    onCapture(null);
    pendingFileRef.current = null;
    setFrameReady(false);
    setEncoding(false);
    setState("idle");
  }, [onCapture, releasePreviewUrl, stopStream]);

  useEffect(() => { cancelRef.current = cancel; }, [cancel]);

  return (
    <div ref={rootRef} className="selfie-capture">
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
        <div className="selfie-ready-row">
          <img src={previewUrl} alt="Confirmed selfie" className="selfie-thumb-img" />
          <span className="selfie-thumb-meta">
            <span className="selfie-thumb-ok"><span aria-hidden="true">✓</span> Selfie ready</span>
            <span className="selfie-thumb-hint">Ready to submit</span>
          </span>
          <button type="button" className="selfie-retake-btn" onClick={retake} disabled={disabled}>Retake</button>
        </div>
      )}

      {overlayOpen && (
        <div ref={overlayRef} className="selfie-overlay" role="dialog" aria-modal="true" aria-label="Take a new selfie">
          <div className="selfie-overlay-stage">
            {state !== "captured" && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="selfie-overlay-video"
                onLoadedData={updateFrameReadiness}
                onCanPlay={updateFrameReadiness}
                onResize={updateFrameReadiness}
              />
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
              <button ref={closeButtonRef} type="button" className="selfie-close" onClick={cancel} aria-label="Close camera">✕</button>
            </div>
          </div>

          <div className="selfie-overlay-bar">
            {state === "live" && (
              <>
                <span className="selfie-bar-side" />
                <button
                  type="button"
                  className="selfie-shutter"
                  onClick={takePhoto}
                  aria-label={encoding ? "Processing photo" : frameReady ? "Take photo" : "Camera preview is loading"}
                  disabled={!frameReady || encoding || disabled}
                />
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
.selfie-open-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;min-height:48px;padding:1rem;border:1px solid #d7dee8;border-radius:12px;background:#fff;font-family:inherit;font-size:.92rem;font-weight:800;color:#7f1d1d;cursor:pointer}
.selfie-open-btn:disabled{opacity:.6;cursor:not-allowed}
.selfie-camera-icon{font-size:1.2rem}
.selfie-spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:selfie-spin .8s linear infinite}
@keyframes selfie-spin{to{transform:rotate(360deg)}}

/* Neutral confirmed-photo row shown inline once the overlay closes. */
.selfie-ready-row{display:flex;align-items:center;gap:.75rem;width:100%;padding:.65rem;border:1px solid #d7dee8;border-radius:12px;background:#fff}
.selfie-thumb-img{width:56px;height:56px;border-radius:12px;object-fit:cover;background:#111;flex:none}
.selfie-thumb-meta{display:grid;gap:.15rem;flex:1;min-width:0}
.selfie-thumb-ok{font-weight:850;font-size:.88rem;color:#16834b}
.selfie-thumb-hint{font-size:.78rem;color:#64748b}
.selfie-retake-btn{min-width:72px;min-height:44px;padding:.65rem .8rem;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155;font-family:inherit;font-size:.84rem;font-weight:800;cursor:pointer}
.selfie-retake-btn:disabled{opacity:.6;cursor:not-allowed}

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
.selfie-close{width:2.75rem;height:2.75rem;flex:none;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-family:inherit;font-size:1rem;font-weight:800;cursor:pointer;backdrop-filter:blur(8px)}
.selfie-overlay-bar{display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:1.1rem 1.2rem calc(1.4rem + env(safe-area-inset-bottom));background:#000}
.selfie-bar-side{flex:1;min-width:0}
.selfie-bar-text{color:rgba(255,255,255,.5);font-size:.75rem;font-weight:700;text-align:right}
.selfie-shutter{width:4.6rem;height:4.6rem;flex:none;border:5px solid rgba(255,255,255,.35);border-radius:50%;background:#fff;cursor:pointer;transition:transform .12s ease}
.selfie-shutter:active{transform:scale(.92)}
.selfie-shutter:disabled{opacity:.5;cursor:not-allowed}
.selfie-ghost-btn,.selfie-use-btn{flex:1;min-height:48px;padding:1rem;border-radius:13px;font-family:inherit;font-size:.95rem;font-weight:800;cursor:pointer}
.selfie-ghost-btn{border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff}
.selfie-use-btn{border:0;background:#db1b0d;color:#fff}
.selfie-ghost-btn:disabled,.selfie-use-btn:disabled{opacity:.55;cursor:not-allowed}
.selfie-primary-btn,.selfie-secondary-btn,.selfie-confirmed-btn{flex:1;min-height:44px;padding:.85rem 1rem;border-radius:11px;font-family:inherit;font-size:.88rem;font-weight:800;cursor:pointer;border:1px solid transparent}
.selfie-primary-btn{background:#db1b0d;color:#fff}
.selfie-secondary-btn{background:#fff;border-color:#cbd5e1;color:#334155}
.selfie-secondary-btn:disabled{opacity:.6;cursor:not-allowed}
.selfie-confirmed-btn{background:#effcf4;border-color:#bbf7d0;color:#16834b;cursor:default}
.selfie-captured{display:grid;gap:.4rem}
.selfie-preview-img{width:100%;max-height:60vh;object-fit:cover;border-radius:14px;background:#111}
.selfie-error{padding:1rem;border:1px solid #fecaca;border-radius:12px;background:#fff1f2}
.selfie-error-title{margin:0 0 .3rem;font-weight:800;color:#7f1d1d}
.selfie-error-hint{margin:0 0 .7rem;color:#7f1d1d;font-size:.86rem;line-height:1.5}
.selfie-open-btn:focus-visible,.selfie-retake-btn:focus-visible,.selfie-close:focus-visible,.selfie-shutter:focus-visible,.selfie-ghost-btn:focus-visible,.selfie-use-btn:focus-visible,.selfie-primary-btn:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}
@media(max-width:360px){.selfie-ready-row{flex-wrap:wrap}.selfie-thumb-meta{min-width:8rem}.selfie-retake-btn{width:100%}}
@media(prefers-reduced-motion:reduce){.selfie-overlay{animation:none}.selfie-spinner{animation:none}.selfie-shutter{transition:none}}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;
