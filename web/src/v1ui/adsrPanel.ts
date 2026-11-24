// The Envelope's ADSR graph, easier to set (owner, 2026-11-17; not in v1). v1 drew the times on a straight line from
// 10 ms to 5 s: the attack's 28 % of the panel is about 100 px, so everything under 100 ms was squeezed into 2 px and a
// sharp attack could hardly be picked. Still v1's graph and handles (ported/UI/Options/OptionADSR.ts), with:
//  - a log time axis (owner's pick of log / squared / straight, 2026-11-17): attack, decay and release handles give
//    short times the room and long ones still reach 5 s. The graph keeps v1's shape, drawn on that scale;
//  - the value while a handle is held, above the graph's top-right corner: "ATTACK 12 ms", "DECAY 300 ms   SUSTAIN 70%",
//    "RELEASE 1.20 s";
//  - no jump on press: a handle follows the pointer from where it was grabbed (v1 moved it to the pointer at once);
//  - fine control: holding Shift moves a held handle a tenth as fast;
//  - one handle at a time: when handles overlap (a short attack and decay), the press takes the nearest one (v1 took
//    all of them, and they then moved together).
import { App } from './shim.ts';

const FINE = 0.1;

/** Value at fraction `u` (0..1) of a time handle's track on the log axis (each tenfold step the same width), and back. */
export function timeAt(u: number, min: number, max: number): number {
  return min * Math.pow(max / min, Math.min(Math.max(u, 0), 1));
}
export function fractionOf(t: number, min: number, max: number): number {
  return Math.log(Math.min(Math.max(t, min), max) / min) / Math.log(max / min);
}

/** "12 ms", "120 ms", "1.20 s". */
export function timeText(t: number): string {
  return t < 1 ? `${Math.round(t * 1000)} ms` : `${t.toFixed(2)} s`;
}

let shift = false;
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') shift = true;
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') shift = false;
  });
  window.addEventListener('blur', () => {
    shift = false;
  });
}

/** Where handle `j` of an ADSR row is drawn, in panel-relative px (as v1 OptionsPanel's hit test). */
function handlePoint(panel: any, o: any, j: number): [number, number] {
  const handles = o.Handles,
    x0 = panel.Position.x + panel.Margin,
    y0 = panel.Position.y + o.Position.y,
    ht = o.Size.height;
  if (j === 0) return [x0 + handles[0].Position.x, y0 + ht * 0.1];
  if (j === 1)
    return [
      x0 + handles[0].Position.x + handles[1].Position.x,
      y0 + ht * 0.9 - handles[1].Position.y,
    ];
  return [x0 + panel.Range * 0.6 + handles[2].Position.x, y0 + ht * 0.9];
}

/** The held handle's value, above the graph's top-right corner. */
function drawReadout(ctx: CanvasRenderingContext2D, o: any, panel: any, units: number): void {
  const j = o.Handles.findIndex((Handle: any) => Handle.Selected);
  if (j < 0) return;
  const h = o.Handles[j];
  const text =
    j === 0
      ? `ATTACK ${timeText(h.XValue)}`
      : j === 1
        ? `DECAY ${timeText(h.XValue)}   SUSTAIN ${Math.round(h.YValue * 100)}%`
        : `RELEASE ${timeText(h.XValue)}`;
  // In the panel just above the graph, right-aligned to its right edge, in the title's type (v1 OptionsPanel TITLE):
  // it never crosses the graph, and a finger on the handle doesn't hide it.
  ctx.font = App.Metrics.TxtMid;
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.textAlign = 'right';
  ctx.fillText(
    text,
    panel.Margin + panel.Range + units,
    o.Position.y + o.Size.height * 0.1 - 12 * units,
  );
}

export function installAdsr(panel: any): void {
  // Handles start where their values are on the log axis (v1 placed them linearly).
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    for (const o of panel.Options ?? [])
      if (o.Type === 'ADSR') {
        for (const h of o.Handles) h.Position.x = h.XRange * fractionOf(h.XValue, h.XMin, h.XMax);
        if (o.__bdReadout) continue;
        const draw = o.Draw.bind(o);
        o.__bdReadout = true;
        o.Draw = (ctx: CanvasRenderingContext2D, units: number, i: number, p: any) => {
          draw(ctx, units, i, p);
          drawReadout(ctx, o, p, units);
        };
      }
  };

  // The nearest handle only.
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    for (const o of panel.Options ?? [])
      if (o.Type === 'ADSR' && o.HandleRoll.filter(Boolean).length > 1) {
        let best = -1,
          bestD = Infinity;
        o.HandleRoll.forEach((r: boolean, j: number) => {
          if (!r) return;
          const [hx, hy] = handlePoint(panel, o, j),
            d = (hx - mx) ** 2 + (hy - my) ** 2;
          if (d < bestD) {
            bestD = d;
            best = j;
          }
        });
        o.HandleRoll = o.HandleRoll.map((_: boolean, j: number) => j === best);
      }
  };

  // Relative dragging (no jump on press; Shift is fine), on the log axis.
  let grab: { n: number; h: number; mx: number; my: number; x: number; y: number } | null = null;
  const handleSet = panel.HandleSet.bind(panel);
  panel.HandleSet = (
    n: number,
    h: number,
    xStart: number,
    yRange: number,
    mx: number,
    my: number,
  ) => {
    const o = panel.Options?.[n];
    if (o?.Type !== 'ADSR') return handleSet(n, h, xStart, yRange, mx, my);
    const hd = o.Handles[h];
    if (!grab || grab.n !== n || grab.h !== h) {
      grab = { n, h, mx, my, x: hd.Position.x, y: hd.Position.y };
      return;
    }
    const k = shift ? FINE : 1;
    grab.x += (mx - grab.mx) * k;
    grab.y -= (my - grab.my) * k; // unclamped, so the pointer and handle stay together
    grab.mx = mx;
    grab.my = my;
    hd.Position.x = Math.min(Math.max(grab.x, 0), hd.XRange);
    hd.XValue = timeAt(hd.Position.x / hd.XRange, hd.XMin, hd.XMax);
    panel._DrawReady = true;
    panel.SelectedBlock.SetParam(hd.XSetting, hd.XValue);
    if (hd.YSetting) {
      hd.Position.y = Math.min(Math.max(grab.y, 0), hd.YRange);
      hd.YValue = hd.YMin + (hd.Position.y / hd.YRange) * (hd.YMax - hd.YMin);
      panel.SelectedBlock.SetParam(hd.YSetting, hd.YValue);
    }
  };
  const up = panel.MouseUp.bind(panel);
  panel.MouseUp = (...a: unknown[]) => {
    grab = null;
    panel._DrawReady = true;
    return up(...a);
  };
}
