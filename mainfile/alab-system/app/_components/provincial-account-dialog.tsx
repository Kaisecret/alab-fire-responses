'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function ProvincialAccountDialog({ children, label, onClose, dismissible = true }: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <dialog ref={ref} className="pma-dialog" aria-label={label}
      onCancel={event => { event.preventDefault(); if (dismissible) onClose(); }}
      onClick={event => {
        if (!dismissible || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      {children}
    </dialog>, document.body,
  );
}
