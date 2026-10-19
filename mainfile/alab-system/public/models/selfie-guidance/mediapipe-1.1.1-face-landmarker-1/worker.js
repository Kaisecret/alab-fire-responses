/* ALAB local-only face geometry worker. Runtime/model attribution: ../README.md. */
/* global Vision */
let task = null;
let processing = false;
let failed = false;

self.onmessage = async ({ data }) => {
  if (failed) { data.bitmap?.close(); return; }
  if (data.type === "init") {
    try {
      importScripts("./vision_bundle.js");
      const root = new URL("./", self.location.href).href;
      const files = await Vision.FilesetResolver.forVisionTasks(`${root}wasm`);
      task = await Vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${root}face_landmarker.task`, delegate: "CPU" },
        runningMode: "VIDEO",
        numFaces: 2,
        minFaceDetectionConfidence: 0.65,
        minFacePresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      self.postMessage({ type: "ready" });
    } catch {
      failed = true;
      task?.close();
      task = null;
      self.postMessage({ type: "error" });
    }
    return;
  }
  if (data.type !== "frame") return;
  if (!task || processing) { data.bitmap?.close(); return; }
  processing = true;
  try {
    const faces = task.detectForVideo(data.bitmap, data.timestamp).faceLandmarks;
    self.postMessage({ type: "result", faces });
  } catch {
    failed = true;
    task?.close();
    task = null;
    self.postMessage({ type: "error" });
  } finally {
    data.bitmap?.close();
    processing = false;
  }
};
