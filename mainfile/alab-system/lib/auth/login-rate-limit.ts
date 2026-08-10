export const MAX_LOGIN_ATTEMPTS = 5;
const WINDOW_MS = 1000 * 60 * 15;

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
