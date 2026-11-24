// Labels (CHG-0020, UI-0011): words on the stage with a drag dot, kept in the patch. Not blocks:
// the engine never hears of them.
import type { Label } from '../../stage/labels.ts';
import { juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { pushUndo } from '../editing/undoSteps.ts';
import { primaryId } from '../input/pinch.ts';
import { changed } from '../model/autosave.ts';
import { labels } from '../model/patchModel.ts';
import { setLabelDrag } from './labelDrag.ts';

const MAX_LABEL_LENGTH = 200;

export const labelsChanged = () => {
  changed();
  if (juce) juce.emitEvent('bd_labels', { labels });
  stage.redraw();
};

function isLabel(item: unknown): item is Label {
  if (!item || typeof item !== 'object') return false;
  const label = item as Label;
  return typeof label.text === 'string' && Number.isFinite(label.x) && Number.isFinite(label.y);
}

/** A patch's labels, checked; one without an id gets one. */
export const readLabels = (list: unknown): Label[] =>
  (Array.isArray(list) ? (list as unknown[]) : []).flatMap((item, index) =>
    isLabel(item)
      ? [
          {
            id: typeof item.id === 'string' ? item.id : `l${index + 1}`,
            text: item.text.slice(0, MAX_LABEL_LENGTH),
            x: item.x,
            y: item.y,
          },
        ]
      : [],
  );

/** Add labels, giving each an id no other label has. */
export function addLabels(list: Label[]): void {
  for (const label of list) {
    let id = label.id;
    for (let k = 1; labels.some((other) => other.id === id); k++) id = `l${labels.length + k}`;
    labels.push({ ...label, id });
  }
}

/** A new label from the menu: it follows the pointer until that lifts, then opens for typing. */
export function newLabel(gridX: number, gridY: number): void {
  addLabels([{ id: `l${labels.length + 1}`, text: 'LABEL', x: gridX, y: gridY }]);
  const label = labels[labels.length - 1];
  pushUndo({ kind: 'add', uids: [], labels: [label.id] });
  setLabelDrag({
    id: label.id,
    pointer: primaryId ?? -1,
    grabX: 0,
    grabY: 0,
    moved: true,
    fresh: true,
    downX: 0,
    downY: 0,
  });
  labelsChanged();
}
