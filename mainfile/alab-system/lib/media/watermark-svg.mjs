import { CAP_HEIGHT, GLYPHS, UNITS_PER_EM } from "./watermark-glyphs.mjs";

// Builds the watermark laid over every photo residents send: a faint
// diagonal "ALAB" pattern that marks the image without hiding it, and a small
// corner tag saying what the photo is for and when it arrived. Text is drawn
// as outlines, so the result does not depend on installed fonts.

const SPACE = GLYPHS[" "]?.[0] ?? 250;

/** Text as SVG paths in font units, and its width. */
export function textOutline(text) {
  let x = 0;
  const parts = [];
  for (const character of String(text)) {
    const glyph = GLYPHS[character] ?? GLYPHS[character.toUpperCase()];
    if (glyph?.[1]) parts.push(x ? `<path transform="translate(${x} 0)" d="${glyph[1]}"/>` : `<path d="${glyph[1]}"/>`);
    x += glyph ? glyph[0] : SPACE;
  }
  return { paths: parts.join(""), width: x };
}

const round = (value) => Math.round(value * 100) / 100;

/**
 * @param {{ width: number, height: number, label: string, detail?: string }} options
 *   label: what the photo is for, repeated faintly across the image
 *   detail: reference and time, shown in the corner tag
 */
export function watermarkOverlaySvg({ width, height, label, detail = "" }) {
  const short = Math.min(width, height);
  const diagonal = Math.hypot(width, height);

  // Diagonal pattern: "ALAB · <label>" repeated in staggered rows.
  const patternSize = Math.max(12, short * 0.032);
  const patternScale = patternSize / UNITS_PER_EM;
  const pattern = textOutline(`ALAB  ·  ${label}`.toUpperCase());
  const patternWidth = pattern.width * patternScale;
  const columnStep = patternWidth + patternSize * 5;
  const rowStep = patternSize * 6.5;
  const tiles = [];
  for (let row = 0, y = -diagonal / 2; y < diagonal / 2 + rowStep; row += 1, y += rowStep) {
    const shift = row % 2 ? columnStep / 2 : 0;
    for (let x = -diagonal / 2 - shift; x < diagonal / 2 + columnStep; x += columnStep) {
      tiles.push(`<use xlink:href="#wm-line" transform="translate(${round(x)} ${round(y)})"/>`);
    }
  }

  // Corner tag: "ALAB" plus the detail, on a soft translucent pill.
  const brand = textOutline("ALAB");
  const info = textOutline(detail);
  const margin = Math.max(8, short * 0.025);
  // The tag keeps to the image: on a narrow photo the text shrinks to fit.
  const emsWide = (brand.width + info.width) / UNITS_PER_EM + (detail ? 0.7 : 0) + 1.5;
  const tagSize = Math.min(Math.max(11, short * 0.026), (width - margin * 2) / emsWide);
  const tagScale = tagSize / UNITS_PER_EM;
  const gap = detail ? tagSize * 0.7 : 0;
  const padX = tagSize * 0.75;
  const padY = tagSize * 0.55;
  const capHeight = CAP_HEIGHT * tagScale;
  const tagWidth = (brand.width + info.width) * tagScale + gap + padX * 2;
  const tagHeight = capHeight + padY * 2;
  const tagX = Math.max(margin, width - margin - tagWidth);
  const tagY = height - margin - tagHeight;
  const baseline = tagY + padY + capHeight;
  const brandWidth = brand.width * tagScale;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <g id="wm-line" transform="scale(${round(patternScale * 1000) / 1000} ${-round(patternScale * 1000) / 1000})">${pattern.paths}</g>
  </defs>
  <g transform="translate(${round(width / 2)} ${round(height / 2)}) rotate(-30)">
    <g fill="#0f172a" fill-opacity="0.07" transform="translate(${round(patternSize * 0.06)} ${round(patternSize * 0.06)})">${tiles.join("")}</g>
    <g fill="#ffffff" fill-opacity="0.16">${tiles.join("")}</g>
  </g>
  <rect x="${round(tagX)}" y="${round(tagY)}" width="${round(tagWidth)}" height="${round(tagHeight)}" rx="${round(tagHeight / 2)}" fill="#0f172a" fill-opacity="0.5"/>
  <g transform="translate(${round(tagX + padX)} ${round(baseline)}) scale(${tagScale} ${-tagScale})" fill="#ffffff" stroke="#ffffff" stroke-width="34" stroke-linejoin="round">${brand.paths}</g>
  <g transform="translate(${round(tagX + padX + brandWidth + gap)} ${round(baseline)}) scale(${tagScale} ${-tagScale})" fill="#ffffff" fill-opacity="0.88">${info.paths}</g>
</svg>`;
}
