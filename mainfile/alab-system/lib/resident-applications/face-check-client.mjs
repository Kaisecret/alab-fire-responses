/** @typedef {{ frontId: File, backId: File, selfie: File, idVerificationToken: string }} FaceEvidence */
/** @typedef {{ status: 'idle'|'checking'|'verified'|'failed', code?: string, message?: string }} FaceCheckState */

function sameEvidence(a, b) {
  return Boolean(a && b && a.frontId === b.frontId && a.backId === b.backId
    && a.selfie === b.selfie && a.idVerificationToken === b.idVerificationToken);
}

/**
 * Owns a single face check for the current confirmed photos. The server still
 * validates every binding; this prevents an obsolete response updating the UI.
 * @param {{ request?: typeof fetch, onState?: (state: FaceCheckState) => void }} options
 */
export function createFaceCheckController({ request = fetch, onState = () => {} } = {}) {
  let generation = 0;
  let disposed = false;
  let activeRequest = null;
  let verifiedEvidence = null;
  let token = null;

  function clear() {
    generation++;
    activeRequest?.abort();
    activeRequest = null;
    verifiedEvidence = null;
    token = null;
  }

  return {
    /** @param {FaceEvidence|null} input */
    getToken(input) {
      return !disposed && sameEvidence(verifiedEvidence, input) ? token : null;
    },
    invalidate() {
      clear();
      if (!disposed) onState({ status: 'idle' });
    },
    dispose() {
      disposed = true;
      clear();
    },
    /** @param {FaceEvidence} input */
    async verify(input) {
      if (disposed) return false;
      clear();
      const job = generation;
      if (!(input?.frontId instanceof File) || !(input?.backId instanceof File)
        || !(input?.selfie instanceof File) || !input.idVerificationToken) {
        onState({ status: 'failed', code: 'EVIDENCE_REQUIRED', message: 'Verify both sides of your ID and confirm your selfie first.' });
        return false;
      }
      const controller = new AbortController();
      activeRequest = controller;
      const timeout = setTimeout(() => controller.abort(), 65_000);
      onState({ status: 'checking', message: 'Comparing your selfie with the photo on your ID…' });
      const body = new FormData();
      body.set('frontId', input.frontId);
      body.set('backId', input.backId);
      body.set('selfie', input.selfie);
      body.set('idVerificationToken', input.idVerificationToken);
      try {
        const response = await request('/api/auth/register/face-check', { method: 'POST', body, signal: controller.signal });
        const result = await response.json().catch(() => ({}));
        if (disposed || job !== generation) return false;
        if (response.ok && result.verified === true && typeof result.token === 'string'
          && result.token.length > 0 && result.token.length <= 8192) {
          verifiedEvidence = { ...input };
          token = result.token;
          onState({ status: 'verified', message: 'Your selfie matches the photo on your ID.' });
          return true;
        }
        onState({ status: 'failed', code: typeof result.code === 'string' ? result.code : 'FACE_NOT_VERIFIED',
          message: typeof result.message === 'string' ? result.message : 'We could not compare your selfie with your ID. Please try again.' });
        return false;
      } catch {
        if (disposed || job !== generation) return false;
        onState({ status: 'failed', code: controller.signal.aborted ? 'TIMEOUT' : 'SERVICE_UNAVAILABLE',
          message: controller.signal.aborted ? 'Face comparison took too long. Please try again.' : 'Unable to reach face verification. Please try again.' });
        return false;
      } finally {
        clearTimeout(timeout);
        if (job === generation) activeRequest = null;
      }
    },
  };
}
