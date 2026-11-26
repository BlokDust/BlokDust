// GALLERY (CHG-0024): the search, the sorts and the scrolling list.
import { App } from '../shim.ts';
import { COPY } from './copy.ts';
import { drawUpArrow } from './icons.ts';
import { PatchesOpenTab } from './openTab.ts';

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? '' : 's'}`;

export abstract class PatchesGalleryTab extends PatchesOpenTab {
  /** Scroll the list by `dy` device px; near its end, the next page loads. */
  scrollGallery(dy: number): void {
    this.GalleryScroll = Math.max(0, Math.min(this.galleryMaxScroll(), this.GalleryScroll + dy));
    if (
      this.GalleryMore &&
      !this.GalleryLoading &&
      this.GalleryScroll > this.galleryMaxScroll() - 120 * App.Unit
    )
      void this.browse(true);
    this.settled();
  }
  /** A mouse wheel over the open panel (scene.wheel). */
  Wheel(event: WheelEvent): void {
    const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    if (this.Tab === 2) this.scrollGallery(dy);
    else if (this.Tab === 1 && this.View === 'list') this.scrollOpen(dy);
  }
  protected drawGallery(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      stageWidth = App.Width,
      cy = this.cy,
      margin = this.margin,
      txt = App.Palette[App.ThemeManager.Txt];
    const layout = this.galleryLayout(),
      win = this.galleryWindow();
    // SEARCH (v1 SoundcloudPanel: a rule under the field, SEARCH bordered above it at right) //
    App.StrokeColor(ctx, txt);
    ctx.beginPath();
    ctx.moveTo(margin, layout.rule);
    ctx.lineTo(margin + this.pageW, layout.rule);
    ctx.stroke();
    this.drawBordered(layout.search, txt);
    // POPULAR · NEW · EXAMPLES · TUTORIALS (the chosen one underlined, the others on hover) //
    App.FillColor(ctx, txt);
    App.StrokeColor(ctx, txt);
    ctx.textAlign = 'left';
    for (const b of this.sortButtons()) {
      ctx.font = App.Metrics.TxtMid;
      ctx.fillText(b.label, b.x, b.y);
      const on = b.sort === this.GallerySort;
      if (!on && !this.roll[`sort_${b.sort}`]) continue;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + 4 * unit);
      ctx.lineTo(b.x + b.w, b.y + 4 * unit);
      ctx.lineWidth = on ? 2 : 1;
      ctx.stroke();
      ctx.lineWidth = 2;
    }
    // ROWS: one list, clipped to its window and scrolled //
    const n0 = this.GalleryItems.length;
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin - 5 * unit, win.clip, this.pageW + 15 * unit, win.bottom - win.clip);
    ctx.clip();
    for (let index = 0; index < n0; index++) {
      const y = this.galleryRowY(index),
        it = this.GalleryItems[index],
        b = this.galleryRow(index);
      if (y + 20 * unit < win.top || y - 40 * unit > win.bottom) continue;
      if (index < n0 - 1 || this.GalleryMore) {
        App.StrokeColor(ctx, App.Palette[1]);
        ctx.beginPath();
        ctx.moveTo(margin, y + this.rowH - this.rowDivider);
        ctx.lineTo(margin + this.pageW, y + this.rowH - this.rowDivider);
        ctx.stroke();
      }
      App.FillColor(ctx, txt);
      ctx.font = this.rowFont;
      ctx.textAlign = 'left';
      const left = margin + unit + 30 * unit,
        maxW = b.textRight - left;
      const fit = (text: string, yy: number, x = left) => {
        const textWidth = ctx.measureText(text).width;
        if (textWidth <= maxW - (x - left)) {
          ctx.fillText(text, x, yy);
          return;
        }
        ctx.save();
        ctx.translate(x, yy);
        ctx.scale((maxW - (x - left)) / textWidth, 1);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };
      const on = App.Palette[App.ThemeManager.OptionsOrder[2]];
      fit(it.title.toUpperCase(), y - this.rowGap);
      const remixes = it.remixes
          ? ` \u00b7 ${plural(it.remixes, 'remix').replace('remixs', 'remixes')}`
          : '',
        views = plural(it.views, 'view');
      // Reddit's column (owner's pick B): the like chevron over the count; pressing it likes.
      drawUpArrow(ctx, margin + 12 * unit, y - 15 * unit, 10 * unit, it.liked, txt, on);
      ctx.textAlign = 'center';
      ctx.fillText(String(it.likes), margin + 12 * unit, y);
      ctx.textAlign = 'left';
      fit(`${COPY.by} @${it.by} \u00b7 ${views}${remixes}`, y);
      this.drawBordered(b.open, txt);
      this.drawBordered(b.insert, App.Palette[1]);
    }
    // More on the way: v1's spinner where the next row will be; more to fetch: SHOW MORE there (the
    // list also fetches them by itself near its end).
    if (n0 && this.GalleryLoading)
      App.AnimationsLayer.DrawSprite(
        ctx,
        'loading',
        stageWidth * 0.5,
        this.galleryRowY(n0) - 9 * unit,
        16,
        true,
      );
    else if (n0 && this.GalleryMore)
      this.drawBordered(this.showMoreButton(), this.roll.showMore ? txt : App.Palette[1]);
    ctx.restore();
    App.FillColor(ctx, txt);
    if (!n0 && this.GalleryLoading)
      App.AnimationsLayer.DrawSprite(ctx, 'loading', stageWidth * 0.5, cy, 16, true);
    else if (!n0) {
      ctx.font = App.Metrics.TxtHeader;
      ctx.textAlign = 'center';
      ctx.fillText(COPY.noneYet.toUpperCase(), stageWidth * 0.5, cy + 10 * unit);
    }
    if (this.GalleryMessage) {
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      this.wordWrap(
        this.GalleryMessage,
        margin,
        this.mobile ? win.top + 30 * unit : cy + 185 * unit,
        14 * unit,
        this.pageW,
      );
    }
  }
  /** Fetch the list from the top, or (`more`) the next page onto its end; stale answers drop. */
  async browse(more = false): Promise<void> {
    const galleryApi = this.host.gallery;
    if (!galleryApi) return;
    if (more && (!this.GalleryMore || this.GalleryLoading)) return;
    const ask = ++this.galleryAsk,
      page = more ? this.GalleryPage + 1 : 1;
    if (!more) {
      this.GalleryItems = [];
      this.GalleryScroll = 0;
      this.GalleryMore = false;
    }
    this.GalleryLoading = true;
    this.showDom();
    try {
      const results = await galleryApi.browse(this.GallerySort, this.GalleryQuery, page);
      if (ask !== this.galleryAsk) return;
      // A patch can move up between pages (POPULAR changes as people like): keep each once.
      const have = new Set(this.GalleryItems.map((i) => i.id));
      this.GalleryItems = [
        ...this.GalleryItems,
        ...(results?.items ?? []).filter((i) => !have.has(i.id)),
      ];
      this.GalleryMore = !!results?.more;
      this.GalleryPage = page;
      if (!results) this.GalleryMessage = 'The gallery is not available here.';
    } catch (error) {
      if (ask === this.galleryAsk) this.GalleryMessage = (error as Error).message;
    } finally {
      if (ask === this.galleryAsk) {
        this.GalleryLoading = false;
        this.settled();
      }
    }
  }
}
