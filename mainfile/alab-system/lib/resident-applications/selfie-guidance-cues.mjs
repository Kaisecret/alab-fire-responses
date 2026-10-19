/**
 * Visual directions use the mirrored preview: the subject's right is screen
 * right. Framing translations supplied by geometry already use screen space.
 * @param {{code: string, direction?: string, progress?: number}} state
 * @param {'front'|'right'|'left'} view
 */
export function selfieGuidanceCue(state, view) {
  const cue = (direction, kind, title, detail) => ({ direction, kind, title, detail });
  const screenDirection = ['left', 'right', 'up', 'down'].includes(state.direction) ? state.direction : null;
  if (state.code === 'turn-right' || state.code === 'turn-left') {
    const direction = state.code === 'turn-right' ? 'right' : 'left';
    return cue(direction, 'turn', `Turn your head ${direction}`, 'Follow the arrow. A small turn is enough.');
  }
  if (state.code === 'turn-back') return cue(view === 'right' ? 'left' : 'right', 'turn', 'Turn back a little', 'Keep both eyes visible to the camera.');
  if (state.code === 'face-front' && screenDirection) return cue(screenDirection, 'turn', 'Look straight ahead', 'Turn gently back toward the camera.');
  if (state.code === 'off-center' && screenDirection) return cue(screenDirection, 'move', `Move a little ${screenDirection}`, 'Move your face inside the oval.');
  if (state.code === 'too-small') return cue('closer', 'distance', 'Move a little closer', 'Let your face fill more of the oval.');
  if (['too-large', 'clipped'].includes(state.code)) return cue('farther', 'distance', 'Move a little farther back', 'Keep your whole face inside the oval.');
  if (state.code === 'hold' || state.code === 'ready') return cue('hold', 'hold', state.code === 'ready' ? 'Photo captured' : 'Perfect. Hold still', 'Your photo captures automatically.');
  if (state.code === 'loading' || state.code === 'camera-pending') return cue('none', 'wait', 'Getting ready', 'Keep your face inside the oval.');
  if (state.code === 'outside-guide') return cue('farther', 'distance', 'Fit your face inside the oval', 'Move back a little so every edge stays visible.');
  if (state.code === 'review' || state.code === 'unavailable') return cue('none', 'wait', '', '');
  if (state.code === 'multiple-faces') return cue('center', 'center', 'Only you in the frame', 'Ask anyone beside you to move out of view.');
  if (state.code === 'head-level') return cue('center', 'center', 'Keep your head level', 'Relax your chin and keep your eyes level.');
  return cue('center', 'center', 'Look at the camera', 'Bring your face into the oval in good light.');
}
