// The Touchpad (CHG-0019, UI-0010): Push-style pads in the block's options panel. The panel is v1's, with two rows of its
// own (the twelve keys; the pads) and more height than v1's 240 units, since the pads are the instrument. Every finger
// on a pad plays its note; sliding to another pad bends the held note there (legato, no new attack).
import { App, Dimensions, Point } from './shim.ts';
import { Device } from './ported/Device';

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

/** Semitones above the root of the pad at (col, row), row 0 at the bottom. In key: along a row the scale's notes, each
 * row three scale steps (a fourth) above the one below. Chromatic: semitones, each row five (a fourth) above. */
export function padSemitone(col: number, row: number, scale: number, chromatic: boolean): number {
  if (chromatic) return col + 5 * row;
  const s = SCALE_STEPS[Math.max(0, Math.min(SCALE_STEPS.length - 1, Math.round(scale)))],
    deg = col + 3 * row;
  return Math.floor(deg / s.length) * 12 + s[deg % s.length];
}
const inScale = (semi: number, scale: number) =>
  SCALE_STEPS[Math.max(0, Math.min(SCALE_STEPS.length - 1, Math.round(scale)))].includes(
    ((semi % 12) + 12) % 12,
  );

interface Pad {
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

const isTouchpad = (panel: any) => panel.SelectedBlock?.def?.id === 'input.touchpad';
const mobile = () => App.Metrics.Device === Device.mobile;
const padsOf = (panel: any): Pad[] =>
  (((panel.Options ?? []) as any[]).find((o) => o.Type === 'pads')?.Pads ?? []) as Pad[];
/** The pad at device px (x, y): the one under it, or, between pads, the nearest (owner, 2026-11-14: no dead gaps). */
function padAt(panel: any, x: number, y: number): Pad | null {
  if (panel.Scale !== 1 || !isTouchpad(panel)) return null;
  const lx = x - panel.Position.x,
    ly = y - panel.Position.y,
    pads = padsOf(panel);
  if (!pads.length) return null;
  const left = Math.min(...pads.map((pad) => pad.x)),
    right = Math.max(...pads.map((pad) => pad.x + pad.w));
  const top = Math.min(...pads.map((pad) => pad.y)),
    bottom = Math.max(...pads.map((pad) => pad.y + pad.h));
  if (lx < left || lx > right || ly < top || ly > bottom) return null;
  let best: Pad | null = null,
    bestD = Infinity;
  for (const pad of pads) {
    const dx = Math.max(pad.x - lx, 0, lx - (pad.x + pad.w)),
      dy = Math.max(pad.y - ly, 0, ly - (pad.y + pad.h)),
      d = dx * dx + dy * dy;
    if (d < bestD) {
      best = pad;
      bestD = d;
    }
  }
  return best;
}

/** A pointer went down at device px (x, y): true if it landed on a pad (it then belongs to the pads until it lifts). */
export function padDown(panel: any, pointer: number, x: number, y: number, host: PadHost): boolean {
  const pad = padAt(panel, x, y);
  if (!pad) return false;
  const block = panel.SelectedBlock.Id as number;
  fingers.set(pointer, { block, base: pad.note, now: pad.note });
  host.note(block, pad.note, true);
  panel._DrawReady = true;
  return true;
}
/** A pad finger moved: onto another pad, its note slides there. True if `pointer` is a pad finger. */
export function padMove(panel: any, pointer: number, x: number, y: number, host: PadHost): boolean {
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
export function padUp(panel: any, pointer: number, host: PadHost): boolean {
  const finger = fingers.get(pointer);
  if (!finger) return false;
  fingers.delete(pointer);
  host.note(finger.block, finger.base, false);
  panel._DrawReady = true;
  return true;
}
/** Tests: the notes sounding from pads now. */
export const padNotes = (): number[] => [...fingers.values()].map((finger) => finger.now);

/** The Touchpad's options form: Key, Scale, the switches, Octave, the pads. */
export function touchpadForm(
  b: { BlockName: string; Params: Record<string, any>; OptionsForm: any },
  scales: string[],
  choice: (name: string, setting: string, value: number, labels: string[]) => unknown,
): void {
  const params = b.Params;
  b.OptionsForm = {
    name: b.BlockName,
    parameters: [
      {
        type: 'slider',
        name: 'Key',
        setting: 'touchpadKey',
        props: {
          value: Number(params.key ?? 0),
          min: 0,
          max: 11,
          quantised: true,
          centered: false,
        },
      },
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
      {
        type: 'slider',
        name: 'Octave',
        setting: 'transpose',
        props: {
          value: Number(params.transpose ?? 0),
          min: -3,
          max: 3,
          quantised: true,
          centered: true,
        },
      },
      {
        type: 'slider',
        name: '',
        setting: 'touchpadPads',
        props: { value: 0, min: 0, max: 1, quantised: false, centered: false },
      },
    ],
  };
}

/** Row heights in v1 units: Key, Scale, switches, Octave; the pads take what the screen has left. */
const ROWS = [40, 40, 56, 40];
/** Room for the panel, in device px either side of its centre line. */
function room(centreY: number): number {
  const unit = App.Unit,
    header = App.MainScene.Header as any;
  const top = header.Height * (header.Rows ?? 1) * unit + 30 * unit,
    bottom = App.Height - 72 * unit; // under the header (and the name tab); over zoom, power, bin
  return Math.max(60 * unit, Math.min(centreY - top, bottom - centreY));
}
/** Where the Touchpad's panel centres: the middle of the free band on desktop and tablet (v1's point leaves too little
 * below); on a phone, as low as the bottom controls allow. As a fraction of the screen height. */
function touchpadCentre(): number {
  const unit = App.Unit,
    header = App.MainScene.Header as any;
  const top = header.Height * (header.Rows ?? 1) * unit + 30 * unit,
    bottom = App.Height - 72 * unit;
  // A phone: all the band but 70 units at the top, where the Touchpad block shows.
  return mobile()
    ? (bottom - (bottom - top - 70 * unit) / 2) / App.Height
    : (top + bottom) / 2 / App.Height;
}

/** Give the open Touchpad panel its own row heights (v1's Populate squeezed everything into 240 units). */
function relayout(panel: any): void {
  const unit = App.Unit,
    opts = panel.Options as any[];
  const total = Math.min((2 * room(panel.Position.y)) / unit - 40, mobile() ? 640 : 440);
  const fixed = ROWS.reduce((a, b) => a + b, 0),
    heights = [...ROWS, Math.max(100, total - fixed)];
  panel.Size.height = (heights.reduce((a, b) => a + b, 0) + 40) * unit;
  let y = -panel.Size.height * 0.5 + 20 * unit;
  opts.forEach((opt, i) => {
    const h = Math.round(heights[i] * unit),
      oy = Math.round(y);
    opt.Position.y = oy;
    opt.Size.height = h;
    for (const s of (opt.Switches ?? []) as any[]) {
      s.Position.y = oy;
      s.Size.height = h * 0.43;
    }
    y += h;
  });
  // v1 Populate's outline (hit test), at the new height.
  const top = -panel.Size.height * 0.5,
    margin = panel.Margin,
    w = panel.Size.width,
    nameW = panel._NameWidth;
  panel.Outline = [
    new Point(0, 0),
    new Point(44 * unit, 0),
    new Point(44 * unit, top),
    new Point(margin - 25 * unit, top),
    new Point(margin - 5 * unit, top - 20 * unit),
    new Point(margin + 5 * unit + nameW, top - 20 * unit),
    new Point(margin + 25 * unit + nameW, top),
    new Point(w - 40 * unit, top),
    new Point(w - 20 * unit, top - 20 * unit),
    new Point(w, top),
    new Point(w, panel.Size.height * 0.5),
    new Point(44 * unit, panel.Size.height * 0.5),
    new Point(44 * unit, 44 * unit),
  ];
}

/** The Key row: the twelve notes across the row, the chosen one underlined (v1's button selection bar). */
function drawKeys(
  this: any,
  ctx: CanvasRenderingContext2D,
  units: number,
  _i: number,
  panel: any,
): void {
  const x = panel.Margin,
    range = panel.Range,
    y = this.Position.y,
    h = this.Size.height,
    mid = y + h * 0.5,
    cell = range / 12;
  const key = Math.round(Number(panel.SelectedBlock?.Params.key ?? 0)),
    dataType = Math.round(units * 10);
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  ctx.beginPath();
  ctx.moveTo(panel.Margin - units, y + h);
  ctx.lineTo(range + panel.Margin + units, y + h);
  ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const cx = x + cell * (k + 0.5);
    if (k) {
      ctx.beginPath();
      ctx.moveTo(x + cell * k, y + h * 0.25);
      ctx.lineTo(x + cell * k, y + h * 0.75);
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
      ctx.fillRect(cx - cell * 0.32, y + h - 6 * units, cell * 0.64, 2 * units);
    }
  }
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
}

/** The pads: 8 × 4 (6 × 5 on a phone) across the panel, each with one corner cut (the blocks' 45°). Roots in the
 * first slider colour, held pads in the second, other scale notes light, notes outside the scale dim. */
function drawPads(
  this: any,
  ctx: CanvasRenderingContext2D,
  units: number,
  _i: number,
  panel: any,
): void {
  const p = panel.SelectedBlock?.Params ?? {},
    cols = mobile() ? 6 : 8,
    rows = mobile() ? 5 : 4;
  const x0 = 44 * units + 14 * units,
    x1 = panel.Size.width - 14 * units,
    y0 = this.Position.y + 6 * units,
    y1 = this.Position.y + this.Size.height - 2 * units;
  const gap = 4 * units,
    pw = (x1 - x0 - gap * (cols - 1)) / cols,
    ph = (y1 - y0 - gap * (rows - 1)) / rows,
    cut = Math.min(pw, ph) * 0.18;
  const key = Math.round(Number(p.key ?? 0)),
    scale = Number(p.scale ?? 0),
    chromatic = !!p.chromatic;
  const held = new Set(
    [...fingers.values()]
      .filter((finger) => finger.block === panel.SelectedBlock?.Id)
      .map((finger) => finger.now),
  );
  const txt = App.Palette[App.ThemeManager.Txt],
    pads: Pad[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const semi = padSemitone(c, r, scale, chromatic),
        note = BASE_NOTE + key + semi;
      const x = x0 + c * (pw + gap),
        y = y0 + (rows - 1 - r) * (ph + gap);
      pads.push({ x, y, w: pw, h: ph, note, semi });
      const root = semi % 12 === 0,
        isHeld = held.has(note),
        scaleNote = inScale(semi, scale);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + pw - cut, y);
      ctx.lineTo(x + pw, y + cut);
      ctx.lineTo(x + pw, y + ph);
      ctx.lineTo(x, y + ph);
      ctx.closePath();
      ctx.globalAlpha = isHeld || root ? 1 : scaleNote ? 0.2 : 0.06;
      App.FillColor(ctx, isHeld ? panel.SliderColours[1] : root ? panel.SliderColours[0] : txt);
      ctx.fill();
      ctx.globalAlpha = isHeld || root ? 0.85 : scaleNote ? 1 : 0.45;
      App.FillColor(ctx, isHeld || root ? App.Palette[2] : txt);
      ctx.font = `600 ${Math.max(8 * units, Math.min(11 * units, ph * 0.2))}px Dosis`;
      ctx.textAlign = 'left';
      ctx.fillText(NOTES[((note % 12) + 12) % 12], x + 5 * units, y + ph - 6 * units);
    }
  ctx.globalAlpha = 1;
  this.Pads = pads;
  this.Shown = { cols, rows, held: [...held] }; // tests
}

/** Teach the options panel the Touchpad (once, at start-up). */
export function installTouchpad(panel: any): void {
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    if (!isTouchpad(panel)) return;
    for (const o of panel.Options as any[]) {
      if (o.Setting === 'touchpadKey') {
        o.Type = 'keys';
        o.Draw = drawKeys;
      }
      if (o.Setting === 'touchpadPads') {
        o.Type = 'pads';
        o.Draw = drawPads;
      }
    }
    (panel.Options as any[]).forEach((o, i) => {
      if ((o.Type === 'keys' || o.Type === 'pads') && panel._SliderRoll)
        panel._SliderRoll[i] = false;
    });
    relayout(panel);
  };
  // The Touchpad opens centred in the free band (or low, on a phone), with its block just clear of it.
  const open = panel.Open.bind(panel);
  panel.Open = (block: any) => {
    const metrics = App.Metrics,
      was = metrics.OptionsPoint,
      pad = block?.def?.id === 'input.touchpad';
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
  };
  // The Key row: a press picks the key under it.
  const mouseDown = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    const keys = isTouchpad(panel) ? (panel.Options as any[]).find((o) => o.Type === 'keys') : null;
    if (
      keys &&
      Dimensions.hitRect(
        panel.Position.x + panel.Margin,
        panel.Position.y + keys.Position.y,
        panel.Range,
        keys.Size.height,
        mx,
        my,
      )
    ) {
      const k = Math.max(
        0,
        Math.min(11, Math.floor((mx - panel.Position.x - panel.Margin) / (panel.Range / 12))),
      );
      panel.RolloverCheck(mx, my);
      panel.SelectedBlock.SetParam('key', k);
      panel._DrawReady = true;
      return;
    }
    mouseDown(mx, my);
  };
}
