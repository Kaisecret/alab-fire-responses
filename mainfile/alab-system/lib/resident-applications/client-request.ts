export class ResidentApplicationRequestError extends Error {
  constructor(message: string, public readonly status = 0) {
    super(message);
    this.name = 'ResidentApplicationRequestError';
  }
}

/** Bound both network and body reads; callers own retries, especially for writes. */
export async function requestResidentApplicationJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) throw init.signal.reason;
  init.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(new ResidentApplicationRequestError(
    init.method && init.method !== 'GET'
      ? 'The request timed out. Check your application status before submitting again; your corrections may have been received.'
      : 'Loading timed out. Please retry.',
  )), timeoutMs);
  let onAbort: () => void;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    const read = async () => {
      const response = await fetch(url, { cache: 'no-store', ...init, signal: controller.signal });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body && typeof body.error === 'string' ? body.error
          : response.status === 401 ? 'Your session has expired. Please sign in again.'
          : response.status === 403 ? 'You no longer have access to these records.'
          : 'Unable to load the response. Please retry.';
        throw new ResidentApplicationRequestError(message, response.status);
      }
      if (!body || typeof body !== 'object') {
        throw new ResidentApplicationRequestError('The server returned an invalid response. Please retry.');
      }
      return body as T;
    };
    return await Promise.race([read(), aborted]);
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof ResidentApplicationRequestError) throw error;
    throw new ResidentApplicationRequestError('Unable to connect. Check your connection and retry.');
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', onAbort!);
  }
}

