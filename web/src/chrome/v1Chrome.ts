// v1's on-stage chrome in its closed state, ported draw call for draw call (CHG-0001 0.10c):
//   ZoomButtons.Draw → TrashCan.Draw → Header.Draw (+ MenuCategory.Draw) → CreateNew icon, in v1's display-list order.
// Expressions keep v1's operation order so fractional coordinates, and therefore anti-aliased pixels, match exactly.
// Interactive states (open menus, hovers, panels, zoom label) are Phase 1.
import type { Theme } from '../generated/palettes.gen.ts';

export type Device = 'desktop' | 'tablet' | 'mobile';
/** v1 Metrics.DeviceCheck (css px). */
export function deviceOf(cssWidth: number, cssHeight: number): { device: Device; screenDivision: number; itemsPerPage: number } {
  if (cssHeight > cssWidth * 1.3) return { device: 'mobile', screenDivision: 475, itemsPerPage: 3 };
  if (cssHeight > cssWidth * 1.1) return { device: 'tablet', screenDivision: 600, itemsPerPage: 4 };
  return { device: 'desktop', screenDivision: 850, itemsPerPage: 6 };
}

const CATEGORIES = ['SOURCE', 'EFFECT', 'POWER', 'INTERACTION'];  // v1 l10n.json Blocks.*.Label, upper-cased
const HEADER_HEIGHT = 60;                                          // v1 Metrics.HeaderHeight (units)

export interface ChromeInput {
  ctx: CanvasRenderingContext2D;
  theme: Theme;
  width: number; height: number;   // canvas (device px) = v1 App.Width / App.Height
  units: number;                   // v1 App.Unit (device px per unit, unscaled by zoom)
  cssWidth: number; cssHeight: number;
  blockCount: number;              // v1 CreateNew shows its icon (and shifts the logo) when there is more than one block
}

export function drawV1Chrome(c: ChromeInput): void {
  const { ctx, theme, units } = c;
  const txt = theme.colors[theme.roles.txt];
  const W = c.width, H = c.height;
  const { device, itemsPerPage } = deviceOf(c.cssWidth, c.cssHeight);

  // ---- ZoomButtons.Draw ----
  {
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.fillStyle = txt; ctx.strokeStyle = txt;
    const zin = { x: 30 * units, y: H - (30 * units) }, zout = { x: 70 * units, y: H - (30 * units) };
    const im = 1, om = 1, diamond = 11;
    ctx.beginPath();
    ctx.moveTo(zin.x, zin.y - ((5 * im) * units));
    ctx.lineTo(zin.x, zin.y + ((5 * im) * units));
    ctx.moveTo(zin.x - ((5 * im) * units), zin.y);
    ctx.lineTo(zin.x + ((5 * im) * units), zin.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(zout.x - ((5 * om) * units), zout.y);
    ctx.lineTo(zout.x + ((5 * om) * units), zout.y);
    ctx.stroke();
    ctx.lineWidth = 1;
    const x = zin.x + ((zout.x - zin.x) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, zin.y - (diamond * units));
    ctx.lineTo(x, zin.y + (diamond * units));
    ctx.closePath();
    ctx.stroke();
  }

  // ---- TrashCan.Draw ----
  {
    const tx = W - (30 * units), ty = H - (30 * units), s = 1;
    ctx.strokeStyle = txt;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - ((11 * s) * units), ty - ((11 * s) * units));
    ctx.lineTo(tx + ((11 * s) * units), ty - ((11 * s) * units));
    ctx.lineTo(tx + ((8 * s) * units), ty + ((11 * s) * units));
    ctx.lineTo(tx - ((8 * s) * units), ty + ((11 * s) * units));
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - ((4 * s) * units), ty - ((4 * s) * units));
    ctx.lineTo(tx + ((4 * s) * units), ty + ((4 * s) * units));
    ctx.moveTo(tx + ((4 * s) * units), ty - ((4 * s) * units));
    ctx.lineTo(tx - ((4 * s) * units), ty + ((4 * s) * units));
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // ---- Header.Populate (layout) + Header.Draw ----
  {
    const rows = device === 'desktop' ? 1 : 2;
    const gutter = device === 'tablet' ? 40 : 60;
    const dataType = units * 10;
    const headerType = Math.round(units * 28);
    const thisHeight = Math.round(HEADER_HEIGHT * units);
    const rowOffset = ((rows - 1) * HEADER_HEIGHT) * units;
    const dropDownHeight = (W / (itemsPerPage + 1)) / units;
    const createNewMargin = c.blockCount > 1 ? 30 : 0;

    ctx.font = '400 ' + dataType + 'px Dosis';
    ctx.textAlign = 'left';
    const catWidth = CATEGORIES.map(n => ctx.measureText(n).width + (gutter * units));
    const menuWidth = catWidth.reduce((a, b) => a + b, 0);
    let catX = ((W * 0.5) - (menuWidth * 0.5));
    const cats = CATEGORIES.map((name, i) => { const x = catX + (catWidth[i] * 0.5); catX += catWidth[i]; return { name, x, width: catWidth[i] }; });

    ctx.fillStyle = theme.colors[2];
    ctx.globalAlpha = 0.16;
    ctx.fillRect(0, 0, W, thisHeight + (5 * units) + 0 + rowOffset);
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, W, thisHeight + 0 + rowOffset);
    ctx.globalAlpha = 1;

    ctx.fillStyle = txt;
    ctx.font = '200 ' + headerType + 'px Dosis';
    if (rows > 1) { ctx.textAlign = 'center'; ctx.fillText('BLOKDUST', W * 0.5, (thisHeight * 0.5) + (headerType * 0.38)); }
    else { ctx.textAlign = 'left'; ctx.fillText('BLOKDUST', (20 + createNewMargin) * units, (thisHeight * 0.5) + (headerType * 0.38)); }

    ctx.strokeStyle = theme.colors[1];
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    if (rows > 1) {
      ctx.beginPath();
      ctx.moveTo(20 * units, thisHeight);
      ctx.lineTo(W - (20 * units), thisHeight);
      ctx.stroke();
    }
    let margin = dropDownHeight * 0.5;
    ctx.beginPath();
    cats.forEach((cat, i) => {
      if (i > 0) {
        ctx.moveTo(Math.round(cat.x - (cat.width * 0.5)), rowOffset + (thisHeight * 0.5) - (16 * units));
        ctx.lineTo(Math.round(cat.x - (cat.width * 0.5)), rowOffset + (thisHeight * 0.5) + (16 * units));
      }
    });
    ctx.moveTo(Math.round(W - (margin * units)), (thisHeight * 0.5) - (16 * units));
    ctx.lineTo(Math.round(W - (margin * units)), (thisHeight * 0.5) + (16 * units));
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '400 ' + dataType + 'px Dosis';
    cats.forEach((cat, i) => {
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.colors[theme.roles.menu[i % theme.roles.menu.length]];
      // MenuCategory.Draw: the selected-tab polygon has zero height when closed (draws nothing), then the label.
      ctx.fillStyle = txt;
      ctx.fillText(cat.name, cat.x, rowOffset + (thisHeight * 0.5) + (dataType * 0.38));
    });

    const btnWidth = ctx.measureText('SHARE').width + (40 * units);
    ctx.globalAlpha = 1;
    margin = dropDownHeight * 0.5;
    ctx.fillStyle = txt; ctx.strokeStyle = txt;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W - (margin * units) + (20 * units), ((HEADER_HEIGHT * 0.5) - 1) * units);
    ctx.lineTo(W - (margin * units) + (26.6 * units), ((HEADER_HEIGHT * 0.5) - 7) * units);
    ctx.lineTo(W - (margin * units) + (33.2 * units), ((HEADER_HEIGHT * 0.5) - 1) * units);
    ctx.lineTo(W - (margin * units) + (40 * units), ((HEADER_HEIGHT * 0.5) - 7) * units);
    ctx.moveTo(W - (margin * units) + (20 * units), ((HEADER_HEIGHT * 0.5) + 7) * units);
    ctx.lineTo(W - (margin * units) + (26.6 * units), ((HEADER_HEIGHT * 0.5) + 1) * units);
    ctx.lineTo(W - (margin * units) + (33.2 * units), ((HEADER_HEIGHT * 0.5) + 7) * units);
    ctx.lineTo(W - (margin * units) + (40 * units), ((HEADER_HEIGHT * 0.5) + 1) * units);
    ctx.moveTo(W - (margin * units) - (btnWidth * 0.5) - (5 * units), ((HEADER_HEIGHT * 0.75) - 6) * units);
    ctx.lineTo(W - (margin * units) - (btnWidth * 0.5), ((HEADER_HEIGHT * 0.75) - 1) * units);
    ctx.lineTo(W - (margin * units) - (btnWidth * 0.5) + (5 * units), ((HEADER_HEIGHT * 0.75) - 6) * units);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText('SHARE', W - (margin * units) - (20 * units), ((HEADER_HEIGHT * 0.5) * units) + (dataType * 0.38));
    ctx.textAlign = 'center';
  }

  // ---- CreateNew icon (visible when more than one block) ----
  if (c.blockCount > 1) {
    const x = 25, y = HEADER_HEIGHT * 0.5, m = 1, xOffset = 0;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = txt;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(((x - (2 * m)) * units) + xOffset, (y - (2 * m)) * units);
    ctx.lineTo(((x + (8 * m)) * units) + xOffset, (y - (2 * m)) * units);
    ctx.moveTo(((x + (3 * m)) * units) + xOffset, (y - (7 * m)) * units);
    ctx.lineTo(((x + (3 * m)) * units) + xOffset, (y + (3 * m)) * units);
    ctx.moveTo(((x - (5 * m)) * units) + xOffset, (y - (2 * m)) * units);
    ctx.lineTo(((x - (5 * m)) * units) + xOffset, (y + (6 * m)) * units);
    ctx.lineTo(((x + (3 * m)) * units) + xOffset, (y + (6 * m)) * units);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

/** Load v1's fonts (vendored copies of files.blokdust.io, web/public/fonts) before measuring or drawing text. */
export async function loadV1Fonts(base = document.baseURI): Promise<void> {
  const faces = [
    new FontFace('Dosis', `url(${new URL('fonts/Dosis-200.woff2', base)}) format('woff2')`, { weight: '200' }),
    new FontFace('Dosis', `url(${new URL('fonts/Dosis-regular.woff2', base)}) format('woff2')`, { weight: '400' }),
    new FontFace('Merriweather Sans', `url(${new URL('fonts/Merriweather-Sans-300italic.woff2', base)}) format('woff2')`, { weight: '300', style: 'italic' }),
  ];
  // A missing font must never stop the app starting: chrome text then falls back to the default font (and visual
  // diffs will show it), but the stage, audio and host bridge keep working.
  const loaded = await Promise.allSettled(faces.map(f => f.load()));
  for (const r of loaded) {
    if (r.status === 'fulfilled') document.fonts.add(r.value);
    else console.warn('v1 font failed to load:', r.reason);
  }
}
