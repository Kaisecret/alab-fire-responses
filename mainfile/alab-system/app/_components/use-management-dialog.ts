"use client";
import { useEffect, useRef } from "react";

export function useManagementDialog(active: boolean, onClose: () => void, busy = false) {
  const close = useRef(onClose);
  const locked = useRef(busy);
  useEffect(() => { close.current = onClose; locked.current = busy; });
  useEffect(() => {
    if (!active) return;
    const dialogs = document.querySelectorAll<HTMLElement>('[data-management-dialog]');
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', dialog.querySelector('h2, h3')?.textContent || 'Record details');
    dialog.tabIndex = -1;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    (focusable()[0] || dialog).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!locked.current) close.current(); }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0]; const last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    dialog.addEventListener('keydown', keydown);
    return () => { dialog.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [active]);
}
