// v1's panels as the scene owns them, and the scene state they share.
import type { V1Block } from '../blocks/v1Block.ts';
import { PatchesPanel } from '../patches/panel.ts';
import { App, Point } from '../shim.ts';
import { shareWarningOf } from './v1Privates.ts';
import { Metrics } from '../ported/Metrics';
import { CreateNew } from '../ported/UI/CreateNew';
import { Header } from '../ported/UI/Header';
import { OptionsPanel } from '../ported/UI/OptionsPanel';
import { optionsPanelView } from '../optionsTypes.ts';
import { SettingsPanel } from '../ported/UI/SettingsPanel';
import { SharePanel } from '../ported/UI/SharePanel';
import { ToolTip } from '../ported/UI/ToolTip';
import { TrashCan } from '../ported/UI/TrashCan';
import { ZoomButtons } from '../ported/UI/ZoomButtons';
import { StageDragger } from '../ported/UI/StageDragger';
import { RecorderPanel } from '../ported/UI/RecorderPanel';
import { SoundcloudPanel } from '../ported/UI/SoundcloudPanel';
import { AnimationsLayer } from '../ported/UI/AnimationsLayer';
import { MessagePanel } from '../ported/UI/MessagePanel';
import { Tutorial } from '../ported/UI/Tutorial';
import { TutorialHotspots } from '../ported/UI/TutorialHotspots';
import type { SceneHost } from './sceneHost.ts';
import { SAVE_WARNING } from './shareSlot.ts';
import { followStageForCreateNew } from './createNewState.ts';
import { ensureTextFields } from './textFields.ts';

export abstract class V1ScenePanels {
  Ctx!: CanvasRenderingContext2D;
  Width = 0;
  Height = 0;
  IsDraggingABlock = false;
  SelectedBlock: V1Block | null = null;
  readonly Metrics = new Metrics();
  readonly ToolTip = new ToolTip();
  readonly ZoomButtons = new ZoomButtons();
  readonly TrashCan = new TrashCan();
  readonly OptionsPanel = optionsPanelView(new OptionsPanel());
  readonly Header = new Header();
  readonly CreateNew = new CreateNew();
  readonly SharePanel = new SharePanel();
  readonly SettingsPanel = new SettingsPanel();
  readonly MainSceneDragger = new StageDragger();
  readonly RecorderPanel = new RecorderPanel();
  /** v1's loading animation: a diamond spinning beside a loading block, and Share's, search's. */
  readonly AnimationsLayer = new AnimationsLayer();
  /** v1's tour (CHG-0035): the welcome, the steps at right, the pulsing markers (tutorial.ts). */
  readonly Tutorial = new Tutorial();
  readonly TutorialHotspots = new TutorialHotspots();
  /** v1's message bar (App.Message): a timed line three quarters down the stage (SAVED, errors). */
  readonly MessagePanel = new MessagePanel();
  /** v1's sample search, searching Freesound (DATA-0005, SPEC-SHARING-BACKEND R15). */
  readonly SoundcloudPanel = new SoundcloudPanel();
  /** Patches (CHG-0005): opened from the header's Share slot, which reads PATCHES. */
  readonly PatchesPanel: PatchesPanel;
  protected pointer = new Point();
  protected initialised = false;
  protected optionTimeout = false;

  constructor(readonly host: SceneHost) {
    this.PatchesPanel = new PatchesPanel(host);
    // v1 App.CreateSubCanvas(0): the options panel draws here to be composited; on the page as
    // v1's (its text gets the page's font smoothing), but out of view and of input.
    const sub = document.createElement('canvas');
    sub.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(sub);
    App.SubCanvas = [sub];
    ensureTextFields();
    followStageForCreateNew(this.CreateNew);
    // v1 SharePanel.GetWarning warned of Recorder blocks; v2 also of the user's own files, never
    // uploaded so the link can't carry them (DATA-0005).
    const share = this.SharePanel,
      getWarning = share.GetWarning.bind(share);
    share.GetWarning = () => {
      getWarning();
      const warning = shareWarningOf(share);
      if (this.host.hasLocalFiles()) warning._Warning = true;
      if (warning._Warning) App.L10n.UI.SharePanel.SaveWarning = SAVE_WARNING;
    };
  }

  /** Zoom/drag followed every frame (no re-layout). */
  setView(zoom: number, drag: { x: number; y: number }): void {
    App.ZoomLevel = zoom;
    this.lastZoom = zoom;
    App.DragOffset.x = drag.x;
    App.DragOffset.y = drag.y;
    this.lastDrag = { x: drag.x, y: drag.y };
    this.Metrics.UpdateGridScale();
  }
  /** The block list changed (v1 calls CreateNew.CheckState after create/delete/load). */
  setBlocks(blocks: V1Block[]): void {
    App.Blocks = blocks;
    if (this.initialised && !this.resetting) this.CreateNew.CheckState();
  }
  /** Inside ResetScene: v1 DeleteAllBlocks then one _Invalidate, so CreateNew checks once (per
   * block, it stopped the panel's close tweens half-way). */
  protected resetting = false;

  /** v1 App.Message: `text` in the message bar for `seconds` (three); with `buttonText` it stays
   * until closed or its button is pressed. */
  message(
    text: string,
    options?: { seconds?: number; buttonText?: string; buttonEvent?: () => void },
  ): void {
    if (this.initialised) this.MessagePanel.NewMessage(text, options);
  }

  protected lastZoom = 1;
  protected lastDrag = { x: 0, y: 0 };

  /** Off in the visual harness (its stage draws the Recorder's baked idle overlay). */
  drawRecorderPanel = true;

  /** v1 Audio.Monitor: the master output's dB (from the snapshot's RMS), with its peak hold. */
  setLevelDb(db: number): void {
    App.Audio.Level = db;
    if (db > App.Audio.Peak) App.Audio.Peak = db;
  }

  pendingSelect: number | null = null;
  /** Web MIDI inputs (MIDI Input block's device option, CHG-0004). */
  midiDevices: { id: string; name: string }[] = [];
  setMidiDevices(list: { id: string; name: string }[]): void {
    this.midiDevices = list;
    this.OptionsPanel.SelectedBlock?.RefreshOptionsPanel();
  }

  setParam(block: V1Block, key: string, value: number): void {
    this.host.setParam(block.Id, key, value);
  }

  select(b: V1Block | null): void {
    if (this.SelectedBlock) this.SelectedBlock.IsSelected = false;
    this.SelectedBlock = b;
    if (b) b.IsSelected = true;
  }
}
