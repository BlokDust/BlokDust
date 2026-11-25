// v1's drawing pieces the account page is built from, and its stats.
import { App, Point } from '../shim.ts';
import { activity } from '../../account/activity.ts';
import qrcode from 'qrcode-generator';
import { COPY } from './copy.ts';
import { FAV, PHONE, STATS_Y, menuItem, shortNumber, type Bordered, type Box } from './metrics.ts';
import { AccountPageLayout } from './layout.ts';

export abstract class AccountPageDrawParts extends AccountPageLayout {
  // ---- drawing (v1's own pieces) ----
  protected filled(b: Box, colour: string, label: string, hover: boolean, small = false): void {
    const context = this.ctx(),
      unit = App.Unit;
    App.FillColor(context, colour);
    context.fillRect(b.x, b.y, b.w, b.h);
    if (hover) {
      context.beginPath();
      context.moveTo(b.cx, b.y + b.h + 9 * unit);
      context.lineTo(b.cx - 10 * unit, b.y + b.h - unit);
      context.lineTo(b.cx + 10 * unit, b.y + b.h - unit);
      context.closePath();
      context.fill();
    }
    App.FillColor(context, App.Palette[App.ThemeManager.Txt]);
    context.textAlign = 'center';
    context.font = small ? App.Metrics.TxtMid : App.Metrics.TxtUrl2;
    const upper = label.toUpperCase(),
      labelWidth = context.measureText(upper).width,
      max = b.w - 12 * unit,
      y = b.y + (small ? 25 : 29) * unit;
    if (labelWidth > max) {
      context.save();
      context.translate(b.cx, 0);
      context.scale(max / labelWidth, 1);
      context.fillText(upper, 0, y);
      context.restore();
    } else context.fillText(upper, b.cx, y);
  }
  protected drawBordered(b: Bordered, stroke: string): void {
    const context = this.ctx();
    context.font = App.Metrics.TxtMid;
    context.textAlign = 'left';
    App.FillColor(context, App.Palette[App.ThemeManager.Txt]);
    context.fillText(b.label.toUpperCase(), b.textX, b.textY);
    App.StrokeColor(context, stroke);
    context.lineWidth = 2;
    context.beginPath();
    context.rect(b.x, b.y, b.w, b.h);
    context.stroke();
  }
  protected wrap(text: string, x: number, y: number, lh: number, width: number): number {
    const context = this.ctx();
    let line = '';
    for (const word of text.split(' ')) {
      const longer = line ? `${line} ${word}` : word;
      if (context.measureText(longer).width > width && line) {
        context.fillText(line, x, y);
        y += lh;
        line = word;
      } else line = longer;
    }
    if (line) {
      context.fillText(line, x, y);
      y += lh;
    }
    return y;
  }
  /** A sub-heading in the tab type (v1's mid type), with no rule under it, and its italic line. */
  protected heading(title: string, line: string, top: number, left: number): void {
    const context = this.ctx(),
      unit = App.Unit,
      txt = App.Palette[App.ThemeManager.Txt];
    App.FillColor(context, txt);
    context.textAlign = 'left';
    context.font = App.Metrics.TxtMid;
    context.fillText(title.toUpperCase(), left, top + 10 * unit);
    if (line) {
      context.font = App.Metrics.TxtItalic2;
      this.wrap(line, left, top + 32 * unit, 14 * unit, this.pageW());
    }
  }

  /** A QR code of `url` in the square `b`: black on white whatever the theme (phone cameras read
   * that), two modules of quiet zone. */
  protected qrCache: { url: string; n: number; dark: boolean[] } | null = null;
  protected drawQr(url: string, b: { x: number; y: number; s: number }): void {
    if (this.qrCache?.url !== url) {
      const qRCode = qrcode(0, 'M');
      qRCode.addData(url);
      qRCode.make();
      const moduleCount = qRCode.getModuleCount(),
        dark: boolean[] = [];
      for (let y = 0; y < moduleCount; y++)
        for (let x = 0; x < moduleCount; x++) dark.push(qRCode.isDark(y, x));
      this.qrCache = { url, n: moduleCount, dark };
    }
    const { n, dark } = this.qrCache,
      context = this.ctx(),
      cell = b.s / (n + 4);
    context.fillStyle = '#ffffff';
    context.fillRect(b.x, b.y, b.s, b.s);
    context.fillStyle = '#000000';
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (dark[y * n + x])
          context.fillRect(
            b.x + (x + 2) * cell,
            b.y + (y + 2) * cell,
            Math.ceil(cell),
            Math.ceil(cell),
          );
  }

  /** A row of numbers, four columns across the page: each large and light over its label. */
  protected numberRow(cells: [string, string][], y: number, left: number): void {
    const context = this.ctx(),
      unit = App.Unit,
      cellWidth = this.pageW() / cells.length;
    App.FillColor(context, App.Palette[App.ThemeManager.Txt]);
    context.textAlign = 'center';
    cells.forEach(([key, label], i) => {
      const x = left + cellWidth * (i + 0.5);
      context.font = App.Metrics.TxtSlider;
      context.fillText(key, x, y + 32 * unit);
      context.font = App.Metrics.TxtMid;
      context.fillText(label.toUpperCase(), x, y + 52 * unit);
    });
  }
  protected drawStats(top: number, left: number, right: number): void {
    const st = this.Account?.stats,
      context = this.ctx(),
      unit = App.Unit,
      txt = App.Palette[App.ThemeManager.Txt];
    if (!st) {
      App.AnimationsLayer.DrawSprite(
        context,
        'loading',
        App.Width * 0.5,
        top + 25 * unit,
        16,
        true,
      );
      return;
    }
    // R16: the running totals plus what this browser counted and hasn't sent (they move offline).
    const pendingCount = activity.pending(),
      ms = st.playMs + pendingCount.playMs,
      hours = ms >= 3_600_000;
    const played = hours
      ? ms < 36_000_000
        ? (Math.floor(ms / 360_000) / 10).toString()
        : shortNumber(Math.floor(ms / 3_600_000))
      : shortNumber(Math.floor(ms / 60_000));
    const cells: [string, string][] = [
      [shortNumber(st.patches), COPY.patches],
      [shortNumber(st.remixes), COPY.remixes],
      [shortNumber(st.likes), COPY.likes],
      [shortNumber(st.opens), COPY.opens],
      [played, hours ? COPY.hoursPlayed : COPY.minutesPlayed],
      [shortNumber(st.blocksAdded + pendingCount.blocks), COPY.blocksAdded],
      [shortNumber(Math.floor(st.particles + pendingCount.particles)), COPY.particles],
      [shortNumber(Math.floor(st.laserTurns + pendingCount.laserTurns)), COPY.laserTurns],
    ];
    const phone = App.SettingsPhone;
    this.numberRow(cells.slice(0, 4), top + (phone ? PHONE.row1 : STATS_Y.row1) * unit, left);
    this.numberRow(cells.slice(4), top + (phone ? PHONE.row2 : STATS_Y.row2) * unit, left);
    let y = top + (phone ? PHONE.favourites : STATS_Y.favourites) * unit;
    // Favourite blocks: v1's menu icons (BlockSprites, as the blocks menu) half size over names.
    App.FillColor(context, txt);
    context.font = App.Metrics.TxtMid;
    context.textAlign = 'left';
    context.fillText(COPY.favourites.toUpperCase(), left, y + 10 * unit);
    // The most remixed patch on the same line, at the right (a phone: on its own line under it).
    if (st.mostRemixed) {
      const remixCount = st.mostRemixed.n,
        remixedTitle = st.mostRemixed.title || 'Untitled';
      context.font = App.Metrics.TxtItalic2;
      context.textAlign = phone ? 'left' : 'right';
      context.fillText(
        `${COPY.mostRemixed}: ${remixedTitle.length > 24 ? `${remixedTitle.slice(0, 23)}…` : remixedTitle}, ${remixCount} ${remixCount === 1 ? 'time' : 'times'}`,
        phone ? left : right,
        y + (phone ? 10 + PHONE.remixed : 10) * unit,
      );
      context.textAlign = 'left';
    }
    if (phone) y += PHONE.remixed * unit;
    // Six in a row; a phone: two rows of three.
    const favs = st.favourites
      .flatMap((favourite) => {
        const item = menuItem(favourite.type);
        return item ? [{ ...favourite, item }] : [];
      })
      .slice(0, 6);
    if (!favs.length) {
      context.font = App.Metrics.TxtItalic2;
      context.fillText(COPY.noFavourites, left, y + FAV.icon * unit);
    }
    const cellWidth = this.pageW() / (phone ? 3 : 6);
    favs.forEach((fav, k) => {
      const i = phone ? k % 3 : k,
        rowY = y + (phone ? Math.floor(k / 3) * PHONE.favRow * unit : 0);
      const x = left + cellWidth * (i + 0.5);
      const iy = rowY + FAV.icon * unit;
      context.save();
      context.translate(x, iy);
      context.scale(FAV.scale, FAV.scale);
      context.translate(-x, -iy);
      App.BlockSprites.DrawSprite(
        { Ctx: context },
        new Point(x, iy),
        false,
        fav.item.name.toLowerCase(),
      );
      context.restore();
      // Its name, on two lines when wider than its column (PARTICLE EMITTER, COMPUTER KEYBOARD).
      App.FillColor(context, txt);
      context.font = App.Metrics.TxtMid;
      context.textAlign = 'center';
      const name = fav.item.name.toUpperCase(),
        words = name.split(' ');
      if (words.length > 1 && context.measureText(name).width > cellWidth - 6 * unit) {
        const cut = Math.ceil(words.length / 2);
        context.fillText(words.slice(0, cut).join(' '), x, rowY + FAV.name * unit);
        context.fillText(words.slice(cut).join(' '), x, rowY + (FAV.name + 14) * unit);
      } else context.fillText(name, x, rowY + FAV.name * unit);
    });
  }
}
