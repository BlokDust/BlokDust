// v2's stand-in for v1's MainScene, for the UI layer only (CHG-0002 1.8–1.10): it owns the ported v1 panels, draws
// them in v1's display-list order onto the stage's static Canvas2D layer, and routes pointer input in v1's order
// (MainScene._PointerDown/_PointerUp/_PointerMove). Blocks, connections and audio stay in the engine (ARCHITECTURE-0002):
// the panels talk to the app through SceneHost.
import type { Theme } from '../generated/palettes.gen.ts';
import { App, Dimensions, Point, Size, TWEEN } from './shim.ts';
import { V1Block } from './blocks.ts';
import { installFilterPanel } from './filterPanel.ts';
import { installSelectors } from './selectorOption.ts';
import { installButtonPairs } from './buttonPair.ts';
import { drawNewSprite, drawPrismExits, followLfos, hasLiveRows, installLiveRows, installNewBlockMenu } from './newBlocks.ts';
import { installTouchpad } from './touchpadPanel.ts';
import { installWaveZoom, panelView } from './waveZoom.ts';
import { Metrics } from './ported/Metrics';
import { CreateNew } from './ported/UI/CreateNew';
import { Header } from './ported/UI/Header';
import { OptionsPanel } from './ported/UI/OptionsPanel';
import { SettingsPanel } from './ported/UI/SettingsPanel';
import { SharePanel } from './ported/UI/SharePanel';
import { ToolTip } from './ported/UI/ToolTip';
import { TrashCan } from './ported/UI/TrashCan';
import { ZoomButtons } from './ported/UI/ZoomButtons';
import { StageDragger } from './ported/UI/StageDragger';
import { BlockSprites } from './ported/Blocks/BlockSprites';
import { RecorderPanel } from './ported/UI/RecorderPanel';
import { SoundcloudPanel } from './ported/UI/SoundcloudPanel';
import { AnimationsLayer } from './ported/UI/AnimationsLayer';
import { Splash } from './ported/Splash';
import RELEASES from '../releases.json';
import { OptionSample } from './ported/UI/Options/OptionSample';
import { Slider } from './ported/UI/Options/OptionSlider';
import type { FreesoundSound } from '../patch/samples.ts';
import { PatchesPanel, drawUploadLink, type PatchesHost } from './patches.ts';
import { AccountPage } from './accountPage.ts';

export interface SceneHost extends PatchesHost {
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
  /** Sampler block: pick and decode a local audio file (never uploaded). */
  loadSample(id: number): void;
  /** v1 SoundcloudPanel search, on Freesound (DATA-0005): sounds of at most `maxSeconds`. */
  searchSamples(query: string, maxSeconds: number): Promise<FreesoundSound[]>;
  /** v1 LoadTrack: fetch and use a Freesound sound in a sampler block. */
  loadFreesound(id: number, sound: FreesoundSound, display: { trackName: string; user: string; permalink: string }): void;
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
  themes(): readonly Theme[];
  /** A Stage block's panel buttons (CHG-0021): look inside it; fill it from a patch file. */
  openStage(id: number): void;
  loadStagePatch(id: number): void;
  /** Ids of the blocks connected to block `id` (the engine's proximity connections). */
  connectedIds(id: number): number[];
  /** An LFO's target (AUDIO-0003): which block and param it moves, or null. */
  targetOf(id: number): { id: number; param: string } | null;
  setTarget(id: number, target: { id: number; param: string } | null): void;
}


/** The Share panel's warning (v1 l10n UI.SharePanel.SaveWarning, reworded: SoundCloud is gone; local files added). */
export const SAVE_WARNING = "Note: Recorder recordings and your own audio samples aren't saved in the link. " +
  'To share audio, download a recording from its options panel or use samples from Freesound.';  // owner, PR #1 review 2026-11-12

const stub = { Open: false, SplashOpen: false, Hover: false, MouseDown() {}, MouseUp() {}, MouseMove() {}, CheckLaunch() {}, OpenSplash() {}, Jump() {} };

export class V1Scene {
  Ctx!: CanvasRenderingContext2D;
  Width = 0; Height = 0;
  IsDraggingABlock = false;
  SelectedBlock: V1Block | null = null;
  readonly Metrics = new Metrics();
  readonly ToolTip = new ToolTip();
  readonly ZoomButtons = new ZoomButtons();
  readonly TrashCan = new TrashCan();
  readonly OptionsPanel = new OptionsPanel();
  readonly Header = new Header();
  readonly CreateNew = new CreateNew();
  readonly SharePanel = new SharePanel();
  readonly SettingsPanel = new SettingsPanel();
  readonly MainSceneDragger = new StageDragger();
  readonly RecorderPanel = new RecorderPanel();
  /** v1's loading animation (a spinning diamond in a bubble beside a loading block; also the Share/search spinners). */
  readonly AnimationsLayer = new AnimationsLayer();
  readonly Tutorial = stub; readonly MessagePanel = stub;
  /** v1's sample search panel, ported verbatim, searching Freesound (DATA-0005, SPEC-SHARING-BACKEND R15). */
  readonly SoundcloudPanel = new SoundcloudPanel();
  /** Patches (CHG-0005): opened from the header's Share slot, which reads PATCHES. */
  readonly PatchesPanel: PatchesPanel;
  private pointer = new Point();
  private initialised = false;
  private optionTimeout = false;

  constructor(readonly host: SceneHost) {
    this.PatchesPanel = new PatchesPanel(host);
    // v1 App.CreateSubCanvas(0): the options panel renders off-screen, then OptionsPanel.Draw composites it.
    // Attached to the page like v1's (App.CreateSubCanvas appends it to body): canvas text then gets the page's
    // -webkit-font-smoothing, as in v1. Kept out of view and out of the way of input.
    const sub = document.createElement('canvas');
    sub.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(sub);
    App.SubCanvas = [sub];
    ensureShareDom();
    // v1 SharePanel.GetWarning warned about Recorder blocks (their audio is not saved). v2 also warns about samples
    // from the user's own files (DATA-0005: never uploaded, so the link can't carry them). v1's text pointed at
    // SoundCloud, which is gone.
    const share = this.SharePanel as any, getWarning = share.GetWarning.bind(share);
    share.GetWarning = () => {
      getWarning();
      if (this.host.hasLocalFiles()) share._Warning = true;
      if (share._Warning) App.L10n.UI.SharePanel.SaveWarning = SAVE_WARNING;
    };
  }

  /** Zoom/drag followed every frame (no re-layout). */
  setView(zoom: number, drag: { x: number; y: number }): void {
    App.ZoomLevel = zoom; this.lastZoom = zoom; App.DragOffset.x = drag.x; App.DragOffset.y = drag.y; this.lastDrag = { x: drag.x, y: drag.y };
    this.Metrics.UpdateGridScale();
  }
  /** The block list changed (v1 calls CreateNew.CheckState after create/delete/load). */
  setBlocks(blocks: V1Block[]): void { App.Blocks = blocks; if (this.initialised && !this.resetting) this.CreateNew.CheckState(); }
  /** Inside ResetScene: v1 DeleteAllBlocks then one _Invalidate, so CreateNew checks its state once. Checking per
   * deleted block stopped the panel's close tweens half-way (owner, 2026-11-08). */
  private resetting = false;

  /** Bind to the stage canvas and sizes: on init and on every resize/theme change (v1 Metrics.Compute + Resize). */
  sync(ctx: CanvasRenderingContext2D, theme: Theme, zoom: number, drag: { x: number; y: number }, blocks: V1Block[]): void {
    this.Ctx = ctx;
    App.Canvas.Ctx = ctx;
    App.MainScene = this; App.Stage = { MainScene: this };
    App.Metrics = this.Metrics;
    App.Palette = theme.colors;
    App.ThemeManager.Txt = theme.roles.txt; App.ThemeManager.MenuOrder = theme.roles.menu; App.ThemeManager.OptionsOrder = theme.roles.options;
    App.ThemeManager.CurrentThemeNo = theme.index; App.ThemeManager.CurrentTheme = { Name: theme.name };
    App.ThemeManager.Themes = this.host.themes().map(t => ({ Name: t.name }));
    App.ThemeManager.LoadTheme = (n: number) => this.host.setTheme(n);
    App.ZoomLevel = zoom; this.lastZoom = zoom; App.DragOffset.x = drag.x; App.DragOffset.y = drag.y;
    App.Blocks = blocks;
    App.CommandManager = { ExecuteCommand: (c: unknown) => this.command(c) };
    App.Audio.Master.volume.onMaster = (db: number) => this.host.setMasterDb(db);
    // v1 ThemeManager: the share text fields take the theme's text colour.
    for (const id of ['shareUrl', 'shareTitle', 'soundCloudSearch', 'patchTitle', 'patchUrl', 'accountHandle', 'gallerySearch']) document.getElementById(id)!.style.color = theme.colors[theme.roles.txt];
    App.BlockSprites = { DrawSprite: (dc: any, pos: Point, scaled: boolean, name: string) => this.drawSprite(dc.Ctx ?? dc, pos, scaled, name) };
    App.AnimationsLayer = this.AnimationsLayer;
    if (!this.initialised) {
      // v1 order: panels are created before Metrics.Compute (App.Width is 0, so their Resize() bails out), then the
      // first resize lays them out.
      this.initialised = true;
      installNewBlockMenu();  // the post-2.0 blocks join v1's menu before the header reads it (SCOPE-0005)
      App.Width = 0; App.Height = 0;
      for (const o of [this.ToolTip, this.AnimationsLayer, this.RecorderPanel, this.ZoomButtons, this.MainSceneDragger, this.TrashCan, this.OptionsPanel, this.Header, this.CreateNew, this.SharePanel, this.SettingsPanel, this.SoundcloudPanel, this.PatchesPanel]) o.Init(this);
      relabelShareButton(this.Header);
      // The header's Share slot opens Patches (CREATE SHARE LINK is in its SAVE tab, owner 2026-11-10).
      (this.SharePanel as any).OpenPanel = () => this.PatchesPanel.OpenPanel();
      release1Settings(this.SettingsPanel, this.host);
      installFilterPanel(this.OptionsPanel);
      cancellableOpen(this.OptionsPanel);
      installSelectors(this.OptionsPanel);
      installButtonPairs(this.OptionsPanel);
      installLiveRows(this.OptionsPanel);
      installTouchpad(this.OptionsPanel);  // it lays the Touchpad's rows out again after the others adapt them
      installWaveZoom(this.OptionsPanel);  // outermost: it narrows the form the others are given (waveZoom.ts)
      locateMissingFiles(this);
    }
    this.Metrics.Compute();
    this.Width = App.Width; this.Height = App.Height;
    for (const o of [this.ZoomButtons, this.TrashCan, this.OptionsPanel, this.Header, this.CreateNew, this.SharePanel, this.SettingsPanel, this.SoundcloudPanel, this.PatchesPanel]) o.Resize?.();
    // v1 MainScene.Resize
    this.OptionsPanel.Close();
    this.Header.Populate(this.Header.MenuJson);
    this.SettingsPanel.Populate(this.SettingsPanel.MenuJson);
    this.CreateNew.CheckState();  // v1 calls it whenever the block list changes (icon + logo margin when > 1 block)
  }

  /** Advance tweens; true while anything animates (the stage then redraws every frame). */
  update(nowMs: number): boolean {
    const animating = TWEEN.update(nowMs);
    // The open panel's block is loading (AnimationsLayer list): keep redrawing it so its loading square spins.
    if (this.OptionsPanel.Scale > 0 && this.AnimationsLayer.ActiveBlocks.includes(this.OptionsPanel.SelectedBlock)) this.OptionsPanel.Animating = true;
    for (const o of [this.ToolTip, this.AnimationsLayer, this.RecorderPanel, this.ZoomButtons, this.OptionsPanel, this.Header, this.CreateNew, this.SharePanel, this.SettingsPanel, this.SoundcloudPanel, this.PatchesPanel]) { o.LastVisualTick = nowMs; o.Update?.(); }
    this.MainSceneDragger.LastVisualTick = nowMs;
    this.MainSceneDragger.Update();
    if (Math.abs(App.ZoomLevel - this.lastZoom) > 1e-9) { this.lastZoom = App.ZoomLevel; this.host.setZoom(App.ZoomLevel); }
    const d = App.DragOffset, easing = Math.round(d.x) !== Math.round(this.MainSceneDragger.Destination.x) || Math.round(d.y) !== Math.round(this.MainSceneDragger.Destination.y);
    if (d.x !== this.lastDrag.x || d.y !== this.lastDrag.y) { this.lastDrag = { x: d.x, y: d.y }; this.host.setDrag({ x: d.x, y: d.y }); }
    // Spinners (AnimationsLayer: loading blocks, Share "saving…", sample search) animate every frame while shown.
    const spinning = this.AnimationsLayer.ActiveBlocks.length > 0 || (this.OptionsPanel.Scale === 1 && !!(this.OptionsPanel as any).Animating) || !!(this.SharePanel as any)._Saving || (this.SoundcloudPanel.Open && !!(this.OptionsPanel.SelectedBlock as any)?.Searching) || (this.PatchesPanel.Open && this.PatchesPanel.animating)
      || (this.SettingsPanel.Open && !!(this.SettingsPanel as any).accountPage?.animating);
    // Playback lines move every frame while shown (and once more to clear them when playback stops).
    const playing = this.playheadsShown || !!this.playheadLines();
    // Live rows (a Compressor's meter, …) follow the engine: the panel is redrawn every frame while one shows.
    const live = followLfos(this.OptionsPanel) || hasLiveRows(this.OptionsPanel);
    if (live) (this.OptionsPanel as any)._DrawReady = true;
    return animating || easing || spinning || playing || live || this.splashDrawing;
  }
  private lastZoom = 1;
  private lastDrag = { x: 0, y: 0 };

  /** Off in the visual harness (its stage draws the Recorder's baked idle overlay). */
  drawRecorderPanel = true;
  /** v1 MainScene display list, from the ToolTip upward (blocks/lines/beams are drawn by the stage before this). */
  draw(): void {
    for (const o of [this.ToolTip, this.AnimationsLayer, ...(this.drawRecorderPanel ? [this.RecorderPanel] : []), this.ZoomButtons, this.MainSceneDragger, this.TrashCan, this.OptionsPanel, this.Header, this.CreateNew, this.SharePanel, this.SettingsPanel, this.SoundcloudPanel, this.PatchesPanel]) {
      if (o === this.OptionsPanel) drawPrismExits(this.Ctx, this.OptionsPanel);  // under the panel, over the stage
      this.Ctx.save();
      o.Draw();
      this.Ctx.restore();
      if (o === this.OptionsPanel) this.drawPlayheads();
      if (o === this.TrashCan) { this.Ctx.save(); this.drawPower(); this.Ctx.restore(); }
    }
    if (this.SoundcloudPanel.Open) { this.Ctx.save(); this.drawFileButton(); this.Ctx.restore(); }
    if (this.splash && !this.splash.IsTransitionFinished) { this.Ctx.save(); this.splash.FrameCount++; this.splash.Draw(); this.Ctx.restore(); }
    this.Ctx.globalAlpha = 1;
  }

  // ---- v1's Splash (owner, 2026-11-11), ported verbatim: the start button (v1 showed it on iOS; v2 everywhere, as a
  // click must start the audio), then on START its intro (panels sliding to BLOKDUST) and the stage revealed. ----
  private splash: Splash | null = null;
  /** Show the start button (web app only: not the plugin, embeds or the visual harness). */
  showSplash(): void {
    const s = new Splash();
    s.Init(this);
    this.splash = s;
  }
  /** START pressed: v1 Splash.StartButtonPressed (its audio unlock is v2's click). `done` once the stage shows. */
  startSplash(done: () => void): void {
    const s = this.splash;
    if (!s) { done(); return; }
    let finished = false;
    this.splashDone = () => { if (finished) return; finished = true; done(); };
    s.AnimationFinished.on(() => { if (finished) return; s.TransitionOut(); this.splashDone!(); });
    const before = new Set(TWEEN.getAll());
    s.StartButtonPressed();
    this.splashTweens = TWEEN.getAll().filter(t => !before.has(t));
    if (this.skipRequested) this.skipSplash();
  }
  private splashDone: (() => void) | null = null;
  private splashTweens: ReturnType<typeof TWEEN.getAll> = [];
  private skipRequested = false;
  /** A click or touch during the intro skips it (owner, PR #1 review 2026-11-12): its tweens stop, the splash is
   * cleared and `done` runs now. Before the intro has begun (START pressed, engine still starting) it skips as soon
   * as the intro starts. v1's pending timers find the splash finished and do nothing more. */
  skipSplash(): void {
    const s = this.splash;
    if (!s || s.IsTransitionFinished) return;
    if (!this.splashDone) { this.skipRequested = true; return; }
    for (const t of this.splashTweens) t.stop();
    this.splashTweens = [];
    s.IsAnimationFinished = true;
    s.IsTransitionFinished = true;
    this.splashDone();
  }
  /** v1 MainScene.Begin (Splash calls it on START: v1 faded its audio in there; v2's starts in the click). */
  Begin(): void {}
  /** True while the splash still covers the stage (input waits, as v1 MainScene._PointerDown). */
  get splashing(): boolean { return !!this.splash && !this.splash.IsAnimationFinished; }
  /** True while the splash still draws (the loop keeps redrawing). */
  get splashDrawing(): boolean { return !!this.splash && !this.splash.IsTransitionFinished; }

  // ---- input, in v1 MainScene order (device px) ----
  /** Returns true when the UI took the press (the stage must not start a block/stage drag). */
  pointerDown(x: number, y: number, blockAt: () => V1Block | null): boolean {
    const p = new Point(x, y);
    this.pointer = p;
    if (this.ToolTip.Open) this.toolTipClose();
    if (this.SharePanel.Open) { this.SharePanel.MouseDown(p); return true; }
    if (this.SettingsPanel.Open) { this.SettingsPanel.MouseDown(p); return true; }
    if (this.PatchesPanel.Open) { this.PatchesPanel.MouseDown(p); return true; }
    if (this.SoundcloudPanel.Open) {
      if (this.fileButtonHit(p)) { const b = this.OptionsPanel.SelectedBlock; this.SoundcloudPanel.ClosePanel(); if (b) this.host.loadSample(b.Id); return true; }
      this.SoundcloudPanel.MouseDown(p); return true;
    }
    this.CreateNew.MouseDown(p); if (this.CreateNew.Hover) return true;
    this.Header.MouseDown(p); if (this.Header.MenuOver) return true;
    this.ZoomButtons.MouseDown(p); if (this.ZoomButtons.InRoll || this.ZoomButtons.OutRoll) return true;
    if (this.powerHit(p)) { this.setWorldPower(!this.worldPower); return true; }
    if (this.OptionsPanel.Scale === 1) { this.OptionsPanel.MouseDown(p.x, p.y); if (this.OptionsPanel.Hover) return true; }
    this.RecorderPanel.MouseDown(p); if (this.RecorderPanel.Hover) return true;
    const hit = blockAt();
    if (hit) {
      this.select(hit);
      hit.IsPressed = true;
      this.IsDraggingABlock = true;
      this.optionTimeout = true;
      setTimeout(() => { this.optionTimeout = false; }, App.Config.SingleClickTime);
      return false;
    }
    this.OptionsPanel.Close();
    this.MainSceneDragger.MouseDown(p);  // v1: no block hit → drag the stage
    return false;
  }

  /** Returns 'delete' when a dragged block was dropped on the trash can. */
  pointerUp(x: number, y: number, moved: boolean): 'delete' | null {
    const p = new Point(x, y);
    let result: 'delete' | null = null;
    // Where the pointer is now, not where it last moved: a finger lifts and lands elsewhere with no move between, so
    // after one drop on the trash the next tap "ended over the trash" too (owner, 2026-11-08, mobile).
    this.TrashCan.MouseMove(p);
    if (this.IsDraggingABlock && this.TrashCan.MouseUp?.()) result = 'delete';
    this.IsDraggingABlock = false;
    if (!result && this.SelectedBlock) {
      this.SelectedBlock.IsPressed = false;
      if (this.optionTimeout && !moved) this.OptionsPanel.Open(this.SelectedBlock);
    }
    if (this.SharePanel.Open) this.SharePanel.MouseUp(p);
    else if (this.SettingsPanel.Open) this.SettingsPanel.MouseUp(p);
    else if (this.SoundcloudPanel.Open) this.SoundcloudPanel.MouseUp(p);
    else if (this.PatchesPanel.Open) this.PatchesPanel.MouseUp();
    else { this.Header.MouseUp(); if (this.OptionsPanel.Scale === 1) this.OptionsPanel.MouseUp(); this.MainSceneDragger.MouseUp(); }
    return result;
  }

  pointerMove(x: number, y: number, pointerDown: boolean, hover: () => V1Block | null, blockMoved: boolean): void {
    const p = new Point(x, y);
    this.pointer = p;
    this.checkHover(p, pointerDown, hover);
    if (blockMoved && this.IsDraggingABlock && this.OptionsPanel.Scale === 1) this.OptionsPanel.Close();
    if (this.OptionsPanel.Scale === 1) this.OptionsPanel.MouseMove(p.x, p.y);
    if (this.SharePanel.Open) this.SharePanel.MouseMove(p);
    if (this.SettingsPanel.Open) this.SettingsPanel.MouseMove(p);
    if (this.SoundcloudPanel.Open) this.SoundcloudPanel.MouseMove(p);
    if (this.PatchesPanel.Open) this.PatchesPanel.MouseMove(p);
    this.Header.MouseMove(p);
    this.CreateNew.MouseMove(p);
    this.ZoomButtons.MouseMove(p);
    this.TrashCan.MouseMove(p);
    this.RecorderPanel.MouseMove(p);
    this.MainSceneDragger.MouseMove(p);
    this.powerHover = this.powerHit(p);
  }

  // ---- the power switch (owner, 2026-11-11; not in v1) ----
  worldPower = true;
  private powerHover = false;
  setWorldPower(on: boolean): void { this.worldPower = on; this.host.setWorldPower(on); }
  /** Bottom centre, between the zoom buttons and the trash: v1's off/on switch (OptionSwitch, "offOn"), at its own size
   * (a 60u options row, 60u wide). Its dash and diamond sit level with +, − and the trash (30u up, v1 ZoomButtons and
   * TrashCan); the label goes above it, where v1's zoom shows its percentage (50u up), as below would meet the edge. */
  private powerRect() { const u = App.Unit, w = 60 * u, h = 60 * u; return { x: App.Width * 0.5 - w * 0.5, y: App.Height - 30 * u - h * 0.35, w, h }; }
  private powerHit(p: { x: number; y: number }): boolean {
    if (this.SharePanel.Open || this.SettingsPanel.Open || this.SoundcloudPanel.Open || this.PatchesPanel.Open) return false;
    const u = App.Unit, r = this.powerRect(); return Dimensions.hitRect(r.x, App.Height - 66 * u, r.w, 66 * u, p.x, p.y);
  }
  /**
   * v1 OptionSwitch (style 1, "offOn"), its proportions unchanged: a divider from 0.15h to 0.55h, the dash (off) and
   * diamond (on) at 0.35h, the lit side underlined at 0.55h. The label: POWER; when off, POWER OFF on v1's red
   * (SAVE-coloured) fill, so a stopped world is never mistaken for a broken one. Space toggles it too.
   */
  private drawPower(): void {
    const ctx = this.Ctx, u = App.Unit, { x, y, w, h } = this.powerRect(), on = this.worldPower, menu = App.ThemeManager.MenuOrder;
    const txt = App.Palette[App.ThemeManager.Txt], cy = y + h * 0.35, lx = x + w * 0.25, rx = x + w * 0.75;
    App.StrokeColor(ctx, App.Palette[1]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.round(x + w * 0.5), y + h * 0.15); ctx.lineTo(Math.round(x + w * 0.5), y + h * 0.55); ctx.stroke();
    App.FillColor(ctx, App.Palette[on ? menu[2] : menu[3]]);
    ctx.fillRect(on ? x + w * 0.5 : x, y + h * 0.55, w * 0.5, h * 0.05 + (this.powerHover ? u : 0));
    ctx.lineWidth = 2; App.StrokeColor(ctx, txt);
    ctx.beginPath();
    ctx.moveTo(lx - 5 * u, cy); ctx.lineTo(lx + 5 * u, cy);
    ctx.moveTo(rx + 5 * u, cy); ctx.lineTo(rx, cy - 5 * u); ctx.lineTo(rx - 5 * u, cy); ctx.lineTo(rx, cy + 5 * u); ctx.lineTo(rx + 5 * u, cy);
    ctx.stroke(); ctx.lineWidth = 1;
    ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'center';
    const label = on ? 'POWER' : 'POWER OFF';
    let base = App.Height - 50 * u;
    if (!on) {
      const m = ctx.measureText(label), boxY = base - 11 * u, boxH = 15 * u;
      App.FillColor(ctx, App.Palette[menu[3]]);
      ctx.fillRect(x + w * 0.5 - m.width * 0.5 - 6 * u, boxY, m.width + 12 * u, boxH);
      // The letters sit in the middle of the red (owner, 2026-11-13: they sat a pixel or two high).
      base = boxY + boxH * 0.5 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * 0.5;
    }
    App.FillColor(ctx, txt);
    ctx.fillText(label, x + w * 0.5, base);
  }

  /** A mouse wheel over the UI: the gallery's list scrolls (owner review 2); elsewhere v1's zoom buttons take it. */
  wheel(e: WheelEvent): void { if (this.PatchesPanel.Open) { this.PatchesPanel.Wheel(e); return; } this.ZoomButtons.MouseWheel(e); }

  // ---- multi-touch (CHG-0005 task 8; not in v1, which took one pointer) ----
  /** Is (x, y) device px on the UI (an open panel, the header with its open menu, the options panel)? Another finger
   * there doesn't grab the block underneath. */
  uiAt(x: number, y: number): boolean {
    if (this.SharePanel.Open || this.SettingsPanel.Open || this.PatchesPanel.Open || this.SoundcloudPanel.Open) return true;
    const h = this.Header as any, u = App.Unit;
    if (y < (h.Height * (h.Rows ?? 1) + (h.DropDown ?? 0)) * u) return true;
    return this.OptionsPanel.Scale === 1 && !!(this.OptionsPanel as any).OutlineTest(new Point(x, y));
  }
  /** Is (x, y) device px on the open options panel? (A trackpad pinch there never zooms the stage.) */
  optionsPanelAt(x: number, y: number): boolean {
    return this.OptionsPanel.Scale === 1 && !!(this.OptionsPanel as any).OutlineTest(new Point(x, y));
  }
  /** A second finger turned a stage drag into a pinch: the first finger stops dragging the stage. */
  endStageDrag(): void { this.MainSceneDragger.MouseUp(); }
  /** The open options panel's slider row under (x, y) device px (v1 OptionsPanel.RolloverCheck's rect), or -1. */
  sliderIndexAt(x: number, y: number): number {
    const o = this.OptionsPanel as any, u = App.Unit;
    if (o.Scale !== 1 || !o.SelectedBlock) return -1;
    return (o.Options ?? []).findIndex((opt: any) => (opt.Type === 'slider' || opt.Type === 'waveslider')
      && Dimensions.hitRect(o.Position.x + o.Margin - 10 * u, o.Position.y + opt.Position.y, o.Range + 20 * u, opt.Size.height, x, y));
  }
  /** Another finger drags slider `i` (v1 OptionsPanel.SliderSet). It is not marked Selected: v1 moves every selected
   * slider to the first finger. */
  setSlider(i: number, x: number): void {
    const o = this.OptionsPanel as any;
    if (o.Scale === 1 && o.Options?.[i]) o.SliderSet(i, x);
  }
  /** Pinch zoom: the view follows the fingers; the zoom readout shows as with v1's zoom buttons. */
  pinchView(zoom: number, drag: { x: number; y: number }): void {
    const z = this.ZoomButtons as any;
    z.StopAllTweens?.(); this.MainSceneDragger.StopAllTweens();
    z.ZoomAlpha = 1;
    this.MainSceneDragger.Destination.x = drag.x; this.MainSceneDragger.Destination.y = drag.y;
    this.setView(zoom, drag);
  }
  /** Fingers lifted: the zoom buttons step on from the nearest of v1's levels; the readout fades as after a step. */
  pinchEnd(): void {
    const z = this.ZoomButtons as any, slots: number[] = z._ZoomSlots ?? [0.25, 0.5, 1, 2, 4];
    let best = 0;
    slots.forEach((s, i) => { if (Math.abs(Math.log(s / App.ZoomLevel)) < Math.abs(Math.log(slots[best] / App.ZoomLevel))) best = i; });
    z.CurrentSlot = best;
    z.DelayTo?.(z, 0, 500, 700, 'ZoomAlpha');
  }

  /** The slider row of the open options panel under (x, y) device px, using v1 OptionsPanel.HitTests' row rect. */
  sliderAt(x: number, y: number): { block: V1Block; setting: string; name: string } | null {
    const o = this.OptionsPanel, u = App.Unit;
    if (o.Scale !== 1 || !o.SelectedBlock) return null;
    for (const opt of o.Options ?? []) {
      if (opt.Type !== 'slider') continue;
      const rx = o.Position.x + o.Margin - 10 * u, ry = o.Position.y + opt.Position.y;
      if (x > rx && x < rx + o.Range + 20 * u && y > ry && y < ry + opt.Size.height) return { block: o.SelectedBlock, setting: opt.Setting, name: opt.Name };
    }
    // The Filter's graph (CHG-0010) stands in for its Frequency and Gain sliders: the handle is Gain, the width bar
    // Width, anywhere else on the graph Frequency (the menu's title names which).
    const g = (o.SelectedBlock as any).def?.id === 'fx.filter' ? o.Options?.find((q: any) => q.Type === 'parametric') : null;
    if (g) {
      const rx = o.Position.x + o.Margin - 10 * u, ry = o.Position.y + g.Position.y;
      if (x > rx && x < rx + o.Range + 20 * u && y > ry && y < ry + g.Size.height) {
        o.RolloverCheck(x, y);
        if (g.HandleRoll[1]) return { block: o.SelectedBlock, setting: 'gain', name: 'Gain' };
        if (g.SubHandleRoll[1]) return { block: o.SelectedBlock, setting: 'Q', name: 'Width' };
        return { block: o.SelectedBlock, setting: 'frequency', name: 'Frequency' };
      }
    }
    return null;
  }
  /**
   * Where each sampler is playing (owner, Phase 3 review; not in v1): the engine's playheads, packed
   * [blockId, seconds]*. While a block's options are open, its waveform shows a thin line per sounding voice (one per
   * grain for Granular).
   */
  private playheads = new Map<number, number[]>();
  private playheadsShown = false;
  setPlayheads(packed: Float32Array): void {
    this.playheads.clear();
    for (let i = 0; i + 1 < packed.length; i += 2) {
      const id = packed[i], list = this.playheads.get(id);
      if (list) list.push(packed[i + 1]); else this.playheads.set(id, [packed[i + 1]]);
    }
  }
  /** The open panel's playheads as fractions of its waveform's width, and the waveform's rect (panel coordinates). */
  playheadLines(): { xs: number[]; x: number; y: number; width: number; height: number } | null {
    const o = this.OptionsPanel as any, v = o.SelectedBlock as V1Block | null;
    if (!v || o.Scale !== 1) return null;
    const secs = this.playheads.get(v.Id);
    const w = (o.Options ?? []).find((q: any) => q.Type === 'waveregion' || q.Type === 'waveslider' || q.Type === 'waveimage');
    const dur = v.GetDuration();
    if (!secs?.length || !w || !(dur > 0) || !(w.Waveform?.length > 0)) return null;
    // A zoomed waveform (waveZoom.ts) shows only the playheads inside its window.
    const view = panelView(o) ?? { f0: 0, f1: 1 };
    const xs = secs.map(t => Math.max(0, Math.min(1, t / dur))).map(f => (f - view.f0) / (view.f1 - view.f0)).filter(f => f >= 0 && f <= 1);
    return { xs, x: o.Margin, y: w.Position.y, width: o.Range, height: w.Size.height };
  }
  private drawPlayheads(): void {
    const l = this.playheadLines();
    this.playheadsShown = !!l;
    if (!l) return;
    const o = this.OptionsPanel as any, ctx = this.Ctx, u = App.Unit;
    ctx.save();
    ctx.setTransform(o.Scale, 0, 0, o.Scale, o.Position.x, o.Position.y);
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(1, u);
    ctx.beginPath();
    for (const f of l.xs) { const x = Math.round(l.x + f * l.width) + 0.5; ctx.moveTo(x, l.y); ctx.lineTo(x, l.y + l.height); }
    ctx.stroke();
    ctx.restore();
  }

  /** v1 Audio.Monitor: Tone.Meter dB of the master output (here the engine snapshot's RMS), with its peak hold. */
  setLevelDb(db: number): void {
    App.Audio.Level = db;
    if (db > App.Audio.Peak) App.Audio.Peak = db;
  }

  get uiBusy(): boolean {
    const z = this.ZoomButtons, o = this.OptionsPanel;
    return this.powerHover || z.InRoll || z.OutRoll || this.RecorderPanel.Hover || this.Header.MenuOver || this.SharePanel.Open || this.SettingsPanel.Open || this.SoundcloudPanel.Open || this.PatchesPanel.Open || this.CreateNew.Hover || (o.Scale === 1 && o.Hover);
  }

  /** v1 CommandManager commands the panels issue: SAVE / SAVE_AS go to the sharing backend (CHG-0003); the Share
   * panel then shows the id exactly as v1 showed a saved composition id. */
  private command(c: unknown): void {
    const name = ((c as { value?: string })?.value ?? String(c)).toLowerCase();  // v1 StringValue lowercases
    if (name === 'save' || name === 'saveas') {
      void this.host.share(name === 'save' ? 'save' : 'saveAs', this.SharePanel.SessionTitle ?? '').then(id => this.SharePanel.ReturnLink(id));
    }
  }

  // ---- v1 MainScene API the ported panels call ----
  CreateBlockFromType(v1Type: string): void {
    const g = this.Metrics.CursorToGrid(this.pointer);
    const id = this.host.createBlock(v1Type, g.x, g.y);
    if (id === null) return;
    this.IsDraggingABlock = true;
    this.pendingSelect = id;
  }
  pendingSelect: number | null = null;
  /** Web MIDI inputs (MIDI Input block's device option, CHG-0004). */
  midiDevices: { id: string; name: string }[] = [];
  setMidiDevices(list: { id: string; name: string }[]): void { this.midiDevices = list; this.OptionsPanel.SelectedBlock?.RefreshOptionsPanel?.(); }
  DeleteSelectedBlock(): void { if (this.SelectedBlock) this.host.deleteBlock(this.SelectedBlock.Id); this.select(null); this.OptionsPanel.Close(); }
  /** v1 MainScene.ResetScene: delete all blocks, reset zoom and drag, close the options panel, reset the session. */
  ResetScene(): void {
    this.resetting = true;
    try { this.host.resetScene(); } finally { this.resetting = false; }
    this.CreateNew.CheckState();
    this.select(null);
    App.DragOffset.x = 0; App.DragOffset.y = 0;
    this.ZoomButtons.CurrentSlot = 2;
    this.MainSceneDragger.Destination = new Point(0, 0);
    App.ZoomLevel = 1;
    this.Metrics.UpdateGridScale();
    this.OptionsPanel.Close();
    App.CompositionId = null; App.SessionId = null;
    this.SharePanel.Reset();
    this.PatchesPanel.setTitle('');  // a new scene gets a new title
  }
  setParam(block: V1Block, key: string, value: number): void { this.host.setParam(block.Id, key, value); }

  select(b: V1Block | null): void {
    if (this.SelectedBlock) this.SelectedBlock.IsSelected = false;
    this.SelectedBlock = b;
    if (b) b.IsSelected = true;
  }

  private checkHover(p: Point, pointerDown: boolean, hover: () => V1Block | null): void {
    const t = this.ToolTip, o = this.OptionsPanel;
    let panelCheck = false, over: V1Block | null = null;
    if (o.Scale === 1) panelCheck = p.x > o.Position.x && p.x < o.Position.x + o.Size.width && p.y > o.Position.y - o.Size.height * 0.5 && p.y < o.Position.y + o.Size.height * 0.5;
    if (!panelCheck && !pointerDown) over = hover();
    if (over) {
      t.Name = over.BlockName;
      const pos = this.Metrics.PointOnGrid(over.Position);
      t.Position.x = pos.x; t.Position.y = pos.y;
    }
    if (over && !t.Open && !o.Opening) {
      t.Open = true;
      if (t.Alpha > 0) t.AlphaTo(t, 100, 600);
      else this.toolTipTimer = setTimeout(() => { if (t.Alpha === 0) t.AlphaTo(t, 100, 600); }, 550);
    }
    if (!over && t.Open) this.toolTipClose();
  }
  private toolTipTimer: any;
  ToolTipClose(): void { this.toolTipClose(); }
  private toolTipClose(): void {
    const t = this.ToolTip;
    clearTimeout(this.toolTipTimer);
    t.StopTween?.();
    t.AlphaTo(t, 0, 200);
    t.Open = false;
  }

  /** v2 addition to the sample panel (DATA-0005: the user's own audio comes first): an UPLOAD FILE button centred under
   * the results, styled like v1's Randomise button beside it, with the upload mark (owner, 2026-11-10). */
  private fileButtonRect(): { x: number; y: number; w: number; h: number; label: string } {
    const u = App.Unit, label = 'UPLOAD FILE';
    this.Ctx.font = App.Metrics.TxtMid;
    const w = this.Ctx.measureText(label).width;
    const cy = this.SoundcloudPanel.OffsetY + App.Height * 0.5;
    return { x: App.Width * 0.5 - w * 0.5 - 5 * u, y: cy + 136 * u, w: w + 10 * u, h: 46 * u, label };
  }
  private fileButtonHit(p: Point): boolean {
    const r = this.fileButtonRect();
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }
  private drawFileButton(): void {
    const r = this.fileButtonRect(), cy = this.SoundcloudPanel.OffsetY + App.Height * 0.5;
    drawUploadLink(this.Ctx, r.label, App.Width * 0.5, cy + 160 * App.Unit, this.fileButtonHit(this.pointer));
  }

  /** v1 BlockSprites (ported): menu icons and dragged items use v1's own sprite code, with its per-type offsets. */
  private readonly sprites = new BlockSprites();
  private drawSprite(ctx: CanvasRenderingContext2D, pos: Point, scaled: boolean, name: string): void {
    if (!scaled && drawNewSprite(ctx, pos, name)) return;  // the post-2.0 blocks: from their manifests
    this.sprites.DrawSprite({ Ctx: ctx }, pos, scaled, name);
  }

}

/** v1 index.html's share inputs (the Share panel positions real DOM text fields over the canvas) and their v1 CSS
 * (styles.css), with the link field changed as noted below. */
function ensureShareDom(): void {
  if (document.getElementById('shareUrl')) return;
  const style = document.createElement('style');
  style.textContent = `#shareUrl, #shareTitle, #soundCloudSearch, #patchTitle, #patchUrl, #accountHandle, #gallerySearch { font-family: "Dosis", Arial, Helvetica, sans-serif; font-weight: 200; font-size: 56px;
    mix-blend-mode: normal; background-blend-mode: normal; width: 200px; height: 100px; position: absolute; left: 1000%; top: -100%; }
  #shareUrl form, #shareTitle form, #soundCloudSearch form, #patchTitle form, #patchUrl form, #accountHandle form, #gallerySearch form { width: inherit; height: inherit; }
  #shareUrl input, #shareTitle input, #soundCloudSearch input, #patchTitle input, #patchUrl input, #accountHandle input, #gallerySearch input { overflow: scroll; scrollbar-width: none; white-space: nowrap; width: inherit; height: inherit; font: inherit;
    line-height: inherit; color: inherit; outline: none; border: none; padding: 0; margin: 0; background-color: transparent; resize: none; }
  #shareUrl input::-webkit-scrollbar, #shareTitle input::-webkit-scrollbar, #soundCloudSearch input::-webkit-scrollbar, #patchTitle input::-webkit-scrollbar, #patchUrl input::-webkit-scrollbar, #accountHandle input::-webkit-scrollbar, #gallerySearch input::-webkit-scrollbar { display: none; }
  #shareTitle input, #soundCloudSearch input, #patchTitle input, #accountHandle input, #gallerySearch input { text-transform: uppercase; }`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div id="shareUrl"><form action=""><input type="text" id="shareUrlText" name="url" readonly autocomplete="off" spellcheck="false"></form></div>
    <div id="shareTitle"><form action=""><input type="text" id="shareTitleInput" name="title" autocomplete="off" spellcheck="false" maxlength="24" value=""></form></div>
    <div id="soundCloudSearch"><form action=""><input type="text" id="soundCloudSearchInput" name="title" autocomplete="off" spellcheck="false" maxlength="24" value=""></form></div>
    <div id="patchTitle"><form action=""><input type="text" id="patchTitleInput" name="title" autocomplete="off" spellcheck="false" maxlength="48" value=""></form></div>
    <div id="patchUrl"><form action=""><input type="text" id="patchUrlText" name="url" readonly autocomplete="off" spellcheck="false"></form></div>
    <div id="accountHandle"><form action=""><input type="text" id="accountHandleInput" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" value=""></form></div>
    <div id="gallerySearch"><form action=""><input type="text" id="gallerySearchInput" name="q" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40" value=""></form></div>`;
  // The video player on SAVE / SHARE (owner review 2): portrait, over the panel like the text fields.
  const video = document.createElement('video');
  video.id = 'patchVideo'; video.playsInline = true; video.loop = true; video.controls = true; video.preload = 'auto';
  Object.assign(video.style, { position: 'absolute', display: 'none', background: '#000', objectFit: 'contain' });
  wrap.appendChild(video);
  for (const el of [...wrap.children]) document.body.appendChild(el);
  // Enter in these fields is handled by the panels (v1 EnterCheck); never submit (reload) the page.
  for (const f of document.querySelectorAll('#shareUrl form, #shareTitle form, #soundCloudSearch form, #patchTitle form, #patchUrl form, #accountHandle form, #gallerySearch form')) f.addEventListener('submit', e => e.preventDefault());
  // v1 used a scrolling <textarea>; v2 shows the link on one line like the title field, with no scrollbars, and a
  // click selects the whole link (owner review 2026-11-06).
  for (const id of ['shareUrlText', 'patchUrlText']) {
    const ta = document.getElementById(id) as HTMLInputElement;
    ta.addEventListener('click', () => { ta.focus(); ta.selectionStart = 0; ta.selectionEnd = ta.value.length; });
  }
}

/**
 * The header's Share slot reads PATCHES (CHG-0005): the Patches panel opens from it on the web and in the plugin (the
 * plugin had no Share, CHG-0004). v1's Header is ported verbatim, so its text is substituted while it draws and hit-
 * tests: it sizes the button, hover triangle and chevron from measureText("SHARE"), so measuring the new label keeps
 * them all centred on it.
 */
const SHARE_SLOT_LABEL = 'PATCHES';
function relabelShareButton(header: any): void {
  const wrap = (fn: () => void) => {
    const ctx = header.Ctx as CanvasRenderingContext2D, { fillText, measureText } = ctx;
    ctx.fillText = function (text: string, x: number, y: number, w?: number) { fillText.call(this, text === 'SHARE' ? SHARE_SLOT_LABEL : text, x, y, w); };
    ctx.measureText = function (text: string) { return measureText.call(this, text === 'SHARE' ? SHARE_SLOT_LABEL : text); };
    // Remove the overrides rather than assigning the originals back: an own property left on the context would shadow
    // CanvasRenderingContext2D.prototype from then on.
    try { fn(); } finally { delete (ctx as any).fillText; delete (ctx as any).measureText; }
  };
  const draw = header.Draw.bind(header), hit = header.HitTests.bind(header);
  header.Draw = () => wrap(draw);
  header.HitTests = (point: unknown) => wrap(() => hit(point));
}

/** Settings › About (owner, 2026-11-10, reworded 2026-11-11): v1's text named the Web Audio API and Tone.js, which v2
 * doesn't use. "DAW plugin" becomes a link to the downloads once they exist (CHG-0005 task 12). */
/** Luke Phillips's credit in About (owner, 2026-11-16): v1's roles, plus V2, which he built alone; his site is funputs.com.
 * At most three lines in its column: v1 draws the website 42 units below the blurb's first line. */
export const PHILLIPS = { blurb: 'Luke Phillips - audio development & musical interaction. V2: architecture & full-stack development.', url: 'funputs.com' };
export const ABOUT = 'BlokDust is a collaboration between Luke Twyman, Luke Phillips and Ed Silverton, developed in Brighton, UK, '
  + 'and released in 2016. This rebuild was released in 2026, built by Luke Phillips, now available as a DAW plugin.';
/** The code (owner: people can read it and send pull requests), where v1 had "Chrome Recommended". */
export const SOURCE_LINK = { label: 'View the code on GitHub', url: 'https://github.com/lukephills/blokdust-v2' };
/** The published plugin installers (`pnpm bd release publish` writes it; null until the first release). */
type Release = { file: string; url: string; sha256: string; bytes: number } | null;
let RELEASE = RELEASES as { version: string | null; macos: Release; windows: Release };
/** Settings › DOWNLOAD (web, CHG-0005 task 12; owner 2026-11-11: a tab of its own rather than About). The intro is two
 * paragraphs, each starting on its own line (owner, 2026-11-12, CHG-0010). The unsigned-Windows note moved into the
 * Windows zip's README.txt (CHG-0010). */
export const DOWNLOAD = {
  intro: ['Download the standalone app or VST3/AU plugins to use in your DAW, or get the iPad app with its AUv3 plugin.',
    'BlokDust can be used as both an instrument and an effect.'],
  macos: 'macOS 11 or later, Apple silicon and Intel. VST3, Audio Unit and the standalone app.',
  windows: 'Windows 10 or 11, 64-bit. VST3 and the standalone app.',
  ipad: 'iPadOS 16 or later. AUv3 for AUM, GarageBand, Logic Pro and other hosts, and the standalone app.',
  soon: 'Coming soon.',
};
/** The iPad app's App Store page (CHG-0025): null until it is listed; the iPad button says Coming soon until then. */
export const IPAD_APP_STORE_URL: string | null = null;
/** The About footer: the code (owner, 2026-11-11: the licences are viewable there, NOTICE.md, so no separate links;
 * every build also carries NOTICE.txt and LICENSE.txt). */
export const FOOTER_LINKS = [SOURCE_LINK];  // no Privacy link until the page exists (owner, 2026-11-16)
/** The footer links shown: none where links can't open (App.NoLinks). */
const footerLinks = () => (App.NoLinks ? [] : FOOTER_LINKS);

/**
 * Owner (2026-11-16, CHG-0025): a plugin inside another iPad app can't open Safari, so it shows no links: no footer
 * link, and About's websites and Twitter names are gone (v1 draws and hit-tests them from the Attribution strings, so
 * empty strings draw nothing and take no press). The iPad app itself opens them.
 */
export function hideLinks(): void {
  App.NoLinks = true;
  for (const who of Object.values(App.L10n.Attribution as Record<string, any>)) if (who && typeof who === 'object') { who.url = ''; who.twitter = ''; }
}
/** The usage stats switch's words (SHARING-0010; owner 2026-11-16: very small, beside the version number). */
export const USAGE_STATS = (on: boolean) => `Anonymous usage stats: ${on ? 'on' : 'off'}`;

/**
 * Release 1 changes to v1's Settings panel (CHG-0005), made around the ported code:
 *  - Connect is gone (owner, 2026-11-10: its Facebook / Twitter / Google+ buttons are dated and the guide site is lost).
 *    v1 addresses its tabs by index (0 Settings, 1 Connect, 2 About), so SETTINGS and ABOUT are laid out as a two-tab
 *    bar and index 1 becomes an inert, zero-width stand-in that is never drawn, hit or opened.
 *  - The About text is the owner's; the footer links the code on GitHub in v1's footer type, underlined on hover like
 *    v1's text links ("Chrome Recommended" is removed in the port, tools/v1/port-ui.ts). The link and v1's build line
 *    show on About only (owner review 2, 2026-11-15).
 *  - Tour (owner, 2026-11-08) is hidden until v1's tutorial is ported; on the web its row (the last) is the patch Tempo
 *    (owner, 2026-11-10: one tempo in Settings instead of a Tempo row on every synced block). In a DAW the host's tempo
 *    rules, so the row stays empty there.
 */
function release1Settings(panel: SettingsPanel, host: SceneHost): void {
  const p = panel as any;
  (App.L10n as any).Attribution.about = ABOUT;
  Object.assign((App.L10n as any).Attribution.phillips, App.NoLinks ? { blurb: PHILLIPS.blurb } : PHILLIPS);
  const populate = p.Populate.bind(p);
  // DOWNLOAD (web only) is tab 3: v1 draws nothing for it, so its page is drawn here, following its tab's YOffset.
  const withDownload = !App.IsPlugin;
  // SIGN IN / ACCOUNT (web only, CHG-0023, owner review 2026-11-15) is tab 4, drawn here the same way.
  const account: AccountPage | null = withDownload && host.account ? new AccountPage(host.account, () => p.Ctx) : null;
  p.accountPage = account;
  p.Populate = () => {
    const open = p._OpenTab;
    p._OpenTab = open === 2 ? 1 : open === 3 ? 2 : open === 4 ? 3 : 0;
    populate({ categories: [{ name: 'settings' }, { name: 'about' }, ...(withDownload ? [{ name: 'download' }] : []), ...(account ? [{ name: account.tabName }] : [])] });
    p._OpenTab = open;
    const [settings, about, download, acct] = p.MenuItems;
    const gone = { Position: new Point(about.Position.x - about.Size.width * 0.5, 0), Size: new Size(0, 16), Name: '', Items: [], Selected: 0,
      Hover: false, XOffset: 0, YOffset: -p.DrawTo.Height, CurrentPage: 0, Draw() {} };
    p.MenuItems = [settings, gone, about, ...(download ? [download] : []), ...(acct ? [acct] : [])];
  };
  if (account) {
    // The tab's name follows who is signed in (SIGN IN / ACCOUNT): lay the tabs out again, keeping each tab's state.
    const prevChange = account.onChange;
    account.onChange = () => {
      prevChange();
      const keep = (p.MenuItems as any[]).map(m => ({ Selected: m.Selected, YOffset: m.YOffset }));
      p.Populate();
      (p.MenuItems as any[]).forEach((m, i) => { if (keep[i]) { m.Selected = keep[i].Selected; m.YOffset = keep[i].YOffset; } });
    };
    /** Open Settings on SIGN IN / ACCOUNT (back from Google, the signed-in mark on the stage). */
    p.openAccount = () => {
      p._OpenTab = 4;
      (p.MenuItems as any[]).forEach((m, i) => { m.Selected = i === 4 ? 1 : 0; m.YOffset = i === 4 ? 0 : -p.DrawTo.Height; });
      void account.refresh();
      p.OpenPanel();
    };
  }
  const accountTop = () => p.OffsetY + 120 * App.Unit + (p.MenuItems[4]?.YOffset ?? -p.DrawTo.Height);
  /** Tests: an account control's centre in CSS px. */
  p.accountCentre = (name: string) => account?.centreOf(name, accountTop()) ?? null;
  /** The DOWNLOAD page's two buttons (v1 SharePanel's halves, 420u wide) and their state. */
  /** MACOS · WINDOWS · IPAD in one row, laid out as v1 Connect's share buttons (130 units each, 15 apart, 420 across;
   * owner, 2026-11-16). The iPad one opens the App Store page as it is; the installers carry ?source=download-page. */
  const downloads = () => {
    const u = App.Unit, W = App.Width, y = p.OffsetY + 120 * u + (p.MenuItems[3]?.YOffset ?? -p.DrawTo.Height) + 70 * u;
    const at = (i: number) => ({ x: W * 0.5 + (-210 + 145 * i) * u, y, w: 130 * u, h: 40 * u, cx: W * 0.5 + (-145 + 145 * i) * u });
    const ipad = IPAD_APP_STORE_URL ? { file: '', url: IPAD_APP_STORE_URL, sha256: '', bytes: 0, store: true } : null;
    return [
      { key: 'macos' as const, label: 'macOS', release: RELEASE.macos as (Release & { store?: boolean }) | null, ...at(0), line: DOWNLOAD.macos },
      { key: 'windows' as const, label: 'Windows', release: RELEASE.windows as (Release & { store?: boolean }) | null, ...at(1), line: DOWNLOAD.windows },
      { key: 'ipad' as const, label: 'iPad', release: ipad as (Release & { store?: boolean }) | null, ...at(2), line: DOWNLOAD.ipad },
    ];
  };
  let downloadHover = -1;
  /** Tests: show the page as it will be once a release is published. */
  p.setRelease = (r: typeof RELEASE) => { RELEASE = r; };
  /** Tests: the DOWNLOAD page's buttons in CSS px, and what they offer. */
  p.downloadButtons = () => { const pr = App.Metrics.PixelRatio; return downloads().map(b => ({ key: b.key, x: (b.x + b.w / 2) / pr, y: (b.y + b.h / 2) / pr, url: b.release?.url ?? null })); };
  /** v1's word wrap (SharePanel.WordWrap): fill `text` within `width` from (x, y), `lh` apart; returns the next line's y. */
  const wrap = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, lh: number, width: number) => {
    let line = '';
    for (const word of text.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > width && line) { ctx.fillText(line, x, y); y += lh; line = word; } else line = t;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  };
  const drawDownload = () => {
    const item = p.MenuItems[3];
    if (!item || item.YOffset <= -p.DrawTo.Height) return;
    const ctx = p.Ctx as CanvasRenderingContext2D, u = App.Unit, W = App.Width, txt = App.Palette[App.ThemeManager.Txt], menu = App.ThemeManager.MenuOrder;
    const top = p.OffsetY + 120 * u + item.YOffset;
    // INTRO (v1 About's body type) //
    App.FillColor(ctx, txt); ctx.textAlign = 'left'; ctx.font = App.Metrics.TxtMid;
    let iy = top + 10 * u;
    for (const para of DOWNLOAD.intro) iy = wrap(ctx, para, W * 0.5 - 210 * u, iy, 16 * u, 420 * u);
    // MACOS · WINDOWS · IPAD (v1 SharePanel's SAVE / SAVE AS colours and a third, Connect's GUIDE button type) //
    let below = 0;
    for (const [i, b] of downloads().entries()) {
      const on = !!b.release;
      App.FillColor(ctx, App.Palette[on ? [menu[3], menu[1], menu[2]][i] : 1]);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (on && downloadHover === i) { ctx.beginPath(); ctx.moveTo(b.cx, b.y + b.h + 9 * u); ctx.lineTo(b.cx - 10 * u, b.y + b.h - u); ctx.lineTo(b.cx + 10 * u, b.y + b.h - u); ctx.closePath(); ctx.fill(); }
      App.FillColor(ctx, txt); ctx.textAlign = 'center'; ctx.font = App.Metrics.TxtUrl2;
      ctx.fillText(b.label.toUpperCase(), b.cx, b.y + 29 * u);
      ctx.textAlign = 'left'; ctx.font = App.Metrics.TxtItalic2;
      below = Math.max(below, wrap(ctx, on ? b.line : DOWNLOAD.soon, b.x, b.y + b.h + 24 * u, 14 * u, b.w));
    }
    // VERSION: under the longest line (the columns are narrow) //
    const y = Math.max(downloads()[0].y + 40 * u + 80 * u, below + 16 * u);
    ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
    if (RELEASE.version) ctx.fillText(`Version ${RELEASE.version}`, W * 0.5 - 210 * u, y);
  };
  // Tempo (web) / nothing (plugin) in place of Tour, v1's last row (drawn at +156 units).
  const tempoRow = () => (p.Options as any[]).findIndex(o => o.Type === 'tempo');
  const placeTempo = (o: any) => { o.Value = host.tempo(); o.Position.x = p.linPosition(0, p.Range, o.Min, o.Max, o.Value); };
  const populateOptions = p.PopulateOptions.bind(p);
  p.PopulateOptions = () => {
    populateOptions();
    const opts = p.Options as any[], i = opts.findIndex(o => o.Setting === 'tutorial');
    if (i < 0) return;
    if (App.IsPlugin) { opts[i] = { Type: 'hidden', Name: opts[i].Name, Selected: false, HandleRoll: [false, false], Position: opts[i].Position, Size: opts[i].Size, Draw() {} }; return; }
    const t = new Slider(new Point(0, 0), new Size(1, 48 * App.Unit), p.Margin, 120, 40, 240, true, 'Tempo', 'tempo', false) as any;
    t.Type = 'tempo';
    t.DisplayConversion = (v: number) => `${Math.round(v)} BPM`;
    placeTempo(t);
    opts[i] = t;
  };
  const openPanel = p.OpenPanel.bind(p);
  p.OpenPanel = () => { const i = tempoRow(); if (i >= 0) placeTempo(p.Options[i]); openPanel(); };

  /** Which footer link the pointer is over (-1: none). */
  let linkHover = -1;
  /** The usage stats switch (About tab only): in the bottom right corner where v1 drew the build number, in its type;
   * the build number moves up a line (owner, 2026-11-16). */
  let statsHover = false;
  /** v1's line height for this type (About's blurbs). */
  const FOOT_LINE = 14;
  const statsBox = () => {
    if (!host.usageStats || p._OpenTab !== 2) return null;
    const u = App.Unit, ctx = p.Ctx as CanvasRenderingContext2D;
    ctx.font = App.Metrics.TxtItalic2;
    const w = ctx.measureText(USAGE_STATS(host.usageStats.get())).width, y = p.OffsetY + p.DrawTo.Height - 20 * u;
    return { x: p.DrawTo.Width - 20 * u - w, y, w, u };
  };
  /** Tests: the switch's centre in CSS px, and its words (null: not shown). */
  p.usageStatsSwitch = () => { const b = statsBox(), pr = App.Metrics.PixelRatio; return b ? { x: (b.x + b.w / 2) / pr, y: (b.y - 4 * b.u) / pr, label: USAGE_STATS(host.usageStats!.get()) } : null; };
  /** The footer links in one centred row, in v1's footer type (where it had "Chrome Recommended"), 30u apart. */
  const footer = () => {
    const u = App.Unit, ctx = p.Ctx as CanvasRenderingContext2D;
    ctx.font = App.Metrics.TxtLarge;
    const ws = footerLinks().map(l => ctx.measureText(l.label).width), gap = 30 * u, y = p.OffsetY + p.DrawTo.Height - 20 * u;
    let x = App.Width * 0.5 - (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)) * 0.5;
    const links = ws.map(w => { const l = { x, w }; x += w + gap; return l; });
    return { links, y, u };
  };
  /** Tests: each footer link's centre in CSS px. */
  p.footerLinks = () => { const f = footer(), pr = App.Metrics.PixelRatio; return f.links.map((l, i) => ({ label: footerLinks()[i].label, x: (l.x + l.w / 2) / pr, y: (f.y - 5 * f.u) / pr })); };
  const hitTests = p.HitTests.bind(p);
  p.HitTests = (pt: { x: number; y: number }) => {
    hitTests(pt);
    // No links (hideLinks): v1 hit-tests About's websites and Twitter names (rollovers 1–6) over fixed widths.
    if (App.NoLinks) for (let i = 1; i <= 6; i++) p._RollOvers[i] = false;
    const f = footer();
    linkHover = p._OpenTab !== 2 ? -1 : f.links.findIndex(l => Dimensions.hitRect(l.x - 5 * f.u, f.y - 20 * f.u, l.w + 10 * f.u, 30 * f.u, pt.x, pt.y));
    const sb = statsBox();
    statsHover = !!sb && Dimensions.hitRect(sb.x - 4 * sb.u, sb.y - 14 * sb.u, sb.w + 8 * sb.u, 20 * sb.u, pt.x, pt.y);
    downloadHover = p._OpenTab === 3 ? downloads().findIndex(b => !!b.release && Dimensions.hitRect(b.x, b.y, b.w, b.h, pt.x, pt.y)) : -1;
    if (account) { if (p._OpenTab === 4) account.hit(pt, accountTop()); else account.hit({ x: -1e9, y: -1e9 }, accountTop()); }
    const i = tempoRow();
    if (i >= 0) p._OptionsRoll[i] = Dimensions.hitRect(p.Margin - 10 * f.u, p.OffsetY + 120 * f.u + p.MenuItems[0].YOffset + 156 * f.u, p.Range + 20 * f.u, 48 * App.Unit, pt.x, pt.y);
  };
  const setTempo = (x: number) => {
    const o = p.Options[tempoRow()];
    o.Position.x = Math.max(0, Math.min(p.Range, x - p.Margin));
    o.Value = Math.round(p.linValue(0, p.Range, o.Min, o.Max, o.Position.x));
    o.Position.x = p.linPosition(0, p.Range, o.Min, o.Max, o.Value);
    host.setTempo(o.Value);
  };
  const mouseDown = p.MouseDown.bind(p);
  p.MouseDown = (pt: { x: number; y: number }) => {
    const before = p._OpenTab;
    mouseDown(pt);
    if (account && p._OpenTab === 4 && before !== 4) { account.View = account.View === 'delete' ? 'main' : account.View; void account.refresh(); }
    if (!p.Open) return;
    if (linkHover >= 0) { window.open(footerLinks()[linkHover].url, '_blank'); return; }
    if (statsHover && host.usageStats) { host.usageStats.set(!host.usageStats.get()); return; }
    if (downloadHover >= 0) { const r = downloads()[downloadHover].release; if (r) window.open(r.store ? r.url : `${r.url}?source=download-page`, '_blank'); return; }
    if (account && p._OpenTab === 4) { account.hit(pt, accountTop()); account.press(); }
    const i = tempoRow();
    if (i >= 0 && p._OpenTab === 0 && p._OptionsRoll[i]) setTempo(pt.x);  // v1 sliders jump to the press, as Volume does
  };
  const mouseMove = p.MouseMove.bind(p);
  p.MouseMove = (pt: { x: number; y: number }) => {
    mouseMove(pt);
    const i = tempoRow();
    if (i >= 0 && p.Options[i].Selected) setTempo(pt.x);
  };
  const draw = p.Draw.bind(p);
  p.Draw = () => {
    // The build line and the GitHub link are About's (owner review 2, 2026-11-15); v1 drew the build under every tab.
    const about = p._OpenTab === 2, build = p._Attribution.build, moved = about && !!statsBox();
    if (!about || moved) p._Attribution.build = '';
    try { draw(); } finally { p._Attribution.build = build; }
    account?.placeField(accountTop(), p.Open && p._OpenTab === 4 && (p.MenuItems[4]?.YOffset ?? -1) > -p.DrawTo.Height * 0.5);
    if (!p.Open) return;
    // DOWNLOAD and ACCOUNT slide in and out under the tabs, as SETTINGS and ABOUT do: v1's clipping box, from 60 units
    // below the tabs' top to the bottom (owner, 2026-11-16: they drew over the tabs while sliding).
    const cctx = p.Ctx as CanvasRenderingContext2D;
    cctx.save();
    cctx.beginPath(); cctx.rect(0, p.OffsetY + 60 * App.Unit, App.Width, App.Height); cctx.clip();
    try {
      drawDownload();
      if (account && (p.MenuItems[4]?.YOffset ?? -p.DrawTo.Height) > -p.DrawTo.Height) account.draw(accountTop());
    } finally { cctx.restore(); }
    if (!about) return;
    const ctx = p.Ctx as CanvasRenderingContext2D, f = footer(), txt = App.Palette[App.ThemeManager.Txt];
    App.FillColor(ctx, txt); App.StrokeColor(ctx, txt);
    ctx.font = App.Metrics.TxtLarge; ctx.textAlign = 'left';
    f.links.forEach((l, i) => {
      ctx.fillText(footerLinks()[i].label, l.x, f.y);
      if (i === linkHover) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l.x, f.y + 2 * f.u); ctx.lineTo(l.x + l.w, f.y + 2 * f.u); ctx.stroke(); }
    });
    const sb = statsBox();
    if (sb && host.usageStats) {
      ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'right';
      ctx.fillText(build, p.DrawTo.Width - 20 * sb.u, sb.y - FOOT_LINE * sb.u);
      ctx.textAlign = 'left';
      ctx.fillText(USAGE_STATS(host.usageStats.get()), sb.x, sb.y);
      if (statsHover) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sb.x, sb.y + 2 * sb.u); ctx.lineTo(sb.x + sb.w, sb.y + 2 * sb.u); ctx.stroke(); }
    }
  };
}

/** The track line of a sampler whose sound can't be found (main.ts markMissing). */
const MISSING = 'MISSING · ';
/**
 * Owner (2026-11-08, CHG-0005): a missing file is relinked by dropping a file on the block or with a button that opens
 * the file picker. While the selected sampler is missing, v1's LOAD NEW SAMPLE button reads LOCATE FILE and opens the
 * picker (host.loadSample: the browser's, or the plugin's native one, which keeps the region) instead of the sample
 * search. v1's option is ported verbatim, so its label is substituted while it draws.
 */
function locateMissingFiles(scene: V1Scene): void {
  const proto = OptionSample.prototype as any, draw = proto.Draw;
  proto.Draw = function (ctx: CanvasRenderingContext2D, ...rest: unknown[]) {
    if (!String(this.Track ?? '').startsWith(MISSING)) return draw.call(this, ctx, ...rest);
    ctx.fillText = function (t: string, x: number, y: number, w?: number) {
      CanvasRenderingContext2D.prototype.fillText.call(this, t === 'LOAD NEW SAMPLE' ? 'LOCATE FILE' : t, x, y, w);
    };
    try { return draw.call(this, ctx, ...rest); } finally { delete (ctx as any).fillText; }
  };
  const search = scene.SoundcloudPanel as any, open = search.OpenPanel.bind(search);
  search.OpenPanel = () => {
    const b = scene.OptionsPanel.SelectedBlock as any;
    if (b && String(b.Params?.trackName ?? '').startsWith(MISSING)) scene.host.loadSample(b.Id);
    else open();
  };
}

/** v1 OptionsPanel.Open, with the 400 ms wait before the panel pops open kept, so it can be called off:
 * `CancelOpen()` (a double click on a Stage block opens the Stage, not its panel; owner, 2026-11-14). */
function cancellableOpen(panel: any): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  panel.Open = (block: any) => {
    block.UpdateOptionsForm();
    if (!block.OptionsForm) return;
    if (panel.Scale == 1 && block !== panel.SelectedBlock) panel.Close();
    panel.Opening = true;
    panel.SelectedBlock = block;
    App.MainScene.MainSceneDragger.Jump(block.Position, new Point(App.Metrics.OptionsPoint.x, App.Metrics.OptionsPoint.y));
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      panel.Opening = false;
      panel.Populate(block.OptionsForm, true);
      panel.PanelScale(panel, 1, 200);
    }, 400);
  };
  panel.CancelOpen = () => {
    if (timer === undefined) return;
    clearTimeout(timer); timer = undefined;
    panel.Opening = false;
  };
}
