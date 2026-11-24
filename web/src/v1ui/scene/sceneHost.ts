// What v1's UI layer asks of the app.
import type { Theme } from '../../generated/palettes.gen.ts';
import type { FreesoundSound } from '../../patch/samples.ts';
import type { PatchesHost } from '../patches/hosts.ts';
import type { SettingsPanel } from '../ported/UI/SettingsPanel';

export interface SceneHost extends PatchesHost {
  feedback?: { draw(panel: SettingsPanel): void };
  /** v1 MenuItem dragged onto the stage: create at the grid cell and start dragging it (v1 CreateBlockFromType). */
  createBlock(v1Type: string, gx: number, gy: number): number | null;
  deleteBlock(id: number): void;
  /** Settings › About: the anonymous usage stats switch (SPEC-SHARING-USAGE-ANALYTICS R7). Absent: not shown. */
  usageStats?: { get(): boolean; set(on: boolean): void };
  setParam(id: number, key: string, value: number): void;
  setTheme(index: number): void;
  setZoom(zoom: number): void;
  /** v1 Settings › Master Volume (Tone dB as set on Tone.Master.volume). */
  setMasterDb(db: number): void;
  /** The power switch (owner, 2026-11-11): off, nothing in the world powers anything; held blocks and keys still play. */
  setWorldPower(on: boolean): void;
  /** Plugin (owner, 2026-11-16, CHG-0025): the switch's mode, 0 off · 1 on · 2 host (the DAW's transport powers it). */
  setPowerMode?(mode: 0 | 1 | 2): void;
  /** Sampler block: pick and decode a local audio file (never uploaded). */
  loadSample(id: number): void;
  /** v1 SoundcloudPanel search, on Freesound (DATA-0005): sounds of at most `maxSeconds`. */
  searchSamples(query: string, maxSeconds: number): Promise<FreesoundSound[]>;
  /** v1 LoadTrack: fetch and use a Freesound sound in a sampler block. */
  loadFreesound(
    id: number,
    sound: FreesoundSound,
    display: { trackName: string; user: string; permalink: string },
  ): void;
  /** The patch tempo (web; the plugin follows the host): SIMULATION-0003, CHG-0004 3.5. */
  tempo(): number;
  setTempo(bpm: number): void;
  /** A text param (not sent to the engine): e.g. the MIDI Input's device name (CHG-0004). */
  setText(id: number, key: string, value: string): void;
  /** Reverse a sampler, mirroring its region (owner review 2026-11-07). */
  reverseSample(id: number, on: boolean): void;
  /** Any sampler using the user's own file: the share link won't carry it (SPEC-SHARING-BACKEND R14). */
  hasLocalFiles(): boolean;
  /** v1 MainSceneDragger moved the stage (pan, or Jump when the options panel opens). */
  setDrag(drag: { x: number; y: number }): void;
  /** v1 MainScene.ResetScene (CreateNew ✓): delete every block, drop the session (URL, share link). */
  resetScene(): void;
  /** v1 SAVE ("overwrite") / SAVE_AS ("generate link", "create new"): the share id to show (a server id, or a
   * `p…` patch token when there is no backend). Updates App.CompositionId / App.SessionId as v1's handlers did. */
  share(mode: 'save' | 'saveAs', title: string, gallery?: boolean): Promise<string>;
  /** v1 Recorder.ToggleRecording / DownloadRecording; SampleGen "generate". */
  toggleRecording(id: number): void;
  downloadRecording(id: number): void;
  generateSample(id: number): void;
  /** SampleGen's SOUND slider (CHG-0035): keep the number; `make`: make its wave (the slider was let go). */
  setSound(id: number, n: number, make: boolean): void;
  themes(): readonly Theme[];
  /** A Stage block's panel buttons (CHG-0021): look inside it; fill it from a patch file. */
  openStage(id: number): void;
  /** A Counter's Reset button (CHG-0015): back to step 1. */
  resetCounter(id: number): void;
  /** Ids of the blocks connected to block `id` (the engine's proximity connections). */
  connectedIds(id: number): number[];
  /** An LFO's target (AUDIO-0003): which block and param it moves, or null. */
  targetOf(id: number): { id: number; param: string } | null;
  setTarget(id: number, target: { id: number; param: string } | null): void;
}
