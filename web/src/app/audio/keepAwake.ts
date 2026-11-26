// Audio comes back after iOS interrupts it.

export let lastSnapshot = 0;

/** iOS leaves the AudioContext interrupted after another app plays (web only, not the plugin).
 * Returning and every press resume it; a press also kicks (suspend, resume) a stuck context. */
export function keepAwake(ctx: AudioContext): void {
  let kicking = false;
  const wake = (press: boolean) => {
    if (document.hidden || ctx.state === 'closed' || kicking) return;
    if (ctx.state !== 'running') {
      void ctx.resume().catch(() => {});
      return;
    }
    if (!press || performance.now() - lastSnapshot < 1000) return;
    kicking = true;
    void ctx
      .suspend()
      .then(() => ctx.resume())
      .catch(() => {})
      .finally(() => {
        kicking = false;
      });
  };
  document.addEventListener('visibilitychange', () => {
    wake(false);
  });
  window.addEventListener('pageshow', () => {
    wake(false);
  });
  window.addEventListener('focus', () => {
    wake(false);
  });
  ctx.addEventListener('statechange', () => {
    wake(false);
  });
  for (const eventType of ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const)
    window.addEventListener(
      eventType,
      () => {
        wake(true);
      },
      { capture: true },
    );
}

export function setLastSnapshot<Value extends typeof lastSnapshot>(value: Value): Value {
  lastSnapshot = value;
  return value;
}
