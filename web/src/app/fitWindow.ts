// Keeps the renderer the size and pixel ratio of the window.
import type { Application } from 'pixi.js';

export function fitToWindow(app: Application): void {
  const touchScreen = matchMedia('(pointer: coarse)').matches;
  // A touch keyboard only shrinks the window; laying out for it left the app tiny after it closed (iPhone, 2026-11-18).
  const typingOnTouch = () => {
    const field = document.activeElement;
    return touchScreen && !!field && (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA');
  };

  let width = window.innerWidth, height = window.innerHeight, pixelRatio = devicePixelRatio;
  const fit = () => {
    const ratioChanged = devicePixelRatio !== pixelRatio;
    const widthChanged = window.innerWidth !== width;
    const heightChanged = window.innerHeight !== height && !typingOnTouch();
    if (!ratioChanged && !widthChanged && !heightChanged) return;
    width = window.innerWidth; height = window.innerHeight; pixelRatio = devicePixelRatio;
    app.renderer.resize(width, height, pixelRatio);
  };

  const fitWhenPixelRatioChanges = () => {
    try { matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change', () => { fit(); fitWhenPixelRatioChanges(); }, { once: true }); } catch { /* no media queries */ }
  };
  const fitAfterTyping = () => { if (!typingOnTouch()) { window.scrollTo(0, 0); fit(); } };

  window.addEventListener('resize', fit);
  fitWhenPixelRatioChanges();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') fit(); });
  document.addEventListener('focusout', () => { for (const ms of [60, 350, 900]) setTimeout(fitAfterTyping, ms); });
}
