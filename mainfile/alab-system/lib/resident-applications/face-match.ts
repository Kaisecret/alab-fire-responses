import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type * as Ort from "onnxruntime-node";
import { alignRgbFace, cosineSimilarity, decodeYuNet, FaceInputError, mergeTileFaces, selectSingleFace, tileStarts } from "./face-match-math.mjs";

export type FaceMatchResult =
  | { ok: true; score: number; threshold: number }
  | { ok: false; code: string; message: string };

// Published SFace LFW cosine operating point, not a probability of identity.
const THRESHOLD = 0.363;
const DETECTOR_SIZE = 640;
// The ID is searched at these longest sides, upright first and then turned, so
// a whole-card photo or a card photographed sideways still yields its portrait.
const ID_SEARCH_SIZES = [DETECTOR_SIZE, 1280, 2048];
const ID_SEARCH_ANGLES = [0, 90, 270, 180];
// Printed ID portraits score lower than live faces. The looser score is used
// only when no size or angle has a strict face: used first, it would accept a
// sideways face with wrong landmarks before the photo is turned upright.
const STRICT_SCORE = 0.9, ID_LOOSE_SCORE = 0.8;
const MODEL_FILES = [
  { file: "face_detection_yunet_2023mar.onnx", sha256: "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4" },
  { file: "face_recognition_sface_2021dec.onnx", sha256: "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79" },
];
type Runtime = { ort: typeof Ort; detector: Ort.InferenceSession; recognizer: Ort.InferenceSession };
type Image = { rgb: Buffer; width: number; height: number };
type Face = { box: number[]; landmarks: number[][]; score: number };
let runtimePromise: Promise<Runtime> | undefined;
let inFlightComparisons = 0;

async function runtime(): Promise<Runtime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const ort = await import("onnxruntime-node");
      const buffers = await Promise.all(MODEL_FILES.map(async (model) => {
        const bytes = await readFile(path.join(process.cwd(), "models", "resident-face", model.file));
        if (createHash("sha256").update(bytes).digest("hex") !== model.sha256) throw new Error("Face model integrity failure");
        return bytes;
      }));
      const options: Ort.InferenceSession.SessionOptions = {
        executionProviders: ["cpu"], intraOpNumThreads: 2, interOpNumThreads: 1,
        executionMode: "sequential", graphOptimizationLevel: "all", logSeverityLevel: 3,
      };
      const detector = await ort.InferenceSession.create(buffers[0], options);
      try {
        const recognizer = await ort.InferenceSession.create(buffers[1], options);
        const detectorShape = detector.inputMetadata[0];
        const recognizerShape = recognizer.inputMetadata[0];
        if (!detectorShape.isTensor || detectorShape.shape.join() !== "1,3,640,640"
          || !recognizerShape.isTensor || recognizerShape.shape.join() !== "1,3,112,112") {
          await recognizer.release();
          throw new Error("Unexpected face model input shape");
        }
        return { ort, detector, recognizer };
      } catch (error) {
        await detector.release();
        throw error;
      }
    })().catch((error) => {
      // Permit a later request to recover from a transient initialization error.
      runtimePromise = undefined;
      throw error;
    });
  }
  return runtimePromise;
}

async function decodeImage(bytes: Buffer, side: "ID" | "SELFIE"): Promise<Image> {
  try {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 6 * 1024 * 1024) throw new Error("Image size");
    // Same strictness as the upload check, so a photo it accepted is never refused here.
    const image = sharp(bytes, { limitInputPixels: 12_000_000, failOn: "error" });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > 5000 || metadata.height > 5000
      || (metadata.pages ?? 1) !== 1 || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("Image format");
    const largest = side === "ID" ? ID_SEARCH_SIZES.at(-1)! : DETECTOR_SIZE;
    const decoded = await image.rotate().resize(largest, largest, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "white" }).toColourspace("srgb").removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (decoded.info.channels !== 3) throw new Error("Image channels");
    return { rgb: decoded.data, width: decoded.info.width, height: decoded.info.height };
  } catch {
    const label = side === "ID" ? "ID photo" : "selfie";
    throw new FaceInputError(`${side}_IMAGE_INVALID`, `The ${label} could not be read. Please use a clear JPG, PNG, or WebP photo under 6 MB.`);
  }
}

async function resized(image: Image, size: number, angle: number): Promise<Image> {
  const out = await sharp(image.rgb, { raw: { width: image.width, height: image.height, channels: 3 } })
    .rotate(angle).resize(size, size, { fit: "inside", withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  return { rgb: out.data, width: out.info.width, height: out.info.height };
}

async function detectFaces(image: Image, loaded: Runtime, minScore: number): Promise<Face[]> {
  const faces: Face[] = [];
  for (const top of tileStarts(image.height)) for (const left of tileStarts(image.width)) {
    // FaceDetectorYN uses blobFromImage(BGR), scale=1, mean=0, no swapRB.
    // The pinned ONNX has fixed 640x640 input: pad only its bottom/right in black.
    const pixels = new Float32Array(3 * DETECTOR_SIZE * DETECTOR_SIZE);
    const rows = Math.min(DETECTOR_SIZE, image.height - top), cols = Math.min(DETECTOR_SIZE, image.width - left);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const src = ((top + y) * image.width + left + x) * 3, dst = y * DETECTOR_SIZE + x;
      for (let c = 0; c < 3; c++) pixels[c * DETECTOR_SIZE * DETECTOR_SIZE + dst] = image.rgb[src + 2 - c];
    }
    const detections = await loaded.detector.run({
      [loaded.detector.inputNames[0]]: new loaded.ort.Tensor("float32", pixels, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]),
    });
    for (const face of decodeYuNet(detections, DETECTOR_SIZE, DETECTOR_SIZE, minScore) as Face[]) {
      faces.push({ ...face, box: [face.box[0] + left, face.box[1] + top, face.box[2], face.box[3]],
        landmarks: face.landmarks.map(([x, y]) => [x + left, y + top]) });
    }
  }
  return mergeTileFaces(faces);
}

// The selfie is checked once at 640px, as before. The ID stops at the first
// size and angle where a face is found; larger sizes also give a sharper crop.
async function findFace(image: Image, side: "ID" | "SELFIE", loaded: Runtime): Promise<{ view: Image; face: Face }> {
  let loose: { angle: number; size: number; faces: Face[] } | undefined;
  for (const angle of side === "ID" ? ID_SEARCH_ANGLES : [0]) {
    let previous = 0;
    for (const size of side === "ID" ? ID_SEARCH_SIZES : [DETECTOR_SIZE]) {
      const view = await resized(image, size, angle);
      const longest = Math.max(view.width, view.height);
      if (longest <= previous) break; // the photo is smaller than this size
      previous = longest;
      const faces = await detectFaces(view, loaded, side === "ID" ? ID_LOOSE_SCORE : STRICT_SCORE);
      const strict = faces.filter((face) => face.score >= STRICT_SCORE);
      if (strict.length) return { view, face: selectSingleFace(strict, side, view.width, view.height) };
      if (faces.length && !loose) loose = { angle, size, faces };
    }
  }
  if (!loose) return selectSingleFace([], side, 0, 0); // throws the "no clear face" error
  const view = await resized(image, loose.size, loose.angle);
  return { view, face: selectSingleFace(loose.faces, side, view.width, view.height) };
}

async function embedding(image: Image, side: "ID" | "SELFIE", loaded: Runtime): Promise<Float32Array> {
  const { view, face } = await findFace(image, side, loaded);
  let aligned: Float32Array;
  try {
    aligned = alignRgbFace(view.rgb, view.width, view.height, face.landmarks);
  } catch {
    throw new FaceInputError(`${side}_FACE_UNCLEAR`, `The face in the ${side === "ID" ? "ID photo" : "selfie"} is unclear. Please take a clearer photo.`);
  }
  // FaceRecognizerSF: 112x112 aligned bytes, scale=1, mean=0, BGR->RGB.
  // Sharp already decoded RGB, so the alignment helper produces raw RGB NCHW.
  const outputs = await loaded.recognizer.run({
    [loaded.recognizer.inputNames[0]]: new loaded.ort.Tensor("float32", aligned, [1, 3, 112, 112]),
  });
  const feature = outputs[loaded.recognizer.outputNames[0]];
  if (feature.type !== "float32" || feature.dims.join() !== "1,128" || feature.data.length !== 128) throw new Error("Unexpected face embedding shape");
  return feature.data as Float32Array;
}

export async function compareResidentFaces(idImage: Buffer, selfieImage: Buffer): Promise<FaceMatchResult> {
  // Fluid/server instances may receive concurrent requests. Keep at most two
  // decoded evidence pairs in memory; never retain images in a waiting queue.
  if (inFlightComparisons >= 2) {
    return { ok: false, code: "FACE_SERVICE_BUSY", message: "Face comparison is busy. Please try again in a moment." };
  }
  inFlightComparisons++;
  try {
    // Image evidence and features remain request-local and are never logged or saved.
    const id = await decodeImage(idImage, "ID");
    const selfie = await decodeImage(selfieImage, "SELFIE");
    const loaded = await runtime();
    const idFeature = await embedding(id, "ID", loaded);
    const selfieFeature = await embedding(selfie, "SELFIE", loaded);
    const score = cosineSimilarity(idFeature, selfieFeature);
    if (score < THRESHOLD) {
      return { ok: false, code: "FACE_MISMATCH", message: "The selfie did not match the face on your ID. Please retake a clear selfie with your face fully visible." };
    }
    return { ok: true, score, threshold: THRESHOLD };
  } catch (error) {
    if (error instanceof FaceInputError) return { ok: false, code: error.code, message: error.message };
    return { ok: false, code: "FACE_SERVICE_UNAVAILABLE", message: "Face comparison is temporarily unavailable. Please try again." };
  } finally {
    inFlightComparisons--;
  }
}
