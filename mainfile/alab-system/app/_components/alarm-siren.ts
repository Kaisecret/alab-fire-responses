"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Two-tone emergency siren, synthesised rather than loaded, so the alarm needs
 * no audio asset and starts instantly. Returns a stop function.
 */
export function startSiren(context: AudioContext): () => void {
  const master = context.createGain();
  master.gain.value = 0.0001;
  master.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.connect(master);

  // Alternate between two pitches, the way a fire alarm sweeps.
  const LOW = 620;
  const HIGH = 880;
  const STEP_SECONDS = 0.55;

  const now = context.currentTime;
  oscillator.frequency.setValueAtTime(LOW, now);
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.05);

  let step = 0;
  const schedule = () => {
    const at = context.currentTime + 0.02;
    step += 1;
    oscillator.frequency.setValueAtTime(step % 2 === 0 ? LOW : HIGH, at);
  };
  const timer = window.setInterval(schedule, STEP_SECONDS * 1000);

  oscillator.start();

  return () => {
    window.clearInterval(timer);
    try {
      const stopAt = context.currentTime;
      master.gain.cancelScheduledValues(stopAt);
      master.gain.setValueAtTime(master.gain.value, stopAt);
      master.gain.exponentialRampToValueAtTime(0.0001, stopAt + 0.12);
      oscillator.stop(stopAt + 0.15);
    } catch {
      // Already stopped.
    }
  };
}

/**
 * Sounds the siren for as long as `on` is true. Browsers keep audio suspended
 * until the page is touched, so a blocked siren starts on the officer's next
 * click or key press, and `audioBlocked` lets the alarm say so.
 */
export function useAlarmSiren(on: boolean) {
  const [audioBlocked, setAudioBlocked] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!on) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }
    if (stopRef.current) return;

    let cancelled = false;
    void (async () => {
      try {
        type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };
        const AudioCtor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
        if (!AudioCtor) {
          setAudioBlocked(true);
          return;
        }
        contextRef.current ??= new AudioCtor();
        const context = contextRef.current;
        if (context.state === "suspended") await context.resume();
        if (cancelled) return;
        if (context.state !== "running") {
          setAudioBlocked(true);
          return;
        }
        setAudioBlocked(false);
        stopRef.current ??= startSiren(context);
      } catch {
        if (!cancelled) setAudioBlocked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [on]);

  useEffect(() => {
    if (!on || !audioBlocked) return;
    let live = true;
    const prime = () => {
      const context = contextRef.current;
      if (!context) return;
      void context.resume().then(() => {
        if (!live || context.state !== "running") return;
        setAudioBlocked(false);
        stopRef.current ??= startSiren(context);
      }).catch(() => {});
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      live = false;
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, [on, audioBlocked]);

  useEffect(() => () => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  return { audioBlocked };
}
