export class ProvincialRequestError extends Error {
  constructor(message: string, public readonly status = 0) {
    super(message);
    this.name = 'ProvincialRequestError';
  }
}

/** Bound both network and body reads; callers own retries, especially for writes. */
export async function requestProvincialJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) throw init.signal.reason;
  init.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(new ProvincialRequestError(
    init.method && init.method !== 'GET'
      ? 'The request timed out. Refresh the account roster before submitting again; the account may have been created.'
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
        throw new ProvincialRequestError(message, response.status);
      }
      if (!body || typeof body !== 'object') {
        throw new ProvincialRequestError('The server returned an invalid response. Please retry.');
      }
      return body as T;
    };
    return await Promise.race([read(), aborted]);
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof ProvincialRequestError) throw error;
    throw new ProvincialRequestError('Unable to connect. Check your connection and retry.');
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', onAbort!);
  }
}
