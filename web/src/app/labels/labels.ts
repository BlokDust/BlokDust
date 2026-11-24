import { type Label, labelRect, labelCssFont } from '../../stage/labels.ts';
import { juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { theme } from '../boot/theme.ts';
import { moveBlock } from '../editing/deleteBlocks.ts';
import { type XY, pushUndo, undoStack } from '../editing/undoSteps.ts';
import { primaryId } from '../input/pinch.ts';
import { STILL_PX } from '../input/selection.ts';
import { changed } from '../model/autosave.ts';
import { labels, model, selLabels, selectedLabels } from '../model/patchModel.ts';

// ---- labels (CHG-0020, UI-0011): text on the stage with a drag dot. Press and drag moves one (onto the bin deletes
// it); a press without a drag edits its words in place. They are not blocks: the engine never hears of them. ----
export let measure!: CanvasRenderingContext2D;

export let labelDrag: {
  id: string;
  pointer: number;
  grabX: number;
  grabY: number;
  moved: boolean;
  fresh: boolean;
  downX: number;
  downY: number;
  /** Dragging a selected label moves the whole selection (whole cells, as blocks move); where its blocks started. */
  group?: Map<number, XY>;
  /** Where the dragged labels were at the start (undo). */
  labelFrom?: Map<string, XY>;
} | null = null;

export let labelEdit: { id: string; input: HTMLInputElement } | null = null;

export const labelsChanged = () => {
  changed();
  if (juce) juce.emitEvent('bd_labels', { labels });
  stage.redraw();
};

export const readLabels = (list: unknown): Label[] =>
  (Array.isArray(list) ? list : []).flatMap((l, i) =>
    l &&
    typeof l === 'object' &&
    typeof (l as Label).text === 'string' &&
    Number.isFinite((l as Label).x) &&
    Number.isFinite((l as Label).y)
      ? [
          {
            id: typeof (l as Label).id === 'string' ? (l as Label).id : `l${i + 1}`,
            text: (l as Label).text.slice(0, 200),
            x: (l as Label).x,
            y: (l as Label).y,
          },
        ]
      : [],
  );

/** Add labels, giving each an id no other label has. */
export function addLabels(list: Label[]): void {
  for (const l of list) {
    let id = l.id;
    for (let k = 1; labels.some((x) => x.id === id); k++) id = `l${labels.length + k}`;
    labels.push({ ...l, id });
  }
}

/** A new label from the menu: it follows the pointer until that lifts, then opens for typing. */
export function newLabel(gx: number, gy: number): void {
  addLabels([{ id: `l${labels.length + 1}`, text: 'LABEL', x: gx, y: gy }]);
  const l = labels[labels.length - 1];
  pushUndo({ kind: 'add', uids: [], labels: [l.id] });
  labelDrag = {
    id: l.id,
    pointer: primaryId ?? -1,
    grabX: 0,
    grabY: 0,
    moved: true,
    fresh: true,
    downX: 0,
    downY: 0,
  };
  labelsChanged();
}

export function moveLabel(e: PointerEvent): void {
  const l = labels.find((x) => x.id === labelDrag!.id);
  if (!l) return;
  if (
    !labelDrag!.moved &&
    Math.hypot(e.offsetX - labelDrag!.downX, e.offsetY - labelDrag!.downY) > STILL_PX
  )
    labelDrag!.moved = true;
  if (!labelDrag!.moved) return;
  const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
  if (labelDrag!.group) {
    const dx = Math.round(gx - labelDrag!.grabX - l.x),
      dy = Math.round(gy - labelDrag!.grabY - l.y);
    if (dx || dy) {
      for (const o of selLabels()) {
        o.x += dx;
        o.y += dy;
      }
      for (const id of labelDrag!.group.keys()) {
        const b = model.get(id);
        if (b) moveBlock(id, b.x + dx, b.y + dy);
      }
    }
    stage.redraw();
    return;
  }
  l.x = Math.round((gx - labelDrag!.grabX) * 2) / 2;
  l.y = Math.round((gy - labelDrag!.grabY) * 2) / 2; // half cells: tidy, but free enough
  stage.redraw();
}

/** Edit a label's words where it stands: Enter or a click elsewhere keeps them (no words: the label goes); Escape
 * leaves it as it was. */
export function editLabel(id: string): void {
  endLabelEdit(true);
  const l = labels.find((x) => x.id === id);
  if (!l) return;
  const m = stage.metrics,
    r = labelRect(measure, m, l),
    input = document.createElement('input');
  input.id = 'labelEdit';
  input.type = 'text';
  input.value = l.text;
  input.maxLength = 200;
  input.spellcheck = false;
  // iOS zooms the page into any text field under 16 px: the field is 16 px, scaled down to the label's size.
  const font = labelCssFont(m),
    px = Number(/([\d.]+)px/.exec(font)?.[1] ?? 16),
    k = Math.min(1, px / 16);
  const w = Math.max(140, (r.w + 80 * m.scaledUnit) / m.dpr),
    h = r.h / m.dpr;
  input.style.cssText =
    `position:fixed;left:${r.textX / m.dpr}px;top:${r.y / m.dpr}px;height:${h / k}px;width:${w / k}px;transform:scale(${k});transform-origin:0 0;` +
    `font:${font.replace(/[\d.]+px/, `${px / k}px`)};color:${theme.colors[theme.roles.txt]};background:transparent;border:none;outline:none;padding:0;margin:0;text-transform:uppercase;z-index:5;`;
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') endLabelEdit(true);
    else if (e.key === 'Escape') endLabelEdit(false);
  });
  input.addEventListener('blur', () => endLabelEdit(true));
  document.body.appendChild(input);
  labelEdit = { id, input };
  input.focus();
  input.select();
  stage.redraw();
}

// tests
export function endLabelEdit(keep: boolean): void {
  const e = labelEdit;
  if (!e) return;
  labelEdit = null;
  const l = labels.find((x) => x.id === e.id),
    text = e.input.value.trim();
  e.input.remove();
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0); // iOS scrolls the page to show the field above its keyboard
  if (l && keep) {
    if (text) l.text = text;
    else {
      // no words: the label goes. Just made: its add step goes too; else this is a removal to undo.
      const top = undoStack[undoStack.length - 1];
      if (
        top?.kind === 'add' &&
        !top.uids.length &&
        top.labels?.length === 1 &&
        top.labels[0] === l.id
      )
        undoStack.pop();
      else pushUndo({ kind: 'remove', snaps: [], labels: [{ ...l }] });
      labels.splice(labels.indexOf(l), 1);
      selectedLabels.delete(l.id);
    }
    labelsChanged();
  }
  stage.redraw();
}

export function setLabelDrag<Value extends typeof labelDrag>(value: Value): Value {
  labelDrag = value;
  return value;
}

export function init(): void {
  measure = document.createElement('canvas').getContext('2d')!;
}
