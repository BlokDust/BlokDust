// What the pointer is over in the Patches panel.
import { App, Dimensions } from '../shim.ts';
import { COPY } from './copy.ts';
import { PatchesFrame } from './frame.ts';

export abstract class PatchesHitTests extends PatchesFrame {
  // ---- input ----
  HitTests(pt: { x: number; y: number }): void {
    const unit = App.Unit,
      width = App.Width,
      cy = this.cy,
      hit = (x: number, y: number, width: number, height: number) =>
        Dimensions.hitRect(x, y, width, height, pt.x, pt.y);
    const { tabs, half } = this.tabs(),
      tabY = this.OffsetY;
    const hits: Record<string, boolean> = {
      close: hit(width * 0.5 + half, tabY + 10 * unit, 40 * unit, 40 * unit),
    };
    tabs.forEach((tab) => {
      hits[`tab${tab.id}`] = hit(tab.x - tab.w * 0.5, tabY, tab.w, 60 * unit);
    });
    const box = (b: { x: number; y: number; w: number; h: number }) => hit(b.x, b.y, b.w, b.h);
    const pad = (b: { x: number; y: number; w: number }) =>
      hit(b.x - 5 * unit, b.y - 10 * unit, b.w + 10 * unit, 40 * unit);
    if (this.View === 'confirm') {
      const [first, second, third] = this.thirds();
      hits.cancel = box(first);
      hits.saveFirst = box(second);
      hits.openAnyway = box(third);
    } else if (this.Tab === 2) {
      {
        const layout = this.galleryLayout();
        hits.search = pad(layout.search);
        for (const b of this.sortButtons())
          hits[`sort_${b.sort}`] = hit(b.x - 5 * unit, b.y - 20 * unit, b.w + 10 * unit, 30 * unit);
        const win = this.galleryWindow();
        hits.list = hit(
          this.margin - 5 * unit,
          win.clip,
          this.pageW + 15 * unit,
          win.bottom - win.clip,
        );
        if (hits.list)
          for (let index = 0; index < this.GalleryItems.length; index++) {
            const b = this.galleryRow(index);
            if (b.open.y > win.bottom || b.open.y + b.open.h < win.top) continue;
            if (pad(b.open)) hits[`gopen${index}`] = true;
            else if (pad(b.insert)) hits[`gins${index}`] = true;
            else if (
              hit(this.margin - 5 * unit, this.galleryRowY(index) - 30 * unit, 35 * unit, 40 * unit)
            )
              hits[`glike${index}`] = true;
          }
        if (hits.list && this.GalleryMore && !this.GalleryLoading && this.GalleryItems.length)
          hits.showMore = pad(this.showMoreButton());
      }
    } else if (this.Tab === 0 && this.View === 'video') {
      const main = this.videoMain();
      if (this.VideoState === 'ready') hits.shareVideo = box(main);
      else hits.make = box(main);
      hits.videoBack = this.backHit(pt);
    } else if (this.Tab === 0 && !this.web) {
      const { left, right } = this.halves();
      hits.randomise = pad(this.randomise());
      hits.save = box(left);
      hits.share = box(right);
    } else if (this.Tab === 0) {
      const sw = (switchBox: { x: number; y: number; w: number; h: number }, name: string) =>
        hit(
          switchBox.x,
          switchBox.y + switchBox.h * 0.1,
          switchBox.w + 12 * unit + this.textW(name),
          switchBox.h * 0.55,
        );
      if (this.host.gallery) hits.gallerySwitch = sw(this.gallerySwitch(), COPY.addToGallery);
      if (this.host.video) hits.videoSwitch = sw(this.videoSwitch(), COPY.makeVideo);
      if (this.signInShown) hits.signIn = pad(this.signInButton());
      hits.randomise = pad(this.randomise());
      hits.share = box(this.mainButton());
      const sec = this.secondary();
      hits.saveAs = pad(sec.saveAs);
      hits.save = !!sec.download && pad(sec.download);
      const live = !!this.link && !this.Saving;
      hits.copyLink = live && pad(this.copyButton());
      hits.shareLink = live && this.canShare && pad(this.shareButton());
      if (this.linkOnly) hits.share = false; // no SAVE button here
    } else if (this.View === 'list') {
      if (this.fileButtonShown) hits.file = pad(this.fileButton());
      const listLayout = this.openLayout();
      hits.list = hit(
        this.margin - 5 * unit,
        listLayout.top,
        this.pageW + 15 * unit,
        listLayout.bottom - listLayout.top,
      );
      if (hits.list)
        for (let row = 0; row < this.Items.length; row++) {
          const b = this.rowButtons(row);
          if (b.open.y > listLayout.bottom || b.open.y + b.open.h < listLayout.top) continue;
          if (pad(b.open)) hits[`open${row}`] = true;
          else if (pad(b.insert)) hits[`ins${row}`] = true;
          else if (
            this.Items[row].removable &&
            hit(b.bin.x, b.bin.y - 10 * unit, b.bin.w + 5 * unit, 40 * unit)
          )
            hits[`bin${row}`] = true;
        }
    } else {
      if (this.View === 'remove') {
        const { left, right } = this.halves();
        for (const b of [left, right]) b.y = cy + 5 * unit;
        hits.removeCancel = box(left);
        hits.removeOk = box(right);
      } else if (this.View === 'file') {
        const { left, right } = this.halves();
        for (const b of [left, right]) b.y = cy + 5 * unit;
        hits.fileOpen = !this.Picked?.error && box(left);
        hits.fileInsert = !this.Picked?.error && box(right);
        hits.fileBack = this.backHit(pt);
      } else {
        const [leftThird, midThird, rightThird] = this.thirds();
        hits.cancel = box(leftThird);
        hits.saveFirst = box(midThird);
        hits.openAnyway = box(rightThird);
      }
    }
    this.roll = hits;
  }
  /** Tests: a control's centre in CSS px: tab0, tab1, close, randomise, save, share, saveAs, url,
   * open<n>, ins<n>, file, fileOpen, fileInsert, fileBack, cancel, saveFirst, openAnyway. */
  centreOf(name: string): [number, number] | null {
    const unit = App.Unit,
      pr = App.Metrics.PixelRatio,
      at = (x: number, y: number): [number, number] => [x / pr, y / pr];
    const mid = (b: { x: number; y: number; w: number; h: number }) =>
      at(b.x + b.w / 2, b.y + b.h / 2);
    const match = /^(open|ins|bin)(\d+)$/.exec(name);
    if (match) {
      const b = this.rowButtons(Number(match[2]));
      return mid(match[1] === 'open' ? b.open : match[1] === 'ins' ? b.insert : b.bin);
    }
    {
      const gm = /^g(open|ins)(\d+)$/.exec(name);
      if (gm) {
        const b = this.galleryRow(Number(gm[2]));
        return mid(gm[1] === 'open' ? b.open : b.insert);
      }
      const lm = /^glike(\d+)$/.exec(name);
      if (lm) return at(this.margin + 12 * unit, this.galleryRowY(Number(lm[1])) - 12 * unit);
      if (name === 'list') {
        const visible = this.galleryWindow();
        return at(App.Width * 0.5, (visible.top + visible.bottom) / 2);
      }
      const layout = this.galleryLayout();
      if (name === 'search') return mid(layout.search);
      const sb =
        /^sort_(\w+)$/.exec(name) && this.sortButtons().find((b) => `sort_${b.sort}` === name);
      if (sb) return at(sb.x + sb.w / 2, sb.y - 5 * unit);
    }
    if (name === 'gallerySwitch' || name === 'videoSwitch') {
      const switchBox = name === 'gallerySwitch' ? this.gallerySwitch() : this.videoSwitch();
      return at(switchBox.x + switchBox.w / 2, switchBox.y + switchBox.h * 0.35);
    }
    if (name === 'player') return mid(this.playerBox());
    if (name === 'videoBack' || name === 'fileBack') {
      const b = this.backArrow();
      return at(b.x, b.y);
    }
    if (name === 'list') {
      const listLayout = this.openLayout();
      return at(App.Width * 0.5, (listLayout.top + listLayout.bottom) / 2);
    }
    if (name === 'make' || name === 'shareVideo') return mid(this.videoMain());
    const tabMatch = /^tab(\d)$/.exec(name);
    if (tabMatch) {
      const tab = this.tabs().tabs.find((x) => x.id === Number(tabMatch[1]));
      return tab ? at(tab.x, this.OffsetY + 30 * unit) : null;
    }
    const { left, right } = this.halves(),
      [first, second, third] = this.thirds(),
      file = this.fileButton();
    switch (name) {
      case 'close':
        return at(App.Width * 0.5 + this.tabs().half + 20 * unit, this.OffsetY + 30 * unit);
      case 'randomise':
        return mid(this.randomise());
      case 'signIn':
        return this.signInShown ? mid(this.signInButton()) : null;
      case 'showMore':
        return this.GalleryMore && this.GalleryItems.length ? mid(this.showMoreButton()) : null;
      case 'save': {
        if (!this.web) return mid(left);
        const downloadBox = this.secondary().download;
        return downloadBox ? mid(downloadBox) : null;
      }
      case 'share':
        return this.web ? mid(this.mainButton()) : mid(right);
      case 'saveAs':
        return this.web ? mid(this.secondary().saveAs) : null;
      case 'url':
        return this.View === 'video'
          ? at(App.Width * 0.5, this.videoLink().box + 20 * unit)
          : at(this.margin + this.urlWidth() / 2, this.urlTop() + 15 * unit);
      case 'copyLink':
        return this.link ? mid(this.copyButton()) : null;
      case 'shareLink':
        return this.link && this.canShare ? mid(this.shareButton()) : null;
      case 'file':
        return mid(file);
      case 'fileOpen':
        return at(left.cx, this.cy + 25 * unit);
      case 'fileInsert':
        return at(right.cx, this.cy + 25 * unit);
      case 'removeCancel':
        return at(left.cx, this.cy + 25 * unit);
      case 'removeOk':
        return at(right.cx, this.cy + 25 * unit);
      case 'cancel':
        return mid(first);
      case 'saveFirst':
        return mid(second);
      case 'openAnyway':
        return mid(third);
    }
    return null;
  }
  get Hover(): boolean {
    return Object.values(this.roll).some(Boolean);
  }
}
