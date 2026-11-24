// The options panel's open, made cancellable.
import { App, Point } from '../shim.ts';

/** v1 OptionsPanel.Open, with the 400 ms wait before the panel pops open kept, so it can be called off:
 * `CancelOpen()` (a double click on a Stage block opens the Stage, not its panel; owner, 2026-11-14). */
export function cancellableOpen(panel: any): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  panel.Open = (block: any) => {
    block.UpdateOptionsForm();
    if (!block.OptionsForm) return;
    if (panel.Scale == 1 && block !== panel.SelectedBlock) panel.Close();
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
