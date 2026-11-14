// The post-2.0 blocks (SCOPE-0005) in v1's UI. v1 knows nothing of them, so this file gives the ported UI what it
// needs: their menu items (after v1's own in each category), their menu icons (drawn from the manifest geometry, as
// v1's BlockSprites draws its own), their options forms (built from v1's option types) and the live rows some panels
// show (a level meter, …), which read the engine's monitors.
import { BLOCKS_BY_ID, type BlockDef } from '../generated/blocks.gen.ts';
import { App, Point } from './shim.ts';
import { addSelector, isSelector } from './selectorOption.ts';
import { touchpadForm } from './touchpadPanel.ts';

/** Menu order within each v1 category (appended after v1's items). */
const MENU: Record<string, string[]> = {
  Source: ['source.stage'],
  Effect: ['fx.compressor', 'fx.chord', 'fx.arpeggiator', 'fx.random-note', 'fx.lfo'],
  Power: ['power.sound-laser', 'power.counter', 'power.chance', 'power.prism'],
  Interaction: ['input.touchpad'],
};
const NEW_DEFS: BlockDef[] = Object.values(MENU).flat().map(id => BLOCKS_BY_ID.get(id)).filter((d): d is BlockDef => !!d);
const BY_NAME = new Map(NEW_DEFS.map(d => [d.name.toLowerCase(), d]));

/** The menu id of a Label (scene.CreateBlockFromType hands it to the host like a block type). */
export const LABEL_MENU_ID = 'Label';

/** Add the new blocks to v1's menu JSON (once, before the header is populated). */
export function installNewBlockMenu(): void {
  for (const cat of (App.BlockCreator.MenuJson as { categories: { name: string; items: { name: string; id: string; description: string }[] }[] }).categories) {
    for (const id of MENU[cat.name] ?? []) {
      const def = BLOCKS_BY_ID.get(id);
      if (id === 'source.stage' && App.IsPlugin) continue;  // the plugin plays Stage blocks; making and opening them is the website's for now
      if (def && !cat.items.some(i => i.id === def.menuId)) cat.items.push({ name: def.name, id: def.menuId, description: def.description });
    }
    // Label (CHG-0020): not a block, but it is made from the Interaction menu like one.
    if (cat.name === 'Interaction' && !cat.items.some(i => i.id === LABEL_MENU_ID))
      cat.items.push({ name: 'Label', id: LABEL_MENU_ID, description: 'A note on the stage. Drag it by its dot; click it to change the words.' });
  }
}

/** Hide these menu ids (inside a Stage block: no Stage, no samplers; CHG-0021), or none. The header is populated
 * again by the scene's next sync. */
let fullMenu: Map<string, { name: string; id: string; description: string }[]> | null = null;
export function setMenuHidden(hidden: Set<string>): void {
  const cats = (App.BlockCreator.MenuJson as { categories: { name: string; items: { name: string; id: string; description: string }[] }[] }).categories;
  fullMenu ??= new Map(cats.map(c => [c.name, c.items.slice()]));
  for (const c of cats) c.items.splice(0, c.items.length, ...(fullMenu.get(c.name) ?? []).filter(i => !hidden.has(i.id)));
}

/** v1 BlockSprites.DrawSprite for a new block (unscaled: menu icons and items dragged from the menu). */
export function drawNewSprite(ctx: CanvasRenderingContext2D, pos: Point, name: string): boolean {
  if (name === 'label') {  // a dot and a line of text, as it looks on the stage
    const u = App.Unit, d = 3 * u, x = pos.x - 16 * u, y = pos.y + App.GridSize * 0.5;
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.beginPath(); ctx.moveTo(x - d, y); ctx.lineTo(x, y - d); ctx.lineTo(x + d, y); ctx.lineTo(x, y + d); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.font = `400 ${Math.round(12 * u)}px Dosis`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('ABC', x + 8 * u, y); ctx.restore();
    return true;
  }
  const def = BY_NAME.get(name);
  if (!def) return false;
  const grd = App.GridSize, [ox, oy] = def.geometry.menuOffset ?? [0, 0];
  for (const l of def.geometry.layers) {
    if (l.units === 'unit') continue;
    ctx.beginPath();
    l.points.forEach(([x, y], i) => { const px = pos.x + (ox + x) * grd, py = pos.y + (oy + y) * grd; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.closePath();
    App.FillColor(ctx, App.Palette[l.palette]);
    ctx.fill();
  }
  return true;
}

// ---- live readouts (Engine::monitors), by block id ----
const monitors = new Map<number, number[]>();
export function setMonitors(packed: Float32Array): void {
  monitors.clear();
  for (let i = 0; i + 4 < packed.length; i += 5) monitors.set(packed[i], [packed[i + 1], packed[i + 2], packed[i + 3], packed[i + 4]]);
}
export const monitorOf = (id: number): number[] | undefined => monitors.get(id);

// ---- options forms ----
interface FormBlock { Id: number; BlockName: string; Params: Record<string, any>; OptionsForm: any; def: BlockDef }
interface SliderOpts { quantised?: boolean; centered?: boolean; log?: boolean; display?: (v: number) => string }
const slider = (name: string, setting: string, value: number, min: number, max: number, o: SliderOpts = {}) => ({ type: 'slider', name, setting,
  props: { value, min, max, quantised: !!o.quantised, centered: !!o.centered, ...(o.log ? { logarithmic: true } : {}), ...(o.display ? { convertDisplay: o.display } : {}) } });
/** A carousel row (selectorOption.ts): arrows either side of the choice, wrapping round. */
const choice = (name: string, setting: string, value: number, labels: string[]) => {
  addSelector(setting);
  return slider(name, setting, Math.max(0, Math.min(labels.length - 1, Math.round(value))), 0, labels.length - 1,
    { quantised: true, display: v => labels[Math.max(0, Math.min(labels.length - 1, Math.round(v)))] });
};
const dB = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;
const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);

/** Scales shared by Random Note and the Touchpad (engine kScales), and the twelve keys. */
export const SCALES = ['MAJOR', 'MINOR', 'DORIAN', 'LYDIAN', 'MIXOLYDIAN', 'PENTATONIC'];
export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHORDS = ['FIFTH', 'MAJOR', 'MINOR', 'SUS 2', 'SUS 4', 'SEVENTH', 'MAJOR 7TH', 'MINOR 7TH'];
/** A synced Arpeggiator's speeds (beats per note), with triplets. */
const ARP_STEPS = [
  { beats: 4, label: '1 BAR' }, { beats: 2, label: '1/2' }, { beats: 1, label: '1/4' }, { beats: 2 / 3, label: '1/4T' }, { beats: 0.5, label: '1/8' },
  { beats: 1 / 3, label: '1/8T' }, { beats: 0.25, label: '1/16' }, { beats: 1 / 6, label: '1/16T' }, { beats: 0.125, label: '1/32' }, { beats: 0.0625, label: '1/64' },
];
/** A synced LFO's cycle lengths (beats per cycle). */
const LFO_STEPS = [
  { beats: 64, label: '16 BARS' }, { beats: 32, label: '8 BARS' }, { beats: 16, label: '4 BARS' }, { beats: 8, label: '2 BARS' }, { beats: 4, label: '1 BAR' },
  { beats: 2, label: '1/2' }, { beats: 1, label: '1/4' }, { beats: 0.5, label: '1/8' }, { beats: 0.25, label: '1/16' },
];
const nearestOf = (steps: { beats: number }[], beats: number) => { let best = 0; steps.forEach((s, i) => { if (Math.abs(s.beats - beats) < Math.abs(steps[best].beats - beats)) best = i; }); return best; };
const nearestStep = (beats: number) => { let best = 0; ARP_STEPS.forEach((s, i) => { if (Math.abs(s.beats - beats) < Math.abs(ARP_STEPS[best].beats - beats)) best = i; }); return best; };
const switches = (...list: { name: string; setting: string; value: boolean }[]) => ({ type: 'switches', name: '', setting: '', props: { value: 0, min: 0, max: 1, quantised: true },
  switches: list.map(s => ({ ...s, lit: true, mode: 'offOn' })) });
/** Switches whose change shows or hides other rows: the panel is laid out again. */
export const settingRefreshes = (key: string): boolean => key === 'perHit' || key === 'gapOnHit';
/** Converted settings whose rows must be laid out again once set. */
const CONVERT_REFRESH = new Set(['inKey']);

/** Slider settings that are not the param itself: the slider's value → the param's. */
const CONVERT: Record<string, { param: string; to: (v: number) => number; from?: (v: number) => number }> = {
  attackMs: { param: 'attack', to: v => v / 1000, from: v => v * 1000 },
  releaseMs: { param: 'release', to: v => v / 1000, from: v => v * 1000 },
  gapMs: { param: 'gap', to: v => v / 1000, from: v => v * 1000 },
  compMeter: { param: 'threshold', to: v => v, from: v => v },   // the Level meter's line (owner, 2026-11-14)
  soundMeter: { param: 'threshold', to: v => v, from: v => v },
  angle90: { param: 'angle', to: v => v - 90, from: v => wrapAngle(v + 90) },  // v1's Angle sliders show angle + 90 (0 = up)
  lfoDivisionIndex: { param: 'division', to: v => LFO_STEPS[Math.max(0, Math.min(LFO_STEPS.length - 1, Math.round(v)))].beats },
  whenQuieter: { param: 'invert', to: v => (v >= 0.5 ? 1 : 0) },
  inKey: { param: 'chromatic', to: v => (v ? 0 : 1) },  // the Touchpad's In Key switch
  arpDivisionIndex: { param: 'division', to: v => ARP_STEPS[Math.max(0, Math.min(ARP_STEPS.length - 1, Math.round(v)))].beats },
};
/** v1 SetParam for the settings above. Returns the param and value to send, or null when `key` is an ordinary param. */
export function convertSetting(key: string, value: number): { param: string; value: number; refresh: boolean } | null {
  const c = CONVERT[key];
  return c ? { param: c.param, value: c.to(Number(value)), refresh: CONVERT_REFRESH.has(key) } : null;
}

const FORMS: Record<string, (b: FormBlock) => any[]> = {
  // CHG-0014: a level meter with the threshold on it (v1's dB meter), then Web Audio's compressor settings.
  'fx.compressor': b => [
    slider('Level', 'compMeter', Number(b.Params.threshold), -60, 0, { display: dB }),  // its line is the Threshold
    slider('Ratio', 'ratio', Number(b.Params.ratio), 1, 20, { display: v => `${v.toFixed(1)} : 1` }),
    slider('Knee', 'knee', Number(b.Params.knee), 0, 40, { display: dB }),
    slider('Attack', 'attackMs', Math.max(1, Number(b.Params.attack) * 1000), 1, 1000, { log: true, display: ms }),
    slider('Release', 'releaseMs', Math.max(10, Number(b.Params.release) * 1000), 10, 1000, { log: true, display: ms }),
    slider('Makeup', 'makeup', Number(b.Params.makeup), -24, 24, { centered: true, display: dB }),
  ],
  // CHG-0021: its level, then the two things to do with it. (In the plugin a Stage plays; opening is the website's.)
  'source.stage': b => {
    const g = Number(b.Params.gain ?? 1);
    return [
      slider('Volume', 'gainDb', g > 0 ? Math.max(-40, 20 * Math.log10(g)) : -40, -40, 6, { display: v => (v <= -40 ? 'OFF' : `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`) }),
      ...(App.IsPlugin ? [] : [
        { type: 'actionbutton', name: '', setting: 'openStage', props: { text: 'Open Stage' } },
        { type: 'actionbutton', name: '', setting: 'loadStagePatch', props: { text: 'Load Patch' } },
      ]),
    ];
  },
  // CHG-0018 (AUDIO-0003): what it moves (a carousel of "Block · Param" over the blocks connected to it), then how.
  'fx.lfo': b => {
    const list = lfoTargets(b), now = App.MainScene?.host?.targetOf?.(b.Id) ?? null;
    let at = now ? list.findIndex(t => t.id === now.id && t.param === now.param) : -1;
    if (now && at < 0) {  // set, but its block is out of reach: kept, idle (AUDIO-0003)
      const far = (App.Blocks as any[]).find(x => x.Id === now.id);
      list.unshift({ id: now.id, param: now.param, label: `${(far?.BlockName ?? '?').toUpperCase()} · ${now.param.toUpperCase()} (OUT OF REACH)` });
      at = 0;
    }
    (b as any).LfoTargets = list;
    return [
      choice('Target', 'lfoTarget', at + 1, ['NONE', ...list.map(t => t.label)]),
      { type: 'buttons', name: 'Shape', setting: 'shape', props: { value: Number(b.Params.shape), mode: 'wave' }, buttons: [{ name: 'Sine' }, { name: 'Square' }, { name: 'Triangle' }, { name: 'Saw' }] },
      switches({ name: 'Tempo Sync', setting: 'sync', value: !!b.Params.sync }),
      b.Params.sync
        ? slider('Rate', 'lfoDivisionIndex', nearestOf(LFO_STEPS, Number(b.Params.division)), 0, LFO_STEPS.length - 1, { quantised: true, display: v => LFO_STEPS[Math.max(0, Math.min(LFO_STEPS.length - 1, Math.round(v)))].label })
        : slider('Rate', 'rate', Number(b.Params.rate), 0.02, 20, { log: true, display: v => `${v < 1 ? v.toFixed(2) : v.toFixed(1)} HZ` }),
      slider('Depth', 'depth', Number(b.Params.depth), 0, 1, { display: v => `${Math.round(v * 100)}%` }),
      slider('Phase', 'phase', Number(b.Params.phase), 0, 1, { display: v => `${Math.round(v * 360)}°` }),
    ];
  },
  // CHG-0017 (AUDIO-0002): the note effects.
  'fx.chord': b => [
    choice('Chord', 'chord', Number(b.Params.chord), CHORDS),
    slider('Inversion', 'inversion', Number(b.Params.inversion), 0, 3, { quantised: true }),
  ],
  // Speed is how fast it moves between the held notes: musical lengths when synced, notes a second when not. Per Hit
  // hands the stepping to the hits instead, so Speed and Tempo Sync go.
  'fx.arpeggiator': b => [
    choice('Pattern', 'pattern', Number(b.Params.pattern), ['UP', 'DOWN', 'UP & DOWN', 'RANDOM']),
    switches({ name: 'Per Hit', setting: 'perHit', value: !!b.Params.perHit }, ...(b.Params.perHit ? [] : [{ name: 'Tempo Sync', setting: 'sync', value: !!b.Params.sync }])),
    ...(b.Params.perHit ? [] : [b.Params.sync
      ? slider('Speed', 'arpDivisionIndex', nearestStep(Number(b.Params.division)), 0, ARP_STEPS.length - 1, { quantised: true, display: v => ARP_STEPS[Math.max(0, Math.min(ARP_STEPS.length - 1, Math.round(v)))].label })
      : slider('Speed', 'speed', Number(b.Params.speed), 1, 30, { display: v => `${v.toFixed(1)} / S` })]),
    slider('Octaves', 'octaves', Number(b.Params.octaves), 1, 3, { quantised: true }),
  ],
  'fx.random-note': b => [
    choice('Key', 'key', Number(b.Params.key), KEYS),
    choice('Scale', 'scale', Number(b.Params.scale), SCALES),
    slider('Low', 'low', Number(b.Params.low), -3, 3, { quantised: true, centered: true, display: v => `OCTAVE ${Math.round(v) >= 0 ? '+' : ''}${Math.round(v)}` }),
    slider('High', 'high', Number(b.Params.high), -3, 3, { quantised: true, centered: true, display: v => `OCTAVE ${Math.round(v) >= 0 ? '+' : ''}${Math.round(v)}` }),
  ],
  // CHG-0016: what it hears against its threshold, then when the beam comes on, then the Laser's own rows.
  'power.sound-laser': b => [
    slider('Level', 'soundMeter', Number(b.Params.threshold), -60, 0, { display: dB }),  // its line is the Threshold
    choice('Band', 'band', Number(b.Params.band), ['ALL', 'LOWS', 'MIDS', 'HIGHS']),
    choice('Beam on', 'whenQuieter', b.Params.invert ? 1 : 0, ['WHEN LOUDER', 'WHEN QUIETER']),
    slider('Hold', 'hold', Number(b.Params.hold), 0, 2, { display: v => ms(v * 1000) }),
    slider('Angle', 'angle90', wrapAngle(Number(b.Params.angle) + 90), -180, 180, { quantised: true, centered: true }),
    slider('Range', 'range', Number(b.Params.range), 50, 1200, { quantised: true }),
  ],
  // v2 (owner, 2026-11-14): v1's Power had no panel. Gap on hit: a particle or beam hitting it cuts its power for a
  // moment, so what it holds is struck again.
  'power.power': b => [
    switches({ name: 'Gap On Hit', setting: 'gapOnHit', value: !!b.Params.gapOnHit }),
    ...(b.Params.gapOnHit ? [slider('Gap', 'gapMs', Number(b.Params.gap ?? 0.05) * 1000, 10, 1000, { log: true, display: ms })] : []),
  ],
  // CHG-0015: the pattern as a row of steps, then the three numbers that make it (Euclidean, SIMULATION-0005).
  'power.counter': b => [
    slider('Pattern', 'counterPattern', 0, 0, 1),
    slider('Steps', 'steps', Number(b.Params.steps), 1, 16, { quantised: true }),
    slider('Hits', 'hits', Math.min(Number(b.Params.hits), Number(b.Params.steps)), 0, 16, { quantised: true }),
    slider('Rotate', 'rotate', Number(b.Params.rotate), 0, 15, { quantised: true }),
  ],
  'power.chance': b => [slider('Chance', 'chance', Number(b.Params.chance), 0, 1, { display: v => `${Math.round(v * 100)}%` })],
  // The Laser's Angle and Rotate rows, then how many streams and how wide they fan (SIMULATION-0006).
  'power.prism': b => [
    slider('Angle', 'angle90', wrapAngle(Number(b.Params.angle) + 90), -180, 180, { quantised: true, centered: true }),
    { type: 'slider', name: 'Rotate', setting: 'rotate', props: { value: Number(b.Params.rotate), min: -500, max: 500, quantised: true, centered: true } },
    slider('Streams', 'streams', Number(b.Params.streams), 1, 4, { quantised: true }),
    slider('Spread', 'spread', Number(b.Params.spread), 0, 180, { quantised: true, display: v => `${Math.round(v)}°` }),
  ],
};
// ---- LFO targets (AUDIO-0003) ----
interface LfoTarget { id: number; param: string; label: string }
/** The params of `block` an LFO can move: the sliders its own panel shows (so they carry v1's names), not its
 * carousels or switches; plus the Filter's three, which its panel shows as a graph. */
function modulatable(block: any): { param: string; label: string }[] {
  const def = block.def as BlockDef, out: { param: string; label: string }[] = [];
  if (def.id === 'fx.filter') return [{ param: 'frequency', label: 'Frequency' }, { param: 'gain', label: 'Gain' }, { param: 'Q', label: 'Width' }];
  block.UpdateOptionsForm();
  for (const row of (block.OptionsForm?.parameters ?? []) as any[]) {
    if (row.type !== 'slider' || isSelector(row.setting) || (LIVE_ROWS[row.setting] && !METER_ROWS.has(row.setting))) continue;
    if (METER_ROWS.has(row.setting)) { if (!out.some(o => o.param === 'threshold')) out.push({ param: 'threshold', label: 'Threshold' }); continue; }
    const param = CONVERT[row.setting]?.param ?? row.setting, p = def.params.find(q => q.key === param);
    if (p && p.ui.transform !== 'None' && !out.some(o => o.param === param)) out.push({ param, label: row.name });
  }
  return out;
}
function lfoTargets(b: FormBlock): LfoTarget[] {
  const host = App.MainScene?.host, out: LfoTarget[] = [];
  for (const id of (host?.connectedIds?.(b.Id) ?? []) as number[]) {
    const block = (App.Blocks as any[]).find(x => x.Id === id);
    if (!block) continue;
    for (const m of modulatable(block)) out.push({ id, param: m.param, label: `${block.BlockName} · ${m.label}`.toUpperCase() });
  }
  return out;
}
/** The LFO's Target carousel moved to entry `index` (0 = none). */
export function setLfoTarget(b: any, index: number): void {
  const t = ((b.LfoTargets ?? []) as LfoTarget[])[Math.round(index) - 1];
  App.MainScene.host.setTarget(b.Id, t ? { id: t.id, param: t.param } : null);
}
/**
 * While an LFO moves a param of the block whose panel is open, that param's slider follows it (the engine's monitors:
 * the value now). What the slider is set to, and what a patch saves, is not touched; the slider shows that again once
 * the LFO lets go. Not while the user drags it. Returns true while anything follows.
 */
let following = false;
export function followLfos(panel: any): boolean {
  const block = panel.SelectedBlock;
  let any = false;
  if (block && panel.Scale === 1) {
    for (const [id, m] of monitors) {
      if (m[0] !== block.Id || (App.Blocks as any[]).find(x => x.Id === id)?.def?.id !== 'fx.lfo') continue;
      const p = block.def.params[Math.round(m[1])];
      if (!p) continue;
      for (const o of (panel.Options ?? []) as any[]) {
        if (o.Type !== 'slider' || o.Selected || (CONVERT[o.Setting]?.param ?? o.Setting) !== p.key) continue;
        const conv = CONVERT[o.Setting], t = p.ui;
        let ui = m[2];
        if (conv) { if (!conv.from) continue; ui = conv.from(ui); }
        else if (t.transform === 'SubtractFrom') ui = t.k - ui; else if (t.transform === 'Minus') ui = ui + t.k; else if (t.transform === 'Divide') ui = ui * t.k;
        ui = Math.max(o.Min, Math.min(o.Max, ui));
        o.Value = ui;
        o.Position.x = o.Log ? panel.logPosition(0, panel.Range, o.Min, o.Max, ui) : panel.linPosition(0, panel.Range, o.Min, o.Max, ui);
        o.Followed = ui;  // tests
        any = true;
      }
    }
    if (any) panel._DrawReady = true;
    else if (following) block.RefreshOptionsPanel();  // back to where it is set
  }
  following = any;
  return any;
}

/** An angle in (−180, 180]. */
const wrapAngle = (a: number) => { let v = a % 360; if (v > 180) v -= 360; if (v <= -180) v += 360; return v; };
/** The Counter's pattern (engine gateDecide): which of its steps let a hit through, from the first one counted. */
export function counterPattern(steps: number, hits: number, rotate: number): boolean[] {
  const n = Math.max(1, Math.min(16, Math.round(steps))), k = Math.max(0, Math.min(n, Math.round(hits))), r = Math.max(0, Math.min(15, Math.round(rotate)));
  return Array.from({ length: n }, (_, i) => (((i + r) % n) * k) % n < k);
}
/** A Counter's steps as they play: set by hand (`pattern` ≥ 0, bit k = step k) or the Euclidean pattern. */
export function counterSteps(p: Record<string, any>): boolean[] {
  const euclid = counterPattern(Number(p.steps ?? 8), Number(p.hits ?? 3), Number(p.rotate ?? 0)), mask = Math.round(Number(p.pattern ?? -1));
  return mask >= 0 ? euclid.map((_, k) => ((mask >> k) & 1) === 1) : euclid;
}
/** A Prism's exit directions in degrees (engine traceBeam / R5d), from its angle now. */
export function prismAngles(angle: number, streams: number, spread: number): number[] {
  const n = Math.max(1, Math.min(4, Math.round(streams)));
  return Array.from({ length: n }, (_, k) => angle + (n > 1 ? spread * (k / (n - 1) - 0.5) : 0));
}
/** The options form of a new block (v1 UpdateOptionsForm), or false when `b` is not one. */
export function newBlockForm(b: FormBlock): boolean {
  if (b.def.id === 'input.touchpad') { touchpadForm(b, SCALES, choice); return true; }  // CHG-0019 (touchpadPanel.ts)
  const f = FORMS[b.def.id];
  if (!f) return false;
  b.OptionsForm = { name: b.BlockName, parameters: f(b) };
  return true;
}

// ---- live rows: declared as sliders (so v1's OptionsPanel lays them out), then redrawn here ----
type RowDraw = (this: any, ctx: CanvasRenderingContext2D, units: number, i: number, panel: any) => void;

/** v1 OptionMeter's look (Settings › dB Meter), for a block: the level as a bar on −60…0 dB. Under the bar, a
 * Compressor shows its gain reduction, growing leftward from 0 dB; a Sound Laser shows a full bar while its beam is on.
 * The row is also the Threshold slider (owner, 2026-11-14): a full-height line with v1's grab diamond, dragged like
 * any slider (its value is the threshold, CONVERT). */
const drawCompressorMeter: RowDraw = function (ctx, units, i, panel) {
  const x = panel.Margin, w = panel.Range, y = this.Position.y, h = this.Size.height, mid = y + h * 0.5;
  const block = panel.SelectedBlock, m = monitorOf(block?.Id) ?? [-100, 0];
  const at = (db: number) => Math.max(0, Math.min(1, (db + 60) / 60)) * w;
  const colours = panel.SliderColours, dataType = Math.round(units * 10);
  // DIVIDER (v1 OptionSlider) //
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) { ctx.beginPath(); ctx.moveTo(panel.Margin - units, y + h); ctx.lineTo(w + panel.Margin + units, y + h); ctx.stroke(); }
  panel.diagonalFill(x - units, y + units, w + 2 * units, h - 2 * units, 9);
  // LEVEL //
  App.FillColor(ctx, colours[i % colours.length]);
  ctx.fillRect(x - units, y + h * 0.19, units + at(m[0]), h * 0.4);
  if (block?.def?.id === 'fx.compressor') {
    // GAIN REDUCTION (24 dB across the row) //
    const gr = Math.max(0, Math.min(1, -m[1] / 24)) * w;
    App.FillColor(ctx, colours[(i + 1) % colours.length]);
    ctx.fillRect(x + w - gr, y + h * 0.65, gr, h * 0.16);
  } else if (m[1] > 0) {
    // SOUND LASER: its beam is on (the Laser's colour, a bar under the level) //
    App.FillColor(ctx, colours[(i + 1) % colours.length]);
    ctx.fillRect(x - units, y + h * 0.65, w + units, h * 0.16);
  }
  // THRESHOLD: v1 OptionSlider's line and grab triangles, in the text colour //
  const tx = x + Math.max(0, Math.min(w, this.Position.x)), d = h * 0.2;
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.fillRect(tx - units, y, 2 * units, h);
  ctx.beginPath(); ctx.moveTo(tx - d, mid); ctx.lineTo(tx, mid - d); ctx.lineTo(tx + d, mid); ctx.lineTo(tx, mid + d); ctx.closePath(); ctx.fill();
  App.FillColor(ctx, App.Palette[8]);
  ctx.beginPath(); ctx.moveTo(tx - d, mid); ctx.lineTo(tx, mid - d); ctx.lineTo(tx + d * 0.5, mid - d * 0.5); ctx.lineTo(tx - d * 0.5, mid + d * 0.5); ctx.closePath(); ctx.fill();
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  if (this.Selected) {  // VALUE TOOLTIP (v1) //
    ctx.textAlign = 'left'; ctx.font = App.Metrics.TxtSlider;
    ctx.fillText(dB(this.Value), tx + 25 * units, mid + Math.round(units * 33) * 0.35);
  }
  // NAME //
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
  this.Shown = { level: m[0], reduction: m[1], on: m[1] > 0, thresholdX: tx - x, width: w };  // tests
};

/** The Counter's pattern: a diamond per step (v1's slider grab shape), filled where a hit passes; the step the next
 * hit lands on is underlined (v1's selection bar). */
const drawCounterPattern: RowDraw = function (ctx, units, i, panel) {
  const x = panel.Margin, w = panel.Range, y = this.Position.y, h = this.Size.height, mid = y + h * 0.5;
  const block = panel.SelectedBlock, p = block?.Params ?? {}, m = monitorOf(block?.Id) ?? [0, 0];
  const pattern = counterSteps(p), n = pattern.length;
  const cell = w / 16, r = Math.min(cell * 0.36, h * 0.3), x0 = x + (w - cell * n) * 0.5, next = Math.round(m[0]) % n;
  const colours = panel.SliderColours, dataType = Math.round(units * 10);
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) { ctx.beginPath(); ctx.moveTo(panel.Margin - units, y + h); ctx.lineTo(w + panel.Margin + units, y + h); ctx.stroke(); }
  ctx.lineWidth = units;
  pattern.forEach((on, k) => {
    const cx = x0 + cell * (k + 0.5);
    ctx.beginPath(); ctx.moveTo(cx - r, mid); ctx.lineTo(cx, mid - r); ctx.lineTo(cx + r, mid); ctx.lineTo(cx, mid + r); ctx.closePath();
    if (on) { App.FillColor(ctx, colours[i % colours.length]); ctx.fill(); }
    else { App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]); ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1; }
    if (k === next) { App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]); ctx.fillRect(cx - r, mid + r + 3 * units, 2 * r, 2 * units); }
  });
  ctx.lineWidth = 1;
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
  this.Shown = { pattern: pattern.map(on => (on ? 'x' : '.')).join(''), next, cells: pattern.map((_, k) => x0 + cell * (k + 0.5)), cell };  // tests, clicks
};
/** A press on the Counter's pattern row toggles the step under it (owner, 2026-11-14): the steps are then set by hand
 * until Steps, Hits or Rotate moves. Returns true when it took the press. */
function counterPress(panel: any, mx: number, my: number): boolean {
  const block = panel.SelectedBlock;
  if (block?.def?.id !== 'power.counter' || panel.Scale !== 1) return false;
  const row = (panel.Options as any[]).find(o => o.Setting === 'counterPattern');
  if (!row?.Shown?.cells) return false;
  const y = panel.Position.y + row.Position.y;
  if (my < y || my > y + row.Size.height) return false;
  const k = (row.Shown.cells as number[]).findIndex(cx => Math.abs(mx - (panel.Position.x + cx)) <= row.Shown.cell / 2);
  if (k < 0) return false;
  const steps = counterSteps(block.Params);
  steps[k] = !steps[k];
  const mask = steps.reduce((m, on, i) => m | (on ? 1 << i : 0), 0);
  block.Params.pattern = mask;
  App.MainScene.setParam(block, 'pattern', mask);
  panel._DrawReady = true;
  return true;
}

/** Live rows that are also sliders (dragged as v1 drags any slider). */
const METER_ROWS = new Set(['compMeter', 'soundMeter']);
const LIVE_ROWS: Record<string, RowDraw> = { compMeter: drawCompressorMeter, soundMeter: drawCompressorMeter, counterPattern: drawCounterPattern };

/** A selected Prism's exit directions, drawn on the stage while its panel is open (as a Laser shows its beam): thin
 * dashed lines from the block, following its rotation. */
export function drawPrismExits(ctx: CanvasRenderingContext2D, panel: any): void {
  const b = panel.SelectedBlock;
  const emitter = b?.def?.id === 'power.emitter';  // a Particle Emitter shows the way it fires too (owner, 2026-11-14)
  if (!b || panel.Scale !== 1 || (b.def?.id !== 'power.prism' && !emitter)) return;
  const angle = emitter ? Number(b.Params.angle) : monitorOf(b.Id)?.[0] ?? Number(b.Params.angle), len = 6;
  const from = App.Metrics.PointOnGrid(new Point(b.Position.x, b.Position.y));
  ctx.save();
  App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.globalAlpha = 0.6; ctx.lineWidth = App.Unit; ctx.setLineDash([4 * App.Unit, 4 * App.Unit]);
  const ends: [number, number][] = [];
  for (const a of emitter ? [angle] : prismAngles(angle, Number(b.Params.streams), Number(b.Params.spread))) {
    const rad = a * Math.PI / 180, to = App.Metrics.PointOnGrid(new Point(b.Position.x + Math.cos(rad) * len, b.Position.y + Math.sin(rad) * len));
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ends.push([to.x - from.x, to.y - from.y]);
  }
  ctx.restore();
  panel.PrismExits = ends;  // tests
}

/** Sliders that stick at 0 (owner, 2026-11-14): a drag into the middle stops at 0; staying near it for a moment lets
 * small values either side through. */
const SNAP_ZERO = new Set(['power.laser:rotate', 'power.prism:rotate']);
const SNAP_ZONE = 0.05, SNAP_HOLD_MS = 500;

/** Teach the options panel the live rows (once, at start-up). */
export function installLiveRows(panel: any): void {
  const sliderSet = panel.SliderSet.bind(panel);
  panel.SliderSet = (n: number, mx: number) => {
    sliderSet(n, mx);
    const o = panel.Options?.[n];
    // A Counter's steps set by hand give way to the Euclidean pattern once Steps, Hits or Rotate moves.
    if (o && panel.SelectedBlock?.def?.id === 'power.counter' && ['steps', 'hits', 'rotate'].includes(o.Setting) && Number(panel.SelectedBlock.Params.pattern ?? -1) >= 0) {
      panel.SelectedBlock.Params.pattern = -1;
      App.MainScene.setParam(panel.SelectedBlock, 'pattern', -1);
    }
    if (!o || !SNAP_ZERO.has(`${panel.SelectedBlock?.def?.id}:${o.Setting}`)) return;
    const now = performance.now();
    if (Math.abs(o.Value) > (o.Max - o.Min) * SNAP_ZONE) { o.SnapSince = undefined; return; }
    o.SnapSince ??= now;
    if (now - o.SnapSince < SNAP_HOLD_MS && o.Value !== 0) {
      o.Value = 0; o.Position.x = panel.linPosition(0, panel.Range, o.Min, o.Max, 0);
      panel.SelectedBlock.SetParam(o.Setting, 0);
    }
  };
  const mouseDown = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => { if (counterPress(panel, mx, my)) panel.Hover = true; else mouseDown(mx, my); };  // the press is the panel's
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    for (const o of panel.Options as any[]) {
      const draw = o.Type === 'slider' ? LIVE_ROWS[o.Setting] : undefined;
      if (draw) { if (!METER_ROWS.has(o.Setting)) o.Type = 'live'; o.Live = true; o.Draw = draw; }
    }
    // v1 keeps a slider's rollover by row number; rows that are no longer sliders must not inherit one.
    (panel.Options as any[]).forEach((o, i) => { if (o.Type !== 'slider' && o.Type !== 'waveslider' && panel._SliderRoll) panel._SliderRoll[i] = false; });
  };
}
/** Is a live row showing? (The scene then redraws the panel every frame.) */
export const hasLiveRows = (panel: any): boolean => panel.Scale > 0 &&
  (((panel.Options ?? []) as any[]).some(o => o.Live) || panel.SelectedBlock?.def?.id === 'power.prism' || panel.SelectedBlock?.def?.id === 'power.emitter' ||  // their guide lines turn with them
   panel.SelectedBlock?.def?.id === 'input.touchpad');     // the Touchpad's pads light as they are played
