// v1's MainScene for the UI only (CHG-0002 1.8–1.10): the ported panels, drawn and given input in
// v1's order; blocks and audio stay in the engine (ARCHITECTURE-0002), reached through SceneHost.
import { drawPrismExits, hasLiveRows, installLiveRows } from '../newBlocks/liveRows.ts';
import { followLfos } from '../newBlocks/lfo.ts';
import { drawNewSprite, installNewBlockMenu } from '../newBlocks/menu.ts';
import type { V1Block } from '../blocks/v1Block.ts';
import type { Theme } from '../../generated/palettes.gen.ts';
import { App, Point, TWEEN } from '../shim.ts';
import { pageElement } from '../pageElement.ts';
import { appSettings } from './settings/settingsView.ts';
import { canvasOf, hideMessageBar, shareSaving, zoomSlotsOf } from './v1Privates.ts';
import { installFilterPanel } from '../filterPanel.ts';
import { installSelectors } from '../selectorOption.ts';
import { installTouchpad } from '../touchpadPanel.ts';
import { installWaveZoom } from '../waveZoom.ts';
import { installAdsr } from '../adsrPanel.ts';
import { installNoteBars } from '../noteBars.ts';
import { BlockSprites } from '../ported/Blocks/BlockSprites';
import { checkTour, installTour } from '../tutorial.ts';
import { relabelShareButton } from './shareSlot.ts';
import { release1Settings } from './settings/release1Settings.ts';
import { locateMissingFiles } from './missingFiles.ts';
import { cancellableOpen } from './cancellableOpen.ts';
import { V1ScenePointer } from './pointer.ts';

export class V1Scene extends V1ScenePointer {
  /** Bind to the stage canvas and sizes, on init and every resize or theme change (v1
   * Metrics.Compute, Resize). */
  sync(
    ctx: CanvasRenderingContext2D,
    theme: Theme,
    zoom: number,
    drag: { x: number; y: number },
    blocks: V1Block[],
  ): void {
    this.Ctx = ctx;
    App.Canvas.Ctx = ctx;
    App.MainScene = this;
    App.Stage = { MainScene: this };
    App.Metrics = this.Metrics;
    App.Palette = theme.colors;
    App.ThemeManager.Txt = theme.roles.txt;
    App.ThemeManager.MenuOrder = theme.roles.menu;
    App.ThemeManager.OptionsOrder = theme.roles.options;
    App.ThemeManager.CurrentThemeNo = theme.index;
    App.ThemeManager.CurrentTheme = { Name: theme.name };
    App.ThemeManager.Themes = this.host.themes().map((theme) => ({ Name: theme.name }));
    App.ThemeManager.LoadTheme = (themeNumber: number) => {
      this.host.setTheme(themeNumber);
    };
    App.ZoomLevel = zoom;
    this.lastZoom = zoom;
    App.DragOffset.x = drag.x;
    App.DragOffset.y = drag.y;
    App.Blocks = blocks;
    App.CommandManager = {
      ExecuteCommand: (command: unknown) => {
        this.command(command);
      },
    };
    App.Audio.Master.volume.onMaster = (db: number) => {
      this.host.setMasterDb(db);
    };
    // v1 ThemeManager: the share text fields take the theme's text colour.
    for (const id of [
      'shareUrl',
      'shareTitle',
      'soundCloudSearch',
      'patchTitle',
      'patchUrl',
      'accountHandle',
      'gallerySearch',
    ])
      pageElement(id).style.color = theme.colors[theme.roles.txt];
    App.BlockSprites = {
      DrawSprite: (target: unknown, pos: Point, scaled: boolean, name: string) => {
        this.drawSprite(canvasOf(target), pos, scaled, name);
      },
    };
    App.AnimationsLayer = this.AnimationsLayer;
    if (!this.initialised) {
      // v1 order: panels are created before Metrics.Compute (App.Width is 0, so their Resize()
      // bails out), then the first resize lays them out.
      this.initialised = true;
      // the post-2.0 blocks join v1's menu before the header reads it (SCOPE-0005)
      installNewBlockMenu();
      App.Width = 0;
      App.Height = 0;
      for (const part of [
        this.ToolTip,
        this.AnimationsLayer,
        this.RecorderPanel,
        this.ZoomButtons,
        this.MainSceneDragger,
        this.TrashCan,
        this.Tutorial,
        this.OptionsPanel,
        this.Header,
        this.CreateNew,
        this.TutorialHotspots,
        this.SharePanel,
        this.SettingsPanel,
        this.SoundcloudPanel,
        this.PatchesPanel,
        this.MessagePanel,
      ])
        part.Init(this);
      installTour(this.Tutorial, this.TutorialHotspots);
      hideMessageBar(this.MessagePanel);
      relabelShareButton(this.Header);
      // The header's Share slot opens Patches (CREATE SHARE LINK is in its SAVE tab).
      this.SharePanel.OpenPanel = () => {
        this.PatchesPanel.OpenPanel();
      };
      release1Settings(this.SettingsPanel, this.host);
      installFilterPanel(this.OptionsPanel);
      cancellableOpen(this.OptionsPanel);
      installSelectors(this.OptionsPanel);
      installLiveRows(this.OptionsPanel);
      // it lays the Touchpad's rows out again after the others adapt them
      installTouchpad(this.OptionsPanel);
      installNoteBars(this.OptionsPanel); // Random Note's and Chord's bars and Range (UI-0016)
      // the Envelope's graph: curved time axis, readout, fine drags (adsrPanel.ts)
      installAdsr(this.OptionsPanel);
      // outermost: it narrows the form the others are given (waveZoom.ts)
      installWaveZoom(this.OptionsPanel);
      locateMissingFiles(this);
    }
    this.Metrics.Compute();
    this.Width = App.Width;
    this.Height = App.Height;
    for (const sized of [
      this.ZoomButtons,
      this.TrashCan,
      this.Tutorial,
      this.OptionsPanel,
      this.Header,
      this.CreateNew,
      this.SharePanel,
      this.SettingsPanel,
      this.SoundcloudPanel,
      this.PatchesPanel,
    ])
      sized.Resize();
    // v1 MainScene.Resize
    this.OptionsPanel.Close();
    this.Header.Populate(this.Header.MenuJson);
    this.SettingsPanel.Populate(this.SettingsPanel.MenuJson);
    // v1 calls it whenever the block list changes (icon + logo margin when > 1 block)
    this.CreateNew.CheckState();
  }

  /** Advance tweens; true while anything animates (the stage then redraws every frame). */
  update(nowMs: number): boolean {
    const animating = TWEEN.update(nowMs);
    // An embed never syncs the scene, so its panels have nothing to update (and v1's OptionsPanel
    // would throw on its first frame, stopping the ticker: Sentry BLOKDUST-WEB-2).
    if (!this.initialised) return animating;
    // The open panel's block is loading (AnimationsLayer): keep redrawing so its square spins.
    if (
      this.OptionsPanel.Scale > 0 &&
      this.AnimationsLayer.ActiveBlocks.includes(this.OptionsPanel.SelectedBlock)
    )
      this.OptionsPanel.Animating = true;
    for (const part of [
      this.ToolTip,
      this.AnimationsLayer,
      this.RecorderPanel,
      this.ZoomButtons,
      this.Tutorial,
      this.OptionsPanel,
      this.Header,
      this.CreateNew,
      this.TutorialHotspots,
      this.SharePanel,
      this.SettingsPanel,
      this.SoundcloudPanel,
      this.PatchesPanel,
      this.MessagePanel,
    ]) {
      part.LastVisualTick = nowMs;
      part.Update();
    }
    checkTour(this.Tutorial, nowMs, this.OptionsPanel.Scale > 0);
    // The tour's markers pulse, and follow the menus and blocks they point at.
    const touring =
      this.Tutorial.Open || this.Tutorial.SplashOpen || this.TutorialHotspots.Points.length > 0;
    this.MainSceneDragger.LastVisualTick = nowMs;
    this.MainSceneDragger.Update();
    if (Math.abs(App.ZoomLevel - this.lastZoom) > 1e-9) {
      this.lastZoom = App.ZoomLevel;
      this.host.setZoom(App.ZoomLevel);
    }
    const point = App.DragOffset,
      easing =
        Math.round(point.x) !== Math.round(this.MainSceneDragger.Destination.x) ||
        Math.round(point.y) !== Math.round(this.MainSceneDragger.Destination.y);
    if (point.x !== this.lastDrag.x || point.y !== this.lastDrag.y) {
      this.lastDrag = { x: point.x, y: point.y };
      this.host.setDrag({ x: point.x, y: point.y });
    }
    // Spinners (loading blocks, Share "saving…", sample search) animate every frame while shown.
    const spinning =
      this.AnimationsLayer.ActiveBlocks.length > 0 ||
      (this.OptionsPanel.Scale === 1 && this.OptionsPanel.Animating) ||
      shareSaving(this.SharePanel) ||
      (this.SoundcloudPanel.Open && !!this.OptionsPanel.SelectedBlock?.Searching) ||
      (this.PatchesPanel.Open && this.PatchesPanel.animating) ||
      (this.SettingsPanel.Open && !!appSettings(this.SettingsPanel).accountPage?.animating);
    // Playback lines move every frame while shown (and once more to clear them when it stops).
    const playing = this.playheadsShown || !!this.playheadLines();
    // Live rows (a Compressor's meter, …) follow the engine: redraw the panel while one shows.
    const live = followLfos(this.OptionsPanel) || hasLiveRows(this.OptionsPanel);
    if (live) this.OptionsPanel._DrawReady = true;
    const hint = this.hostHinting,
      hintGone = this.hintDrawn && !hint; // one more frame clears the hint
    this.hintDrawn = hint;
    return (
      animating ||
      easing ||
      spinning ||
      playing ||
      live ||
      touring ||
      this.splashDrawing ||
      hint ||
      hintGone
    );
  }

  /** v1 MainScene's display list from the ToolTip up (the stage drew blocks, lines and beams). */
  draw(): void {
    for (const part of [
      this.ToolTip,
      this.AnimationsLayer,
      ...(this.drawRecorderPanel ? [this.RecorderPanel] : []),
      this.ZoomButtons,
      this.MainSceneDragger,
      this.TrashCan,
      this.Tutorial,
      this.OptionsPanel,
      this.Header,
      this.CreateNew,
      this.TutorialHotspots,
      this.SharePanel,
      this.SettingsPanel,
      this.SoundcloudPanel,
      this.PatchesPanel,
      this.MessagePanel,
    ]) {
      // under the panel, over the stage
      if (part === this.OptionsPanel) drawPrismExits(this.Ctx, this.OptionsPanel);
      this.Ctx.save();
      part.Draw();
      this.Ctx.restore();
      if (part === this.OptionsPanel) this.drawPlayheads();
      if (part === this.TrashCan) {
        this.Ctx.save();
        this.drawPower();
        this.Ctx.restore();
      }
    }
    if (this.SoundcloudPanel.Open) {
      this.Ctx.save();
      this.drawFileButton();
      this.Ctx.restore();
    }
    if (this.splash && !this.splash.IsTransitionFinished) {
      this.Ctx.save();
      this.splash.FrameCount++;
      this.splash.Draw();
      this.Ctx.restore();
    }
    this.Ctx.globalAlpha = 1;
  }

  /** v1 CommandManager commands the panels issue: SAVE / SAVE_AS go to the sharing backend
   * (CHG-0003); the Share panel then shows the id exactly as v1 showed a saved composition id. */
  protected command(command: unknown): void {
    // v1 StringValue lowercases
    const named = command as { value?: string } | null | undefined;
    const name = (named?.value ?? String(command)).toLowerCase();
    if (name === 'save' || name === 'saveas') {
      void this.host
        .share(name === 'save' ? 'save' : 'saveAs', this.SharePanel.SessionTitle)
        .then((id) => {
          this.SharePanel.ReturnLink(id);
        });
    }
  }

  // ---- v1 MainScene API the ported panels call ----
  CreateBlockFromType(v1Type: string): void {
    const point = this.Metrics.CursorToGrid(this.pointer);
    const id = this.host.createBlock(v1Type, point.x, point.y);
    if (id === null) return;
    this.IsDraggingABlock = true;
    this.pendingSelect = id;
  }

  DeleteSelectedBlock(): void {
    if (this.SelectedBlock) this.host.deleteBlock(this.SelectedBlock.Id);
    this.select(null);
    this.OptionsPanel.Close();
  }
  /** v1 MainScene.ResetScene: no blocks, zoom and drag reset, options closed, a new session. */
  ResetScene(): void {
    if (this.Tutorial.Open) this.Tutorial.ClosePanel(); // v1 MainScene.ResetScene
    this.Tutorial.WatchedBlocks = [];
    this.resetting = true;
    try {
      this.host.resetScene();
    } finally {
      this.resetting = false;
    }
    this.CreateNew.CheckState();
    this.select(null);
    App.DragOffset.x = 0;
    App.DragOffset.y = 0;
    this.ZoomButtons.CurrentSlot = zoomSlotsOf(this.ZoomButtons).indexOf(1);
    this.MainSceneDragger.Destination = new Point(0, 0);
    App.ZoomLevel = 1;
    this.Metrics.UpdateGridScale();
    this.OptionsPanel.Close();
    App.CompositionId = null;
    App.SessionId = null;
    this.SharePanel.Reset();
    this.PatchesPanel.setTitle(''); // a new scene gets a new title
  }

  /** v1 BlockSprites (ported): menu icons and dragged items use v1's sprite code and offsets. */
  protected readonly sprites = new BlockSprites();
  protected drawSprite(
    ctx: CanvasRenderingContext2D,
    pos: Point,
    scaled: boolean,
    name: string,
  ): void {
    // the post-2.0 blocks: from their manifests
    if (!scaled && drawNewSprite(ctx, pos, name)) return;
    this.sprites.DrawSprite(
      { Ctx: ctx, Width: this.Width, Height: this.Height },
      pos,
      scaled,
      name,
    );
  }
}
