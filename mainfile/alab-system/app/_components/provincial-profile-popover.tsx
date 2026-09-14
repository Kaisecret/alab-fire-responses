'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function ProvincialProfilePopover({ anchor, children, onClose }: {
  anchor: HTMLElement;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const position = () => {
      const bounds = anchor.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const below = bounds.top < window.innerHeight / 2;
      const left = below ? bounds.right - width : bounds.left;
      panel.style.left = `${Math.max(12, Math.min(left, window.innerWidth - width - 12))}px`;
      panel.style.top = `${Math.max(12, Math.min(below ? bounds.bottom + 8 : bounds.top - height - 8, window.innerHeight - height - 12))}px`;
      panel.style.visibility = 'visible';
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target) && !anchor.contains(event.target)) onClose();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); anchor.focus(); }
    };
    position();
    panel.querySelector<HTMLElement>('a, button')?.focus();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div ref={ref} id="provincial-profile-popover" className="pbfp-profile-popover"
      aria-label="Account actions" style={{ visibility: 'hidden' }}>
      {children}
    </div>, document.body,
  );
}
