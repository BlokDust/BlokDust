// The stage's corner text: the patch's credit and the account (owner review 2026-11-15).
import { drawUpArrow } from '../../v1ui/patches/icons.ts';
import { type ButtonBox, inBox } from '../../stage/makeStageButton.ts';
import { App } from '../../v1ui/shim.ts';
import { stage } from '../boot/pixi.ts';
import { theme } from '../boot/theme.ts';
import { inside } from '../model/stageWorlds.ts';
import { shareLink } from '../model/unsavedChanges.ts';
import { accountSettings, openAccountSettings } from '../scene/hostParts.ts';
import { scene } from '../scene/scene.ts';
import { ownDirty, ownLink, quickSave, quickSaving } from '../share/ownLink.ts';
import { likeCredit } from './likes.ts';

/** Top left: someone else's patch, "TITLE BY @NAME" (SPEC-SHARING-GALLERY R15), the name opening
 * their gallery; published, a like chevron. Top right: the account (SPEC-SHARING-ACCOUNTS R14). */
export let credit: {
  id: string;
  title: string;
  by: string;
  published: boolean;
  liked: boolean;
  likes: number;
  views: number;
} | null = null;

export let cornerBoxes: {
  by?: ButtonBox;
  me?: ButtonBox;
  like?: ButtonBox;
  credit?: ButtonBox;
  save?: ButtonBox;
} = {};

export let byHover = false,
  meHover = false,
  saveHover = false;

export const accountPage = () => accountSettings().accountPage;

/** v1's metrics (fonts) exist once its scene has started. */
const v1TypeReady = () => !!(App as { Metrics?: { TxtMid?: string } }).Metrics?.TxtMid;

export function drawCorners(ctx: CanvasRenderingContext2D): void {
  cornerBoxes = {};
  if (inside) return;
  const metrics = stage.metrics,
    unit = metrics.unit,
    header = scene.Header as unknown as { Height: number; Rows?: number },
    y = header.Height * (header.Rows ?? 1) * unit + 22 * unit;
  ctx.save();
  if (!v1TypeReady()) {
    ctx.restore();
    return;
  }
  // The size of Settings › About's "Current Build" line (v1's 8-unit italic), in Dosis capitals
  // (owner review 3).
  ctx.fillStyle = theme.colors[theme.roles.txt];
  ctx.font = `400 ${Math.round(unit * 8)}px Dosis`;
  ctx.textBaseline = 'alphabetic';
  if (credit) {
    const title = `${credit.title.toUpperCase()} BY `,
      by = `@${credit.by.toUpperCase()}`,
      tw = ctx.measureText(title).width,
      bw = ctx.measureText(by).width,
      x = 20 * unit;
    ctx.textAlign = 'left';
    ctx.fillText(title, x, y);
    ctx.fillText(by, x + tw, y);
    // A link: underlined only under the mouse (owner review 3, 2026-11-16).
    if (byHover) ctx.fillRect(x + tw, y + 3 * unit, bw, Math.max(1, unit * 0.6));
    cornerBoxes.by = { x: x + tw - 4 * unit, y: y - 16 * unit, w: bw + 8 * unit, h: 24 * unit };
    cornerBoxes.credit = { x: x - 4 * unit, y: y - 16 * unit, w: tw + bw + 8 * unit, h: 24 * unit };
    if (credit.published) {
      // Likes (owner's pick, B): a second line, the like chevron, the count, the views. The chevron
      // is the button; liked, it takes the options colour.
      const txt = theme.colors[theme.roles.txt],
        on = theme.colors[theme.roles.options[2]];
      const views = `${credit.views} VIEW${credit.views === 1 ? '' : 'S'}`;
      const y2 = y + 16 * unit,
        count = String(credit.likes),
        cw = ctx.measureText(count).width;
      drawUpArrow(ctx, x + 4 * unit, y2 - 3 * unit, 9 * unit, credit.liked, txt, on);
      ctx.fillText(count, x + 12 * unit, y2);
      ctx.globalAlpha = 0.6;
      ctx.fillText(`   ${views}`, x + 12 * unit + cw, y2);
      ctx.globalAlpha = 1;
      cornerBoxes.like = { x: x - 6 * unit, y: y2 - 14 * unit, w: cw + 24 * unit, h: 22 * unit };
    }
  } else if (ownLink()) {
    // Your own saved patch (SPEC-SHARING-BACKEND R19): its title, then, changed since saving, a dim
    // "· UNSAVED" that reads SAVE under the mouse, saving on a press (R18); SAVING while it saves.
    const title = (shareLink?.title || 'Untitled').toUpperCase(),
      x = 20 * unit,
      tw = ctx.measureText(title).width;
    ctx.textAlign = 'left';
    ctx.fillText(title, x, y);
    if (ownDirty || quickSaving) {
      const sep = '  ·  ',
        sw = ctx.measureText(sep).width,
        word = quickSaving ? 'SAVING' : saveHover ? 'SAVE' : 'UNSAVED',
        ww = ctx.measureText(word).width;
      ctx.globalAlpha = 0.6;
      ctx.fillText(sep, x + tw, y);
      if (!saveHover || quickSaving) ctx.fillText(word, x + tw + sw, y);
      ctx.globalAlpha = 1;
      if (saveHover && !quickSaving) {
        ctx.fillText(word, x + tw + sw, y);
        ctx.fillRect(x + tw + sw, y + 3 * unit, ww, Math.max(1, unit * 0.6));
      }
      // The box is UNSAVED's width (the wider word), so the pointer doesn't fall off it when the
      // word changes.
      const bw = Math.max(ww, ctx.measureText('UNSAVED').width);
      if (!quickSaving)
        cornerBoxes.save = {
          x: x + tw + sw - 4 * unit,
          y: y - 16 * unit,
          w: bw + 8 * unit,
          h: 24 * unit,
        };
    }
  }
  const me = accountPage()?.Account;
  if (me?.handle) {
    const text = `SIGNED IN AS ${me.handle.toUpperCase()}`,
      textWidth = ctx.measureText(text).width,
      x = metrics.width - 20 * unit;
    ctx.textAlign = 'right';
    ctx.fillText(text, x, y);
    // a link: underlined under the mouse
    if (meHover) ctx.fillRect(x - textWidth, y + 3 * unit, textWidth, Math.max(1, unit * 0.6));
    cornerBoxes.me = {
      x: x - textWidth - 4 * unit,
      y: y - 16 * unit,
      w: textWidth + 8 * unit,
      h: 24 * unit,
    };
  }
  ctx.restore();
}

/** A press on the corner text (device px): true if it was used. Not while a panel is open over the
 * stage. */
export function cornerPress(x: number, y: number): boolean {
  if (scene.PatchesPanel.Open || scene.SettingsPanel.Open || scene.OptionsPanel.Scale > 0)
    return false;
  if (cornerBoxes.by && credit && inBox(cornerBoxes.by, x, y)) {
    scene.PatchesPanel.showGallery(`@${credit.by}`);
    return true;
  }
  if (cornerBoxes.like && credit && inBox(cornerBoxes.like, x, y)) {
    likeCredit();
    return true;
  }
  if (cornerBoxes.me && inBox(cornerBoxes.me, x, y)) {
    openAccountSettings();
    return true;
  }
  if (cornerBoxes.save && inBox(cornerBoxes.save, x, y)) {
    saveHover = false;
    void quickSave();
    return true;
  }
  return false;
}

export function setCredit<Value extends typeof credit>(value: Value): Value {
  credit = value;
  return value;
}

export function setByHover<Value extends typeof byHover>(value: Value): Value {
  byHover = value;
  return value;
}

export function setMeHover<Value extends typeof meHover>(value: Value): Value {
  meHover = value;
  return value;
}

export function setSaveHover<Value extends typeof saveHover>(value: Value): Value {
  saveHover = value;
  return value;
}
