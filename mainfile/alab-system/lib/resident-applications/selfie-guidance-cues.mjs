/**
 * Visual directions use the mirrored preview: the subject's right is screen
 * right. Framing translations supplied by geometry already use screen space.
 * @param {{code: string, direction?: string, progress?: number}} state
 * @param {'front'|'right'|'left'} view
 */
export function selfieGuidanceCue(state, view) {
  const side = view === 'left' || view === 'right';
  const cue = (direction, kind, title, detail) => ({ direction, kind, title, detail });
  const screenDirection = ['left', 'right', 'up', 'down'].includes(state.direction) ? state.direction : null;
  // A side view only ever points toward its own side.
  if (state.code === 'turn-right' || state.code === 'turn-left') {
    const direction = state.code === 'turn-right' ? 'right' : 'left';
    return cue(direction, 'turn', `Turn your head ${direction}`, 'Turn slowly. The photo is taken automatically.');
  }
  if (state.code === 'wrong-way' && side) return cue(view, 'turn', `Other way: turn ${view}`, 'Turn your head toward the arrow.');
  if (state.code === 'turn-back') return cue('center', 'center', 'Turn back a little', 'Keep both eyes visible to the camera.');
  if (state.code === 'face-front' && screenDirection) return cue(screenDirection, 'turn', 'Look straight ahead', 'Turn gently back toward the camera.');
  if (state.code === 'off-center' && screenDirection) return cue(screenDirection, 'move', `Move a little ${screenDirection}`, side ? 'Keep your whole face in the camera view.' : 'Move your face inside the oval.');
  if (state.code === 'too-small') return cue('closer', 'distance', 'Move a little closer', side ? 'Make your face clear enough to scan.' : 'Let your face fill more of the oval.');
  if (['too-large', 'clipped'].includes(state.code)) return cue('farther', 'distance', 'Move a little farther back', side ? 'Keep your whole face in the camera view.' : 'Keep your whole face inside the oval.');
  if (state.code === 'hold' || state.code === 'ready') return cue('hold', 'hold', state.code === 'ready' ? 'Photo captured' : 'Perfect. Hold still', 'Your photo captures automatically.');
  if (state.code === 'loading' || state.code === 'camera-pending') return cue('none', 'wait', 'Getting ready', side ? 'Keep your face in the camera view.' : 'Keep your face inside the oval.');
  if (state.code === 'outside-guide') return cue('farther', 'distance', side ? 'Keep your whole face in view' : 'Fit your face inside the oval', 'Move back a little so every edge stays visible.');
  if (state.code === 'review' || state.code === 'unavailable') return cue('none', 'wait', '', '');
  if (state.code === 'too-dark') return cue('center', 'light', 'Find better light', 'Face a lamp or window so the camera can see your face.');
  if (state.code === 'multiple-faces') return cue('center', 'center', 'Only you in the frame', 'Ask anyone beside you to move out of view.');
  if (state.code === 'head-level') return cue('center', 'center', 'Keep your head level', 'Relax your chin and keep your eyes level.');
  return side ? cue('center', 'center', 'Show your whole face', 'Hold the phone at eye level, about an arm away, in good light.')
    : cue('center', 'center', 'Look at the camera', 'Bring your face into the oval in good light.');
}
