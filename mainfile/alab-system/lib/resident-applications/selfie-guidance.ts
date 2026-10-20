import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { createSelfieGuidanceGate } from "./selfie-guidance-math.mjs";

export type SelfieGuidanceDirection = "left" | "right" | "up" | "down" | "closer" | "farther" | "center" | "hold";
export type SelfieGuidanceState = { ready: boolean; progress: number; message: string; code: string; direction?: SelfieGuidanceDirection };
export type SelfieGuidanceHandle = { stop(): void };
export type SelfieGuidanceSession = { start(options: SelfieGuidanceOptions): Promise<SelfieGuidanceHandle>; preload(): void; close(): void };
type Landmark = { x: number; y: number; z: number };
type Runtime = { detect(canvas: HTMLCanvasElement, timestamp: number): Promise<Landmark[][]>; close(): void; frameIntervalMs: number; minimumIdleMs: number };
export type SelfieGuidanceOptions = {
  video: HTMLVideoElement;
  guide: HTMLElement;
  view: "front" | "right" | "left";
  onUpdate(state: SelfieGuidanceState): void;
  onReady(): void;
  signal?: AbortSignal;
};

const ASSET_ROOT = "/models/selfie-guidance/mediapipe-1.1.1-face-landmarker-1";
const BRIGHTNESS_INTERVAL_MS = 1000;

/** Mean luma (0-1) of a small centre patch, or undefined when unreadable. */
function centreBrightness(context: CanvasRenderingContext2D, width: number, height: number): number | undefined {
  try {
    const size = Math.max(1, Math.min(96, width, height));
    const pixels = context.getImageData(Math.floor((width - size) / 2), Math.floor((height - size) / 2), size, size).data;
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 16) sum += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    const value = sum / Math.ceil(pixels.length / 16) / 255;
    return Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}
const abortError = () => new DOMException("Selfie guidance stopped.", "AbortError");
const checkAborted = (signal: AbortSignal) => { if (signal.aborted) throw abortError(); };

async function createWorkerRuntime(signal: AbortSignal): Promise<Runtime> {
  checkAborted(signal);
  const worker = new Worker(`${ASSET_ROOT}/worker.js`);
  let closed = false;
  let pending: { resolve(faces: Landmark[][]): void; reject(error: Error): void; timeout: number } | null = null;
  let readyResolve: (() => void) | null = null;
  let readyReject: ((error: Error) => void) | null = null;
  const ready = new Promise<void>((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const close = () => {
    if (closed) return;
    closed = true;
    signal.removeEventListener("abort", close);
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    readyReject?.(abortError());
    readyReject = null;
    if (pending) window.clearTimeout(pending.timeout);
    pending?.reject(abortError());
    pending = null;
  };
  const fail = (error: Error) => {
    readyReject?.(error);
    readyReject = null;
    if (pending) window.clearTimeout(pending.timeout);
    pending?.reject(error);
    pending = null;
    close();
  };
  signal.addEventListener("abort", close, { once: true });
  worker.onerror = () => fail(new Error("Face guidance worker is unavailable."));
  worker.onmessage = (event: MessageEvent) => {
    if (closed) return;
    const data = event.data;
    if (data?.type === "ready") {
      readyReject = null;
      readyResolve?.();
      readyResolve = null;
    } else if (data?.type === "result") {
      const request = pending;
      pending = null;
      if (request) window.clearTimeout(request.timeout);
      request?.resolve(data.faces);
    } else if (data?.type === "error") {
      fail(new Error("Face guidance could not process the camera."));
    }
  };
  try {
    worker.postMessage({ type: "init" });
    await ready;
    checkAborted(signal);
  } catch (error) {
    close();
    throw error;
  }
  return {
    frameIntervalMs: 120,
    minimumIdleMs: 0,
    async detect(canvas, timestamp) {
      if (closed || pending) throw abortError();
      const bitmap = await createImageBitmap(canvas);
      if (closed) { bitmap.close(); throw abortError(); }
      return new Promise<Landmark[][]>((resolve, reject) => {
        pending = {
          resolve, reject,
          timeout: window.setTimeout(() => fail(new Error("Face guidance inference timed out.")), 10_000),
        };
        try {
          worker.postMessage({ type: "frame", bitmap, timestamp }, [bitmap]);
        } catch (error) {
          bitmap.close();
          if (pending) window.clearTimeout(pending.timeout);
          pending = null;
          reject(error);
        }
      });
    },
    close,
  };
}

async function createCpuRuntime(signal: AbortSignal): Promise<Runtime> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  checkAborted(signal);
  const files = await FilesetResolver.forVisionTasks(`${ASSET_ROOT}/wasm`);
  checkAborted(signal);
  const task: FaceLandmarker = await FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${ASSET_ROOT}/face_landmarker.task`, delegate: "CPU" },
    runningMode: "VIDEO",
    numFaces: 2,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
  if (signal.aborted) { task.close(); throw abortError(); }
  let closed = false;
  return {
    frameIntervalMs: 240,
    minimumIdleMs: 50,
    async detect(canvas, timestamp) {
      if (closed) throw abortError();
      return task.detectForVideo(canvas, timestamp).faceLandmarks;
    },
    close() { if (!closed) { closed = true; task.close(); } },
  };
}

async function createRuntime(signal: AbortSignal): Promise<Runtime> {
  checkAborted(signal);
  const loadingAbort = new AbortController();
  const expiresAt = performance.now() + 90_000;
  let timedOut = false;
  let initialized: Runtime | null = null;
  const cancel = () => { loadingAbort.abort(); initialized?.close(); };
  const expire = () => { timedOut = true; cancel(); };
  const timeout = window.setTimeout(expire, 90_000);
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const initialize = async () => {
      if (typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function") {
        try { return await createWorkerRuntime(loadingAbort.signal); }
        catch {
          // A deadline or owner cancellation must not restart the same model
          // download/compile on the main thread. Explicit worker failures may
          // fall back using only the time left in this initialization budget.
          checkAborted(loadingAbort.signal);
        }
      }
      return createCpuRuntime(loadingAbort.signal);
    };
    const initialization = initialize().then((model) => {
      initialized = model;
      // A synchronous compile can postpone the timer callback. Also close a
      // model that resolves after cancellation while its caller has moved on.
      if (performance.now() >= expiresAt) expire();
      if (loadingAbort.signal.aborted) { model.close(); throw abortError(); }
      return model;
    });
    return await untilAborted(initialization, loadingAbort.signal);
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error("Face guidance took too long to load. Reopen the camera to try again.");
      timeoutError.name = "SelfieGuidanceInitializationTimeoutError";
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
}

/** Wait cancellation never cancels a runtime that belongs to an open dialog. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  checkAborted(signal);
  return new Promise<T>((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); reject(abortError()); };
    signal.addEventListener("abort", abort, { once: true });
    promise.then((value) => { signal.removeEventListener("abort", abort); resolve(value); }, (error) => { signal.removeEventListener("abort", abort); reject(error); });
  });
}

/**
 * One open camera dialog owns one lazily initialized model. start() replaces
 * only the active view. Its handle/signal stops callbacks but retains the model
 * through review/next-view screens. close() MUST run when that dialog closes.
 * A previous view's in-flight frame is discarded before another frame is sent.
 */
export function createSelfieGuidanceSession(): SelfieGuidanceSession {
  const ownerAbort = new AbortController();
  let closed = false;
  let runtime: Runtime | null = null;
  let runtimePromise: Promise<Runtime> | null = null;
  let activeStop: (() => void) | null = null;
  let inFlight: Promise<Landmark[][]> | null = null;
  const close = () => {
    if (closed) return;
    closed = true;
    activeStop?.();
    ownerAbort.abort();
    runtime?.close();
    runtime = null;
    runtimePromise = null;
    inFlight = null;
  };
  const getRuntime = () => {
    if (!runtimePromise) {
      runtimePromise = createRuntime(ownerAbort.signal).then((model) => {
        if (closed) { model.close(); throw abortError(); }
        runtime = model;
        return model;
      }).catch((error) => { runtimePromise = null; throw error; });
    }
    return runtimePromise;
  };
  const detect = async (model: Runtime, canvas: HTMLCanvasElement, signal: AbortSignal) => {
    // Stopped views can leave at most one already-sent frame. Never queue more
    // image bitmaps or send a replacement frame until that request settles.
    while (inFlight) await untilAborted(inFlight.then(() => {}, () => {}), signal);
    checkAborted(signal);
    checkAborted(ownerAbort.signal);
    const request = model.detect(canvas, performance.now());
    inFlight = request;
    const clear = () => { if (inFlight === request) inFlight = null; };
    void request.then(clear, clear);
    return untilAborted(request, signal);
  };
  const start = async ({ video, guide, view, onUpdate, onReady, signal }: SelfieGuidanceOptions): Promise<SelfieGuidanceHandle> => {
    if (closed || signal?.aborted) throw abortError();
    if (typeof window === "undefined" || typeof document === "undefined") throw new Error("Selfie guidance needs a browser.");
    activeStop?.();
    const abort = new AbortController();
    let stopped = false;
    let timer: number | undefined;
    let canvas: HTMLCanvasElement | null = null;
    let gate: ReturnType<typeof createSelfieGuidanceGate> | null = null;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      abort.abort();
      signal?.removeEventListener("abort", stop);
      if (timer !== undefined) window.clearTimeout(timer);
      gate?.stop();
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      if (activeStop === stop) activeStop = null;
    };
    activeStop = stop;
    signal?.addEventListener("abort", stop, { once: true });
    try {
      onUpdate({ ready: false, progress: 0, code: "loading", message: "Preparing face guidance on this device..." });
      const model = await untilAborted(getRuntime(), abort.signal);
      checkAborted(abort.signal);
      canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("This browser cannot prepare the camera image.");
      gate = createSelfieGuidanceGate({ view, onUpdate, onReady, onStop: stop });
      let lastVideoTime = -1;
      // Brightness only explains a missing face, so it is read at most once a
      // second and only while no face is found.
      let faceSeen = true;
      let brightness: number | undefined;
      let brightnessAt = -Infinity;
      const layout = (faces: Landmark[][]) => ({
        faces,
        brightness,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        videoRect: video.getBoundingClientRect(),
        guideRect: guide.getBoundingClientRect(),
        mirrored: true,
      });
      const cameraReady = () => document.visibilityState !== "hidden" && !video.paused && !video.ended && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
      const tick = async () => {
        if (stopped || closed || !canvas || !gate) return;
        const tickStarted = performance.now();
        try {
          if (!cameraReady()) {
            gate.sample({ ...layout([]), videoWidth: 0 }, performance.now());
          } else if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const inputWidth = video.videoWidth;
            const inputHeight = video.videoHeight;
            const scale = Math.min(1, 640 / Math.max(inputWidth, inputHeight));
            const width = Math.max(1, Math.round(inputWidth * scale));
            const height = Math.max(1, Math.round(inputHeight * scale));
            if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
            // drawImage does not apply the <video>'s CSS scaleX(-1).
            context.drawImage(video, 0, 0, width, height);
            if (!faceSeen && tickStarted - brightnessAt >= BRIGHTNESS_INTERVAL_MS) {
              brightnessAt = tickStarted;
              brightness = centreBrightness(context, width, height);
            }
            const faces = await detect(model, canvas, abort.signal);
            faceSeen = faces.length > 0;
            if (!stopped && !closed) {
              if (!cameraReady() || video.videoWidth !== inputWidth || video.videoHeight !== inputHeight) {
                gate.sample({ ...layout([]), videoWidth: 0 }, performance.now());
              } else {
                gate.sample(layout(faces), performance.now());
              }
            }
          }
        } catch {
          if (!stopped && !closed) {
            try { onUpdate({ ready: false, progress: 0, code: "unavailable", message: "Face guidance stopped. Reopen the camera to try again." }); }
            finally { close(); }
          }
        } finally {
          // Fixed start-to-start budget, never parallel inference. Workers can
          // react at ~8fps; main-thread fallback keeps a conservative ~4fps.
          if (!stopped && !closed) timer = window.setTimeout(tick, Math.max(model.minimumIdleMs, model.frameIntervalMs - (performance.now() - tickStarted)));
        }
      };
      timer = window.setTimeout(tick, 0);
      return { stop };
    } catch (error) {
      stop();
      if (!(error instanceof DOMException && error.name === "AbortError")) close();
      throw error;
    }
  };
  // Starts the model download/compile early so the camera opens ready.
  const preload = () => { if (!closed) void getRuntime().catch(() => {}); };
  return { start, preload, close };
}

/** Standalone one-view API: completion, stop, or abort releases its model. */
export async function startSelfieGuidance(options: SelfieGuidanceOptions): Promise<SelfieGuidanceHandle> {
  const session = createSelfieGuidanceSession();
  const close = () => { options.signal?.removeEventListener("abort", close); session.close(); };
  options.signal?.addEventListener("abort", close, { once: true });
  try {
    await session.start({ ...options, onReady: () => { try { options.onReady(); } finally { close(); } } });
    return { stop: close };
  } catch (error) {
    close();
    throw error;
  }
}
