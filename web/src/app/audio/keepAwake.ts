// Audio comes back after iOS interrupts it.

/** iOS interrupts the AudioContext when another app plays (a video, a podcast) and leaves it so when the page comes
 * back: the engine runs in it, so sound, connections and particles all stood still (owner, 2026-11-14). Coming back to
 * the page and every press resume it; a press also kicks a context that says it runs but has rendered nothing for a
 * while (suspend, then resume), which iOS sometimes leaves behind. Never the plugin (JUCE runs the engine). */
export let lastSnapshot = 0;

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
  document.addEventListener('visibilitychange', () => wake(false));
  window.addEventListener('pageshow', () => wake(false));
  window.addEventListener('focus', () => wake(false));
  ctx.addEventListener('statechange', () => wake(false));
  for (const t of ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const)
    window.addEventListener(t, () => wake(true), { capture: true });
}

export function setLastSnapshot<Value extends typeof lastSnapshot>(value: Value): Value {
  lastSnapshot = value;
  return value;
}
