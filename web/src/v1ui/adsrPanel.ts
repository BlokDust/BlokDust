// The Envelope's ADSR graph, easier to set: v1's graph and handles (OptionADSR) on a log time axis,
// with the held value shown, no jump on press, Shift for fine moves, the nearest handle only.
import { App } from './shim.ts';
import type { PanelOption, V2OptionsPanel } from './optionsTypes.ts';

/** Holding Shift moves a held handle a tenth as fast. */
const FINE = 0.1;

/** Value at `fraction` (0..1) of a time handle's track on the log axis, and back. */
export function timeAt(fraction: number, min: number, max: number): number {
  return min * Math.pow(max / min, Math.min(Math.max(fraction, 0), 1));
}
export function fractionOf(time: number, min: number, max: number): number {
  return Math.log(Math.min(Math.max(time, min), max) / min) / Math.log(max / min);
}

/** "12 ms", "120 ms", "1.20 s". */
export function timeText(time: number): string {
  return time < 1 ? `${Math.round(time * 1000)} ms` : `${time.toFixed(2)} s`;
}

let shift = false;
window.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') shift = true;
});
window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') shift = false;
});
window.addEventListener('blur', () => {
  shift = false;
});

/** Where handle `j` of an ADSR row is drawn, in device px (as v1 OptionsPanel's hit test). */
function handlePoint(panel: V2OptionsPanel, row: PanelOption, j: number): [number, number] {
  const handles = row.Handles,
    x0 = panel.Position.x + panel.Margin,
    y0 = panel.Position.y + row.Position.y,
    height = row.Size.height;
  if (j === 0) return [x0 + handles[0].Position.x, y0 + height * 0.1];
  if (j === 1)
    return [
      x0 + handles[0].Position.x + handles[1].Position.x,
      y0 + height * 0.9 - handles[1].Position.y,
    ];
  return [x0 + panel.Range * 0.6 + handles[2].Position.x, y0 + height * 0.9];
}

/** The held handle's value, in the panel just above the graph, right-aligned to its edge, in the
 * title's type: it never crosses the graph, and a finger on the handle doesn't hide it. */
function drawReadout(
  ctx: CanvasRenderingContext2D,
  row: PanelOption,
  panel: V2OptionsPanel,
  units: number,
): void {
  const j = row.Handles.findIndex((handle) => handle.Selected);
  if (j < 0) return;
  const handle = row.Handles[j];
  const text =
    j === 0
      ? `ATTACK ${timeText(handle.XValue)}`
      : j === 1
        ? `DECAY ${timeText(handle.XValue)}   SUSTAIN ${Math.round(handle.YValue * 100)}%`
        : `RELEASE ${timeText(handle.XValue)}`;
  ctx.font = App.Metrics.TxtMid;
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.textAlign = 'right';
  ctx.fillText(
    text,
    panel.Margin + panel.Range + units,
    row.Position.y + row.Size.height * 0.1 - 12 * units,
  );
}

/** Handles start where their values are on the log axis (v1 placed them linearly). */
function placeOnLogAxis(row: PanelOption): void {
  for (const handle of row.Handles)
    handle.Position.x = handle.XRange * fractionOf(handle.XValue, handle.XMin, handle.XMax);
  if (row.__bdReadout) return;
  const draw = row.Draw.bind(row);
  row.__bdReadout = true;
  row.Draw = (ctx, units, i, panel) => {
    draw(ctx, units, i, panel);
    drawReadout(ctx, row, panel, units);
  };
}
/** Of overlapping handles, a press takes the nearest (v1 took them all, moving together). */
function nearestOnly(panel: V2OptionsPanel, row: PanelOption, mx: number, my: number): void {
  let best = -1,
    bestDistance = Infinity;
  row.HandleRoll.forEach((rolled, j) => {
    if (!rolled) return;
    const [hx, hy] = handlePoint(panel, row, j),
      distance = (hx - mx) ** 2 + (hy - my) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = j;
    }
  });
  row.HandleRoll = row.HandleRoll.map((_, j) => j === best);
}

interface Grab {
  row: number;
  handle: number;
  mx: number;
  my: number;
  x: number;
  y: number;
}

export function installAdsr(panel: V2OptionsPanel): void {
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json, open) => {
    populate(json, open);
    for (const row of panel.Options) if (row.Type === 'ADSR') placeOnLogAxis(row);
  };
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    for (const row of panel.Options)
      if (row.Type === 'ADSR' && row.HandleRoll.filter(Boolean).length > 1)
        nearestOnly(panel, row, mx, my);
  };

  // Relative dragging (no jump on press; Shift is fine), on the log axis.
  let grab: Grab | null = null;
  const handleSet = panel.HandleSet.bind(panel);
  panel.HandleSet = (
    rowIndex: number,
    handleIndex: number,
    xStart: number,
    yRange: number,
    mx: number,
    my: number,
  ) => {
    const row = panel.Options.at(rowIndex);
    if (row?.Type !== 'ADSR') {
      handleSet(rowIndex, handleIndex, xStart, yRange, mx, my);
      return;
    }
    const handle = row.Handles[handleIndex];
    if (grab?.row !== rowIndex || grab.handle !== handleIndex) {
      grab = {
        row: rowIndex,
        handle: handleIndex,
        mx,
        my,
        x: handle.Position.x,
        y: handle.Position.y,
      };
      return;
    }
    const speed = shift ? FINE : 1;
    grab.x += (mx - grab.mx) * speed;
    grab.y -= (my - grab.my) * speed; // unclamped, so the pointer and handle stay together
    grab.mx = mx;
    grab.my = my;
    handle.Position.x = Math.min(Math.max(grab.x, 0), handle.XRange);
    handle.XValue = timeAt(handle.Position.x / handle.XRange, handle.XMin, handle.XMax);
    panel._DrawReady = true;
    panel.SelectedBlock?.SetParam(handle.XSetting, handle.XValue);
    if (handle.YSetting) {
      handle.Position.y = Math.min(Math.max(grab.y, 0), handle.YRange);
      handle.YValue =
        handle.YMin + (handle.Position.y / handle.YRange) * (handle.YMax - handle.YMin);
      panel.SelectedBlock?.SetParam(handle.YSetting, handle.YValue);
    }
  };
  const up = panel.MouseUp.bind(panel);
  panel.MouseUp = () => {
    grab = null;
    panel._DrawReady = true;
    up();
  };
}
