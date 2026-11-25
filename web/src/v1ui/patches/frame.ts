// The Patches panel's frame: background, title, tabs, close cross, and the sliding pages.
import { App } from '../shim.ts';
import { Device } from '../ported/Device';
import { COPY } from './copy.ts';
import { PatchesGalleryTab } from './galleryTab.ts';

export abstract class PatchesFrame extends PatchesGalleryTab {
  Draw(): void {
    if (!this.shown) return;
    const ctx = this.Ctx,
      unit = App.Unit,
      width = App.Width,
      txt = App.Palette[App.ThemeManager.Txt],
      tabY = this.OffsetY;

    // BG //
    App.FillColor(ctx, App.Palette[2]);
    ctx.globalAlpha = 0.95;
    ctx.fillRect(0, this.OffsetY, width, App.Height);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    App.FillColor(ctx, txt);
    App.StrokeColor(ctx, txt);

    // PANEL TITLE (v1 SettingsPanel: desktop only) //
    if (App.Metrics.Device === Device.desktop) {
      ctx.textAlign = 'left';
      ctx.font = App.Metrics.TxtHeader;
      ctx.fillText(COPY.panel.toUpperCase(), 20 * unit, tabY + 41 * unit);
    }

    // TABS (v1 SettingsPanel categories + MenuCategory.Draw) //
    const { tabs, half } = this.tabs(),
      headerHeight = Math.round(60 * unit);
    App.StrokeColor(ctx, App.Palette[1]);
    ctx.beginPath();
    ctx.moveTo(width * 0.5 - half, tabY + 60 * unit - 1);
    ctx.lineTo(width * 0.5 + half, tabY + 60 * unit - 1);
    for (let i = 1; i < tabs.length; i++) {
      const x = Math.round(tabs[i].x - tabs[i].w * 0.5);
      ctx.moveTo(x, tabY + 16 * unit);
      ctx.lineTo(x, tabY + 44 * unit);
    }
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = App.Metrics.TxtMid;
    tabs.forEach((tab, i) => {
      const selection = this.selected[tab.id],
        hw = tab.w * 0.5,
        x = tab.x;
      App.FillColor(
        ctx,
        App.Palette[App.ThemeManager.MenuOrder[i % App.ThemeManager.MenuOrder.length]],
      );
      ctx.beginPath();
      ctx.moveTo(x - hw, tabY);
      ctx.lineTo(x + hw, tabY);
      ctx.lineTo(x + hw, tabY + headerHeight * selection);
      ctx.lineTo(x + 10 * unit, tabY + headerHeight * selection);
      ctx.lineTo(x, tabY + (headerHeight + 10 * unit) * selection);
      ctx.lineTo(x - 10 * unit, tabY + headerHeight * selection);
      ctx.lineTo(x - hw, tabY + headerHeight * selection);
      ctx.closePath();
      ctx.fill();
      App.FillColor(ctx, txt);
      ctx.fillText(tab.name, x, tabY + headerHeight * 0.5 + 10 * unit * 0.38);
    });

    // CLOSE (v1 SettingsPanel) //
    App.StrokeColor(ctx, txt);
    const closeY = tabY + 30 * unit;
    ctx.beginPath();
    ctx.moveTo(width * 0.5 + half + 12.5 * unit, closeY - 7.5 * unit);
    ctx.lineTo(width * 0.5 + half + 27.5 * unit, closeY + 7.5 * unit);
    ctx.moveTo(width * 0.5 + half + 27.5 * unit, closeY - 7.5 * unit);
    ctx.lineTo(width * 0.5 + half + 12.5 * unit, closeY + 7.5 * unit);
    ctx.stroke();

    // THE PAGES, sliding under the tabs (v1 SettingsPanel clips them from the tabs' rule down) //
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, tabY + 60 * unit, width, App.Height);
    ctx.clip();
    try {
      const away = -App.Height + 1,
        leaving = this.leaving;
      if (leaving !== null && leaving !== this.Tab && this.pageDy[leaving] > away) {
        const keep = { Tab: this.Tab, View: this.View, GalleryView: this.GalleryView };
        this.Tab = leaving;
        this.View = 'list';
        this.GalleryView = 'list';
        try {
          this.drawPage();
        } finally {
          Object.assign(this, keep);
        }
      }
      if (this.pageDy[this.Tab] > away) this.drawPage();
    } finally {
      ctx.restore();
    }
  }
  protected drawPage(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      width = App.Width,
      txt = App.Palette[App.ThemeManager.Txt];
    if (this.Opening) {
      App.AnimationsLayer.DrawSprite(ctx, 'loading', width * 0.5, this.cy, 16, true);
      return;
    }
    if (this.OpenError) {
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      this.wordWrap(this.OpenError, this.margin, this.cy + 205 * unit, 14 * unit, this.pageW);
    }
    // OPEN over unsaved changes asks first, from the OPEN tab or the gallery (bug, owner review 3:
    // the gallery's question was never drawn nor answered, so OPEN did nothing after an INSERT).
    if (this.View === 'confirm') this.drawConfirm();
    else if (this.Tab === 0) this.drawSave();
    else if (this.Tab === 2) this.drawGallery();
    else if (this.View === 'list') this.drawList();
    else if (this.View === 'file') this.drawFile();
    else if (this.View === 'remove') this.drawRemove();
    else this.drawConfirm();
  }
}
