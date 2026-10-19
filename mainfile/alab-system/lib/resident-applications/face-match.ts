import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type * as Ort from "onnxruntime-node";
import { alignRgbFace, cosineSimilarity, decodeYuNet, FaceInputError, selectSingleFace } from "./face-match-math.mjs";

export type FaceMatchResult =
  | { ok: true; score: number; threshold: number }
  | { ok: false; code: string; message: string };

// Published SFace LFW cosine operating point, not a probability of identity.
const THRESHOLD = 0.363;
const DETECTOR_SIZE = 640;
const MODEL_FILES = [
  { file: "face_detection_yunet_2023mar.onnx", sha256: "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4" },
  { file: "face_recognition_sface_2021dec.onnx", sha256: "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79" },
];
type Runtime = { ort: typeof Ort; detector: Ort.InferenceSession; recognizer: Ort.InferenceSession };
type Image = { rgb: Buffer; width: number; height: number };
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
    const image = sharp(bytes, { limitInputPixels: 12_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > 5000 || metadata.height > 5000
      || (metadata.pages ?? 1) !== 1 || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("Image format");
    const decoded = await image.rotate().resize(DETECTOR_SIZE, DETECTOR_SIZE, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "white" }).toColourspace("srgb").removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (decoded.info.channels !== 3) throw new Error("Image channels");
    return { rgb: decoded.data, width: decoded.info.width, height: decoded.info.height };
  } catch {
    const label = side === "ID" ? "ID photo" : "selfie";
    throw new FaceInputError(`${side}_IMAGE_INVALID`, `The ${label} could not be read. Please use a clear JPG, PNG, or WebP photo under 6 MB.`);
  }
}

async function embedding(image: Image, side: "ID" | "SELFIE", loaded: Runtime): Promise<Float32Array> {
  // FaceDetectorYN uses blobFromImage(BGR), scale=1, mean=0, no swapRB.
  // The pinned ONNX has fixed 640x640 input: pad only its bottom/right in black.
  const detectorPixels = new Float32Array(3 * DETECTOR_SIZE * DETECTOR_SIZE);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const src = (y * image.width + x) * 3, dst = y * DETECTOR_SIZE + x;
    for (let c = 0; c < 3; c++) detectorPixels[c * DETECTOR_SIZE * DETECTOR_SIZE + dst] = image.rgb[src + 2 - c];
  }
  const detections = await loaded.detector.run({
    [loaded.detector.inputNames[0]]: new loaded.ort.Tensor("float32", detectorPixels, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]),
  });
  const faces = decodeYuNet(detections, DETECTOR_SIZE, DETECTOR_SIZE);
  const face = selectSingleFace(faces, side, image.width, image.height);
  let aligned: Float32Array;
  try {
    aligned = alignRgbFace(image.rgb, image.width, image.height, face.landmarks);
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
