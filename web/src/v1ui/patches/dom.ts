// The Patches panel's DOM fields (v1 ShowDom, StyleDom) and its tweens.
import { App } from '../shim.ts';
import { COPY } from './copy.ts';
import { PatchesLayout } from './layout.ts';

export abstract class PatchesDom extends PatchesLayout {
  abstract browse(more?: boolean): Promise<void>;
  Init(drawTo: any): void {
    super.Init(drawTo);
    this.OffsetY = -this.DrawTo.Height;
    this.TitleContainer = document.getElementById('patchTitle')!;
    this.Input = document.getElementById('patchTitleInput') as HTMLInputElement;
    this.UrlContainer = document.getElementById('patchUrl')!;
    this.UrlInput = document.getElementById('patchUrlText') as HTMLInputElement;
    // Any characters (owner, 2026-11-10: "+" in a name). v1 stripped punctuation because the title went into the URL
    // unescaped; the link now escapes it and the file name is made safe separately (fileNameFor, PatchFiles::safeName).
    this.Input.addEventListener('input', () => {
      this.Title = this.Input.value;
    });
    this.Input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.Input.blur();
    });
    this.UrlInput.addEventListener('click', () => void this.copyLink());
    this.player = document.getElementById('patchVideo') as HTMLVideoElement | null;
    this.SearchContainer = document.getElementById('gallerySearch')!;
    this.SearchInput = document.getElementById('gallerySearchInput') as HTMLInputElement;
    this.SearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.SearchInput.blur();
        this.GalleryQuery = this.SearchInput.value.trim();
        void this.browse();
      }
    });
  }
  /** Click the link: it is copied (and selected, so it can be copied by hand where the clipboard is refused). */
  protected async copyLink(): Promise<void> {
    const link = this.link;
    if (!link) return;
    this.UrlInput.select();
    try {
      await navigator.clipboard.writeText(link.url);
    } catch {
      document.execCommand?.('copy');
    }
    this.say(COPY.linkCopied);
  }

  /** SHARE (phones): the device's own share sheet, which lists Instagram, Messages, WhatsApp… (owner, 2026-11-18). */
  protected get canShare(): boolean {
    return this.mobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }
  protected async shareSheet(): Promise<void> {
    const link = this.link;
    if (!link) return;
    try {
      await navigator.share({ title: this.Title.trim() || 'BlokDust', url: link.url });
    } catch {
      /* closed */
    }
  }

  // v1 SoundcloudPanel.DelayTo (its text fields follow the panel), TweenDom and StyleDom.
  protected tweens: Record<string, { stop(): void }> = {};
  protected tween(key: 'OffsetX' | 'OffsetY', to: number, ms: number): void {
    // One tween per property: reopening while the close is still running must not let the close finish (and hide it).
    this.tweens[key]?.stop();
    const self = this,
      tw = new (window as any).TWEEN.Tween({ x: this[key] });
    this.tweens[key] = tw;
    tw.to({ x: to }, ms);
    tw.onUpdate(function (this: { x: number }) {
      self[key] = this.x;
      if (key === 'OffsetY') self.placeDom();
    });
    tw.onComplete(() => {
      if (key === 'OffsetY' && to !== 0) {
        this.shown = false;
        this.showDom();
      }
    });
    tw.easing((window as any).TWEEN.Easing.Exponential.InOut);
    tw.start(this.LastVisualTick);
  }
  protected tweenPage(i: number, to: number, ms: number, delay: number): void {
    const k = `page${i}`;
    this.tweens[k]?.stop();
    const self = this,
      tw = new (window as any).TWEEN.Tween({ x: this.pageDy[i] });
    this.tweens[k] = tw;
    tw.to({ x: to }, ms);
    tw.onUpdate(function (this: { x: number }) {
      self.pageDy[i] = this.x;
      self.placeDom();
    });
    tw.onComplete(() => {
      if (i === this.leaving && to !== 0) this.leaving = null;
      this.showDom();
    });
    tw.easing((window as any).TWEEN.Easing.Exponential.InOut);
    tw.delay(delay);
    tw.start(this.LastVisualTick);
  }
  protected tweenSelected(i: number, to: number, ms: number): void {
    const k = `sel${i}`;
    this.tweens[k]?.stop();
    const self = this,
      tw = new (window as any).TWEEN.Tween({ x: this.selected[i] });
    this.tweens[k] = tw;
    tw.to({ x: to }, ms);
    tw.onUpdate(function (this: { x: number }) {
      self.selected[i] = this.x;
    });
    tw.easing((window as any).TWEEN.Easing.Exponential.InOut);
    tw.start(this.LastVisualTick);
  }
  protected placeDom(): void {
    const pr = App.Metrics.PixelRatio,
      unit = App.Unit,
      mid = this.cy;
    // The fields slide with their page and, like the canvas, are cut off at the tabs' foot (owner, 2026-11-18: the name
    // showed above the tabs as SAVE / SHARE lifted out).
    const clipTop = this.OffsetY + 60 * unit;
    const at = (el: HTMLElement, top: number, h: number) => {
      el.style.top = `${top / pr}px`;
      const hidden = Math.max(0, Math.min(h, clipTop - top));
      el.style.clipPath = hidden > 0 ? `inset(${hidden / pr}px 0 0 0)` : '';
      el.style.visibility = hidden >= h ? 'hidden' : '';
    };
    at(this.TitleContainer, mid - unit * 132, unit * 42);
    // The link: v1's large URL box under the video; on SAVE / SHARE small, on a rule, up to COPY LINK (owner, 2026-11-18).
    const video = this.Tab === 0 && this.View === 'video',
      url = this.UrlContainer.style;
    const font = video ? App.Metrics.TxtUrl : `300 ${Math.round((unit * 12) / pr)}px Dosis`,
      w = video ? unit * 400 : this.urlWidth(),
      h = unit * (video ? 40 : 30);
    if (url.font !== font) url.font = font;
    url.width = `${w / pr}px`;
    url.height = `${h / pr}px`;
    url.lineHeight = `${h / pr}px`;
    url.left = `${(video ? App.Width * 0.5 - unit * 200 : this.margin) / pr}px`;
    url.opacity = video || this.linkOnly ? '' : '0.6';
    at(this.UrlContainer, video ? this.videoLink().box : this.urlTop(), h);
    if (this.player) at(this.player, this.playerBox().y, this.playerBox().h);
    if (this.SearchContainer)
      at(this.SearchContainer, this.galleryLayout().rule - unit * 42, unit * 42); // v1 StyleDom(…, 152): 42 above the rule
  }
  /** The name field shows on the SAVE tab; the link field when there is a link (v1 ShowDom / HideDom). */
  protected showDom(): void {
    const on = this.shown,
      link = this.Tab === 0 && on && !this.Saving ? this.link : null;
    this.TitleContainer.style.display =
      on && this.Tab === 0 && this.View !== 'video' && !this.Opening ? 'block' : 'none';
    if (this.SearchContainer)
      this.SearchContainer.style.display =
        on &&
        this.Tab === 2 &&
        this.GalleryView === 'list' &&
        this.View !== 'confirm' &&
        !this.Opening
          ? 'block'
          : 'none';
    this.UrlContainer.style.display =
      link && (this.View !== 'video' || this.web) ? 'block' : 'none';
    if (this.player)
      this.player.style.display =
        on && this.Tab === 0 && this.View === 'video' && this.VideoState === 'ready'
          ? 'block'
          : 'none';
    if (link && this.UrlInput.value !== link.url) this.UrlInput.value = link.url; // unchanged: keep the selection
    this.placeDom(); // the link sits under the video in the video view
  }
  /** Keep the link field in step with the link (made, gone stale, reset). */
  Update(): void {
    if (this.shown) this.showDom();
  }
  Resize(): void {
    const unit = App.Unit,
      pr = App.Metrics.PixelRatio,
      el = this.TitleContainer,
      url = this.UrlContainer;
    if (!el) return;
    // v1 StyleDom(TitleInputContainer, 300, 42, 210, 132): up to RANDOMISE TITLE.
    const width = 420 - this.textW(COPY.randomise) / unit - 20;
    el.style.font = App.Metrics.TxtHeaderPR;
    el.style.width = `${(unit * width) / pr}px`;
    el.style.height = `${(unit * 42) / pr}px`;
    el.style.lineHeight = `${(unit * 42) / pr}px`;
    el.style.left = `${(App.Width / pr) * 0.5 - (unit * 210) / pr}px`;
    // v1 StyleDom(URLInputContainer, 400, 40, 200, 20, …, TxtUrl): in v1's URL box.
    url.style.font = App.Metrics.TxtUrl;
    url.style.width = `${(unit * 400) / pr}px`;
    url.style.height = `${(unit * 40) / pr}px`;
    url.style.lineHeight = `${(unit * 40) / pr}px`;
    url.style.left = `${(App.Width / pr) * 0.5 - (unit * 200) / pr}px`;
    // The gallery search field: v1 SoundcloudPanel StyleDom(SearchInputContainer, 300, 42, 210, 152, 0, TxtHeaderPR).
    const sf = this.SearchContainer;
    if (sf) {
      sf.style.font = App.Metrics.TxtHeaderPR;
      sf.style.width = `${(unit * 300) / pr}px`;
      sf.style.height = `${(unit * 42) / pr}px`;
      sf.style.lineHeight = `${(unit * 42) / pr}px`;
      sf.style.left = `${(App.Width / pr) * 0.5 - (unit * 210) / pr}px`;
    }
    if (this.player) {
      const b = this.playerBox();
      Object.assign(this.player.style, {
        left: `${b.x / pr}px`,
        width: `${b.w / pr}px`,
        height: `${b.h / pr}px`,
      });
    }
    if (!this.Open) this.OffsetY = -App.Height;
    this.showDom();
    this.placeDom();
  }
}
