// The Touchpad (CHG-0019, UI-0010): Push-style pads in v1's options panel, with two rows of its own
// (the keys, the pads) and more height. Every finger plays its pad; sliding to another bends there.
import { App, Dimensions, Point } from './shim.ts';
import { Device } from './ported/Device';
import type { Header } from './ported/UI/Header';
import type { V1Block } from './blocks/v1Block.ts';
import type { FormParameter, PanelOption, V2OptionsPanel } from './optionsTypes.ts';

/** Scale steps (engine kScales): major, minor, dorian, lydian, mixolydian, pentatonic. */
const SCALE_STEPS = [
  [0, 2, 4, 5, 7, 9, 11],
  [0, 2, 3, 5, 7, 8, 10],
  [0, 2, 3, 5, 7, 9, 10],
  [0, 2, 4, 6, 7, 9, 11],
  [0, 2, 4, 5, 7, 9, 10],
  [0, 2, 4, 7, 9],
];
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** The bottom-left pad of a Touchpad in C: C3 (the Octave slider moves it, in the engine). */
const BASE_NOTE = 48;

const stepsOf = (scale: number) =>
  SCALE_STEPS[Math.max(0, Math.min(SCALE_STEPS.length - 1, Math.round(scale)))];
/** Semitones above the root of the pad at (col, row), row 0 at the bottom. In key: the scale along
 * a row, each row a fourth (three steps) up. Chromatic: semitones, each row five up. */
export function padSemitone(col: number, row: number, scale: number, chromatic: boolean): number {
  if (chromatic) return col + 5 * row;
  const steps = stepsOf(scale),
    degree = col + 3 * row;
  return Math.floor(degree / steps.length) * 12 + steps[degree % steps.length];
}
const inScale = (semitone: number, scale: number) =>
  stepsOf(scale).includes(((semitone % 12) + 12) % 12);

/** A pad as drawn, in panel px (tests and presses read them). */
export interface Pad {
  x: number;
  y: number;
  w: number;
  h: number;
  note: number;
  semi: number;
}
interface Finger {
  block: number;
  base: number;
  now: number;
}
/** Fingers (and the mouse) on pads: the note each started, and the one it has slid to. */
const fingers = new Map<number, Finger>();
export interface PadHost {
  note(block: number, note: number, on: boolean): void;
  bend(block: number, note: number, semitones: number): void;
}

const isTouchpad = (panel: V2OptionsPanel) => panel.SelectedBlock?.def.id === 'input.touchpad';
const mobile = () => App.Metrics.Device === Device.mobile;
const padsOf = (panel: V2OptionsPanel): Pad[] =>
  panel.Options.find((option) => option.Type === 'pads')?.Pads ?? [];
/** The pad at device px (x, y): the one under it, or, between pads, the nearest (no dead gaps). */
function padAt(panel: V2OptionsPanel, x: number, y: number): Pad | null {
  if (panel.Scale !== 1 || !isTouchpad(panel)) return null;
  const localX = x - panel.Position.x,
    localY = y - panel.Position.y,
    pads = padsOf(panel);
  if (!pads.length) return null;
  const left = Math.min(...pads.map((pad) => pad.x)),
    right = Math.max(...pads.map((pad) => pad.x + pad.w));
  const top = Math.min(...pads.map((pad) => pad.y)),
    bottom = Math.max(...pads.map((pad) => pad.y + pad.h));
  if (localX < left || localX > right || localY < top || localY > bottom) return null;
  let best: Pad | null = null,
    bestDistance = Infinity;
  for (const pad of pads) {
    const dx = Math.max(pad.x - localX, 0, localX - (pad.x + pad.w)),
      dy = Math.max(pad.y - localY, 0, localY - (pad.y + pad.h)),
      distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      best = pad;
      bestDistance = distance;
    }
  }
  return best;
}

/** A pointer went down at device px (x, y): true if on a pad (it is then the pads' until it
 * lifts). */
export function padDown(
  panel: V2OptionsPanel,
  pointer: number,
  x: number,
  y: number,
  host: PadHost,
): boolean {
  const pad = padAt(panel, x, y),
    block = panel.SelectedBlock;
  if (!pad || !block) return false;
  fingers.set(pointer, { block: block.Id, base: pad.note, now: pad.note });
  host.note(block.Id, pad.note, true);
  panel._DrawReady = true;
  return true;
}
/** A pad finger moved: onto another pad, its note slides there. True if `pointer` is a pad
 * finger. */
export function padMove(
  panel: V2OptionsPanel,
  pointer: number,
  x: number,
  y: number,
  host: PadHost,
): boolean {
  const finger = fingers.get(pointer);
  if (!finger) return false;
  const pad = padAt(panel, x, y);
  if (pad && pad.note !== finger.now && panel.SelectedBlock?.Id === finger.block) {
    finger.now = pad.note;
    host.bend(finger.block, finger.base, finger.now - finger.base);
    panel._DrawReady = true;
  }
  return true;
}
/** A pad finger lifted (or was cancelled). True if `pointer` was one. */
export function padUp(panel: V2OptionsPanel, pointer: number, host: PadHost): boolean {
  const finger = fingers.get(pointer);
  if (!finger) return false;
  fingers.delete(pointer);
  host.note(finger.block, finger.base, false);
  panel._DrawReady = true;
  return true;
}
/** Tests: the notes sounding from pads now. */
export const padNotes = (): number[] => [...fingers.values()].map((finger) => finger.now);

const quantisedSlider = (
  name: string,
  setting: string,
  value: number,
  min: number,
  max: number,
  centered: boolean,
): FormParameter => ({
  type: 'slider',
  name,
  setting,
  props: { value, min, max, quantised: true, centered },
});
/** The Touchpad's options form: Key, Scale, the switches, Octave, the pads. */
export function touchpadForm(
  block: V1Block,
  scales: string[],
  choice: (name: string, setting: string, value: number, labels: string[]) => FormParameter,
): void {
  const params = block.Params;
  block.OptionsForm = {
    name: block.BlockName,
    parameters: [
      quantisedSlider('Key', 'touchpadKey', Number(params.key ?? 0), 0, 11, false),
      choice('Scale', 'scale', Number(params.scale ?? 0), scales),
      {
        type: 'switches',
        name: '',
        setting: '',
        props: { value: 0, min: 0, max: 1, quantised: true },
        switches: [
          {
            name: 'Mono/Poly',
            setting: 'polyphonic',
            value: !!params.isPolyphonic,
            mode: 'fewMany',
          },
          { name: 'In Key', setting: 'inKey', value: !params.chromatic, lit: true, mode: 'offOn' },
        ],
      },
      quantisedSlider('Octave', 'transpose', Number(params.transpose ?? 0), -3, 3, true),
      {
        type: 'slider',
        name: '',
        setting: 'touchpadPads',
        props: { value: 0, min: 0, max: 1, quantised: false, centered: false },
      },
    ],
  };
}

/** Row heights in v1 units: Key, Scale, switches, Octave; the pads take what the screen has
 * left. */
const ROWS = [40, 40, 56, 40];
/** v1's header may not have laid out its rows yet. */
const headerRows = (header: Header) => (header.Rows as number | undefined) ?? 1;
/** The free band's top and bottom: under the header (and the name tab), over zoom, power, bin. */
function freeBand(): { top: number; bottom: number } {
  const unit = App.Unit,
    header = App.MainScene.Header;
  return {
    top: header.Height * headerRows(header) * unit + 30 * unit,
    bottom: App.Height - 72 * unit,
  };
}
/** Room for the panel, in device px either side of its centre line. */
function room(centreY: number): number {
  const { top, bottom } = freeBand();
  return Math.max(60 * App.Unit, Math.min(centreY - top, bottom - centreY));
}
/** Where the Touchpad's panel centres, as a fraction of the screen's height: the middle of the free
 * band; on a phone, as low as it goes, leaving 70 units at the top for the block. */
function touchpadCentre(): number {
  const { top, bottom } = freeBand();
  return mobile()
    ? (bottom - (bottom - top - 70 * App.Unit) / 2) / App.Height
    : (top + bottom) / 2 / App.Height;
}

/** Give the open Touchpad panel its own row heights (v1's Populate fits everything in 240
 * units). */
function relayout(panel: V2OptionsPanel): void {
  const unit = App.Unit;
  const total = Math.min((2 * room(panel.Position.y)) / unit - 40, mobile() ? 640 : 440);
  const fixed = ROWS.reduce((a, b) => a + b, 0),
    heights = [...ROWS, Math.max(100, total - fixed)];
  panel.Size.height = (heights.reduce((a, b) => a + b, 0) + 40) * unit;
  let y = -panel.Size.height * 0.5 + 20 * unit;
  panel.Options.forEach((option, i) => {
    const height = Math.round(heights[i] * unit),
      top = Math.round(y);
    option.Position.y = top;
    option.Size.height = height;
    for (const toggle of option.Switches ?? []) {
      toggle.Position.y = top;
      toggle.Size.height = height * 0.43;
    }
    y += height;
  });
  panel.Outline = outline(panel);
}
/** v1 Populate's outline (its hit test), at the new height. */
function outline(panel: V2OptionsPanel): Point[] {
  const unit = App.Unit,
    top = -panel.Size.height * 0.5,
    bottom = panel.Size.height * 0.5,
    margin = panel.Margin,
    width = panel.Size.width,
    nameWidth = panel._NameWidth;
  return [
    new Point(0, 0),
    new Point(44 * unit, 0),
    new Point(44 * unit, top),
    new Point(margin - 25 * unit, top),
    new Point(margin - 5 * unit, top - 20 * unit),
    new Point(margin + 5 * unit + nameWidth, top - 20 * unit),
    new Point(margin + 25 * unit + nameWidth, top),
    new Point(width - 40 * unit, top),
    new Point(width - 20 * unit, top - 20 * unit),
    new Point(width, top),
    new Point(width, bottom),
    new Point(44 * unit, bottom),
    new Point(44 * unit, 44 * unit),
  ];
}

/** The Key row: the twelve notes across it, the chosen one underlined (v1's button selection
 * bar). */
function drawKeys(
  this: PanelOption,
  ctx: CanvasRenderingContext2D,
  units: number,
  _index: number,
  panel: V2OptionsPanel,
): void {
  const x = panel.Margin,
    range = panel.Range,
    y = this.Position.y,
    height = this.Size.height,
    mid = y + height * 0.5,
    cell = range / 12;
  const key = Math.round(Number(panel.SelectedBlock?.Params.key ?? 0)),
    dataType = Math.round(units * 10);
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  ctx.beginPath();
  ctx.moveTo(panel.Margin - units, y + height);
  ctx.lineTo(range + panel.Margin + units, y + height);
  ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const cx = x + cell * (k + 0.5);
    if (k) {
      ctx.beginPath();
      ctx.moveTo(x + cell * k, y + height * 0.25);
      ctx.lineTo(x + cell * k, y + height * 0.75);
      ctx.stroke();
    }
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.globalAlpha = k === key ? 1 : 0.6;
    ctx.font = App.Metrics.TxtMid;
    ctx.textAlign = 'center';
    ctx.fillText(NOTES[k], cx, mid + dataType * 0.4);
    ctx.globalAlpha = 1;
    if (k === key) {
      App.FillColor(ctx, panel.SliderColours[0]);
      ctx.fillRect(cx - cell * 0.32, y + height - 6 * units, cell * 0.64, 2 * units);
    }
  }
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
}

/** A pad: its top-right corner cut (the blocks' 45°). */
function padPath(ctx: CanvasRenderingContext2D, pad: Pad, cut: number): void {
  ctx.beginPath();
  ctx.moveTo(pad.x, pad.y);
  ctx.lineTo(pad.x + pad.w - cut, pad.y);
  ctx.lineTo(pad.x + pad.w, pad.y + cut);
  ctx.lineTo(pad.x + pad.w, pad.y + pad.h);
  ctx.lineTo(pad.x, pad.y + pad.h);
  ctx.closePath();
}
/** The pads: 8 × 4 (6 × 5 on a phone). Roots in the first slider colour, held pads in the second,
 * other scale notes light, notes outside the scale dim. */
function drawPads(
  this: PanelOption,
  ctx: CanvasRenderingContext2D,
  units: number,
  _index: number,
  panel: V2OptionsPanel,
): void {
  const params = panel.SelectedBlock?.Params ?? {},
    cols = mobile() ? 6 : 8,
    rows = mobile() ? 5 : 4;
  const x0 = 44 * units + 14 * units,
    x1 = panel.Size.width - 14 * units,
    y0 = this.Position.y + 6 * units,
    y1 = this.Position.y + this.Size.height - 2 * units;
  const gap = 4 * units,
    padWidth = (x1 - x0 - gap * (cols - 1)) / cols,
    padHeight = (y1 - y0 - gap * (rows - 1)) / rows,
    cut = Math.min(padWidth, padHeight) * 0.18;
  const key = Math.round(Number(params.key ?? 0)),
    scale = Number(params.scale ?? 0),
    chromatic = !!params.chromatic;
  const held = new Set(
    [...fingers.values()]
      .filter((finger) => finger.block === panel.SelectedBlock?.Id)
      .map((finger) => finger.now),
  );
  const txt = App.Palette[App.ThemeManager.Txt],
    pads: Pad[] = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const semi = padSemitone(col, row, scale, chromatic),
        note = BASE_NOTE + key + semi;
      const pad: Pad = {
        x: x0 + col * (padWidth + gap),
        y: y0 + (rows - 1 - row) * (padHeight + gap),
        w: padWidth,
        h: padHeight,
        note,
        semi,
      };
      pads.push(pad);
      const root = semi % 12 === 0,
        isHeld = held.has(note),
        scaleNote = inScale(semi, scale);
      padPath(ctx, pad, cut);
      ctx.globalAlpha = isHeld || root ? 1 : scaleNote ? 0.2 : 0.06;
      App.FillColor(ctx, isHeld ? panel.SliderColours[1] : root ? panel.SliderColours[0] : txt);
      ctx.fill();
      ctx.globalAlpha = isHeld || root ? 0.85 : scaleNote ? 1 : 0.45;
      App.FillColor(ctx, isHeld || root ? App.Palette[2] : txt);
      ctx.font = `600 ${Math.max(8 * units, Math.min(11 * units, padHeight * 0.2))}px Dosis`;
      ctx.textAlign = 'left';
      ctx.fillText(
        NOTES[((note % 12) + 12) % 12],
        pad.x + 5 * units,
        pad.y + padHeight - 6 * units,
      );
    }
  ctx.globalAlpha = 1;
  this.Pads = pads;
  this.Shown = { cols, rows, held: [...held] };
}

/** The Touchpad opens centred in the free band (or low, on a phone), its block just clear of it. */
function openTouchpad(panel: V2OptionsPanel, open: (block: V1Block) => void, block: V1Block) {
  const metrics = App.Metrics,
    was = metrics.OptionsPoint,
    pad = block.def.id === 'input.touchpad';
  panel.Position.y = Math.round(App.Height * (pad ? touchpadCentre() : mobile() ? 0.65 : was.y));
  if (pad)
    metrics.OptionsPoint = new Point(
      was.x,
      mobile()
        ? Math.max(0.16, (panel.Position.y - room(panel.Position.y) - 40 * App.Unit) / App.Height)
        : touchpadCentre(),
    );
  try {
    open(block);
  } finally {
    metrics.OptionsPoint = was;
  }
}

/** Teach the options panel the Touchpad (once, at start-up). */
export function installTouchpad(panel: V2OptionsPanel): void {
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json, open) => {
    populate(json, open);
    if (!isTouchpad(panel)) return;
    for (const option of panel.Options) {
      if (option.Setting === 'touchpadKey') {
        option.Type = 'keys';
        option.Draw = drawKeys;
      }
      if (option.Setting === 'touchpadPads') {
        option.Type = 'pads';
        option.Draw = drawPads;
      }
    }
    panel.Options.forEach((option, i) => {
      if ((option.Type === 'keys' || option.Type === 'pads') && panel._SliderRoll)
        panel._SliderRoll[i] = false;
    });
    relayout(panel);
  };
  const open = panel.Open.bind(panel);
  panel.Open = (block: V1Block) => {
    openTouchpad(panel, open, block);
  };
  // The Key row: a press picks the key under it.
  const mouseDown = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    const keys = isTouchpad(panel)
      ? panel.Options.find((option) => option.Type === 'keys')
      : undefined;
    const block = panel.SelectedBlock;
    if (
      keys &&
      block &&
      Dimensions.hitRect(
        panel.Position.x + panel.Margin,
        panel.Position.y + keys.Position.y,
        panel.Range,
        keys.Size.height,
        mx,
        my,
      )
    ) {
      const key = Math.max(
        0,
        Math.min(11, Math.floor((mx - panel.Position.x - panel.Margin) / (panel.Range / 12))),
      );
      panel.RolloverCheck(mx, my);
      block.SetParam('key', key);
      panel._DrawReady = true;
      return;
    }
    mouseDown(mx, my);
  };
}
