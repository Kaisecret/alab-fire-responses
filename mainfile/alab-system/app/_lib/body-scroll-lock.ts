// Nested dialogs can unmount in either order. Restore scrolling only after
// every dialog that locked this body has released its own lock.
const locks = new WeakMap<object, { count: number; overflow: string }>();

export function lockBodyScroll(body: Pick<HTMLElement, "style">) {
  const lock = locks.get(body) ?? { count: 0, overflow: body.style.overflow };
  lock.count += 1;
  locks.set(body, lock);
  body.style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lock.count -= 1;
    if (lock.count === 0) {
      body.style.overflow = lock.overflow;
      locks.delete(body);
    }
  };
}
