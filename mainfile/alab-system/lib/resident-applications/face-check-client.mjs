/** @typedef {{ frontId: File, backId: File, selfie: File, selfieRight: File, selfieLeft: File, idVerificationToken: string }} FaceEvidence */
/** @typedef {{ status: 'idle'|'checking'|'verified'|'failed', code?: string, message?: string, retryable?: boolean }} FaceCheckState */

// Failures where the same photos can be sent again without retaking them.
const RETRYABLE_CODES = new Set(['SERVICE_UNAVAILABLE', 'FACE_SERVICE_UNAVAILABLE', 'FACE_SERVICE_BUSY', 'TIMEOUT', 'TOO_MANY_CHECKS']);
const NETWORK_MESSAGE = 'Your photos did not reach our server. Check your internet connection and try again. You do not need to retake them.';
const SERVICE_MESSAGE = 'Selfie checking is not available right now. Try again in a moment. You do not need to retake your photos.';

/** @param {number} ms @param {AbortSignal} signal */
function pause(ms, signal) {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(undefined);
    const timer = setTimeout(done, ms);
    function done() { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(undefined); }
    signal.addEventListener('abort', done, { once: true });
  });
}

function sameEvidence(a, b) {
  return Boolean(a && b && a.frontId === b.frontId && a.backId === b.backId
    && a.selfie === b.selfie && a.selfieRight === b.selfieRight && a.selfieLeft === b.selfieLeft
    && a.idVerificationToken === b.idVerificationToken);
}

/**
 * Owns a single face check for the current confirmed photos. The server still
 * validates every binding; this prevents an obsolete response updating the UI.
 * A dropped connection or an unavailable server is retried once with the same
 * photos before the resident sees an error.
 * @param {{ request?: typeof fetch, onState?: (state: FaceCheckState) => void, retryDelayMs?: number }} options
 */
export function createFaceCheckController({ request = fetch, onState = () => {}, retryDelayMs = 1500 } = {}) {
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
        || !(input?.selfie instanceof File) || !(input?.selfieRight instanceof File)
        || !(input?.selfieLeft instanceof File) || !input.idVerificationToken) {
        onState({ status: 'failed', code: 'EVIDENCE_REQUIRED', message: 'Verify both sides of your ID and capture your front, right and left views first.' });
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
      body.set('selfieRight', input.selfieRight);
      body.set('selfieLeft', input.selfieLeft);
      body.set('idVerificationToken', input.idVerificationToken);
      try {
        let response;
        for (let attempt = 1; ; attempt++) {
          try {
            response = await request('/api/auth/register/face-check', { method: 'POST', body, signal: controller.signal });
            if (attempt < 2 && [502, 503, 504].includes(response.status) && !controller.signal.aborted) {
              await pause(retryDelayMs, controller.signal);
              if (!controller.signal.aborted) continue;
            }
            break;
          } catch (error) {
            if (attempt >= 2 || controller.signal.aborted) throw error;
            await pause(retryDelayMs, controller.signal);
            if (controller.signal.aborted) throw error;
          }
        }
        const result = await response.json().catch(() => ({}));
        if (disposed || job !== generation) return false;
        if (response.ok && result.verified === true && typeof result.token === 'string'
          && result.token.length > 0 && result.token.length <= 8192) {
          verifiedEvidence = { ...input };
          token = result.token;
          onState({ status: 'verified', message: 'Your selfie matches the photo on your ID.' });
          return true;
        }
        // Platform errors (crashes, gateway timeouts) carry no JSON code.
        const code = typeof result.code === 'string' ? result.code : response.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'FACE_NOT_VERIFIED';
        const retryable = RETRYABLE_CODES.has(code);
        onState({ status: 'failed', code, retryable,
          message: typeof result.message === 'string' ? result.message
            : retryable ? SERVICE_MESSAGE : 'We could not compare your selfie with your ID. Please try again.' });
        return false;
      } catch {
        if (disposed || job !== generation) return false;
        onState({ status: 'failed', code: controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR', retryable: true,
          message: controller.signal.aborted ? 'Face comparison took too long. Try again. You do not need to retake your photos.' : NETWORK_MESSAGE });
        return false;
      } finally {
        clearTimeout(timeout);
        if (job === generation) activeRequest = null;
      }
    },
  };
}
