// Editing a label's words where it stands: Enter or a click elsewhere keeps them (no words: it
// goes); Escape leaves it as it was.
import { labelCssFont, labelRect } from '../../stage/labels.ts';
import { stage } from '../boot/pixi.ts';
import { theme } from '../boot/theme.ts';
import { pushUndo, undoStack } from '../editing/undoSteps.ts';
import { labels, selectedLabels } from '../model/patchModel.ts';
import { labelsChanged } from './labels.ts';

const MAX_LABEL_LENGTH = 200;
/** iOS zooms into any text field under 16 px. */
const IOS_MIN_FIELD_PX = 16;

export let measure!: CanvasRenderingContext2D;
export let labelEdit: { id: string; input: HTMLInputElement } | null = null;

/** The field is 16 px, scaled down to the label's size. */
function placeField(input: HTMLInputElement, rect: ReturnType<typeof labelRect>): void {
  const metrics = stage.metrics;
  const font = labelCssFont(metrics);
  const fontPx = Number(/([\d.]+)px/.exec(font)?.[1] ?? IOS_MIN_FIELD_PX);
  const scale = Math.min(1, fontPx / IOS_MIN_FIELD_PX);
  const width = Math.max(140, (rect.w + 80 * metrics.scaledUnit) / metrics.dpr);
  const height = rect.h / metrics.dpr;
  input.style.cssText =
    `position:fixed;left:${rect.textX / metrics.dpr}px;top:${rect.y / metrics.dpr}px;` +
    `height:${height / scale}px;width:${width / scale}px;transform:scale(${scale});transform-origin:0 0;` +
    `font:${font.replace(/[\d.]+px/, `${fontPx / scale}px`)};color:${theme.colors[theme.roles.txt]};` +
    'background:transparent;border:none;outline:none;padding:0;margin:0;text-transform:uppercase;z-index:5;';
}

export function editLabel(id: string): void {
  endLabelEdit(true);
  const label = labels.find((candidate) => candidate.id === id);
  if (!label) return;
  const input = document.createElement('input');
  input.id = 'labelEdit';
  input.type = 'text';
  input.value = label.text;
  input.maxLength = MAX_LABEL_LENGTH;
  input.spellcheck = false;
  placeField(input, labelRect(measure, stage.metrics, label));
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') endLabelEdit(true);
    else if (event.key === 'Escape') endLabelEdit(false);
  });
  input.addEventListener('blur', () => {
    endLabelEdit(true);
  });
  document.body.appendChild(input);
  labelEdit = { id, input };
  input.focus();
  input.select();
  stage.redraw();
}

/** No words: the label goes. Just made, its add step goes too; else the removal can be undone. */
function removeEmptyLabel(label: (typeof labels)[number]): void {
  const top = undoStack.at(-1);
  const justMade =
    top?.kind === 'add' &&
    !top.uids.length &&
    top.labels?.length === 1 &&
    top.labels[0] === label.id;
  if (justMade) undoStack.pop();
  else pushUndo({ kind: 'remove', snaps: [], labels: [{ ...label }] });
  labels.splice(labels.indexOf(label), 1);
  selectedLabels.delete(label.id);
}

export function endLabelEdit(keep: boolean): void {
  const editing = labelEdit;
  if (!editing) return;
  labelEdit = null;
  const label = labels.find((candidate) => candidate.id === editing.id);
  const text = editing.input.value.trim();
  editing.input.remove();
  // iOS scrolled the page to show the field above its keyboard.
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  if (label && keep) {
    if (text) label.text = text;
    else removeEmptyLabel(label);
    labelsChanged();
  }
  stage.redraw();
}

export function init(): void {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('BlokDust: no 2D canvas to measure labels');
  measure = context;
}
