/**
 * A green confirmation that an action went through, shown by the
 * SuccessToastHost in the municipal and provincial shells.
 *
 * The coordination dialogs close as soon as they succeed, so without it an
 * officer who sent a response or accepted a call had nothing to say it worked.
 */

export const SUCCESS_TOAST_EVENT = "alab:success-toast";
export const SUCCESS_TOAST_FLASH_KEY = "alab:success-toast";

/** Show the confirmation on the page the officer is on. */
export function showSuccessToast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(SUCCESS_TOAST_EVENT, { detail: message }));
}

/**
 * Show the confirmation on the next page, for an action that navigates away
 * the moment it succeeds and would otherwise take its toast down with it.
 */
export function flashSuccessToast(message: string) {
  try {
    sessionStorage.setItem(SUCCESS_TOAST_FLASH_KEY, JSON.stringify({ message, at: Date.now() }));
  } catch {
    // Storage can be blocked; the action itself still went through.
  }
}
