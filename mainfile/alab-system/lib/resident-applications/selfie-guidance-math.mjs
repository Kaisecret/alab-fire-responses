/** Pure geometry only. Coordinates are from the UNMIRRORED camera input. */
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const degrees = (radians) => radians * 180 / Math.PI;
const validRect = (rect) => rect && [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
const reject = (code, message) => ({ acceptable: false, code, message });

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
 * Approximate yaw from outer eye corners: 33 (subject right), 263 (left).
 * MediaPipe z increases away from the camera, with x-like normalized scale.
 * Thus z[33] > z[263] means the subject turned RIGHT. CSS mirroring never
 * enters this computation. atan2 removes face-size dependence; the result is
 * a coarse pose cue, not calibrated head-angle measurement or recognition.
 * See the shipped provenance README for the primary model/topology sources.
 */
export function evaluateSelfieGeometry(frame, view) {
  const { faces, videoWidth, videoHeight, videoRect, guideRect } = frame;
  if (!validRect(videoRect) || !validRect(guideRect) || !Number.isFinite(videoWidth) || !Number.isFinite(videoHeight) || videoWidth <= 0 || videoHeight <= 0) {
    return reject("camera-pending", "Waiting for the camera preview...");
  }
  if (!Array.isArray(faces) || faces.length === 0) return reject("no-face", "Center your face in the oval.");
  if (faces.length !== 1) return reject("multiple-faces", "Only one person should be in view.");
  const face = faces[0];
  if (!Array.isArray(face) || [...FACE_OVAL, 33, 263, 1].some((index) => !face[index] || ![face[index].x, face[index].y, face[index].z].every(Number.isFinite))) {
    return reject("no-face", "Keep your whole face visible in good light.");
  }
  const contour = FACE_OVAL.map((index) => mapLandmarkToPreview(face[index], frame));
  if (FACE_OVAL.some((index) => face[index].x < 0.01 || face[index].x > 0.99 || face[index].y < 0.01 || face[index].y > 0.99) || contour.some((point) => point.x <= videoRect.left + 2 || point.x >= videoRect.left + videoRect.width - 2 || point.y <= videoRect.top + 2 || point.y >= videoRect.top + videoRect.height - 2)) {
    return reject("clipped", "Move back so your whole face is visible.");
  }
  const minX = Math.min(...contour.map((p) => p.x));
  const maxX = Math.max(...contour.map((p) => p.x));
  const minY = Math.min(...contour.map((p) => p.y));
  const maxY = Math.max(...contour.map((p) => p.y));
  const width = (maxX - minX) / guideRect.width;
  const height = (maxY - minY) / guideRect.height;
  if (width < 0.5 || height < 0.55) return reject("too-small", "Move a little closer to fill the oval.");
  if (width > 0.92 || height > 0.92) return reject("too-large", "Move a little farther from the camera.");
  const centerX = ((minX + maxX) / 2 - guideRect.left - guideRect.width / 2) / (guideRect.width / 2);
  const centerY = ((minY + maxY) / 2 - guideRect.top - guideRect.height / 2) / (guideRect.height / 2);
  if (Math.abs(centerX) > 0.16 || Math.abs(centerY) > 0.16) {
    const direction = Math.abs(centerX) > Math.abs(centerY) ? (centerX > 0 ? "left" : "right") : (centerY > 0 ? "up" : "down");
    return reject("off-center", `Center your face: move ${direction} in the preview.`);
  }
  if (contour.some((p) => ((p.x - guideRect.left - guideRect.width / 2) / (guideRect.width / 2)) ** 2 + ((p.y - guideRect.top - guideRect.height / 2) / (guideRect.height / 2)) ** 2 > 1)) {
    return reject("outside-guide", "Keep your whole face inside the oval.");
  }
  const rightEye = face[33];
  const leftEye = face[263];
  const dx = leftEye.x - rightEye.x;
  const dy = (leftEye.y - rightEye.y) * videoHeight / videoWidth;
  if (dx <= 0.02) return reject("face-front", "Face the camera so both eyes are visible.");
  const roll = degrees(Math.atan2(dy, dx));
  const yaw = degrees(Math.atan2(rightEye.z - leftEye.z, Math.hypot(dx, dy)));
  if (Math.abs(roll) > 8) return reject("head-level", "Keep your head upright and your eyes level.");
  const noseBelowEyes = (face[1].y - (rightEye.y + leftEye.y) / 2) / (Math.max(...FACE_OVAL.map((i) => face[i].y)) - Math.min(...FACE_OVAL.map((i) => face[i].y)));
  if (noseBelowEyes < 0.06 || noseBelowEyes > 0.35) return reject("head-level", "Keep your chin level with the camera.");
  if (view === "front") {
    if (Math.abs(yaw) > 10) return reject("face-front", "Look straight at the camera.");
  } else if (view === "right" || view === "left") {
    const directedYaw = view === "right" ? yaw : -yaw;
    if (directedYaw < 15) return reject(`turn-${view}`, `Slowly turn your head to your ${view}.`);
    if (directedYaw > 35) return reject("turn-back", "Turn back a little; keep both eyes visible.");
  } else {
    return reject("face-front", "Choose a valid camera view.");
  }
  return { acceptable: true, code: "hold", message: "Hold still...", geometry: { centerX, centerY, width, height, yaw, roll } };
}

/** One view, one continuous hold, one completion. stop() silences callbacks. */
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
        onUpdate({ ready: false, progress: 0, code: result.code, message: result.message });
        return;
      }
      const current = result.geometry;
      const moved = anchor && (Math.abs(current.centerX - anchor.centerX) > 0.055 || Math.abs(current.centerY - anchor.centerY) > 0.055 || Math.abs(current.width / anchor.width - 1) > 0.08 || Math.abs(current.height / anchor.height - 1) > 0.08 || Math.abs(current.yaw - anchor.yaw) > 5 || Math.abs(current.roll - anchor.roll) > 4);
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
        onUpdate({ ready: false, progress, code: "hold", message: moved ? "Hold your position steady..." : "Hold still..." });
        return;
      }
      try {
        onUpdate({ ready: true, progress: 1, code: "ready", message: "Great. Capturing this view..." });
        if (active) onReady();
      } finally {
        stop();
      }
    },
  };
}
