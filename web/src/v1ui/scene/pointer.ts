// Pointer input in v1 MainScene's order, the tooltip, and the sample panel's UPLOAD FILE.
import type { V1Block } from '../blocks/v1Block.ts';
import { drawUploadLink } from '../patches/icons.ts';
import { App, Point } from '../shim.ts';
import { V1SceneTouch } from './touch.ts';

export abstract class V1ScenePointer extends V1SceneTouch {
  // ---- input, in v1 MainScene order (device px) ----
  /** Returns true when the UI took the press (the stage must not start a block/stage drag). */
  pointerDown(x: number, y: number, blockAt: () => V1Block | null): boolean {
    const point = new Point(x, y);
    this.pointer = point;
    if (this.ToolTip.Open) this.toolTipClose();
    if (this.MessagePanel.Open && this.MessagePanel.Hover) {
      this.MessagePanel.MouseDown(point);
      return true;
    } // v1 MainScene
    if (this.SharePanel.Open) {
      this.SharePanel.MouseDown(point);
      return true;
    }
    if (this.SettingsPanel.Open) {
      this.SettingsPanel.MouseDown(point);
      return true;
    }
    if (this.PatchesPanel.Open) {
      this.PatchesPanel.MouseDown(point);
      return true;
    }
    if (this.SoundcloudPanel.Open) {
      if (this.fileButtonHit(point)) {
        const b = this.OptionsPanel.SelectedBlock;
        this.SoundcloudPanel.ClosePanel();
        if (b) this.host.loadSample(b.Id);
        return true;
      }
      this.SoundcloudPanel.MouseDown(point);
      return true;
    }
    const tour = this.Tutorial;
    if (tour.SplashOpen) {
      tour.SplashMouseDown(point);
      if (tour.Hover) return true;
    } // v1 order: the welcome first
    this.CreateNew.MouseDown(point);
    if (this.CreateNew.Hover) return true;
    this.Header.MouseDown(point);
    if (this.Header.MenuOver) return true;
    this.ZoomButtons.MouseDown(point);
    if (this.ZoomButtons.InRoll || this.ZoomButtons.OutRoll) return true;
    if (this.powerHit(point)) {
      this.pressPower(point.x);
      return true;
    }
    if (this.OptionsPanel.Scale === 1) {
      this.OptionsPanel.MouseDown(point.x, point.y);
      if (this.OptionsPanel.Hover) return true;
    }
    if (tour.Open) {
      tour.MouseDown(point);
      if (tour.Hover) return true;
    } // SKIP TOUR / OKAY DONE
    this.RecorderPanel.MouseDown(point);
    if (this.RecorderPanel.Hover) return true;
    const hit = blockAt();
    if (hit) {
      this.select(hit);
      hit.IsPressed = true;
      this.IsDraggingABlock = true;
      this.optionTimeout = true;
      setTimeout(() => {
        this.optionTimeout = false;
      }, App.Config.SingleClickTime);
      return false;
    }
    this.OptionsPanel.Close();
    this.MainSceneDragger.MouseDown(point); // v1: no block hit → drag the stage
    return false;
  }

  /** Returns 'delete' when a dragged block was dropped on the trash can. */
  pointerUp(x: number, y: number, moved: boolean): 'delete' | null {
    const point = new Point(x, y);
    let result: 'delete' | null = null;
    // Where the pointer is now: a finger lands elsewhere with no move between, so after one drop
    // on the trash the next tap "ended over the trash" too.
    this.TrashCan.MouseMove(point);
    if (this.IsDraggingABlock && this.TrashCan.MouseUp()) result = 'delete';
    this.IsDraggingABlock = false;
    if (!result && this.SelectedBlock) {
      this.SelectedBlock.IsPressed = false;
      if (this.optionTimeout && !moved) this.OptionsPanel.Open(this.SelectedBlock);
    }
    if (this.SharePanel.Open) this.SharePanel.MouseUp(point);
    else if (this.SettingsPanel.Open) this.SettingsPanel.MouseUp(point);
    else if (this.SoundcloudPanel.Open) this.SoundcloudPanel.MouseUp(point);
    else if (this.PatchesPanel.Open) this.PatchesPanel.MouseUp();
    else {
      this.Header.MouseUp();
      if (this.OptionsPanel.Scale === 1) this.OptionsPanel.MouseUp();
      this.MainSceneDragger.MouseUp();
    }
    return result;
  }

  pointerMove(
    x: number,
    y: number,
    pointerDown: boolean,
    hover: () => V1Block | null,
    blockMoved: boolean,
  ): void {
    const point = new Point(x, y);
    this.pointer = point;
    this.checkHover(point, pointerDown, hover);
    if (blockMoved && this.IsDraggingABlock && this.OptionsPanel.Scale === 1)
      this.OptionsPanel.Close();
    if (this.OptionsPanel.Scale === 1) this.OptionsPanel.MouseMove(point.x, point.y);
    if (this.SharePanel.Open) this.SharePanel.MouseMove(point);
    if (this.SettingsPanel.Open) this.SettingsPanel.MouseMove(point);
    if (this.SoundcloudPanel.Open) this.SoundcloudPanel.MouseMove(point);
    if (this.PatchesPanel.Open) this.PatchesPanel.MouseMove(point);
    if (this.MessagePanel.Open) this.MessagePanel.MouseMove(point);
    this.Header.MouseMove(point);
    this.CreateNew.MouseMove(point);
    if (this.Tutorial.Open || this.Tutorial.SplashOpen) this.Tutorial.MouseMove(point);
    this.ZoomButtons.MouseMove(point);
    this.TrashCan.MouseMove(point);
    this.RecorderPanel.MouseMove(point);
    this.MainSceneDragger.MouseMove(point);
    this.powerHover = this.powerHit(point);
  }

  get uiBusy(): boolean {
    const z = this.ZoomButtons,
      optionsPanel = this.OptionsPanel;
    return (
      this.powerHover ||
      z.InRoll ||
      z.OutRoll ||
      ((this.Tutorial.Open || this.Tutorial.SplashOpen) && this.Tutorial.Hover) ||
      this.RecorderPanel.Hover ||
      this.Header.MenuOver ||
      this.SharePanel.Open ||
      this.SettingsPanel.Open ||
      this.SoundcloudPanel.Open ||
      this.PatchesPanel.Open ||
      this.CreateNew.Hover ||
      (optionsPanel.Scale === 1 && optionsPanel.Hover)
    );
  }

  protected checkHover(point: Point, pointerDown: boolean, hover: () => V1Block | null): void {
    const toolTip = this.ToolTip,
      optionsPanel = this.OptionsPanel;
    let panelCheck = false,
      over: V1Block | null = null;
    if (optionsPanel.Scale === 1)
      panelCheck =
        point.x > optionsPanel.Position.x &&
        point.x < optionsPanel.Position.x + optionsPanel.Size.width &&
        point.y > optionsPanel.Position.y - optionsPanel.Size.height * 0.5 &&
        point.y < optionsPanel.Position.y + optionsPanel.Size.height * 0.5;
    if (!panelCheck && !pointerDown) over = hover();
    if (over) {
      toolTip.Name = over.BlockName;
      const pos = this.Metrics.PointOnGrid(over.Position);
      toolTip.Position.x = pos.x;
      toolTip.Position.y = pos.y;
    }
    if (over && !toolTip.Open && !optionsPanel.Opening) {
      toolTip.Open = true;
      if (toolTip.Alpha > 0) toolTip.AlphaTo(toolTip, 100, 600);
      else
        this.toolTipTimer = setTimeout(() => {
          if (toolTip.Alpha === 0) toolTip.AlphaTo(toolTip, 100, 600);
        }, 550);
    }
    if (!over && toolTip.Open) this.toolTipClose();
  }
  protected toolTipTimer: ReturnType<typeof setTimeout> | undefined;
  ToolTipClose(): void {
    this.toolTipClose();
  }
  protected toolTipClose(): void {
    const toolTip = this.ToolTip;
    clearTimeout(this.toolTipTimer);
    toolTip.StopTween();
    toolTip.AlphaTo(toolTip, 0, 200);
    toolTip.Open = false;
  }

  /** The sample panel's UPLOAD FILE (v2; the user's own audio first, DATA-0005): under the results,
   * styled as v1's Randomise beside it, with the upload mark. */
  protected fileButtonRect(): { x: number; y: number; w: number; h: number; label: string } {
    const unit = App.Unit,
      label = 'UPLOAD FILE';
    this.Ctx.font = App.Metrics.TxtMid;
    const labelWidth = this.Ctx.measureText(label).width;
    const cy = this.SoundcloudPanel.OffsetY + App.Height * 0.5;
    return {
      x: App.Width * 0.5 - labelWidth * 0.5 - 5 * unit,
      y: cy + 136 * unit,
      w: labelWidth + 10 * unit,
      h: 46 * unit,
      label,
    };
  }
  protected fileButtonHit(point: Point): boolean {
    const rect = this.fileButtonRect();
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    );
  }
  protected drawFileButton(): void {
    const rect = this.fileButtonRect(),
      cy = this.SoundcloudPanel.OffsetY + App.Height * 0.5;
    drawUploadLink(
      this.Ctx,
      rect.label,
      App.Width * 0.5,
      cy + 160 * App.Unit,
      this.fileButtonHit(this.pointer),
    );
  }
}
