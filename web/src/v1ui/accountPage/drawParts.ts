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
    const c = this.ctx(),
      unit = App.Unit;
    App.FillColor(c, colour);
    c.fillRect(b.x, b.y, b.w, b.h);
    if (hover) {
      c.beginPath();
      c.moveTo(b.cx, b.y + b.h + 9 * unit);
      c.lineTo(b.cx - 10 * unit, b.y + b.h - unit);
      c.lineTo(b.cx + 10 * unit, b.y + b.h - unit);
      c.closePath();
      c.fill();
    }
    App.FillColor(c, App.Palette[App.ThemeManager.Txt]);
    c.textAlign = 'center';
    c.font = small ? App.Metrics.TxtMid : App.Metrics.TxtUrl2;
    const t = label.toUpperCase(),
      w = c.measureText(t).width,
      max = b.w - 12 * unit,
      y = b.y + (small ? 25 : 29) * unit;
    if (w > max) {
      c.save();
      c.translate(b.cx, 0);
      c.scale(max / w, 1);
      c.fillText(t, 0, y);
      c.restore();
    } else c.fillText(t, b.cx, y);
  }
  protected drawBordered(b: Bordered, stroke: string): void {
    const c = this.ctx();
    c.font = App.Metrics.TxtMid;
    c.textAlign = 'left';
    App.FillColor(c, App.Palette[App.ThemeManager.Txt]);
    c.fillText(b.label.toUpperCase(), b.textX, b.textY);
    App.StrokeColor(c, stroke);
    c.lineWidth = 2;
    c.beginPath();
    c.rect(b.x, b.y, b.w, b.h);
    c.stroke();
  }
  protected wrap(text: string, x: number, y: number, lh: number, width: number): number {
    const c = this.ctx();
    let line = '';
    for (const word of text.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (c.measureText(t).width > width && line) {
        c.fillText(line, x, y);
        y += lh;
        line = word;
      } else line = t;
    }
    if (line) {
      c.fillText(line, x, y);
      y += lh;
    }
    return y;
  }
  /** A sub-heading: the tab type (v1's mid type), no rule under it (owner review 2), and its italic line if any. */
  protected heading(title: string, line: string, top: number, L: number): void {
    const c = this.ctx(),
      unit = App.Unit,
      txt = App.Palette[App.ThemeManager.Txt];
    App.FillColor(c, txt);
    c.textAlign = 'left';
    c.font = App.Metrics.TxtMid;
    c.fillText(title.toUpperCase(), L, top + 10 * unit);
    if (line) {
      c.font = App.Metrics.TxtItalic2;
      this.wrap(line, L, top + 32 * unit, 14 * unit, this.pageW());
    }
  }

  /** A QR code of `url` in the square `b`: black on white whatever the theme (phone cameras read that), two
   * modules of quiet zone. */
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
      c = this.ctx(),
      cell = b.s / (n + 4);
    c.fillStyle = '#ffffff';
    c.fillRect(b.x, b.y, b.s, b.s);
    c.fillStyle = '#000000';
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (dark[y * n + x])
          c.fillRect(b.x + (x + 2) * cell, b.y + (y + 2) * cell, Math.ceil(cell), Math.ceil(cell));
  }

  /** One row of numbers, four columns across the page: the number large and light, its label under it. */
  protected numberRow(cells: [string, string][], y: number, L: number): void {
    const c = this.ctx(),
      unit = App.Unit,
      w = this.pageW() / cells.length;
    App.FillColor(c, App.Palette[App.ThemeManager.Txt]);
    c.textAlign = 'center';
    cells.forEach(([key, label], i) => {
      const x = L + w * (i + 0.5);
      c.font = App.Metrics.TxtSlider;
      c.fillText(key, x, y + 32 * unit);
      c.font = App.Metrics.TxtMid;
      c.fillText(label.toUpperCase(), x, y + 52 * unit);
    });
  }
  protected drawStats(top: number, L: number, R: number): void {
    const st = this.Account?.stats,
      c = this.ctx(),
      unit = App.Unit,
      txt = App.Palette[App.ThemeManager.Txt];
    if (!st) {
      App.AnimationsLayer.DrawSprite(c, 'loading', App.Width * 0.5, top + 25 * unit, 16, true);
      return;
    }
    // R16: the running totals, with what this browser counted and hasn't sent yet (so they move without a request).
    const p = activity.pending(),
      ms = st.playMs + p.playMs,
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
      [shortNumber(st.blocksAdded + p.blocks), COPY.blocksAdded],
      [shortNumber(Math.floor(st.particles + p.particles)), COPY.particles],
      [shortNumber(Math.floor(st.laserTurns + p.laserTurns)), COPY.laserTurns],
    ];
    const phone = App.SettingsPhone;
    this.numberRow(cells.slice(0, 4), top + (phone ? PHONE.row1 : STATS_Y.row1) * unit, L);
    this.numberRow(cells.slice(4), top + (phone ? PHONE.row2 : STATS_Y.row2) * unit, L);
    let y = top + (phone ? PHONE.favourites : STATS_Y.favourites) * unit;
    // Favourite blocks: v1's menu icons (BlockSprites, as the blocks menu draws them) at half size over their names.
    App.FillColor(c, txt);
    c.font = App.Metrics.TxtMid;
    c.textAlign = 'left';
    c.fillText(COPY.favourites.toUpperCase(), L, y + 10 * unit);
    // The most remixed patch on the same line, at the right (a phone: on its own line under it).
    if (st.mostRemixed) {
      const n = st.mostRemixed.n,
        t = st.mostRemixed.title || 'Untitled';
      c.font = App.Metrics.TxtItalic2;
      c.textAlign = phone ? 'left' : 'right';
      c.fillText(
        `${COPY.mostRemixed}: ${t.length > 24 ? `${t.slice(0, 23)}…` : t}, ${n} ${n === 1 ? 'time' : 'times'}`,
        phone ? L : R,
        y + (phone ? 10 + PHONE.remixed : 10) * unit,
      );
      c.textAlign = 'left';
    }
    if (phone) y += PHONE.remixed * unit;
    // Six in a row; a phone: two rows of three.
    const favs = st.favourites
      .map((favourite) => ({ ...favourite, item: menuItem(favourite.type) }))
      .filter((f) => f.item)
      .slice(0, 6);
    if (!favs.length) {
      c.font = App.Metrics.TxtItalic2;
      c.fillText(COPY.noFavourites, L, y + FAV.icon * unit);
    }
    const w = this.pageW() / (phone ? 3 : 6);
    favs.forEach((fav, k) => {
      const i = phone ? k % 3 : k,
        rowY = y + (phone ? Math.floor(k / 3) * PHONE.favRow * unit : 0);
      const x = L + w * (i + 0.5);
      const iy = rowY + FAV.icon * unit;
      c.save();
      c.translate(x, iy);
      c.scale(FAV.scale, FAV.scale);
      c.translate(-x, -iy);
      App.BlockSprites.DrawSprite(
        { Ctx: c },
        new Point(x, iy),
        false,
        fav.item!.name.toLowerCase(),
      );
      c.restore();
      // Its name, on two lines when it is wider than its column (PARTICLE EMITTER beside COMPUTER KEYBOARD).
      App.FillColor(c, txt);
      c.font = App.Metrics.TxtMid;
      c.textAlign = 'center';
      const name = fav.item!.name.toUpperCase(),
        words = name.split(' ');
      if (words.length > 1 && c.measureText(name).width > w - 6 * unit) {
        const cut = Math.ceil(words.length / 2);
        c.fillText(words.slice(0, cut).join(' '), x, rowY + FAV.name * unit);
        c.fillText(words.slice(cut).join(' '), x, rowY + (FAV.name + 14) * unit);
      } else c.fillText(name, x, rowY + FAV.name * unit);
    });
  }
}
