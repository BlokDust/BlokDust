import type { Theme } from '../generated/palettes.gen.ts';

/** A dark theme: its background (palette 0) is dark (MODE STEREO, CONSOLE, SEA CUCUMBER,
 * VOLCANOLOGIST). */
export function isDarkTheme(theme: Theme): boolean {
  const [red, green, blue] = (theme.colors[0].match(/[\d.]+/g) ?? ['0', '0', '0']).map(Number);
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 < 0.5;
}
