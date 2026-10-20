// YuNet decoding and SFace landmark order/preprocessing follow OpenCV 4.13.0
// FaceDetectorYN and FaceRecognizerSF; see models/resident-face/manifest.json.
const TEMPLATE = [[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366], [41.5493, 92.3655], [70.7299, 92.2041]];

export class FaceInputError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function cosineSimilarity(a, b) {
  if (!a?.length || a.length !== b?.length) throw new Error("Invalid embedding dimensions");
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) throw new Error("Invalid embedding values");
    dot += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i];
  }
  if (!Number.isFinite(aa + bb + dot) || aa <= 1e-12 || bb <= 1e-12) throw new Error("Invalid embedding norm");
  return Math.max(-1, Math.min(1, dot / Math.sqrt(aa * bb)));
}

function overlap(a, b) {
  const area = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]))
    * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
  return area / (a[2] * a[3] + b[2] * b[3] - area);
}

export function decodeYuNet(outputs, width, height, scoreThreshold = 0.9, nmsThreshold = 0.3) {
  const faces = [];
  for (const stride of [8, 16, 32]) {
    const cols = width / stride, rows = height / stride, count = cols * rows;
    const tensors = {};
    for (const [name, channels] of [["cls", 1], ["obj", 1], ["bbox", 4], ["kps", 10]]) {
      const tensor = outputs[`${name}_${stride}`];
      if (!Number.isInteger(cols) || !Number.isInteger(rows) || !tensor || tensor.dims.length !== 3
        || tensor.dims[0] !== 1 || tensor.dims[1] !== count || tensor.dims[2] !== channels || tensor.data.length !== count * channels) {
        throw new Error("Unexpected YuNet output shape");
      }
      tensors[name] = tensor.data;
    }
    for (let i = 0; i < count; i++) {
      const clamp = (n) => Math.max(0, Math.min(1, n));
      const score = Math.sqrt(clamp(tensors.cls[i]) * clamp(tensors.obj[i]));
      if (!Number.isFinite(score)) throw new Error("Invalid YuNet output values");
      if (score < scoreThreshold) continue;
      const col = i % cols, row = Math.floor(i / cols), boxAt = i * 4;
      const cx = (col + tensors.bbox[boxAt]) * stride, cy = (row + tensors.bbox[boxAt + 1]) * stride;
      const w = Math.exp(tensors.bbox[boxAt + 2]) * stride, h = Math.exp(tensors.bbox[boxAt + 3]) * stride;
      const landmarks = Array.from({ length: 5 }, (_, n) => [
        (tensors.kps[i * 10 + n * 2] + col) * stride,
        (tensors.kps[i * 10 + n * 2 + 1] + row) * stride,
      ]);
      const box = [cx - w / 2, cy - h / 2, w, h];
      if (![...box, ...landmarks.flat()].every(Number.isFinite) || w <= 0 || h <= 0) throw new Error("Invalid YuNet output values");
      faces.push({ box, landmarks, score });
    }
  }
  const kept = [];
  // Match the published YuNet top_k=5000 before non-maximum suppression.
  for (const face of faces.sort((a, b) => b.score - a.score).slice(0, 5000)) {
    if (!kept.some((other) => overlap(face.box, other.box) > nmsThreshold)) kept.push(face);
  }
  return kept;
}

// Many IDs (passports, newer national cards) also print a small "ghost" copy of
// the holder's portrait. On the ID only, the largest face is used when every
// other face is at most this fraction of its width and height. Faces of similar
// size still fail, and a selfie must always contain exactly one face.
const ID_GHOST_MAX_RATIO = 0.5;

export function selectSingleFace(faces, side, width, height) {
  const label = side === "ID" ? "ID photo" : "selfie";
  if (faces.length === 0) throw new FaceInputError(`${side}_FACE_NOT_FOUND`, `No clear face was found in the ${label}. Please take a clearer photo.`);
  let face = faces[0];
  if (faces.length !== 1) {
    const [largest, ...others] = [...faces].sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]);
    const ghostsOnly = side === "ID" && others.every((other) => other.box[2] <= largest.box[2] * ID_GHOST_MAX_RATIO
      && other.box[3] <= largest.box[3] * ID_GHOST_MAX_RATIO);
    if (!ghostsOnly) throw new FaceInputError(`${side}_MULTIPLE_FACES`, `More than one face was found in the ${label}. Please use a photo showing only your face.`);
    face = largest;
  }
  if (face.box.length !== 4 || !face.box.every(Number.isFinite) || face.box[2] < 16 || face.box[3] < 16
    || face.landmarks.length !== 5 || !face.landmarks.every((p) => p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] >= 0 && p[0] < width && p[1] >= 0 && p[1] < height)) {
    throw new FaceInputError(`${side}_FACE_UNCLEAR`, `The face in the ${label} is too small or cut off. Please take a closer, clearer photo.`);
  }
  return face;
}

// Orientation-preserving least-squares similarity transform. In 2D this is the
// closed-form equivalent of OpenCV's Umeyama/SVD rotation+scale fit.
export function similarityTransform(source) {
  if (source.length !== 5 || !source.every((p) => p.length === 2 && p.every(Number.isFinite))) throw new Error("Invalid landmarks");
  const mean = (points, axis) => points.reduce((sum, p) => sum + p[axis], 0) / 5;
  const sx = mean(source, 0), sy = mean(source, 1), dx = mean(TEMPLATE, 0), dy = mean(TEMPLATE, 1);
  let denominator = 0, real = 0, imaginary = 0;
  for (let i = 0; i < 5; i++) {
    const x = source[i][0] - sx, y = source[i][1] - sy, u = TEMPLATE[i][0] - dx, v = TEMPLATE[i][1] - dy;
    denominator += x * x + y * y; real += x * u + y * v; imaginary += x * v - y * u;
  }
  if (denominator <= 1e-8 || Math.hypot(real, imaginary) <= 1e-8) throw new Error("Degenerate landmarks");
  const a = real / denominator, b = imaginary / denominator;
  return [a, -b, dx - a * sx + b * sy, b, a, dy - b * sx - a * sy];
}

export function alignRgbFace(rgb, width, height, landmarks) {
  if (rgb.length !== width * height * 3) throw new Error("Invalid RGB image");
  const m = similarityTransform(landmarks), determinant = m[0] * m[4] - m[1] * m[3];
  if (!Number.isFinite(determinant) || determinant < 1e-12) throw new Error("Degenerate landmarks");
  const result = new Float32Array(3 * 112 * 112);
  const pixel = (x, y, channel) => x < 0 || y < 0 || x >= width || y >= height ? 0 : rgb[(y * width + x) * 3 + channel];
  for (let y = 0; y < 112; y++) for (let x = 0; x < 112; x++) {
    const sx = (m[4] * (x - m[2]) - m[1] * (y - m[5])) / determinant;
    const sy = (-m[3] * (x - m[2]) + m[0] * (y - m[5])) / determinant;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    for (let c = 0; c < 3; c++) {
      // Match warpAffine's 8-bit aligned image followed by raw RGB blob creation.
      result[c * 112 * 112 + y * 112 + x] = Math.round(
        pixel(x0, y0, c) * (1 - fx) * (1 - fy) + pixel(x0 + 1, y0, c) * fx * (1 - fy)
        + pixel(x0, y0 + 1, c) * (1 - fx) * fy + pixel(x0 + 1, y0 + 1, c) * fx * fy,
      );
    }
  }
  return result;
}
