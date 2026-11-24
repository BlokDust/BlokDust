// The colour theme: kept in this browser, or picked to match the system.
import { THEMES, type Theme } from '../../generated/palettes.gen.ts';
import { isDarkTheme } from '../darkTheme.ts';
import { embedId, juce, params, start } from './page.ts';

// The colour theme is the user's preference, kept in this browser (owner review 3, 2026-11-16: it went back to the
// first on every reload). `?theme=` (embeds, tests) comes first; a v1 composition's own theme only when none is kept.
export const THEME_KEY = 'blokdust.theme';

export let keptTheme!: number | null;

// A first visit (no theme kept, none asked for) gets a theme at random from those that match the system's light or
// dark setting (owner, 2026-11-17, CHG-0035: shared patches in every colour, and the user's preference kept), and
// keeps it. Automated browsers keep the first theme (their screenshots expect it) unless the URL asks (`firsttheme=1`).
export const firstTheme = (): number | null => {
  if (juce || embedId || (navigator.webdriver && params.get('firsttheme') !== '1')) return null;
  let dark = false;
  try {
    dark = matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    /* no media queries: light */
  }
  const pool = THEMES.filter((t) => isDarkTheme(t) === dark).map((t) => t.index);
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? 0;
  try {
    localStorage.setItem(THEME_KEY, String(pick));
  } catch {
    /* private mode: picked again next time */
  }
  return pick;
};

export let theme!: Theme;

export function setTheme<Value extends typeof theme>(value: Value): Value {
  theme = value;
  return value;
}

export function init(): void {
  keptTheme = (() => {
    if (embedId) return null;
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === null ? null : Number(v);
    } catch {
      return null;
    }
  })();
  theme =
    THEMES[
      Math.min(
        Number(params.get('theme') ?? keptTheme ?? start.view.theme ?? firstTheme() ?? 0),
        THEMES.length - 1,
      )
    ] ?? THEMES[0];
}
