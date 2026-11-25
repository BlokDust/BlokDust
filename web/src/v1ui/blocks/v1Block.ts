// The v1 block the ported OptionsPanel and ToolTip use (Params, OptionsForm, SetParam, Position…),
// backed by a v2 patch block. Forms are v1's own (ported/BlockForms.ts); SetParam goes to the app.
import type { BlockDef } from '../../generated/blocks.gen.ts';
import { App, PLUGIN_LABELS, Point, sceneIfMade } from '../shim.ts';
import { FORMS } from '../ported/BlockForms';
import { SoundCloudTrack } from '../ported/Core/Audio/SoundCloud/SoundcloudTrack';
import type { FreesoundSound } from '../../patch/samples.ts';
import { filterForm } from '../filterPanel.ts';
import { newBlockForm } from '../newBlocks/forms.ts';
import { convertSetting, settingRefreshes } from '../newBlocks/formRows.ts';
import { setLfoTarget, type LfoTarget } from '../newBlocks/lfo.ts';
import type { FormSwitch, OptionsForm } from '../optionsTypes.ts';
import { formatLength, v1BlockName } from './names.ts';
import { SOUND_MAX, soundForm } from './sampleGenSound.ts';
import { GAIN_DB_MIN, extendMidiForm, gainForm } from './extraForms.ts';
import {
  BEAT_STEPS,
  DELAY_STEPS,
  PULSE_DELAY_STEPS,
  SIGNED_TURNS,
  SYNCED,
  extendSyncForm,
  stepAt,
  type BeatStep,
} from './syncForm.ts';

/** v1 Config keys for each sampler's longest searchable track (seconds). */
type TrackLengthKey = 'GranularMaxTrackLength' | 'ConvolverMaxTrackLength';
/** Other samplers: v1's config has no SoundCloudMaxTrackLength, so they always got 510 s. */
const DEFAULT_MAX_TRACK_SECONDS = 510;
const MAX_TRACK: Partial<Record<string, TrackLengthKey>> = {
  Granular: 'GranularMaxTrackLength',
  ConvolutionReverb: 'ConvolverMaxTrackLength',
};
/** A search result: v1's track with the Freesound sound it came from. */
export type FoundTrack = SoundCloudTrack & { Sound: FreesoundSound };
/** Step sliders (tempo sync): the slider setting, its steps and the param they set in beats. */
const STEP_SETTINGS: Partial<Record<string, { steps: BeatStep[]; param: string }>> = {
  turnIndex: { steps: SIGNED_TURNS, param: 'turnBeats' },
  delayIndex: { steps: DELAY_STEPS, param: 'delayBeats' },
  pulseDelayIndex: { steps: PULSE_DELAY_STEPS, param: 'delayBeats' },
  divisionIndex: { steps: BEAT_STEPS, param: 'division' },
  lengthIndex: { steps: BEAT_STEPS, param: 'pulseBeats' },
};
/** Settings that are commands to the app, not params. */
const COMMANDS: Partial<Record<string, (id: number) => void>> = {
  download: (id) => {
    App.MainScene.host.downloadRecording(id);
  },
  generate: (id) => {
    App.MainScene.host.generateSample(id);
  },
  openStage: (id) => {
    App.MainScene.host.openStage(id);
  },
  resetCounter: (id) => {
    App.MainScene.host.resetCounter(id);
  },
};

export class V1Block {
  Id: number;
  Position: Point;
  BlockName: string;
  Params: Record<string, unknown>;
  OptionsForm: OptionsForm | null = null;
  IsPressed = false;
  IsSelected = false;
  TranspositionRange = 3; // v1 Controller default
  WaveForm: number[] = []; // samplers: v1 Waveform.GetWaveformFromBuffer of the loaded buffer
  PrimaryBuffer: AudioBuffer | null = null;
  _WaveForm: number[] = []; // Convolver/Granular: the loaded impulse response's waveform
  GrainsAmount = 10;
  /** An LFO's Target choices (newBlocks/lfo.ts; tests read them). */
  LfoTargets?: LfoTarget[];
  /** Note bars: the engine's last pick count, and the bar a new pick lit (noteBars.ts). */
  __bdSeen?: number;
  __bdLit?: { note: number; until: number };

  constructor(
    id: number,
    readonly def: BlockDef,
    x: number,
    y: number,
    params: Record<string, unknown>,
  ) {
    this.Id = id;
    this.Position = new Point(x, y);
    this.BlockName = v1BlockName(def);
    this.Params = {
      ...Object.fromEntries(def.params.map((param) => [param.key, param.default])),
      ...params,
    };
    // v1's default impulse response (files.blokdust.io) is gone: the engine's built-in one plays.
    const irDefault = def.params.find((param) => param.key === 'track')?.default;
    if (def.id === 'fx.convolver' && this.Params.track === irDefault)
      Object.assign(this.Params, { trackName: 'BUILT-IN HALL', user: 'BlokDust' });
  }

  UpdateOptionsForm(): void {
    const v1Form = this.def.v1Type ? FORMS[this.def.v1Type] : undefined;
    this.OptionsForm = null;
    v1Form?.call(this);
    newBlockForm(this); // the post-2.0 blocks (SCOPE-0005)
    const id = this.def.id;
    if (id === 'source.microphone' || id === 'source.audio-in') gainForm(this);
    if (id === 'source.sample-gen') soundForm(this);
    if (id === 'input.midi-controller' && this.currentForm()) extendMidiForm(this);
    const form = this.currentForm();
    // Silent Keys (CHG-0017): a switch beside Mono/Poly, off by default.
    if (form && this.def.params.some((param) => param.key === 'keysSetPitch')) {
      const silentKeys: FormSwitch = {
        name: 'Silent Keys',
        setting: 'keysSetPitch',
        value: !!this.Params.keysSetPitch,
        lit: true,
        mode: 'offOn',
      };
      form.parameters.find((param) => param.type === 'switches')?.switches?.push(silentKeys);
    }
    // Glide is mono-only (the engine starts each poly note without it): Poly hides it (CHG-0010).
    if (this.def.category === 'interaction' && form && this.Params.isPolyphonic)
      form.parameters = form.parameters.filter((param) => param.setting !== 'glide');
    if (id === 'fx.filter') filterForm(this); // CHG-0010: types and a response graph
    if (SYNCED.has(id)) extendSyncForm(this);
    const label = App.IsPlugin && this.def.v1Type ? PLUGIN_LABELS[this.def.v1Type] : undefined;
    const finalForm = this.currentForm();
    // v1 forms hard-code some titles ("MIDI Keyboard")
    if (label && finalForm) finalForm.name = label.name;
  }
  /** The form as the steps above left it (they may replace it). */
  private currentForm(): OptionsForm | null {
    return this.OptionsForm;
  }

  // ---- v1 sampler search (the ported SoundcloudPanel drives these), on Freesound ----
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
    const lengthKey = MAX_TRACK[this.def.v1Type ?? ''];
    const max = lengthKey ? App.Config[lengthKey] : DEFAULT_MAX_TRACK_SECONDS;
    App.MainScene.host.searchSamples(query, max).then(
      (results: FreesoundSound[]) => {
        if (seq === this.searchSeq) this.SetSearchResults(results);
      },
      () => {
        if (seq === this.searchSeq) this.SetSearchResults([]);
      },
    );
  }
  /** v1 SoundCloudTrack shortens and capitalises titles and users as v1 showed them; v2 adds each
   * sound's length ("By User · 0:07"). */
  SetSearchResults(results: FreesoundSound[]): void {
    this.Searching = false;
    App.MainScene.OptionsPanel.Animating = false;
    this.SearchResults = results.map((result) => {
      const track: FoundTrack = Object.assign(
        new SoundCloudTrack(result.name, result.username, `freesound:${result.id}`, result.url),
        { Sound: result },
      );
      track.User = `${track.User} · ${formatLength(result.duration)}`;
      return track;
    });
  }
  /** v1 Sample.LoadTrack: show the new track at once, then the app fetches and decodes it. */
  LoadTrack(track: FoundTrack): void {
    Object.assign(this.Params, {
      permalink: track.Permalink,
      trackName: track.TitleShort,
      user: track.UserShort,
    });
    if ('reverse' in this.Params) this.Params.reverse = false;
    this.WaveForm = [];
    this._WaveForm = []; // v1 LoadTrack: the panel shows the loading square
    App.MainScene.host.loadFreesound(this.Id, track.Sound, {
      trackName: track.TitleShort,
      user: track.UserShort,
      permalink: track.Permalink,
    });
    this.RefreshOptionsPanel();
  }

  /** v1 Block.Connections (the tour asks what a block connects to): the engine's connections. */
  get Connections(): { Count: number; ToArray(): V1Block[] } {
    const ids = new Set<number>(sceneIfMade()?.host.connectedIds(this.Id) ?? []);
    const list = App.Blocks.filter((block) => ids.has(block.Id));
    return { Count: list.length, ToArray: () => list };
  }
  /** v1 Recorder: recording now (RecorderPanel draws the button lit). */
  IsRecording = false;
  ToggleRecording(): void {
    App.MainScene.host.toggleRecording(this.Id);
  }

  /** v1 block SetParam(param, sliderValue). */
  SetParam(key: string, value: number | boolean): void {
    const scene = App.MainScene,
      number = Number(value);
    const command = COMMANDS[key];
    if (command) {
      command(this.Id);
      return;
    }
    if (key === 'sound') {
      // SampleGen's SOUND (CHG-0035): the wave is made when the slider is let go (liveRows.ts)
      const sound = Math.max(1, Math.min(SOUND_MAX, Math.round(number)));
      if (sound === this.Params.sound) return;
      this.Params.sound = sound;
      scene.host.setSound(this.Id, sound, false);
      return;
    }
    // Samplers: reverse flips the waveform and mirrors the region at once (the app does both).
    if (key === 'reverse' && this.def.params.some((param) => param.key === 'startPosition')) {
      scene.host.reverseSample(this.Id, !!value);
      return;
    }
    // MIDI Input's device: an input by index (0 = all); the patch keeps its name (web, CHG-0004).
    if (key === 'deviceIndex') {
      const i = Math.round(number);
      const name = i > 0 ? (scene.midiDevices[i - 1]?.name ?? '') : '';
      this.Params.device = name;
      this.Params.deviceIndex = i;
      scene.host.setText(this.Id, 'device', name);
      return;
    }
    // Tempo sync (CHG-0004 3.5): division sliders step through musical lengths.
    const stepSetting = STEP_SETTINGS[key];
    if (stepSetting) {
      const beats = stepAt(stepSetting.steps, number).beats;
      this.Params[stepSetting.param] = beats;
      this.Params[key] = Math.round(number);
      scene.setParam(this, stepSetting.param, beats);
      return;
    }
    if (key === 'gainDb') {
      const gain = number <= GAIN_DB_MIN ? 0 : Math.pow(10, number / 20);
      this.Params.gain = gain;
      scene.setParam(this, 'gain', gain);
      return;
    }
    if (key === 'lfoTarget') {
      setLfoTarget(this, number);
      this.RefreshOptionsPanel();
      return;
    } // an LFO's Target carousel (AUDIO-0003)
    if (this.setConverted(key, number)) return;
    if (key === 'sync' || key === 'mpe') {
      // MPE (PLUGIN-0004): the panel shows the mapping rows only while it is on
      if (key === 'mpe' && !this.def.params.some((param) => param.key === 'mpe')) return;
      this.Params[key] = !!value;
      scene.setParam(this, key, value ? 1 : 0);
      this.RefreshOptionsPanel();
      return;
    }
    // v1 Keyboard.SetParam('polyphonic') also sets isPolyphonic, which the Mono/Poly switch shows.
    if (key === 'polyphonic') {
      this.Params.isPolyphonic = !!value;
      scene.setParam(this, 'isPolyphonic', value ? 1 : 0);
      queueMicrotask(() => {
        this.RefreshOptionsPanel();
      });
    }
    this.setManifestParam(key, value);
  }
  /** A new block's slider in other units (ms → s, …). True when `key` was one. */
  private setConverted(key: string, value: number): boolean {
    const converted = convertSetting(key, value);
    if (!converted) return false;
    this.Params[converted.param] = converted.value;
    App.MainScene.setParam(this, converted.param, converted.value);
    if (converted.refresh) this.RefreshOptionsPanel();
    return true;
  }
  /** The slider value back to the param through the manifest's v1 mapping (as the plugin's Dust
   * automation does, codegen automation()). */
  private setManifestParam(key: string, value: number | boolean): void {
    const param = this.def.params.find((entry) => entry.key === key);
    if (!param) return;
    let native = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    const transform = param.ui;
    if (transform.transform === 'SubtractFrom') native = transform.k - native;
    else if (transform.transform === 'Minus') native = native - transform.k;
    else if (transform.transform === 'Divide') native = native / transform.k;
    this.Params[key] = typeof value === 'boolean' ? value : native;
    if (Number.isFinite(native)) App.MainScene.setParam(this, key, native);
    if (settingRefreshes(key)) this.RefreshOptionsPanel();
  }

  /** ToneSource.DisplayNote: transpose value → note name + octave. */
  DisplayNote = (value: number): string => {
    const octave = Math.floor(value / 12) + 4;
    let note = value % 12;
    if (note < 0) note += 12;
    return `${App.Audio.NoteIndex[note]}${octave}`;
  };
  /** v1 SamplerBase.GetDuration(buffer); a Recorder reads its own buffer, 10 s when empty. */
  GetDuration(buffer?: { duration: number } | null): number {
    return (buffer ?? this.PrimaryBuffer)?.duration ?? (this.def.v1Type === 'Recorder' ? 10 : 0);
  }
  /** v1 Block.RefreshOptionsPanel(cmd): re-populate if this block's panel is open; "animate" keeps
   * it redrawing every frame (its loading square spins) until the next plain refresh. */
  RefreshOptionsPanel(cmd?: string): void {
    const optionsPanel = sceneIfMade()?.OptionsPanel;
    if (!optionsPanel) return;
    // v1: in place, at once
    if (optionsPanel.Scale > 0 && optionsPanel.SelectedBlock === this) {
      this.UpdateOptionsForm();
      optionsPanel.Populate(this.OptionsForm, false);
    }
    optionsPanel.Animating = cmd === 'animate';
  }
}
