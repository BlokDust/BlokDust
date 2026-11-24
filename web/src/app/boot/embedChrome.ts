// Embed player chrome (SHARING-0002).
import { track, flushAnalytics } from '../../analytics/client.ts';

/** Embed player chrome (SHARING-0002): a play overlay and a link to the full app. Plain DOM over the stage. */
export function setupEmbedChrome(id: string, title: string): void {
  const base =
    document.querySelector<HTMLMetaElement>('meta[name="blokdust-base"]')?.content ??
    new URL('.', document.baseURI).href.replace(/\/$/, '');
  const overlay = document.getElementById('start');
  if (overlay) overlay.style.background = 'rgb(26 31 33 / 0.6)';
  if (overlay)
    overlay.innerHTML = `<span style="display:grid;place-items:center;gap:10px"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="27" fill="none" stroke="currentColor" stroke-width="2"/><path d="M22 17 L40 28 L22 39 Z" fill="currentColor"/></svg><span style="font:300 18px Dosis, system-ui, sans-serif;letter-spacing:.12em">${title ? title.toUpperCase().replace(/[<&>]/g, '') : 'PLAY'}</span></span>`;
  const link = document.createElement('a');
  link.href = `${base}/?c=${id}${title ? `&t=${encodeURI(title)}` : ''}`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'OPEN IN BLOKDUST ↗';
  link.id = 'open-in-blokdust';
  link.addEventListener('click', () => {
    track('embed_opened_full');
    flushAnalytics(true);
  });
  link.style.cssText =
    'position:fixed;right:10px;bottom:8px;z-index:4;color:#fff4d6;opacity:.75;font:400 11px Dosis, system-ui, sans-serif;letter-spacing:.1em;text-decoration:none';
  document.body.appendChild(link);
}
