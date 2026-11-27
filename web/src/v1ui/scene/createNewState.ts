// CreateNew's CLEAR icon: shown whenever the stage holds a block (SPEC-VISUAL-V1-PARITY R23).
import { App } from '../shim.ts';
import type { CreateNew } from '../ported/UI/CreateNew';

/** v1 CheckState needed two blocks and a finished hide tween, so a scene opened mid-reset left the
 * icon hidden; this follows whether the stage is empty (owner), with v1's tweens. */
export function followStageForCreateNew(createNew: CreateNew): void {
  let shown = false;
  createNew.CheckState = function (this: CreateNew) {
    const show = App.Blocks.length > 0;
    if (show !== shown) {
      shown = show;
      // v1 stopped every CreateNew tween; the confirm panel's close (from a hide a moment ago)
      // restarts so it doesn't stop half-way.
      this.StopAllTweens();
      if (!this.Open) {
        if (this.Selected !== 0) this.DelayTo(this, 0, 0.3, 0, 'Selected');
        if (this.PanelOffset.y !== -1) this.DelayTo(this.PanelOffset, -1, 0.3, 0, 'y');
      }
      if (this.PanelOffset2.y !== 1 && this.PanelOffset2.y !== 0) this.CloseMessage();
      if (show) {
        this.DelayTo(this.IconOffset, 0, 0.6, 0, 'x');
        this.DelayTo(App.MainScene.Header, 30, 0.6, 0, 'CreateNewMargin');
      } else {
        // v1 CheckState's hide: the confirm panel and the message close with the icon
        if (this.Open) {
          this.Open = false;
          this.DelayTo(this, 0, 0.3, 0, 'Selected');
          this.DelayTo(this.PanelOffset, -1, 0.3, 0, 'y');
        }
        if (this.PanelOffset2.y === 0) this.CloseMessage();
        this.DelayTo(this.IconOffset, -1, 0.6, 0, 'x');
        this.DelayTo(App.MainScene.Header, 0, 0.6, 0, 'CreateNewMargin');
      }
    }
    this.BlockCount = App.Blocks.length;
  };
}
