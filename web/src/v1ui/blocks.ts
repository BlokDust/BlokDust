// The v1 block interface the ported OptionsPanel/ToolTip use (Params, OptionsForm, SetParam, Position…), backed by a v2
// patch block. Options forms are v1's own UpdateOptionsForm bodies (ported/BlockForms.ts). SetParam maps the slider value
// back to the block's native value through the manifest's v1 UiTransform and sends it to the engine via the scene.
import type { BlockDef } from '../generated/blocks.gen.ts';
import { App, PLUGIN_LABELS, Point } from './shim.ts';
import { FORMS } from './ported/BlockForms';
import { SoundCloudTrack } from './ported/Core/Audio/SoundCloud/SoundcloudTrack';
import type { FreesoundSound } from '../patch/samples.ts';
import { filterForm } from './filterPanel.ts';
import { convertSetting, newBlockForm, setLfoTarget, settingRefreshes } from './newBlocks.ts';

/** v1 Config keys for each sampler's longest searchable track (seconds). */
const MAX_TRACK: Record<string, string> = { Sample: 'SoundCloudMaxTrackLength', Granular: 'GranularMaxTrackLength', ConvolutionReverb: 'ConvolverMaxTrackLength' };

export class V1Block {
  Id: number;
  Position: Point;
  BlockName: string;
  Params: Record<string, any>;
  OptionsForm: any = null;
  IsPressed = false;
  IsSelected = false;
  TranspositionRange = 3;     // v1 Controller default
  WaveForm: number[] = [];    // samplers: v1 Waveform.GetWaveformFromBuffer of the loaded buffer
  PrimaryBuffer: any = null;
  _WaveForm: number[] = [];   // Convolver/Granular: the loaded impulse response's waveform
  GrainsAmount = 10;

  constructor(id: number, readonly def: BlockDef, x: number, y: number, params: Record<string, any>) {
    this.Id = id;
    this.Position = new Point(x, y);
    this.BlockName = def.v1Type ? (App.L10n.Blocks[catOf(def)]?.Blocks?.[nameKey(def)]?.name ?? def.name) : def.name;
    this.Params = { ...Object.fromEntries(def.params.map(p => [p.key, p.default])), ...params };
    // v1's default impulse response (Teufelsberg on files.blokdust.io) is gone; the engine's built-in one plays instead.
    const irDefault = def.params.find(p => p.key === 'track')?.default;
    if (def.id === 'fx.convolver' && this.Params.track === irDefault) Object.assign(this.Params, { trackName: 'BUILT-IN HALL', user: 'BlokDust' });
  }

  UpdateOptionsForm(): void {
    const f = this.def.v1Type ? FORMS[this.def.v1Type] : undefined;
    this.OptionsForm = null;
    f?.call(this);
    newBlockForm(this);  // the post-2.0 blocks (SCOPE-0005)
    if (this.def.id === 'source.microphone' || this.def.id === 'source.audio-in') gainForm(this);
    if (this.def.id === 'source.sample-gen' && this.OptionsForm) soundForm(this);
    if (this.def.id === 'input.midi-controller' && this.OptionsForm) extendMidiForm(this);
    // Silent Keys (CHG-0017): a switch beside Mono/Poly, off by default.
    if (this.OptionsForm && this.def.params.some(p => p.key === 'keysSetPitch'))
      (this.OptionsForm.parameters as any[]).find(p => p.type === 'switches')?.switches.push({ name: 'Silent Keys', setting: 'keysSetPitch', value: !!this.Params.keysSetPitch, lit: true, mode: 'offOn' });
    // Glide is mono-only (the engine starts each poly note without it): Poly hides it (owner, 2026-11-12, CHG-0010).
    if (this.def.category === 'interaction' && this.OptionsForm && this.Params.isPolyphonic)
      this.OptionsForm.parameters = (this.OptionsForm.parameters as any[]).filter(p => p.setting !== 'glide');
    if (this.def.id === 'fx.filter') filterForm(this);  // CHG-0010: types and a response graph (filterPanel.ts)
    if (SYNCED.has(this.def.id) && this.OptionsForm) extendSyncForm(this);
    const label = App.IsPlugin && this.def.v1Type ? PLUGIN_LABELS[this.def.v1Type] : undefined;
    if (label && this.OptionsForm) this.OptionsForm.name = label.name;  // v1 forms hard-code some titles ("MIDI Keyboard")
  }

  // ---- v1 Source/Sample/Granular/ConvolutionReverb search (the ported SoundcloudPanel drives these), on Freesound ----
  SearchResults: SoundCloudTrack[] = [];
  Searching = false;
  SearchString = '';
  ResultsPage = 1;
  private searchSeq = 0;
  Search(query: string): void {
    this.Searching = true;
    App.MainScene.OptionsPanel.Animating = true;
    this.ResultsPage = 1;
    this.SearchResults = [];
    const seq = ++this.searchSeq;
    const max = App.Config[MAX_TRACK[this.def.v1Type ?? ''] ?? 'SoundCloudMaxTrackLength'] ?? 510;
    App.MainScene.host.searchSamples(query, max)
      .then((r: FreesoundSound[]) => { if (seq === this.searchSeq) this.SetSearchResults(r); },
        () => { if (seq === this.searchSeq) this.SetSearchResults([]); });
  }
  SetSearchResults(results: FreesoundSound[]): void {
    this.Searching = false;
    App.MainScene.OptionsPanel.Animating = false;
    // v1 SoundCloudTrack (ported) shortens and capitalises titles/users as v1 showed them.
    // Owner (2026-11-14): the results also show each sound's length ("By User · 0:07"; the panel draws "By " + User).
    this.SearchResults = results.map(s => {
      const t = Object.assign(new SoundCloudTrack(s.name, s.username, `freesound:${s.id}`, s.url), { Sound: s });
      t.User = `${t.User} · ${formatLength(s.duration)}`;
      return t;
    });
  }
  /** v1 Sample.LoadTrack: show the new track at once, then the app fetches and decodes it. */
  LoadTrack(track: SoundCloudTrack & { Sound: FreesoundSound }): void {
    Object.assign(this.Params, { permalink: track.Permalink, trackName: track.TitleShort, user: track.UserShort });
    if ('reverse' in this.Params) this.Params.reverse = false;
    this.WaveForm = []; this._WaveForm = [];  // v1 Sample/Granular/ConvolutionReverb.LoadTrack: the panel shows the loading square
    App.MainScene.host.loadFreesound(this.Id, track.Sound, { trackName: track.TitleShort, user: track.UserShort, permalink: track.Permalink });
    this.RefreshOptionsPanel();
  }

  /** v1 Block.Connections (the tour asks what a block is connected to, CHG-0035): the engine's proximity connections. */
  get Connections(): { Count: number; ToArray(): V1Block[] } {
    const ids = new Set<number>(App.MainScene?.host?.connectedIds(this.Id) ?? []);
    const list = (App.Blocks as V1Block[]).filter(b => ids.has(b.Id));
    return { Count: list.length, ToArray: () => list };
  }
  /** v1 Recorder: recording now (RecorderPanel draws the button lit). */
  IsRecording = false;
  ToggleRecording(): void { App.MainScene.host.toggleRecording(this.Id); }

  /** v1 block SetParam(param, sliderValue). */
  SetParam(key: string, value: any): void {
    // Action buttons (v1 Recorder "download", SampleGen "generate") are commands, not params.
    if (key === 'download') { App.MainScene.host.downloadRecording(this.Id); return; }
    if (key === 'generate') { App.MainScene.host.generateSample(this.Id); return; }
    if (key === 'sound') {  // SampleGen's SOUND (CHG-0035): a number, not a button; the wave follows it
      const n = Math.max(1, Math.min(SOUND_MAX, Math.round(Number(value))));
      if (n === this.Params.sound) return;
      this.Params.sound = n;
      App.MainScene.host.setSound(this.Id, n, false);  // the wave is made when the slider is let go (newBlocks.ts)
      return;
    }
    if (key === 'openStage') { App.MainScene.host.openStage(this.Id); return; }          // a Stage's panel buttons (CHG-0021)
    if (key === 'loadStagePatch') { App.MainScene.host.loadStagePatch(this.Id); return; }
    if (key === 'resetCounter') { App.MainScene.host.resetCounter(this.Id); return; }  // a Counter's Reset (R2c)
    // Samplers: reverse flips the waveform and mirrors the region at once (the app updates Params and the engine).
    if (key === 'reverse' && this.def.params.some(q => q.key === 'startPosition')) { App.MainScene.host.reverseSample(this.Id, !!value); return; }
    // MIDI Input's device slider picks an input by index (0 = all): the patch keeps its name (web only, CHG-0004).
    if (key === 'deviceIndex') {
      const list = App.MainScene.midiDevices as { name: string }[], i = Math.round(Number(value));
      const name = i > 0 ? list[i - 1]?.name ?? '' : '';
      this.Params.device = name; this.Params.deviceIndex = i;
      App.MainScene.host.setText(this.Id, 'device', name);
      return;
    }
    // Tempo sync (CHG-0004 3.5): the division sliders step through musical lengths; tempo is the patch's (web).
    if (key === 'turnIndex') {
      const beats = SIGNED_TURNS[Math.max(0, Math.min(SIGNED_TURNS.length - 1, Math.round(Number(value))))].beats;
      this.Params.turnBeats = beats; this.Params.turnIndex = Math.round(Number(value));
      App.MainScene.setParam(this, 'turnBeats', beats);
      return;
    }
    if (key === 'delayIndex') {
      const beats = DELAY_STEPS[Math.max(0, Math.min(DELAY_STEPS.length - 1, Math.round(Number(value))))].beats;
      this.Params.delayBeats = beats; this.Params.delayIndex = Math.round(Number(value));
      App.MainScene.setParam(this, 'delayBeats', beats);
      return;
    }
    if (key === 'pulseDelayIndex') {  // a synced Pulse's Delay (CHG-0029)
      const beats = PULSE_DELAY_STEPS[Math.max(0, Math.min(PULSE_DELAY_STEPS.length - 1, Math.round(Number(value))))].beats;
      this.Params.delayBeats = beats; this.Params.pulseDelayIndex = Math.round(Number(value));
      App.MainScene.setParam(this, 'delayBeats', beats);
      return;
    }
    if (key === 'divisionIndex' || key === 'lengthIndex') {
      const beats = BEAT_STEPS[Math.max(0, Math.min(BEAT_STEPS.length - 1, Math.round(Number(value))))].beats;
      const target = key === 'divisionIndex' ? 'division' : 'pulseBeats';
      this.Params[target] = beats; this.Params[key] = Math.round(Number(value));
      App.MainScene.setParam(this, target, beats);
      return;
    }
    if (key === 'gainDb') {
      const db = Number(value), g = db <= GAIN_DB_MIN ? 0 : Math.pow(10, db / 20);
      this.Params.gain = g;
      App.MainScene.setParam(this, 'gain', g);
      return;
    }
    if (key === 'lfoTarget') { setLfoTarget(this, Number(value)); this.RefreshOptionsPanel(); return; }  // an LFO's Target carousel (AUDIO-0003)
    const conv = convertSetting(key, value);  // a new block's slider in other units (ms → s, …)
    if (conv) { this.Params[conv.param] = conv.value; App.MainScene.setParam(this, conv.param, conv.value); if (conv.refresh) this.RefreshOptionsPanel(); return; }
    if (key === 'sync') { this.Params.sync = !!value; App.MainScene.setParam(this, 'sync', value ? 1 : 0); this.RefreshOptionsPanel(); return; }
    // MPE switches (PLUGIN-0004): the panel shows the mapping rows only while MPE is on.
    if (key === 'mpe') { const p = this.def.params.find(q => q.key === 'mpe'); if (p) { this.Params.mpe = !!value; App.MainScene.setParam(this, 'mpe', value ? 1 : 0); this.RefreshOptionsPanel(); } return; }
    // v1 Keyboard.SetParam('polyphonic') also sets isPolyphonic, which the Mono/Poly switch displays.
    if (key === 'polyphonic') { this.Params.isPolyphonic = !!value; App.MainScene.setParam(this, 'isPolyphonic', value ? 1 : 0); queueMicrotask(() => this.RefreshOptionsPanel()); }
    const p = this.def.params.find(q => q.key === key);
    if (!p) return;
    let v = typeof value === 'boolean' ? (value ? 1 : 0) : Number(value);
    const t = p.ui;  // the manifest's v1 slider mapping (same as the plugin's Dust automation, codegen automation())
    if (t.transform === 'SubtractFrom') v = t.k - v;
    else if (t.transform === 'Minus') v = v - t.k;
    else if (t.transform === 'Divide') v = v / t.k;
    this.Params[key] = typeof value === 'boolean' ? value : v;
    if (Number.isFinite(v)) App.MainScene.setParam(this, key, v);
    if (settingRefreshes(key)) this.RefreshOptionsPanel();
  }

  /** ToneSource.DisplayNote: transpose value → note name + octave. */
  DisplayNote = (value: number): string => {
    const octave = Math.floor(value / 12) + 4;
    let n = value % 12; if (n < 0) n += 12;
    return `${App.Audio.NoteIndex[n]}${octave}`;
  };
  // v1 SamplerBase.GetDuration(buffer); Recorder.GetDuration() reads its own buffer, 10 s when empty.
  GetDuration(buffer?: any): number { return (buffer ?? this.PrimaryBuffer)?.duration ?? (this.def.v1Type === "Recorder" ? 10 : 0); }
  /** v1 Block.RefreshOptionsPanel(cmd): re-populate if this block's panel is open; "animate" keeps the panel redrawing
   * every frame (its loading square spins) until the next plain refresh. */
  RefreshOptionsPanel(cmd?: string): void {
    const o = App.MainScene?.OptionsPanel;
    if (!o) return;
    if (o.Scale > 0 && o.SelectedBlock === this) { this.UpdateOptionsForm(); o.Populate(this.OptionsForm, false); }  // v1: in place, at once
    o.Animating = cmd === 'animate';
  }
}

/** A sample length as m:ss (h:mm:ss from an hour; a sound under a second shows 0:01). */
export function formatLength(sec: number): string {
  const n = Number(sec) || 0, t = n > 0 ? Math.max(1, Math.round(n)) : 0, h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
const CATEGORY: Record<string, string> = { source: 'Source', effect: 'Effect', power: 'Power', interaction: 'Interaction' };
function catOf(def: BlockDef): string { return CATEGORY[def.category] ?? 'Source'; }
/** l10n key for a block: v1 uses e.g. Blocks.Source.Blocks.Tone for ToneSource. */
function nameKey(def: BlockDef): string {
  const cat = App.L10n.Blocks[catOf(def)]?.Blocks ?? {};
  const byType: Record<string, string> = { ToneSource: 'Tone', ParticleEmitter: 'ParticleEmitter', ComputerKeyboard: 'ComputerKeyboard', MIDIController: 'MIDIController' };
  const k = byType[def.v1Type ?? ''] ?? def.v1Type ?? '';
  return k in cat ? k : Object.keys(cat).find(n => n.toLowerCase() === (def.v1Type ?? '').toLowerCase()) ?? k;
}

/** SampleGen's numbered sounds (CHG-0035). */
export const SOUND_MAX = 999;
/**
 * Run v1's SampleGen generator (ported verbatim: it draws every choice from Math.random) on sound `n`'s own random
 * numbers (mulberry32), so a number always makes the same wave. 0: as v1, unseeded.
 */
export function withSound<T>(n: number, run: () => T): T {
  if (!(n > 0)) return run();
  let a = (Math.imul(n, 0x9e3779b1) ^ 0x5bd1e995) >>> 0;
  const random = Math.random;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return run(); } finally { Math.random = random; }
}
/**
 * SampleGen (owner, 2026-11-17, CHG-0035): v1's GENERATE WAVE button rolled a new random wave; a SOUND slider picks one
 * of 999 instead. Each number seeds v1's generator, so a number is always the same wave and can be found again.
 */
function soundForm(b: V1Block): void {
  const params = b.OptionsForm.parameters as any[], i = params.findIndex(p => p.setting === 'generate');
  if (i < 0) return;
  params[i] = { type: 'slider', name: 'Sound', setting: 'sound',
    props: { value: Math.max(1, Number(b.Params.sound) || 1), min: 1, max: SOUND_MAX, quantised: true, centered: false,
      convertDisplay: (v: number) => `#${Math.round(v)}` } };
}

/**
 * MIDI Input options beyond v1's (CHG-0004, PLUGIN-0004), built from v1's own option types so they look like v1: an MPE
 * switch beside Mono/Poly; Channel (OMNI, 1–16) and, on the web, Device (ALL or an input's name) as sliders with a text
 * readout (v1 convertDisplay, as the Tone's note slider); with MPE on, Pressure and Slide switches and a Bend range.
 */
function extendMidiForm(b: V1Block): void {
  const params = b.OptionsForm.parameters as any[];
  const sw = params.find(p => p.type === 'switches');
  sw?.switches.push({ name: 'MPE', setting: 'mpe', value: !!b.Params.mpe, lit: true, mode: 'offOn' });
  // Owner (2026-11-12, CHG-0010): with MPE on, Channel is hidden: MPE uses every channel of its zone (the engine ignores
  // the channel then).
  if (!b.Params.mpe) params.push({ type: 'slider', name: 'Channel', setting: 'channel',
    props: { value: Number(b.Params.channel ?? 0), min: 0, max: 16, quantised: true, centered: false,
      convertDisplay: (v: number) => (Math.round(v) === 0 ? 'OMNI' : String(Math.round(v))) } });
  if (!App.IsPlugin) {  // a selector, not a slider (selectorOption.ts): arrows either side of the name
    const list = (App.MainScene?.midiDevices ?? []) as { name: string }[];
    const at = list.findIndex(d => d.name === b.Params.device);
    params.push({ type: 'slider', name: 'Device', setting: 'deviceIndex',
      props: { value: at + 1, min: 0, max: Math.max(1, list.length), quantised: true, centered: false,
        convertDisplay: (v: number) => { const i = Math.round(v); return i === 0 ? 'ALL' : (list[i - 1]?.name ?? (b.Params.device || '—')).toUpperCase(); } } });
  }
  if (b.Params.mpe) {
    params.push({ type: 'switches', name: '', setting: '', props: { value: 0, min: 0, max: 1, quantised: true },
      switches: [
        { name: 'Pressure', setting: 'pressureTo', value: Number(b.Params.pressureTo ?? 1) >= 0.5, lit: true, mode: 'offOn' },
        { name: 'Slide', setting: 'slideTo', value: Number(b.Params.slideTo ?? 1) >= 0.5, lit: true, mode: 'offOn' },
      ] });
    // No Bend row (owner, 2026-11-12): pitch bend is ±48 semitones, MPE's standard (the `bendRange` param's default).
  }
}

/**
 * Audio Input / Microphone (owner review 2): v1 has no options for the Microphone; one Gain row in v1's slider style,
 * in dB (−40 dB = off, up to +6 dB). The param is a ratio, 1 = unity: the plugins' Audio Input is a true bypass.
 */
const GAIN_DB_MIN = -40;
function gainForm(b: V1Block): void {
  const g = Number(b.Params.gain ?? 1);
  b.OptionsForm = { name: App.IsPlugin && b.def.id === 'source.audio-in' ? 'Audio Input' : b.BlockName, parameters: [{ type: 'slider', name: 'Gain', setting: 'gainDb',
    props: { value: g > 0 ? Math.max(GAIN_DB_MIN, 20 * Math.log10(g)) : GAIN_DB_MIN, min: GAIN_DB_MIN, max: 6, quantised: false, centered: false,
      convertDisplay: (v: number) => (v <= GAIN_DB_MIN ? 'OFF' : `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`) } }] };
}

/** Musical lengths for the synced sliders (beats = quarter notes), with triplets (owner). */
const BEAT_STEPS = [
  { beats: 0.0625, label: '1/64' }, { beats: 0.125, label: '1/32' }, { beats: 1 / 6, label: '1/16T' }, { beats: 0.25, label: '1/16' },
  { beats: 1 / 3, label: '1/8T' }, { beats: 0.5, label: '1/8' }, { beats: 2 / 3, label: '1/4T' }, { beats: 1, label: '1/4' },
  { beats: 4 / 3, label: '1/2T' }, { beats: 2, label: '1/2' }, { beats: 4, label: '1 BAR' }, { beats: 8, label: '2 BARS' }, { beats: 16, label: '4 BARS' },
];
/** A synced laser's time per full turn, laid out like v1's Rotate slider: fastest anticlockwise (↺, negative) at the
 * left, slowest in the middle, fastest clockwise (↻) at the right. */
const TURN_STEPS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64].map(b => ({ beats: b, label: b < 4 ? `1/${4 / b}` : b === 4 ? '1 BAR' : `${b / 4} BARS` }));
const SIGNED_TURNS = [...TURN_STEPS.map(t => ({ beats: -t.beats, label: `↺ ${t.label}` })), ...[...TURN_STEPS].reverse().map(t => ({ beats: t.beats, label: `↻ ${t.label}` }))];
const nearest = (steps: { beats: number }[], beats: number) => { let best = 0; steps.forEach((s, i) => { if (Math.abs(s.beats - beats) < Math.abs(steps[best].beats - beats)) best = i; }); return best; };
const stepOf = (beats: number) => nearest(BEAT_STEPS, beats);
const stepSlider = (name: string, setting: string, steps: { label: string }[], at: number, centered = false) => ({ type: 'slider', name, setting,
  props: { value: at, min: 0, max: steps.length - 1, quantised: true, centered,
    convertDisplay: (v: number) => steps[Math.max(0, Math.min(steps.length - 1, Math.round(v)))].label } });

/** A synced Stereo Delay's time (owner, 2026-11-10), with triplets and the dotted lengths delays are often set to. */
const DELAY_STEPS = [
  { beats: 0.125, label: '1/32' }, { beats: 1 / 6, label: '1/16T' }, { beats: 0.25, label: '1/16' }, { beats: 1 / 3, label: '1/8T' },
  { beats: 0.375, label: '1/16D' }, { beats: 0.5, label: '1/8' }, { beats: 2 / 3, label: '1/4T' }, { beats: 0.75, label: '1/8D' },
  { beats: 1, label: '1/4' }, { beats: 4 / 3, label: '1/2T' }, { beats: 1.5, label: '1/4D' }, { beats: 2, label: '1/2' },
];
/** A synced Pulse's Delay (CHG-0029): off, then the musical lengths up to a bar. */
const PULSE_DELAY_STEPS = [{ beats: 0, label: 'OFF' }, ...BEAT_STEPS.filter(s => s.beats <= 4)];
/** Blocks with a Tempo Sync switch. */
const SYNCED = new Set(['power.emitter', 'power.pulse', 'power.laser', 'fx.stereo-delay']);

/**
 * Tempo sync rows (CHG-0004 3.5, SIMULATION-0003) in v1's option styles, placed after the first row (Angle; Pulse
 * length for the Pulse, Delay Time for the Stereo Delay): a Tempo Sync switch, then what timing uses (owner). Synced:
 * the Emitter's Division and Swing, the Pulse's Length, the Laser's Turn, the Stereo Delay's Delay (musical steps,
 * readout "1/8T", "1 BAR"); the free-running rows they replace are hidden (Emitter: Fire Rate and P. Speed; Pulse:
 * Pulse length; Laser: Rotate; Stereo Delay: Delay Time). Not synced: v1's rows. The tempo itself is in Settings
 * (web, owner 2026-11-10); in a DAW the host's tempo rules.
 */
function extendSyncForm(b: V1Block): void {
  const params = b.OptionsForm.parameters as any[];
  const kind = b.def.id === 'power.emitter' ? 'emitter' : b.def.id === 'power.pulse' ? 'pulse' : b.def.id === 'fx.stereo-delay' ? 'delay' : 'laser';
  const sync = { type: 'switches', name: '', setting: '', props: { value: 0, min: 0, max: 1, quantised: true },
    switches: [{ name: 'Tempo Sync', setting: 'sync', value: !!b.Params.sync, lit: true, mode: 'offOn' }] };
  // The Laser's Restart (R9a): each power-on starts again from its Angle; beside Tempo Sync, synced or not.
  if (kind === 'laser') sync.switches.push({ name: 'Restart', setting: 'restart', value: !!b.Params.restart, lit: true, mode: 'offOn' });
  const synced: any[] = [];
  if (b.Params.sync) {
    if (kind === 'emitter') {
      synced.push(stepSlider('Division', 'divisionIndex', BEAT_STEPS, stepOf(Number(b.Params.division ?? 1))));
      synced.push({ type: 'slider', name: 'Swing', setting: 'swing', props: { value: Number(b.Params.swing ?? 0), min: 0, max: 1, quantised: false, centered: false,
        convertDisplay: (v: number) => `${Math.round(v * 100)}%` } });
    } else if (kind === 'pulse') {
      synced.push(stepSlider('Length', 'lengthIndex', BEAT_STEPS, stepOf(Number(b.Params.pulseBeats ?? 0.25))));
      synced.push(stepSlider('Delay', 'pulseDelayIndex', PULSE_DELAY_STEPS, nearest(PULSE_DELAY_STEPS, Number(b.Params.delayBeats ?? 0))));
    }
    else if (kind === 'delay') synced.push(stepSlider('Delay', 'delayIndex', DELAY_STEPS, nearest(DELAY_STEPS, Number(b.Params.delayBeats ?? 0.5))));
    else synced.push(stepSlider('Turn', 'turnIndex', SIGNED_TURNS, nearest(SIGNED_TURNS, Number(b.Params.turnBeats ?? 4)), true));
  }
  const free = new Set(b.Params.sync ? ({ emitter: ['rate', 'speed'], pulse: ['pulseLength'], delay: ['delayTime'], laser: ['rotate'] })[kind] : []);
  const kept = params.filter(p => !free.has(p.setting));
  if (kind === 'emitter') {
    // Offset (CHG-0014): a nudge, as a share of the interval: after Swing when synced, after Fire Rate when not.
    const offset = { type: 'slider', name: 'Offset', setting: 'offset', props: { value: Number(b.Params.offset ?? 0), min: 0, max: 1, quantised: false, centered: false,
      convertDisplay: (v: number) => `${Math.round(v * 100)}%` } };
    if (b.Params.sync) synced.push(offset);
    else kept.splice(kept.findIndex(p => p.setting === 'rate') + 1, 0, offset);
  }
  if (kind === 'pulse' && !b.Params.sync) {
    // Delay (CHG-0029, SIMULATION-0010): each hit waits this long before it powers the sources; after Pulse length.
    kept.splice(kept.findIndex(p => p.setting === 'pulseLength') + 1, 0, { type: 'slider', name: 'Delay', setting: 'delay',
      props: { value: Number(b.Params.delay ?? 0), min: 0, max: 4, quantised: false, centered: false,
        convertDisplay: (v: number) => (v < 0.005 ? 'OFF' : v < 1 ? `${Math.round(v * 1000)} ms` : `${v.toFixed(2)} s`) } });
  }
  // Pulse and Stereo Delay: their first row (Pulse length, Delay Time) is hidden when synced, so the sync rows go first.
  const at = kind === 'pulse' || kind === 'delay' ? 0 : 1;
  b.OptionsForm.parameters = [...kept.slice(0, at), sync, ...synced, ...kept.slice(at)];
}
