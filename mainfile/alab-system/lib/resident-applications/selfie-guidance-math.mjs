/** Pure geometry only. Coordinates are from the UNMIRRORED camera input. */
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const degrees = (radians) => radians * 180 / Math.PI;
const validRect = (rect) => rect && [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
/** @typedef {'left'|'right'|'up'|'down'|'closer'|'farther'|'center'|'hold'} GuidanceDirection */
/** @param {string} code @param {string} message @param {GuidanceDirection} [direction] */
const reject = (code, message, direction) => ({ acceptable: false, code, message, direction });
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** CSS object-fit: cover at object-position: center, then scaleX(-1). */
export function mapLandmarkToPreview(point, { videoWidth, videoHeight, videoRect, mirrored = true }) {
  const scale = Math.max(videoRect.width / videoWidth, videoRect.height / videoHeight);
  const displayedWidth = videoWidth * scale;
  const displayedHeight = videoHeight * scale;
  const localX = point.x * displayedWidth - (displayedWidth - videoRect.width) / 2;
  return {
    x: videoRect.left + (mirrored ? videoRect.width - localX : localX),
    y: videoRect.top + point.y * displayedHeight - (displayedHeight - videoRect.height) / 2,
  };
}

/**
 * Approximate yaw from three symmetric eye pairs. A median makes a single
 * noisy corner unable to change the requested pose. Outer corners are 33
 * (subject right), 263 (left); inner corners 133/362, upper lids 159/386.
 * MediaPipe z increases away from the camera, with x-like normalized scale.
 * Thus z[33] > z[263] means the subject turned RIGHT. CSS mirroring never
 * enters this computation. atan2 removes face-size dependence; the result is
 * a coarse pose cue, not calibrated head-angle measurement or recognition.
 * See the shipped provenance README for the primary model/topology sources.
 */
export function evaluateSelfieGeometry(frame, view) {
  const { faces, videoWidth, videoHeight, videoRect, guideRect } = frame;
  const sideView = view === "right" || view === "left";
  if (!validRect(videoRect) || (!sideView && !validRect(guideRect)) || !Number.isFinite(videoWidth) || !Number.isFinite(videoHeight) || videoWidth <= 0 || videoHeight <= 0) {
    return reject("camera-pending", "Waiting for the camera preview...");
  }
  if (!Array.isArray(faces) || faces.length === 0) return reject("no-face", sideView ? "Keep your whole face visible in the camera." : "Center your face in the oval.", "center");
  if (faces.length !== 1) return reject("multiple-faces", "Only one person should be in view.", "center");
  const face = faces[0];
  if (!Array.isArray(face) || [...FACE_OVAL, 33, 263, 1].some((index) => !face[index] || ![face[index].x, face[index].y, face[index].z].every(Number.isFinite))) {
    return reject("no-face", "Keep your whole face visible in good light.");
  }
  const contour = FACE_OVAL.map((index) => mapLandmarkToPreview(face[index], frame));
  const sourceMargin = sideView ? 0 : 0.01;
  const previewMargin = sideView ? 0 : 2;
  if (FACE_OVAL.some((index) => face[index].x < sourceMargin || face[index].x > 1 - sourceMargin || face[index].y < sourceMargin || face[index].y > 1 - sourceMargin) || contour.some((point) => point.x <= videoRect.left + previewMargin || point.x >= videoRect.left + videoRect.width - previewMargin || point.y <= videoRect.top + previewMargin || point.y >= videoRect.top + videoRect.height - previewMargin)) {
    return reject("clipped", "Move back so your whole face is visible.", "farther");
  }
  const minX = Math.min(...contour.map((p) => p.x));
  const maxX = Math.max(...contour.map((p) => p.x));
  const minY = Math.min(...contour.map((p) => p.y));
  const maxY = Math.max(...contour.map((p) => p.y));
  // Side views use the full visible preview. The oval has no role in their
  // positioning, size limits, or hold coordinates and may be hidden entirely.
  const reference = sideView ? videoRect : guideRect;
  const width = (maxX - minX) / reference.width;
  const height = (maxY - minY) / reference.height;
  const centerX = ((minX + maxX) / 2 - reference.left - reference.width / 2) / (reference.width / 2);
  const centerY = ((minY + maxY) / 2 - reference.top - reference.height / 2) / (reference.height / 2);
  if (sideView) {
    // Undo CSS cover scaling before measuring the face in the actual small
    // inference image. A large CSS preview must not magnify an unusably tiny
    // camera face into acceptance. Match the runtime's rounded canvas size.
    const inferenceScale = Math.min(1, 640 / Math.max(videoWidth, videoHeight));
    const coverScale = Math.max(videoRect.width / videoWidth, videoRect.height / videoHeight);
    const inferenceWidth = Math.round(videoWidth * inferenceScale);
    const inferenceHeight = Math.round(videoHeight * inferenceScale);
    const faceWidthPixels = (maxX - minX) * inferenceWidth / (videoWidth * coverScale);
    const faceHeightPixels = (maxY - minY) * inferenceHeight / (videoHeight * coverScale);
    if (faceWidthPixels + 0.000001 < 64 || faceHeightPixels + 0.000001 < 80) return reject("too-small", "Move a little closer so your face is clear.", "closer");
  } else {
    if (width < 0.5 || height < 0.55) return reject("too-small", "Move a little closer to fill the oval.", "closer");
    if (width > 0.92 || height > 0.92) return reject("too-large", "Move a little farther from the camera.", "farther");
    if (Math.abs(centerX) > 0.24 || Math.abs(centerY) > 0.24) {
      const direction = Math.abs(centerX) > Math.abs(centerY) ? (centerX > 0 ? "left" : "right") : (centerY > 0 ? "up" : "down");
      return reject("off-center", `Center your face: move ${direction} in the preview.`, direction);
    }
    if (contour.some((p) => ((p.x - guideRect.left - guideRect.width / 2) / (guideRect.width / 2)) ** 2 + ((p.y - guideRect.top - guideRect.height / 2) / (guideRect.height / 2)) ** 2 > 1)) {
      return reject("outside-guide", "Keep your whole face inside the oval.", "center");
    }
  }
  const rightEye = face[33];
  const leftEye = face[263];
  const dx = leftEye.x - rightEye.x;
  if (dx <= 0.02) return reject("face-front", "Face the camera so both eyes are visible.");
  const eyePairs = [[33, 263], [133, 362], [159, 386]].map(([rightIndex, leftIndex]) => {
    const right = face[rightIndex];
    const left = face[leftIndex];
    if (!right || !left || ![right.x, right.y, right.z, left.x, left.y, left.z].every(Number.isFinite)) return null;
    const spanX = left.x - right.x;
    const spanY = (left.y - right.y) * videoHeight / videoWidth;
    if (spanX <= 0.02) return null;
    return { yaw: degrees(Math.atan2(right.z - left.z, Math.hypot(spanX, spanY))), roll: degrees(Math.atan2(spanY, spanX)) };
  }).filter((pair) => pair !== null);
  if (eyePairs.length !== 3) return reject("no-face", "Keep both eyes clearly visible in good light.", "center");
  const roll = median(eyePairs.map((pair) => pair.roll));
  const yaw = median(eyePairs.map((pair) => pair.yaw));
  if (Math.abs(roll) > 8) return reject("head-level", "Keep your head upright and your eyes level.", "center");
  const noseBelowEyes = (face[1].y - (rightEye.y + leftEye.y) / 2) / (Math.max(...FACE_OVAL.map((i) => face[i].y)) - Math.min(...FACE_OVAL.map((i) => face[i].y)));
  if (noseBelowEyes < 0.06 || noseBelowEyes > 0.35) return reject("head-level", "Keep your chin level with the camera.");
  if (view === "front") {
    if (Math.abs(yaw) > 10) return reject("face-front", "Look straight at the camera.", yaw > 0 ? "left" : "right");
  } else if (view === "right" || view === "left") {
    const directedYaw = view === "right" ? yaw : -yaw;
    if (directedYaw < 15) return reject(`turn-${view}`, `Slowly turn your head to your ${view}.`, view);
    if (directedYaw > 35) return reject("turn-back", "Turn back a little; keep both eyes visible.", view === "right" ? "left" : "right");
  } else {
    return reject("face-front", "Choose a valid camera view.");
  }
  return { acceptable: true, code: "hold", message: "Hold still...", geometry: { centerX, centerY, width, height, yaw, roll } };
}

/**
 * One view, one continuous hold, one completion. stop() silences callbacks.
 * @param {{view:'front'|'right'|'left', onUpdate:(state:{ready:boolean,progress:number,code:string,message:string,direction?:GuidanceDirection})=>void,onReady:()=>void,onStop?:()=>void}} options
 */
export function createSelfieGuidanceGate({ view, onUpdate, onReady, onStop = () => {} }) {
  let active = true;
  let startedAt = null;
  let lastAt = null;
  let anchor = null;
  let stableSamples = 0;
  const stop = () => {
    if (!active) return;
    active = false;
    anchor = null;
    onStop();
  };
  return {
    get active() { return active; },
    stop,
    sample(frame, now) {
      if (!active) return;
      const result = evaluateSelfieGeometry(frame, view);
      if (!result.acceptable || !Number.isFinite(now)) {
        startedAt = null;
        anchor = null;
        lastAt = null;
        stableSamples = 0;
        onUpdate({ ready: false, progress: 0, code: result.code, message: result.message, direction: result.direction });
        return;
      }
      const current = result.geometry;
      const moved = anchor && (Math.abs(current.centerX - anchor.centerX) > 0.11 || Math.abs(current.centerY - anchor.centerY) > 0.11 || Math.abs(current.width / anchor.width - 1) > 0.08 || Math.abs(current.height / anchor.height - 1) > 0.08 || Math.abs(current.yaw - anchor.yaw) > 5 || Math.abs(current.roll - anchor.roll) > 4);
      if (startedAt === null || lastAt === null || now <= lastAt || now - lastAt > 1000 || moved) {
        startedAt = now;
        anchor = current;
        stableSamples = 1;
      } else {
        stableSamples++;
      }
      lastAt = now;
      // Tolerate slower devices while requiring repeated positive observations;
      // two widely spaced detections cannot complete a hold by elapsed time alone.
      const progress = Math.min(stableSamples >= 4 ? 1 : 0.99, Math.max(0, (now - startedAt) / 900));
      if (progress < 1) {
        onUpdate({ ready: false, progress, code: "hold", message: moved ? "Hold your position steady..." : "Hold still...", direction: "hold" });
        return;
      }
      try {
        onUpdate({ ready: true, progress: 1, code: "ready", message: "Great. Capturing this view...", direction: "hold" });
        if (active) onReady();
      } finally {
        stop();
      }
    },
  };
}
