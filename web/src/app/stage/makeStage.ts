import { type ButtonBox } from '../../stage/makeStageButton.ts';
import { stage } from '../boot/pixi.ts';
import { placing } from '../editing/placing.ts';
import { drag } from '../input/pointerState.ts';
import { selection, setSelection } from '../input/selection.ts';
import { model, selectedLabels } from '../model/patchModel.ts';
import { inside } from '../model/stageWorlds.ts';
import { canGoInside, wrapInStage } from '../stageBlock/fillStage.ts';

// ---- MAKE STAGE (owner, 2026-11-14; UI-0012): with blocks selected, a button puts them inside a new Stage block ----
export const MAKE_STAGE = 'MAKE STAGE';

export let makeStageAt: ButtonBox | null = null,
  makeStageHover = false;

// (stage.selected is the selection; tested first, as this runs from draws made before the pointer state below exists)
export const offerMakeStage = () =>
  stage.selected.size > 0 && !inside && !placing && !drag && canGoInside(stage.selected);

/** The selected blocks go inside a new Stage block where they were (as Cmd/Ctrl+G); it is then the one selected. */
export function makeStage(): void {
  const bs = [...selection].map((id) => model.get(id)!).filter(Boolean);
  if (!bs.length) return;
  const id = wrapInStage(
    [...selection],
    Math.round(bs.reduce((a, b) => a + b.x, 0) / bs.length),
    Math.round(bs.reduce((a, b) => a + b.y, 0) / bs.length),
    [...selectedLabels],
  );
  makeStageHover = false;
  if (id !== null) setSelection([id]);
  stage.redraw();
}

export function setMakeStageAt<Value extends typeof makeStageAt>(value: Value): Value {
  makeStageAt = value;
  return value;
}

export function setMakeStageHover<Value extends typeof makeStageHover>(value: Value): Value {
  makeStageHover = value;
  return value;
}
