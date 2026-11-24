// Wheel, pinch and extra fingers on v1's UI (not in v1, which took one pointer).
import { App, Dimensions, Point } from '../shim.ts';
import type { V1Block } from '../blocks.ts';
import { V1ScenePlayheads } from './playheads.ts';

export abstract class V1SceneTouch extends V1ScenePlayheads {
  /** A mouse wheel over the UI: the gallery's list scrolls (owner review 2); elsewhere v1's zoom buttons take it. */
  wheel(event: WheelEvent): void {
    if (this.PatchesPanel.Open) {
      this.PatchesPanel.Wheel(event);
      return;
    }
    this.ZoomButtons.MouseWheel(event);
  }

  // ---- multi-touch (CHG-0005 task 8; not in v1, which took one pointer) ----
  /** Is (x, y) device px on the UI (an open panel, the header with its open menu, the options panel)? Another finger
   * there doesn't grab the block underneath. */
  uiAt(x: number, y: number): boolean {
    if (
      this.SharePanel.Open ||
      this.SettingsPanel.Open ||
      this.PatchesPanel.Open ||
      this.SoundcloudPanel.Open
    )
      return true;
    const header = this.Header as any,
      unit = App.Unit;
    if (y < (header.Height * (header.Rows ?? 1) + (header.DropDown ?? 0)) * unit) return true;
    return (
      this.OptionsPanel.Scale === 1 && !!(this.OptionsPanel as any).OutlineTest(new Point(x, y))
    );
  }
  /** Is (x, y) device px on the open options panel? (A trackpad pinch there never zooms the stage.) */
  optionsPanelAt(x: number, y: number): boolean {
    return (
      this.OptionsPanel.Scale === 1 && !!(this.OptionsPanel as any).OutlineTest(new Point(x, y))
    );
  }
  /** A second finger turned a stage drag into a pinch: the first finger stops dragging the stage. */
  endStageDrag(): void {
    this.MainSceneDragger.MouseUp();
  }
  /** The open options panel's slider row under (x, y) device px (v1 OptionsPanel.RolloverCheck's rect), or -1. */
  sliderIndexAt(x: number, y: number): number {
    const optionsPanel = this.OptionsPanel as any,
      unit = App.Unit;
    if (optionsPanel.Scale !== 1 || !optionsPanel.SelectedBlock) return -1;
    return (optionsPanel.Options ?? []).findIndex(
      (opt: any) =>
        (opt.Type === 'slider' || opt.Type === 'waveslider') &&
        Dimensions.hitRect(
          optionsPanel.Position.x + optionsPanel.Margin - 10 * unit,
          optionsPanel.Position.y + opt.Position.y,
          optionsPanel.Range + 20 * unit,
          opt.Size.height,
          x,
          y,
        ),
    );
  }
  /** Another finger drags slider `i` (v1 OptionsPanel.SliderSet). It is not marked Selected: v1 moves every selected
   * slider to the first finger. */
  setSlider(i: number, x: number): void {
    const optionsPanel = this.OptionsPanel as any;
    if (optionsPanel.Scale === 1 && optionsPanel.Options?.[i]) optionsPanel.SliderSet(i, x);
  }
  /** Pinch zoom: the view follows the fingers; the zoom readout shows as with v1's zoom buttons. */
  pinchView(zoom: number, drag: { x: number; y: number }): void {
    const z = this.ZoomButtons as any;
    z.StopAllTweens?.();
    this.MainSceneDragger.StopAllTweens();
    z.ZoomAlpha = 1;
    this.MainSceneDragger.Destination.x = drag.x;
    this.MainSceneDragger.Destination.y = drag.y;
    this.setView(zoom, drag);
  }
  /** Fingers lifted: the zoom buttons step on from the nearest of v1's levels; the readout fades as after a step. */
  pinchEnd(): void {
    const z = this.ZoomButtons as any,
      slots: number[] = z._ZoomSlots ?? [0.15, 0.25, 0.5, 1, 2, 4];
    let best = 0;
    slots.forEach((slot, i) => {
      if (
        Math.abs(Math.log(slot / App.ZoomLevel)) < Math.abs(Math.log(slots[best] / App.ZoomLevel))
      )
        best = i;
    });
    z.CurrentSlot = best;
    z.DelayTo?.(z, 0, 500, 700, 'ZoomAlpha');
  }

  /** The slider row of the open options panel under (x, y) device px, using v1 OptionsPanel.HitTests' row rect. */
  sliderAt(x: number, y: number): { block: V1Block; setting: string; name: string } | null {
    const optionsPanel = this.OptionsPanel,
      unit = App.Unit;
    if (optionsPanel.Scale !== 1 || !optionsPanel.SelectedBlock) return null;
    for (const opt of optionsPanel.Options ?? []) {
      if (opt.Type !== 'slider') continue;
      const rx = optionsPanel.Position.x + optionsPanel.Margin - 10 * unit,
        ry = optionsPanel.Position.y + opt.Position.y;
      if (x > rx && x < rx + optionsPanel.Range + 20 * unit && y > ry && y < ry + opt.Size.height)
        return { block: optionsPanel.SelectedBlock, setting: opt.Setting, name: opt.Name };
    }
    // The Filter's graph (CHG-0010) stands in for its Frequency and Gain sliders: the handle is Gain, the width bar
    // Width, anywhere else on the graph Frequency (the menu's title names which).
    const option =
      optionsPanel.SelectedBlock.def?.id === 'fx.filter'
        ? optionsPanel.Options?.find((Option: any) => Option.Type === 'parametric')
        : null;
    if (option) {
      const rx = optionsPanel.Position.x + optionsPanel.Margin - 10 * unit,
        ry = optionsPanel.Position.y + option.Position.y;
      if (
        x > rx &&
        x < rx + optionsPanel.Range + 20 * unit &&
        y > ry &&
        y < ry + option.Size.height
      ) {
        optionsPanel.RolloverCheck(x, y);
        if (option.HandleRoll[1])
          return { block: optionsPanel.SelectedBlock, setting: 'gain', name: 'Gain' };
        if (option.SubHandleRoll[1])
          return { block: optionsPanel.SelectedBlock, setting: 'Q', name: 'Width' };
        return { block: optionsPanel.SelectedBlock, setting: 'frequency', name: 'Frequency' };
      }
    }
    return null;
  }
}
