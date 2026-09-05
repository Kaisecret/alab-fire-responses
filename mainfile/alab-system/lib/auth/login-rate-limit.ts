// Legacy reference: MAX_LOGIN_ATTEMPTS = 5
export const MAX_LOGIN_ATTEMPTS = 3;
export const WINDOW_MS = 1000 * 60 * 2; // 2 minutes lockout

type AttemptState = {
  count: number;
  windowStartedAt: number;
  lockedUntil: number | null;
};

const attempts = new Map<string, AttemptState>();

function currentState(key: string, now = Date.now()) {
  const existing = attempts.get(key);
  if (!existing || now - existing.windowStartedAt >= WINDOW_MS) {
    const fresh = { count: 0, windowStartedAt: now, lockedUntil: null };
    attempts.set(key, fresh);
    return fresh;
  }
  return existing;
}

export function checkLoginRateLimit(key: string) {
  const state = currentState(key);
  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return { allowed: false, retryAfterSeconds: Math.ceil((state.lockedUntil - Date.now()) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(key: string) {
  const state = currentState(key);
  state.count += 1;
  if (state.count >= MAX_LOGIN_ATTEMPTS) state.lockedUntil = Date.now() + WINDOW_MS;
  return { locked: Boolean(state.lockedUntil), attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - state.count) };
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

export function checkLoginRateLimits(keys: string[]) {
  let maxRetrySeconds = 0;
  for (const key of keys) {
    const result = checkLoginRateLimit(key);
    if (!result.allowed) {
      if (result.retryAfterSeconds > maxRetrySeconds) {
        maxRetrySeconds = result.retryAfterSeconds;
      }
    }
  }
  if (maxRetrySeconds > 0) {
    return { allowed: false, retryAfterSeconds: maxRetrySeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailures(keys: string[]) {
  let isLocked = false;
  let minRemaining = MAX_LOGIN_ATTEMPTS;
  for (const key of keys) {
    const result = recordLoginFailure(key);
    if (result.locked) isLocked = true;
    if (result.attemptsRemaining < minRemaining) minRemaining = result.attemptsRemaining;
  }
  return { locked: isLocked, attemptsRemaining: minRemaining };
}

export function clearAllLoginFailures(keys: string[]) {
  for (const key of keys) {
    attempts.delete(key);
  }
}

