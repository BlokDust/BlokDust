// SAVE / SHARE: the name, the switches, SAVE and the link.
import { App } from '../shim.ts';
import { COPY } from './copy.ts';
import { PatchesVideo } from './video.ts';
import type { BorderedButton } from './layout.ts';

export abstract class PatchesSaveTab extends PatchesVideo {
  protected drawSave(): void {
    if (this.View === 'video') {
      this.drawVideo();
      return;
    }
    const ctx = this.Ctx,
      unit = App.Unit,
      width = App.Width,
      cy = this.cy,
      txt = App.Palette[App.ThemeManager.Txt],
      menu = App.ThemeManager.MenuOrder;
    // NAME (v1 SharePanel TITLE) //
    ctx.font = App.Metrics.TxtMid;
    if (this.mobile) {
      ctx.textAlign = 'left';
      ctx.fillText(COPY.name.toUpperCase(), width * 0.5 - 210 * unit, cy - 150 * unit);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(COPY.name.toUpperCase(), width * 0.5 - 225 * unit, cy - 106 * unit);
    }
    App.StrokeColor(ctx, txt);
    ctx.beginPath();
    ctx.moveTo(width * 0.5 - 210 * unit, cy - 90 * unit);
    ctx.lineTo(width * 0.5 + 210 * unit, cy - 90 * unit);
    ctx.stroke();
    this.drawBordered(this.randomise(), txt);
    const off = this.Saving || !this.host.hasBlocks(),
      links = this.host.links,
      link = this.link;
    if (!this.web) {
      this.drawPluginSave(off);
      return;
    }

    // ADD TO GALLERY · MAKE VIDEO (v1 OptionSwitch "offOn") //
    const signedIn = this.host.signedIn();
    if (this.host.gallery)
      this.drawSwitch(
        this.gallerySwitch(),
        COPY.addToGallery,
        signedIn && this.GalleryOn,
        signedIn,
        signedIn ? '' : COPY.signInToPublish,
      );
    if (this.host.video)
      this.drawSwitch(this.videoSwitch(), COPY.makeVideo, this.videoOn, true, '');
    if (this.signInShown)
      this.drawBordered(this.signInButton(), this.roll.signIn ? txt : App.Palette[1]);

    // SAVE (SAVE CHANGES once linked), or MAKE VIDEO with nothing to save; saved and unchanged,
    // the link takes its place. While saving the button says so: no spinner or line under it.
    const main = this.mainAction(),
      mainBox = this.mainButton();
    if (!this.linkOnly) {
      const label = this.Saving
        ? COPY.savingButton
        : main.kind === 'save' && link && this.shareState().save === 'save'
          ? COPY.saveChanges
          : main.label;
      this.filled(
        mainBox,
        App.Palette[main.off ? 1 : menu[3]],
        label,
        !!this.roll.share && !main.off,
      );
    }

    // THE LINK: its line, the link small on a rule (a click copies it), COPY LINK, phone SHARE //
    App.FillColor(ctx, txt);
    let warnY = cy + 85 * unit;
    if (link && !this.Saving) {
      ctx.save();
      if (!this.linkOnly) ctx.globalAlpha = 0.6; // changed since: the link is the last save's
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      this.wordWrap(
        this.linkOnly ? COPY.savedLine : COPY.linkLine,
        this.margin,
        this.linkLineY(),
        14 * unit,
        this.pageW,
      );
      App.StrokeColor(ctx, App.Palette[1]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.margin, this.urlTop() + 32 * unit);
      ctx.lineTo(this.margin + this.urlWidth(), this.urlTop() + 32 * unit);
      ctx.stroke();
      const copy = this.copyButton();
      this.drawBordered(copy, this.roll.copyLink ? txt : this.linkOnly ? txt : App.Palette[1]);
      if (this.canShare) this.drawBordered(this.shareButton(), txt);
      ctx.restore();
      warnY = this.urlTop() + (this.mobile ? 85 : 60) * unit;
    }
    // WARNINGS (v1 SharePanel) //
    if (!this.Saving) {
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      const warn = !this.host.hasBlocks()
        ? App.L10n.UI.SharePanel.NoBlocks
        : this.GalleryNote || links?.warning();
      if (warn) this.wordWrap(warn, width * 0.5 - 210 * unit, warnY, 14 * unit, 420 * unit);
    }
    // SAVE AS · DOWNLOAD PATCH (v1's bordered buttons, quieter: owner review 2) //
    const sec = this.secondary(),
      st = this.shareState();
    const quiet = (b: BorderedButton, live: boolean, key: string) => {
      ctx.save();
      if (!live) ctx.globalAlpha = 0.4;
      this.drawBordered(
        { ...b, label: this.label(key, b.label) },
        live && this.roll[key] ? txt : App.Palette[1],
      );
      ctx.restore();
    };
    quiet(sec.saveAs, !off && st.saveAs, 'saveAs');
    if (sec.download) quiet(sec.download, !off, 'save');
  }

  /** Plugin: SAVE TO COMPUTER · CREATE SHARE LINK (v1 SAVE / SAVE AS), each with its line. */
  protected drawPluginSave(off: boolean): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      cy = this.cy,
      txt = App.Palette[App.ThemeManager.Txt],
      menu = App.ThemeManager.MenuOrder;
    const { left, right } = this.halves(),
      save = left,
      share = right;
    ctx.font = App.Metrics.TxtItalic2;
    ctx.textAlign = 'left';
    App.FillColor(ctx, txt);
    this.wordWrap(COPY.saveLinePlugin, save.x, cy - 59 * unit, 14 * unit, save.w);
    this.wordWrap(COPY.shareLinePlugin, share.x, cy - 59 * unit, 14 * unit, share.w);
    this.filled(
      save,
      App.Palette[off ? 1 : menu[3]],
      this.label('save', COPY.save),
      !!this.roll.save && !off,
    );
    const shareOff = !this.host.links || off;
    this.filled(
      share,
      App.Palette[shareOff ? 1 : menu[1]],
      this.label('share', COPY.share),
      !!this.roll.share && !shareOff,
    );
    if (!this.host.hasBlocks()) {
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      this.wordWrap(App.L10n.UI.SharePanel.NoBlocks, save.x, cy + 75 * unit, 14 * unit, this.pageW);
    } else {
      const warn = this.host.links?.warning();
      if (warn) {
        App.FillColor(ctx, txt);
        ctx.font = App.Metrics.TxtItalic2;
        this.wordWrap(warn, save.x, cy + 75 * unit, 14 * unit, this.pageW);
      }
    }
  }
}
