// OPEN: the patches saved here and the presets, and the steps before opening.
import { App } from '../shim.ts';
import { COPY } from './copy.ts';
import { drawBin } from './icons.ts';
import { PatchesSaveTab } from './saveTab.ts';

export abstract class PatchesOpenTab extends PatchesSaveTab {
  scrollOpen(dy: number): void {
    this.OpenScroll = Math.max(0, Math.min(this.openMaxScroll(), this.OpenScroll + dy));
    this.settled();
  }
  protected drawList(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      margin = this.margin,
      pageW = this.pageW,
      stageWidth = App.Width,
      txt = App.Palette[App.ThemeManager.Txt],
      layout = this.openLayout();
    // RULE (no hint: owner, 2026-11-18) //
    App.StrokeColor(ctx, txt);
    ctx.beginPath();
    ctx.moveTo(margin, layout.rule);
    ctx.lineTo(margin + pageW, layout.rule);
    ctx.stroke();

    // ROWS (v1 SoundcloudPanel track loop), clipped to the window and scrolled //
    const n0 = this.Items.length;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      margin - 5 * unit,
      layout.rule + unit,
      pageW + 15 * unit,
      layout.bottom - layout.rule - unit,
    );
    ctx.clip();
    for (let index = 0; index < n0; index++) {
      const y = this.openRowY(index);
      if (y + 20 * unit < layout.top || y - 40 * unit > layout.bottom) continue;
      if (index < n0 - 1) {
        App.StrokeColor(ctx, App.Palette[1]);
        ctx.beginPath();
        ctx.moveTo(margin, y + this.rowH - this.rowDivider);
        ctx.lineTo(margin + pageW, y + this.rowH - this.rowDivider);
        ctx.stroke();
      }
      const item = this.Items[index],
        b = this.rowButtons(index);
      App.FillColor(ctx, txt);
      ctx.font = this.rowFont;
      ctx.textAlign = 'left';
      // A long name is narrowed to the room left of OPEN, not run under it.
      const room = b.open.x - 8 * unit - (margin + unit),
        fit = (text: string, yy: number) => {
          const textWidth = ctx.measureText(text).width;
          if (textWidth <= room) {
            ctx.fillText(text, margin + unit, yy);
            return;
          }
          ctx.save();
          ctx.translate(margin + unit, yy);
          ctx.scale(room / textWidth, 1);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        };
      fit(item.name.toUpperCase(), y - this.rowGap);
      fit(item.detail, y);
      // OPEN (text-colour border) and INSERT (the lighter rule colour): both explicit, Open the
      // stronger. No hover mark: v1's bordered buttons (Randomise Title, Search) have none.
      this.drawBordered(b.open, txt);
      this.drawBordered(b.insert, App.Palette[1]);
      if (item.removable)
        drawBin(ctx, b.bin.cx, b.bin.cy, this.roll[`bin${index}`] ? 0.55 * 1.2 : 0.55);
    }
    ctx.restore();

    // EMPTY / LOADING //
    App.FillColor(ctx, txt);
    if (!n0 && this.Loading)
      App.AnimationsLayer.DrawSprite(
        ctx,
        'loading',
        stageWidth * 0.5,
        (layout.top + layout.bottom) / 2,
        16,
        true,
      );
    else if (!n0) {
      ctx.font = App.Metrics.TxtHeader;
      ctx.textAlign = 'center';
      ctx.fillText(
        COPY.empty.toUpperCase(),
        stageWidth * 0.5,
        (layout.top + layout.bottom) / 2 + 10 * unit,
      );
    }

    // OPEN FROM YOUR DEVICE: bordered, as RANDOMISE TITLE (owner, 2026-11-18) //
    if (this.fileButtonShown) this.drawBordered(this.fileButton(), txt);
  }

  protected drawFile(): void {
    const picked = this.Picked,
      unit = App.Unit,
      menu = App.ThemeManager.MenuOrder;
    if (!picked) return;
    this.heading(
      picked.error ? 'Not a BlokDust patch' : picked.title,
      picked.error ?? picked.fileName,
    );
    if (!picked.error) {
      const { left, right } = this.halves(),
        ctx = this.Ctx;
      for (const b of [left, right]) b.y = this.cy + 5 * unit;
      this.filled(left, App.Palette[menu[3]], COPY.open, !!this.roll.fileOpen);
      this.filled(right, App.Palette[menu[1]], COPY.insert, !!this.roll.fileInsert);
      App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'center';
      ctx.fillText(COPY.openDesc, left.cx, this.cy + 70 * unit);
      ctx.fillText(COPY.insertDesc, right.cx, this.cy + 70 * unit);
    }
    this.drawBack();
  }
  /** Delete one of the user's patches: v1's CANCEL-coloured and SAVE-coloured half buttons. */
  protected drawRemove(): void {
    const item = this.removing,
      menu = App.ThemeManager.MenuOrder,
      unit = App.Unit,
      { left, right } = this.halves();
    if (!item) return;
    this.heading(`${COPY.remove} ${item.name}?`, this.host.removeLine(item));
    for (const b of [left, right]) b.y = this.cy + 5 * unit;
    this.filled(left, App.Palette[1], COPY.cancel, !!this.roll.removeCancel);
    this.filled(right, App.Palette[menu[3]], COPY.removeButton, !!this.roll.removeOk);
  }
  protected drawConfirm(): void {
    const menu = App.ThemeManager.MenuOrder,
      [first, second, third] = this.thirds();
    this.heading(COPY.confirm, COPY.confirmLine);
    const font = App.Metrics.TxtMid;
    this.filled(first, App.Palette[1], COPY.cancel, !!this.roll.cancel, font, 18.5);
    this.filled(
      second,
      App.Palette[menu[1]],
      this.Saving ? COPY.saving : COPY.saveFirst,
      !!this.roll.saveFirst && !this.Saving,
      font,
      18.5,
    );
    this.filled(third, App.Palette[menu[3]], COPY.openAnyway, !!this.roll.openAnyway, font, 18.5);
  }
}
