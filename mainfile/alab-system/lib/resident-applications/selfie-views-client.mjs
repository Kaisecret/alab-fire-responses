/** @typedef {'front'|'right'|'left'} SelfieView */
/** @type {ReadonlyArray<{key: SelfieView, label: string, heading: string, prompt: string}>} */
export const SELFIE_VIEWS = Object.freeze([
  { key: 'front', label: 'Front', heading: 'Look straight ahead', prompt: 'Center your face in the oval and look at the camera.' },
  { key: 'right', label: 'Right', heading: 'Turn slightly to your right', prompt: 'Slowly turn your head to your right while keeping your face inside the oval.' },
  { key: 'left', label: 'Left', heading: 'Turn slightly to your left', prompt: 'Slowly turn your head to your left while keeping your face inside the oval.' },
]);

/** Request-local confirmed camera photos; never written to browser storage. */
export function createSelfieViewCollection() {
  /** @type {Map<SelfieView, File>} */
  const photos = new Map();
  return {
    /** @param {SelfieView} view @param {File} file */
    set(view, file) {
      if (!SELFIE_VIEWS.some(item => item.key === view) || !(file instanceof File)) throw new Error('Invalid selfie view');
      photos.set(view, file);
    },
    /** @param {SelfieView} view */
    get: view => photos.get(view) ?? null,
    count: () => photos.size,
    nextMissing: () => SELFIE_VIEWS.find(view => !photos.has(view.key))?.key ?? null,
    evidence() {
      const selfie = photos.get('front'), selfieRight = photos.get('right'), selfieLeft = photos.get('left');
      return selfie && selfieRight && selfieLeft ? { selfie, selfieRight, selfieLeft } : null;
    },
    clear: () => photos.clear(),
  };
}
