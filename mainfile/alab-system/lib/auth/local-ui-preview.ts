/**
 * Enables local, read-only portal previews without credentials.
 *
 * This intentionally requires Next.js development mode as well as an explicit
 * local opt-in. `next start` and every Vercel deployment run with a production
 * NODE_ENV, so this can never bypass authentication outside local development.
 */
export function isLocalUiPreviewEnabled() {
  return process.env.NODE_ENV === "development" && process.env.LOCAL_UI_BYPASS === "true";
}
