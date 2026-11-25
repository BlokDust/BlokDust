// Where the account page's parts sit, and the numbers it shows.
import { App } from '../shim.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';

/** v1 SettingsPanel's menuWidth, About's text column: 4/7 of the panel; on a phone the width less
 * 80 units (owner, 2026-11-18). Settings › DOWNLOAD and ACCOUNT use it too (CHG-0035). */
export function pageWidth(): number {
  return App.SettingsMenuWidth(App.MainScene?.Width || App.Width);
}

/** Where each part of the stats starts (units from the page's top). Numbers: their tops are 5 units under a row's y,
 * their labels' baselines 52; FAVOURITE BLOCKS' title tops are 2 units under its y. */
export const STATS_Y = { row1: 27, row2: 96, favourites: 168, buttons: 278 } as const;
/** On a phone (owner, 2026-11-18): the numbers in two rows of four as on a desktop, with more room between the parts
 * (the screen is tall); FAVOURITE BLOCKS in two rows of three (the most remixed patch on its own line under the title),
 * then the buttons. */
export const PHONE = {
  row1: 40,
  row2: 130,
  favourites: 232,
  favRow: 110,
  remixed: 18,
  buttons: 506,
} as const;
/** The account page's top, in units under Settings' tabs' top (scene.ts accountTop: 35 above v1's 120). */
export const ACCOUNT_TOP = 85;
/** Favourite blocks (from FAVOURITE BLOCKS' y): the icons at half v1's menu size (owner,
 * 2026-11-16), centred 31 units down; their names' baselines 62 down (a second line 14 under). */
export const FAV = { scale: 0.5, icon: 42, name: 73 } as const;
/** 1234 → 1,234; 12345 → 12.3K; 1234567 → 1.2M (the numbers are for fun: short beats exact). */
export function shortNumber(n: number): string {
  const f = (v: number, s: string) => `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10}${s}`;
  if (n >= 1e9) return f(n / 1e9, 'B');
  if (n >= 1e6) return f(n / 1e6, 'M');
  if (n >= 1e4) return f(n / 1e3, 'K');
  return Math.round(n).toLocaleString('en-GB');
}
/** A block type's menu item (its icon is drawn by name, as the blocks menu does), or null if it has none. */
export function menuItem(type: string): { name: string } | null {
  const id = BLOCKS_BY_ID.get(type)?.menuId;
  for (const cat of (
    App.BlockCreator.MenuJson as { categories: { items: { name: string; id: string }[] }[] }
  ).categories)
    for (const item of cat.items) if (item.id === id) return item;
  return null;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
}
export interface Bordered {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  textX: number;
  textY: number;
}
