import type { Theme } from '../generated/palettes.gen.ts';

/** A dark theme: its background (palette 0) is dark (MODE STEREO, CONSOLE, SEA CUCUMBER, VOLCANOLOGIST). */
export function isDarkTheme(t: Theme): boolean {
  const [r, g, b] = (t.colors[0].match(/[\d.]+/g) ?? ['0', '0', '0']).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}
