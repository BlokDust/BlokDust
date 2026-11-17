// The Envelope's ADSR graph, easier to set (owner, 2026-11-17; not in v1). v1 drew the times on a straight line from
// 10 ms to 5 s: the attack's 28 % of the panel is about 100 px, so everything under 100 ms was squeezed into 2 px and a
// sharp attack could hardly be picked. Still v1's graph and handles (ported/UI/Options/OptionADSR.ts), with:
//  - a curved time axis: attack, decay and release handles sit on a log (default) or squared scale, so short times get
//    the room and long ones still reach 5 s. The graph keeps v1's shape, drawn on that scale;
//  - the value while a handle is held, above the graph's top-right corner: "ATTACK 12 ms", "DECAY 300 ms   SUSTAIN 70%",
//    "RELEASE 1.20 s";
//  - no jump on press: a handle follows the pointer from where it was grabbed (v1 moved it to the pointer at once);
//  - fine control: holding Shift moves a held handle a tenth as fast;
//  - one handle at a time: when handles overlap (a short attack and decay), the press takes the nearest one (v1 took
//    all of them, and they then moved together).
// For the owner's review on staging, `?adsr=log|square|v1` picks the axis (remembered in this browser); v1 is v1's
// straight axis with the other improvements.
import { App } from './shim.ts';

export type AdsrAxis = 'log' | 'square' | 'v1';
const AXES: AdsrAxis[] = ['log', 'square', 'v1'];
const FINE = 0.1;

/** The axis this browser uses: `?adsr=` (then remembered), else the remembered one, else log. */
export function adsrAxis(): AdsrAxis {
  let axis: string | null = null;
  try {
    axis = new URLSearchParams(location.search).get('adsr');
    if (axis && AXES.includes(axis as AdsrAxis)) localStorage.setItem('bd.adsrAxis', axis);
    else axis = localStorage.getItem('bd.adsrAxis');
  } catch { /* no storage: the default */ }
  return AXES.includes(axis as AdsrAxis) ? axis as AdsrAxis : 'log';
}

/** Value at fraction `u` (0..1) of a time handle's track, and back. */
export function timeAt(axis: AdsrAxis, u: number, min: number, max: number): number {
  u = Math.min(Math.max(u, 0), 1);
  if (axis === 'log') return min * Math.pow(max / min, u);
  if (axis === 'square') return min + (max - min) * u * u;
  return min + (max - min) * u;
}
export function fractionOf(axis: AdsrAxis, t: number, min: number, max: number): number {
  t = Math.min(Math.max(t, min), max);
  if (axis === 'log') return Math.log(t / min) / Math.log(max / min);
  if (axis === 'square') return Math.sqrt((t - min) / (max - min));
  return (t - min) / (max - min);
}

/** "12 ms", "120 ms", "1.20 s". */
export function timeText(t: number): string {
  return t < 1 ? `${Math.round(t * 1000)} ms` : `${t.toFixed(2)} s`;
}

let shift = false;
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => { if (e.key === 'Shift') shift = true; });
  window.addEventListener('keyup', e => { if (e.key === 'Shift') shift = false; });
  window.addEventListener('blur', () => { shift = false; });
}

/** Where handle `j` of an ADSR row is drawn, in panel-relative px (as v1 OptionsPanel's hit test). */
function handlePoint(panel: any, o: any, j: number): [number, number] {
  const h = o.Handles, x0 = panel.Position.x + panel.Margin, y0 = panel.Position.y + o.Position.y, ht = o.Size.height;
  if (j === 0) return [x0 + h[0].Position.x, y0 + ht * 0.1];
  if (j === 1) return [x0 + h[0].Position.x + h[1].Position.x, y0 + ht * 0.9 - h[1].Position.y];
  return [x0 + panel.Range * 0.6 + h[2].Position.x, y0 + ht * 0.9];
}

/** The held handle's value, above the graph's top-right corner. */
function drawReadout(ctx: CanvasRenderingContext2D, o: any, panel: any, units: number): void {
  const j = o.Handles.findIndex((h: any) => h.Selected);
  if (j < 0) return;
  const h = o.Handles[j];
  const text = j === 0 ? `ATTACK ${timeText(h.XValue)}` : j === 1 ? `DECAY ${timeText(h.XValue)}   SUSTAIN ${Math.round(h.YValue * 100)}%` : `RELEASE ${timeText(h.XValue)}`;
  // In the panel just above the graph, right-aligned to its right edge, in the title's type (v1 OptionsPanel TITLE):
  // it never crosses the graph, and a finger on the handle doesn't hide it.
  ctx.font = App.Metrics.TxtMid;
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.textAlign = 'right';
  ctx.fillText(text, panel.Margin + panel.Range + units, o.Position.y + o.Size.height * 0.1 - 12 * units);
}

export function installAdsr(panel: any, axis: AdsrAxis = adsrAxis()): void {
  // Handles start where their values are on the chosen axis (v1 placed them linearly).
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    for (const o of panel.Options ?? []) if (o.Type === 'ADSR') {
      for (const h of o.Handles) h.Position.x = h.XRange * fractionOf(axis, h.XValue, h.XMin, h.XMax);
      if (o.__bdReadout) continue;
      const draw = o.Draw.bind(o);
      o.__bdReadout = true;
      o.Draw = (ctx: CanvasRenderingContext2D, units: number, i: number, p: any) => { draw(ctx, units, i, p); drawReadout(ctx, o, p, units); };
    }
  };

  // The nearest handle only.
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    for (const o of panel.Options ?? []) if (o.Type === 'ADSR' && o.HandleRoll.filter(Boolean).length > 1) {
      let best = -1, bestD = Infinity;
      o.HandleRoll.forEach((r: boolean, j: number) => {
        if (!r) return;
        const [hx, hy] = handlePoint(panel, o, j), d = (hx - mx) ** 2 + (hy - my) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      });
      o.HandleRoll = o.HandleRoll.map((_: boolean, j: number) => j === best);
    }
  };

  // Relative dragging (no jump on press; Shift is fine), on the chosen axis.
  let grab: { n: number; h: number; mx: number; my: number; x: number; y: number } | null = null;
  const handleSet = panel.HandleSet.bind(panel);
  panel.HandleSet = (n: number, h: number, xStart: number, yRange: number, mx: number, my: number) => {
    const o = panel.Options?.[n];
    if (o?.Type !== 'ADSR') return handleSet(n, h, xStart, yRange, mx, my);
    const hd = o.Handles[h];
    if (!grab || grab.n !== n || grab.h !== h) { grab = { n, h, mx, my, x: hd.Position.x, y: hd.Position.y }; return; }
    const k = shift ? FINE : 1;
    grab.x += (mx - grab.mx) * k; grab.y -= (my - grab.my) * k;  // unclamped, so the pointer and handle stay together
    grab.mx = mx; grab.my = my;
    hd.Position.x = Math.min(Math.max(grab.x, 0), hd.XRange);
    hd.XValue = timeAt(axis, hd.Position.x / hd.XRange, hd.XMin, hd.XMax);
    panel._DrawReady = true;
    panel.SelectedBlock.SetParam(hd.XSetting, hd.XValue);
    if (hd.YSetting) {
      hd.Position.y = Math.min(Math.max(grab.y, 0), hd.YRange);
      hd.YValue = hd.YMin + (hd.Position.y / hd.YRange) * (hd.YMax - hd.YMin);
      panel.SelectedBlock.SetParam(hd.YSetting, hd.YValue);
    }
  };
  const up = panel.MouseUp.bind(panel);
  panel.MouseUp = (...a: unknown[]) => { grab = null; panel._DrawReady = true; return up(...a); };
}
