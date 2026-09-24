"use client";

import { useEffect, useRef } from "react";

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Makes a portaled dialog modal: locks page scroll, marks the page inert,
 * traps Tab inside the dialog, closes on Escape, and returns focus to the
 * element that opened it.
 */
export function useDialogFocus(open: boolean, dialogLabelId: string, onClose: () => void, pageSelector: string) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const page = document.querySelector<HTMLElement>(pageSelector);
    const dialog = () => document.querySelector<HTMLElement>(`[aria-labelledby="${dialogLabelId}"]`);
    page?.setAttribute("inert", "");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFirst = window.requestAnimationFrame(() => {
      dialog()?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      const current = dialog();
      if (event.key !== "Tab" || !current) return;
      const focusable = Array.from(current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFirst);
      document.removeEventListener("keydown", handleKeyDown);
      page?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [open, dialogLabelId, pageSelector]);
}
