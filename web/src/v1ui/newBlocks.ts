// The post-2.0 blocks (SCOPE-0005) in v1's UI. v1 knows nothing of them, so this file gives the ported UI what it
// needs: their menu items (in MENU_ORDER), their menu icons (drawn from the manifest geometry, as
// v1's BlockSprites draws its own), their options forms (built from v1's option types) and the live rows some panels
// show (a level meter, …), which read the engine's monitors.
import { BLOCKS, BLOCKS_BY_ID, type BlockDef } from '../generated/blocks.gen.ts';
import { App, PLUGIN_LABELS, Point } from './shim.ts';
import { addSelector, isSelector } from './selectorOption.ts';
import { touchpadForm } from './touchpadPanel.ts';
import { tablePicture } from '../engine/wasmEngine.ts';
import { drawNoteBars, drawRange, noteName, rangeOf } from './noteBars.ts';

/** The new blocks in each v1 category (the menu then sorts each category: MENU_ORDER). */
const MENU: Record<string, string[]> = {
  Source: ['source.stage', 'source.wavetable'],
  Effect: ['fx.compressor', 'fx.chord', 'fx.arpeggiator', 'fx.random-note', 'fx.lfo'],
  Power: ['power.sound-laser', 'power.counter', 'power.chance', 'power.prism', 'power.gate'],
  Interaction: ['input.touchpad', 'input.stage-in'],
};
const NEW_DEFS: BlockDef[] = Object.values(MENU).flat().map(id => BLOCKS_BY_ID.get(id)).filter((d): d is BlockDef => !!d);
const BY_NAME = new Map(NEW_DEFS.map(d => [d.name.toLowerCase(), d]));
const BY_MENU_ID = new Map(BLOCKS.map(d => [d.menuId, d]));

/** Menu order by menu id (owner, 2026-11-17, CHG-0035). Ids not on this branch (Gate) are simply skipped. */
export const MENU_ORDER: Record<string, string[]> = {
  Source: ['ToneSource', 'Noise', 'Wavetable', 'Sample', 'Granular', 'Microphone', 'Recorder', 'SampleGen', 'Stage'],
  Power: ['Power', 'ParticleEmitter', 'Laser', 'Toggle', 'Pulse', 'Counter', 'Chance', 'SoundLaser', 'Prism', 'Gate', 'Void'],
  Interaction: ['ComputerKeyboard', 'MIDIController', 'Touchpad', 'Label', 'StageIn'],
};

/** The menu id of a Label (scene.CreateBlockFromType hands it to the host like a block type). */
export const LABEL_MENU_ID = 'Label';

/** Add the new blocks to v1's menu JSON (once, before the header is populated). */
export function installNewBlockMenu(): void {
  for (const cat of (App.BlockCreator.MenuJson as { categories: { name: string; items: { name: string; id: string; description: string }[] }[] }).categories) {
    for (const id of MENU[cat.name] ?? []) {
      const def = BLOCKS_BY_ID.get(id);
      if (def && !cat.items.some(i => i.id === def.menuId)) cat.items.push({ name: def.name, id: def.menuId, description: def.description });
    }
    // Label (CHG-0020): not a block, but it is made from the Interaction menu like one.
    if (cat.name === 'Interaction' && !cat.items.some(i => i.id === LABEL_MENU_ID))
      cat.items.push({ name: 'Label', id: LABEL_MENU_ID, description: 'A text box.' });
    // Every block's hint (the menu's ?) is its manifest's description, v1's blocks too (owner, 2026-11-17, CHG-0035:
    // v1's named SoundCloud); the plugin keeps its own words for Audio Input and MIDI Input.
    for (const item of cat.items) {
      const def = BY_MENU_ID.get(item.id);
      if (def && !(App.IsPlugin && PLUGIN_LABELS[item.id])) item.description = def.description;
    }
    // Owner (2026-11-17, CHG-0035): Sources, Powers and Interactions list the most used blocks first (MENU_ORDER);
    // Effects, and any block not in the list, are alphabetical (by the name shown, so the plugin's labels too).
    const order = MENU_ORDER[cat.name] ?? [], rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
    cat.items.sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  }
  setMenuHidden(ONLY_INSIDE);  // the outer stage's menu
}

/** Hide these menu ids (inside a Stage block: no Stage; outside: no Stage In; CHG-0021). The header is populated
 * again by the scene's next sync. */
let fullMenu: Map<string, { name: string; id: string; description: string }[]> | null = null;
/** Menu ids offered only inside a Stage block. */
export const ONLY_INSIDE = new Set(['StageIn']);
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
    // Pixel layers (the stars: Gate, as v1's Void in its menu) are in v1 units, as v1 BlockSprites.DrawPixel unscaled.
    // The Void's random star has no place in the menu (v1 put it at a fixed one), so anchored layers are left out.
    if (l.units === 'unit' && l.anchor) continue;
    const at = (x: number, y: number): [number, number] => l.units === 'unit' ? [pos.x + ox * grd + x * App.Unit, pos.y + oy * grd + y * App.Unit] : [pos.x + (ox + x) * grd, pos.y + (oy + y) * grd];
    ctx.beginPath();
    l.points.forEach(([x, y], i) => { const [px, py] = at(x, y); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
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
/** The Gates the engine reports open (CHG-0032: monitor [open, …]), for the stage to draw faded. */
export function openGateIds(packed: Float32Array): number[] {
  const out: number[] = [];
  for (let i = 0; i + 4 < packed.length; i += 5) {
    if (packed[i + 1] !== 1) continue;
    const id = packed[i];
    if ((App.Blocks as any[] | undefined)?.find(x => x.Id === id)?.def?.id === 'power.gate') out.push(id);
  }
  return out;
}

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
// `loop`: v1 Sample.SetParam('loop') → RefreshOptionsPanel, so the waveform shows or hides the loop markers (owner bug
// 2026-11-14: they stayed as the panel opened).
export const settingRefreshes = (key: string): boolean => key === 'perHit' || key === 'gapOnHit' || key === 'loop';
/** Converted settings whose rows must be laid out again once set. */
const CONVERT_REFRESH = new Set(['inKey']);

/** Slider settings that are not the param itself: the slider's value → the param's. */
const CONVERT: Record<string, { param: string; to: (v: number) => number; from?: (v: number) => number }> = {
  attackMs: { param: 'attack', to: v => v / 1000, from: v => v * 1000 },
  releaseMs: { param: 'release', to: v => v / 1000, from: v => v * 1000 },
  gapMs: { param: 'gap', to: v => v / 1000, from: v => v * 1000 },
  glidePct: { param: 'glide', to: v => v / 100, from: v => v * 100 },  // v1 Keyboard's Glide slider shows glide × 100
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

/** The Wavetable's built-in tables, in the engine's order (TableBank::names, CHG-0031). */
export const WAVETABLES = ['BELL', 'CHIME', 'GLASS', 'GONG', 'VOICE', 'SWEEP', 'SYNC', 'FOLD', 'PULSE'];

const FORMS: Record<string, (b: FormBlock) => any[]> = {
  // CHG-0031 (AUDIO-0004): the frame being played, drawn as v1 draws a waveform; then which table, where in it, and
  // the Tone's Note and Fine rows.
  'source.wavetable': b => [
    slider('Wave', 'wavePicture', 0, 0, 1),
    choice('Table', 'table', Number(b.Params.table), WAVETABLES),
    slider('Position', 'position', Number(b.Params.position), 0, 1, { display: v => `${Math.round(v * 100)}%` }),
    slider('Note', 'transpose', Number(b.Params.transpose), -48, 48, { quantised: true, centered: true, display: (b as any).DisplayNote }),
    slider('Fine', 'fine', Number(b.Params.fine), -1, 1, { centered: true }),
  ],
  // CHG-0014: a level meter with the threshold on it (v1's dB meter), then Web Audio's compressor settings.
  'fx.compressor': b => [
    slider('Level', 'compMeter', Number(b.Params.threshold), -60, 0, { display: dB }),  // its line is the Threshold
    slider('Ratio', 'ratio', Number(b.Params.ratio), 1, 20, { display: v => `${v.toFixed(1)} : 1` }),
    slider('Knee', 'knee', Number(b.Params.knee), 0, 40, { display: dB }),
    slider('Attack', 'attackMs', Math.max(1, Number(b.Params.attack) * 1000), 1, 1000, { log: true, display: ms }),
    slider('Release', 'releaseMs', Math.max(10, Number(b.Params.release) * 1000), 10, 1000, { log: true, display: ms }),
    slider('Makeup', 'makeup', Number(b.Params.makeup), -24, 24, { centered: true, display: dB }),
  ],
  // UI-0012: a keyboard without keys (v1 ComputerKeyboard's form): it plays the notes played on its Stage outside.
  'input.stage-in': b => [
    { type: 'switches', name: '', setting: '', props: { value: 0, min: 0, max: 1, quantised: true },
      switches: [{ name: 'Mono/Poly', setting: 'polyphonic', value: !!b.Params.isPolyphonic, mode: 'fewMany' }] },
    slider('Octave', 'transpose', Number(b.Params.transpose ?? 0), -3, 3, { quantised: true, centered: true }),
    slider('Glide', 'glidePct', Number(b.Params.glide ?? 0.05) * 100, 0, 100),
  ],
  // CHG-0021: its level, then the two things to do with it.
  'source.stage': b => {
    const g = Number(b.Params.gain ?? 1);
    return [
      slider('Volume', 'gainDb', g > 0 ? Math.max(-40, 20 * Math.log10(g)) : -40, -40, 6, { display: v => (v <= -40 ? 'OFF' : `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`) }),
      // R13b (owner, 2026-11-14): unpowered, the particles inside carry on.
      switches({ name: 'Keep Particles', setting: 'keepParticles', value: !!b.Params.keepParticles }),
      // One row: OPEN STAGE beside LOAD PATCH (owner, 2026-11-14; buttonPair.ts). The plugins too (CHG-0038).
      { type: 'actionbutton', name: '', setting: 'openStage', props: { text: 'Open Stage' } },
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
  // CHG-0040 (UI-0016): a chord for each note, the Key that slides them, and smooth voicing.
  'fx.chord': b => [
    { type: 'slider', name: 'Chords', setting: 'noteBars', props: { value: 0, min: 0, max: 1, height: 110 } },
    slider('Key', 'key', Number(b.Params.key ?? 0), 0, 11, { quantised: true, display: v => KEYS[Math.max(0, Math.min(11, Math.round(v)))] }),
    switches({ name: 'Smooth', setting: 'smooth', value: b.Params.smooth === undefined ? true : !!Number(b.Params.smooth) }),
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
  // CHG-0040 (UI-0016): a weight for each note, the Key that slides them, and the range by semitone.
  'fx.random-note': b => [
    { type: 'slider', name: 'Notes', setting: 'noteBars', props: { value: 0, min: 0, max: 1, height: 110 } },
    slider('Key', 'key', Number(b.Params.key ?? 0), 0, 11, { quantised: true, display: v => KEYS[Math.max(0, Math.min(11, Math.round(v)))] }),
    { type: 'slider', name: 'Range', setting: 'noteRange', props: { value: 0, min: 0, max: 1, convertDisplay: () => rangeOf(b).map(noteName).join(' – ') } },
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
  // CHG-0015: the pattern as a row of steps, the three numbers that make it (Euclidean, SIMULATION-0005), then Reset.
  'power.counter': b => [
    slider('Pattern', 'counterPattern', 0, 0, 1),
    slider('Steps', 'steps', Number(b.Params.steps), 1, 16, { quantised: true }),
    slider('Hits', 'hits', Math.min(Number(b.Params.hits), Number(b.Params.steps)), 0, 16, { quantised: true }),
    slider('Rotate', 'rotate', Number(b.Params.rotate), 0, 15, { quantised: true }),
    { type: 'actionbutton', name: '', setting: 'resetCounter', props: { text: 'Reset' } },
  ],
  'power.chance': b => [slider('Chance', 'chance', Number(b.Params.chance), 0, 1, { display: v => `${Math.round(v * 100)}%` })],
  // CHG-0032: open while a power block powers it; Invert swaps that (SIMULATION-0011).
  'power.gate': b => [switches({ name: 'Invert', setting: 'invert', value: !!b.Params.invert })],
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
  // CHG-0040: Random Note's bars and range ends (its Key is a slider row); a Chord's Key only, not its chord bars.
  if (def.id === 'fx.random-note') return [...KEYS.map((k, i) => ({ param: `w${i}`, label: `Weight ${k}` })), { param: 'key', label: 'Key' }, { param: 'low', label: 'Range Low' }, { param: 'high', label: 'Range High' }];
  if (def.id === 'fx.chord') return [{ param: 'key', label: 'Key' }];
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

/** The Counter's pattern: a diamond per step (v1's slider grab shape), filled where it fires; the step the next
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

// ---- the Wavetable's picture (CHG-0031, SPEC-AUDIO-WAVETABLE R7) ----
let tableModule: WebAssembly.Module | null = null;
/** The engine module the pictures are drawn with (the app hands it over once loaded). */
export function setTableModule(m: WebAssembly.Module): void { tableModule = m; }
const pictures = new Map<string, Float32Array>();
function pictureOf(table: number, position: number): Float32Array | null {
  if (!tableModule) return null;
  const key = `${table}:${Math.round(position * 512)}`;
  let p = pictures.get(key);
  if (!p) {
    if (pictures.size > 256) pictures.clear();
    p = tablePicture(tableModule, table, Math.round(position * 512) / 512, 200);
    pictures.set(key, p);
  }
  return p;
}
/** v1 OptionWave's look (the Sample's waveform: divider, fill in palette 1, name on the left), but the wave itself,
 * filled between it and the middle line: one cycle of the frame the block plays (two note cycles of a bell or gong).
 * It reads the Position slider as shown, so it moves with an LFO or Dust automation. */
const drawWavePicture: RowDraw = function (ctx, units, i, panel) {
  const x = panel.Margin, w = panel.Range, y = this.Position.y, h = this.Size.height, mid = y + h * 0.5;
  const block = panel.SelectedBlock, dataType = Math.round(units * 10);
  const posRow = (panel.Options as any[]).find(o => o.Setting === 'position');
  const table = Math.max(0, Math.min(WAVETABLES.length - 1, Math.round(Number(block?.Params?.table ?? 0))));
  const position = Math.max(0, Math.min(1, Number(posRow?.Value ?? block?.Params?.position ?? 0)));
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) { ctx.beginPath(); ctx.moveTo(x - units, y + h); ctx.lineTo(w + x + units, y + h); ctx.stroke(); }
  const pic = pictureOf(table, position);
  App.FillColor(ctx, App.Palette[1]);
  if (pic) {
    ctx.beginPath();
    ctx.moveTo(x, mid);
    pic.forEach((v, j) => ctx.lineTo(x + (w / (pic.length - 1)) * j, mid - v * h * 0.45));
    ctx.lineTo(x + w, mid);
    ctx.closePath();
    ctx.fill();
  } else App.AnimationsLayer.DrawSprite(ctx, 'loading', x + w * 0.5, mid, 11, true);  // v1's loading square
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), x - 15 * units, mid + dataType * 0.4);
  this.Shown = { table: WAVETABLES[table], position, drawn: !!pic, first: pic ? Array.from(pic.slice(0, 8)) : [] };  // tests
};

/** Live rows that are also sliders (dragged as v1 drags any slider). */
const METER_ROWS = new Set(['compMeter', 'soundMeter']);
const LIVE_ROWS: Record<string, RowDraw> = { compMeter: drawCompressorMeter, soundMeter: drawCompressorMeter, counterPattern: drawCounterPattern, wavePicture: drawWavePicture, noteBars: drawNoteBars, noteRange: drawRange };

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
  // SampleGen's SOUND (CHG-0035, owner 2026-11-17): its number always shows (v1 shows a slider's value only while
  // it is held, and the panel is built again when the wave arrives), and the wave is made when the slider is let go.
  const mouseUp = panel.MouseUp.bind(panel);
  panel.MouseUp = () => {
    const sound = (panel.Options as any[] | undefined)?.find(o => o.Setting === 'sound' && o.Selected);
    const block = panel.SelectedBlock;
    mouseUp();
    if (sound && block) App.MainScene.host.setSound(block.Id, Number(block.Params.sound) || 1, true);
  };
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    for (const o of panel.Options as any[]) {
      if (o.Type === 'slider' && o.Setting === 'sound' && panel.SelectedBlock?.def?.id === 'source.sample-gen') {
        const draw = o.Draw.bind(o);
        o.Draw = (...a: unknown[]) => { const held = o.Selected; o.Selected = true; try { draw(...a); } finally { o.Selected = held; } };
      }
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
