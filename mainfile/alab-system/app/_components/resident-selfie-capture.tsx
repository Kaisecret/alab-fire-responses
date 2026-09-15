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
      onCapture(file);
    }, "image/jpeg", 0.92);
  }, [onCapture, stopStream]);

  const retake = useCallback(() => {
    releasePreviewUrl();
    setPreviewUrl(null);
    onCapture(null);
    setErrorKind(null);
    void openCamera();
  }, [onCapture, openCamera, releasePreviewUrl]);

  const cancel = useCallback(() => {
    stopStream();
    releasePreviewUrl();
    setPreviewUrl(null);
    onCapture(null);
    setState("idle");
  }, [onCapture, releasePreviewUrl, stopStream]);

  return (
    <div className="selfie-capture">
      <div aria-live="polite" className="sr-only">{announcement}</div>

      {state === "idle" && (
        <button type="button" className="selfie-open-btn" onClick={() => void openCamera()} disabled={disabled}>
          <span className="selfie-camera-icon" aria-hidden="true">📷</span>
          Open camera
        </button>
      )}

      {state === "requesting" && (
        <div className="selfie-status">
          <span className="selfie-spinner" aria-hidden="true" />
          Requesting camera access…
        </div>
      )}

      {state === "live" && (
        <div className="selfie-live">
          <div className="selfie-video-frame">
            <video ref={videoRef} autoPlay playsInline muted className="selfie-video" />
            <div className="selfie-face-guide" aria-hidden="true" />
          </div>
          <div className="selfie-live-actions">
            <button type="button" className="selfie-secondary-btn" onClick={cancel}>Cancel</button>
            <button type="button" className="selfie-primary-btn" onClick={takePhoto}>Take photo</button>
          </div>
        </div>
      )}

      {state === "captured" && previewUrl && (
        <div className="selfie-captured">
          <img src={previewUrl} alt="Captured selfie preview" className="selfie-preview-img" />
          <div className="selfie-live-actions">
            <button type="button" className="selfie-secondary-btn" onClick={retake} disabled={disabled}>Retake</button>
            <button type="button" className="selfie-confirmed-btn" disabled>✓ Photo confirmed</button>
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
.selfie-status{display:flex;align-items:center;justify-content:center;gap:.6rem;padding:1.1rem;border:1px solid #e5e7eb;border-radius:12px;color:#64748b;font-weight:700}
.selfie-spinner{display:inline-block;width:16px;height:16px;border:2px solid #fecaca;border-top-color:#db1b0d;border-radius:50%;animation:selfie-spin .8s linear infinite}
@keyframes selfie-spin{to{transform:rotate(360deg)}}
.selfie-video-frame{position:relative;width:100%;aspect-ratio:3/4;max-height:60vh;border-radius:14px;overflow:hidden;background:#111;margin:0 auto}
.selfie-video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
.selfie-face-guide{position:absolute;inset:12% 22%;border:2px dashed rgba(255,255,255,.75);border-radius:50%;pointer-events:none}
.selfie-live-actions{display:flex;gap:.6rem;margin-top:.7rem}
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
