// v1's drawing pieces the Patches panel is built from.
import { App } from '../shim.ts';
import { COPY } from './copy.ts';
import { PatchesDom } from './dom.ts';

export abstract class PatchesDrawParts extends PatchesDom {
  /** A filled button with v1's hover notch under its centre (SharePanel / SettingsPanel). */
  protected filled(
    b: { x: number; y: number; w: number; h: number; cx: number },
    colour: string,
    label: string,
    hover: boolean,
    font = App.Metrics.TxtUrl2,
    textDy = 29,
    text = App.Palette[App.ThemeManager.Txt],
  ) {
    const ctx = this.Ctx,
      unit = App.Unit;
    App.FillColor(ctx, colour);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (hover) {
      ctx.beginPath();
      ctx.moveTo(b.cx, b.y + b.h + 9 * unit);
      ctx.lineTo(b.cx - 10 * unit, b.y + b.h - unit);
      ctx.lineTo(b.cx + 10 * unit, b.y + b.h - unit);
      ctx.closePath();
      ctx.fill();
    }
    App.FillColor(ctx, text);
    ctx.textAlign = 'center';
    ctx.font = font;
    // v1's 24-unit type, narrowed to fit a half button when a label is longer ("CREATE NEW").
    const labelWidth = ctx.measureText(label.toUpperCase()).width,
      max = b.w - 12 * unit;
    if (labelWidth > max) {
      ctx.save();
      ctx.translate(b.cx, 0);
      ctx.scale(max / labelWidth, 1);
      ctx.fillText(label.toUpperCase(), 0, b.y + textDy * unit);
      ctx.restore();
    } else ctx.fillText(label.toUpperCase(), b.cx, b.y + textDy * unit);
  }
  protected drawBordered(
    b: { label: string; x: number; y: number; w: number; h: number; textX: number; textY: number },
    stroke: string,
    dx = 0,
  ) {
    const ctx = this.Ctx;
    ctx.font = App.Metrics.TxtMid;
    ctx.textAlign = 'left';
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.fillText(b.label.toUpperCase(), b.textX + dx, b.textY);
    App.StrokeColor(ctx, stroke);
    ctx.beginPath();
    ctx.rect(b.x + dx, b.y, b.w, b.h);
    ctx.stroke();
  }

  /** v1 OptionSwitch.Draw, style 1, mode "offOn": the chosen side underlined in the options colour;
   * its name after it, and (dimmed) a line saying why it can't be used. */
  protected drawSwitch(
    b: { x: number; y: number; w: number; h: number },
    name: string,
    on: boolean,
    enabled: boolean,
    note: string,
  ): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      txt = App.Palette[App.ThemeManager.Txt],
      { x, y, w, h } = b;
    ctx.save();
    if (!enabled) ctx.globalAlpha = 0.5;
    App.StrokeColor(ctx, App.Palette[1]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(x + w * 0.5), y + h * 0.15);
    ctx.lineTo(Math.round(x + w * 0.5), y + h * 0.55);
    ctx.stroke();
    App.FillColor(ctx, App.Palette[App.ThemeManager.OptionsOrder[2]]);
    ctx.fillRect(on ? x + w * 0.5 : x, y + h * 0.55, w * 0.5, h * 0.05);
    App.StrokeColor(ctx, txt);
    const cy = y + h * 0.35,
      lx = x + w * 0.25,
      rx = x + w * 0.75;
    ctx.beginPath();
    ctx.moveTo(lx - 5 * unit, cy);
    ctx.lineTo(lx + 5 * unit, cy);
    ctx.moveTo(rx + 5 * unit, cy);
    ctx.lineTo(rx, cy - 5 * unit);
    ctx.lineTo(rx - 5 * unit, cy);
    ctx.lineTo(rx, cy + 5 * unit);
    ctx.lineTo(rx + 5 * unit, cy);
    ctx.stroke();
    ctx.restore();
    App.FillColor(ctx, txt);
    ctx.textAlign = 'left';
    ctx.font = App.Metrics.TxtMid;
    ctx.fillText(name.toUpperCase(), x + w + 12 * unit, cy + (note ? -2 : 4) * unit);
    // The note wraps inside this switch's half of the page.
    if (note) {
      ctx.font = App.Metrics.TxtItalic2;
      this.wordWrap(
        note,
        x + w + 12 * unit,
        cy + 12 * unit,
        12 * unit,
        this.pageW * 0.5 - 10 * unit - w - 12 * unit,
      );
    }
  }

  /** The file and confirm steps' heading: v1's header type over italic copy (SharePanel). */
  protected heading(title: string, line: string): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      cy = this.cy;
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.textAlign = 'left';
    ctx.font = App.Metrics.TxtHeader;
    // A long patch name is narrowed to the page width rather than run off it.
    const titleWidth = ctx.measureText(title.toUpperCase()).width;
    if (titleWidth > this.pageW) {
      ctx.save();
      ctx.translate(this.margin, 0);
      ctx.scale(this.pageW / titleWidth, 1);
      ctx.fillText(title.toUpperCase(), 0, cy - 72 * unit);
      ctx.restore();
    } else ctx.fillText(title.toUpperCase(), this.margin, cy - 72 * unit);
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.beginPath();
    ctx.moveTo(this.margin, cy - 60 * unit);
    ctx.lineTo(this.margin + this.pageW, cy - 60 * unit);
    ctx.stroke();
    ctx.font = App.Metrics.TxtItalic2;
    this.wordWrap(line, this.margin, cy - 40 * unit, 14 * unit, this.pageW);
  }
  protected drawBack(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      { x, y } = this.backArrow();
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.beginPath();
    ctx.moveTo(x + 10 * unit, y - 20 * unit);
    ctx.lineTo(x - 10 * unit, y);
    ctx.lineTo(x + 10 * unit, y + 20 * unit);
    ctx.stroke();
    ctx.font = App.Metrics.TxtMid;
    ctx.textAlign = 'center';
    ctx.fillText(COPY.back.toUpperCase(), x, y + 35 * unit);
  }

  /** v1 SharePanel.WordWrap. */
  protected wordWrap(
    text: string,
    x: number,
    y: number,
    lineHeight: number,
    fitWidth: number,
  ): void {
    const ctx = this.Ctx;
    let words = text.split(' '),
      line = 0,
      idx = 1;
    while (words.length > 0 && idx <= words.length) {
      const firstWidth = ctx.measureText(words.slice(0, idx).join(' ')).width;
      if (firstWidth > fitWidth) {
        if (idx === 1) idx = 2;
        ctx.fillText(words.slice(0, idx - 1).join(' '), x, y + lineHeight * line);
        line++;
        words = words.splice(idx - 1);
        idx = 1;
      } else idx++;
    }
    if (idx > 0) ctx.fillText(words.join(' '), x, y + lineHeight * line);
  }
}
