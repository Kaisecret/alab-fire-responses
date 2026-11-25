/**
 * Maps the on-screen ID frame onto the camera image, so the saved photo holds
 * what the resident lined up. The preview video uses `object-fit: cover`, so
 * part of the camera image can sit outside the visible stage.
 * A small margin keeps the card edges when the card sits right on the frame.
 * @param {{left: number, top: number, width: number, height: number}} stage
 * @param {{left: number, top: number, width: number, height: number}} frame
 * @param {number} videoWidth
 * @param {number} videoHeight
 * @param {number} [margin]
 */
export function idFrameCrop(stage, frame, videoWidth, videoHeight, margin = 0.06) {
  const whole = { x: 0, y: 0, width: videoWidth, height: videoHeight };
  const scale = Math.max(stage.width / videoWidth, stage.height / videoHeight);
  if (!Number.isFinite(scale) || scale <= 0 || frame.width <= 0 || frame.height <= 0) return whole;
  const offsetX = (stage.width - videoWidth * scale) / 2;
  const offsetY = (stage.height - videoHeight * scale) / 2;
  const pad = frame.width * margin;
  const toVideoX = (screenX) => (screenX - stage.left - offsetX) / scale;
  const toVideoY = (screenY) => (screenY - stage.top - offsetY) / scale;
  const left = Math.max(0, toVideoX(frame.left - pad));
  const top = Math.max(0, toVideoY(frame.top - pad));
  const right = Math.min(videoWidth, toVideoX(frame.left + frame.width + pad));
  const bottom = Math.min(videoHeight, toVideoY(frame.top + frame.height + pad));
  if (right - left < 1 || bottom - top < 1) return whole;
  return { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) };
}
