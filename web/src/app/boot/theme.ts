// The colour theme: the user's choice, kept in this browser, or picked to match the system.
import { THEMES, type Theme } from '../../generated/palettes.gen.ts';
import { isDarkTheme } from '../darkTheme.ts';
import { embedId, juce, params, start } from './page.ts';

export const THEME_KEY = 'blokdust.theme';

export let theme!: Theme;

export function setTheme<Value extends typeof theme>(value: Value): Value {
  theme = value;
  return value;
}

function keptTheme(): number | null {
  if (embedId) return null;
  try {
    const kept = localStorage.getItem(THEME_KEY);
    return kept === null ? null : Number(kept);
  } catch {
    return null;
  }
}

/** A first visit gets a random theme of the system's lightness, kept (CHG-0035). */
function firstTheme(): number | null {
  // Automated browsers keep theme 0 for their screenshots unless asked (`firsttheme=1`).
  if (juce || embedId || (navigator.webdriver && params.get('firsttheme') !== '1')) return null;
  let dark = false;
  try {
    dark = matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    /* no media queries: light */
  }
  const pool = THEMES.filter((candidate) => isDarkTheme(candidate) === dark).map(
    (candidate) => candidate.index,
  );
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? 0;
  try {
    localStorage.setItem(THEME_KEY, String(pick));
  } catch {
    /* private mode: picked again next time */
  }
  return pick;
}

export function init(): void {
  // `?theme=` (embeds, tests) first; a v1 composition's own theme only when none is kept.
  const chosen = Number(
    params.get('theme') ?? keptTheme() ?? start.view.theme ?? firstTheme() ?? 0,
  );
  theme = THEMES[Math.min(chosen, THEMES.length - 1)] ?? THEMES[0];
}
