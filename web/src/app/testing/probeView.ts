// Where things are on screen, in css px, for the browser tests to click and check.
import { measure } from '../labels/labelEditing.ts';
import { labelRect } from '../../stage/labels.ts';
import type { ButtonBox } from '../../stage/makeStageButton.ts';
import { stage } from '../boot/pixi.ts';
import { labels } from '../model/patchModel.ts';
import { inside } from '../model/stageWorlds.ts';
import { shareLink } from '../model/unsavedChanges.ts';
import { ownDirty, ownLink, quickSaving } from '../share/ownLink.ts';
import { accountPage, cornerBoxes, credit, saveHover } from '../stage/corners.ts';
import { makeStageAt } from '../stage/makeStage.ts';
import { insideFrame } from '../stageBlock/lookInside.ts';

const toCss = (devicePixels: number) => devicePixels / stage.metrics.dpr;
const centreOf = (box?: ButtonBox | null) =>
  box ? [toCss(box.x + box.w / 2), toCss(box.y + box.h / 2)] : null;
const cssBox = (box: ButtonBox) => ({
  x: toCss(box.x),
  y: toCss(box.y),
  w: toCss(box.w),
  h: toCss(box.h),
});

/** The Stage being looked into and its window; null on the outer stage. */
export function insideView() {
  if (!inside) return null;
  const frame = insideFrame();
  return {
    stage: inside.stageId,
    x: toCss(frame.x),
    y: toCss(frame.y),
    w: toCss(frame.w),
    h: toCss(frame.h),
    closeX: toCss(frame.closeX),
    closeY: toCss(frame.closeY),
  };
}

/** Labels on the stage (CHG-0020) with their centres. */
export function labelsView() {
  return labels.map((label) => {
    const rect = labelRect(measure, stage.metrics, label);
    return { ...label, cx: toCss(rect.x + rect.w / 2), cy: toCss(rect.y + rect.h / 2) };
  });
}

/** The MAKE STAGE button's centre and box, or null when it is not offered. */
export function makeStageView() {
  if (!makeStageAt) return null;
  return { ...cssCentre(makeStageAt), box: cssBox(makeStageAt) };
}

function cssCentre(box: ButtonBox) {
  return { x: toCss(box.x + box.w / 2), y: toCss(box.y + box.h / 2) };
}

export function selectedBoundsView() {
  const bounds = stage.selectedBounds();
  return (
    bounds && {
      x0: toCss(bounds.x0),
      y0: toCss(bounds.y0),
      x1: toCss(bounds.x1),
      y1: toCss(bounds.y1),
    }
  );
}

/** A point on block `id` that the stage's own hit test maps to it (black-box tests click there). */
export function blockPoint(id: number): [number, number] | null {
  const block = stage.block(id);
  if (!block) return null;
  const metrics = stage.metrics;
  const centreX = toCss(metrics.originX + block.x * metrics.scaledGridSize);
  const centreY = toCss(metrics.originY + block.y * metrics.scaledGridSize);
  const gridSize = toCss(metrics.scaledGridSize);
  for (let radius = 0; radius <= 2.5; radius += 0.25)
    for (let step = 0; step < 8; step++) {
      const x = centreX + Math.cos((step * Math.PI) / 4) * radius * gridSize;
      const y = centreY + Math.sin((step * Math.PI) / 4) * radius * gridSize;
      if (stage.hitTest(x, y)?.id === id) return [x, y];
    }
  return null;
}

export function gridToCss(gridX: number, gridY: number): [number, number] {
  const metrics = stage.metrics;
  return [
    toCss(metrics.originX + gridX * metrics.scaledGridSize),
    toCss(metrics.originY + gridY * metrics.scaledGridSize),
  ];
}

/** The corners: a patch's credit and who is signed in, with where to click. */
export function cornersView() {
  const creditBox = cornerBoxes.credit;
  // The title's start, clear of the @NAME link and the star.
  const titleAt = creditBox
    ? [toCss(creditBox.x + 12 * stage.metrics.unit), toCss(creditBox.y + creditBox.h / 2)]
    : null;
  return {
    credit,
    me: accountPage()?.Account?.handle ?? null,
    byAt: centreOf(cornerBoxes.by),
    meAt: centreOf(cornerBoxes.me),
    meBox: cornerBoxes.me && cssBox(cornerBoxes.me),
    likeAt: centreOf(cornerBoxes.like),
    creditAt: titleAt,
    // Quick save (CHG-0033): the own patch's line and its UNSAVED / SAVE word.
    own:
      ownLink() && shareLink
        ? { title: shareLink.title, dirty: ownDirty, saving: quickSaving, hover: saveHover }
        : null,
    saveAt: centreOf(cornerBoxes.save),
  };
}
