// The options panel's open, made cancellable.
import type { V1Block } from '../blocks/v1Block.ts';
import type { V2OptionsPanel } from '../optionsTypes.ts';
import { App, Point } from '../shim.ts';

/** v1 OptionsPanel.Open, keeping its 400 ms wait before the panel pops open so `CancelOpen()` can
 * call it off (a double click on a Stage block opens the Stage, not its panel). */
export function cancellableOpen(panel: V2OptionsPanel): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  panel.Open = (block: V1Block) => {
    block.UpdateOptionsForm();
    const form = block.OptionsForm;
    if (!form) return;
    if (panel.Scale === 1 && block !== panel.SelectedBlock) panel.Close();
    panel.Opening = true;
    panel.SelectedBlock = block;
    App.MainScene.MainSceneDragger.Jump(
      block.Position,
      new Point(App.Metrics.OptionsPoint.x, App.Metrics.OptionsPoint.y),
    );
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
    clearTimeout(timer);
    timer = undefined;
    panel.Opening = false;
  };
}
