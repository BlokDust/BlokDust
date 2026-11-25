// The Patches panel's DOM fields (v1 ShowDom, StyleDom) and its tweens.
import { App, type DisplayContext, TWEEN } from '../shim.ts';
import { pageElement } from '../pageElement.ts';
import { COPY } from './copy.ts';
import { PatchesLayout } from './layout.ts';

/** The old copy command, for web views that refuse the clipboard API (it copies the selection). */
function copySelection(): void {
  const legacy: { execCommand?: (command: string) => boolean } = document;
  legacy.execCommand?.('copy');
}

export abstract class PatchesDom extends PatchesLayout {
  abstract browse(more?: boolean): Promise<void>;
  /** v1 sizes its panels (Resize) before Init makes their fields. */
  private domReady = false;
  Init(drawTo: DisplayContext): void {
    super.Init(drawTo);
    this.OffsetY = -this.DrawTo.Height;
    this.TitleContainer = pageElement('patchTitle');
    this.Input = pageElement<HTMLInputElement>('patchTitleInput');
    this.UrlContainer = pageElement('patchUrl');
    this.UrlInput = pageElement<HTMLInputElement>('patchUrlText');
    // Any characters ("+" in a name): v1 stripped punctuation for its unescaped URL; the link
    // escapes it and the file name is made safe on its own (fileNameFor, PatchFiles::safeName).
    this.Input.addEventListener('input', () => {
      this.Title = this.Input.value;
    });
    this.Input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.Input.blur();
    });
    this.UrlInput.addEventListener('click', () => void this.copyLink());
    this.player = document.getElementById('patchVideo') as HTMLVideoElement | null;
    this.SearchContainer = pageElement('gallerySearch');
    this.SearchInput = pageElement<HTMLInputElement>('gallerySearchInput');
    this.SearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.SearchInput.blur();
        this.GalleryQuery = this.SearchInput.value.trim();
        void this.browse();
      }
    });
    this.domReady = true;
  }
  /** Click the link: it is copied, and selected to copy by hand where the clipboard is refused. */
  protected async copyLink(): Promise<void> {
    const link = this.link;
    if (!link) return;
    this.UrlInput.select();
    try {
      await navigator.clipboard.writeText(link.url);
    } catch {
      copySelection();
    }
    this.say(COPY.linkCopied);
  }

  /** SHARE (phones): the device's own share sheet (Instagram, Messages, WhatsApp…). */
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
  protected tweens = new Map<string, { stop(): void }>();
  /** Tween `key`'s value from `from` to `to`; one tween per key, so reopening while the close
   * still runs stops it (else it would finish and hide the panel). */
  private slide(
    key: string,
    from: number,
    to: number,
    ms: number,
    update: (value: number) => void,
    delay = 0,
  ) {
    this.tweens.get(key)?.stop();
    const tweened = { x: from },
      tween = new TWEEN.Tween(tweened);
    this.tweens.set(key, tween);
    tween.to({ x: to }, ms);
    tween.onUpdate(() => {
      update(tweened.x);
    });
    tween.easing(TWEEN.Easing.Exponential.InOut);
    tween.delay(delay);
    return tween;
  }
  protected tween(key: 'OffsetX' | 'OffsetY', to: number, ms: number): void {
    const tween = this.slide(key, this[key], to, ms, (value) => {
      this[key] = value;
      if (key === 'OffsetY') this.placeDom();
    });
    tween.onComplete(() => {
      if (key === 'OffsetY' && to !== 0) {
        this.shown = false;
        this.showDom();
      }
    });
    tween.start(this.LastVisualTick);
  }
  protected tweenPage(i: number, to: number, ms: number, delay: number): void {
    const tween = this.slide(
      `page${i}`,
      this.pageDy[i],
      to,
      ms,
      (value) => {
        this.pageDy[i] = value;
        this.placeDom();
      },
      delay,
    );
    tween.onComplete(() => {
      if (i === this.leaving && to !== 0) this.leaving = null;
      this.showDom();
    });
    tween.start(this.LastVisualTick);
  }
  protected tweenSelected(i: number, to: number, ms: number): void {
    this.slide(`sel${i}`, this.selected[i], to, ms, (value) => {
      this.selected[i] = value;
    }).start(this.LastVisualTick);
  }
  protected placeDom(): void {
    const pr = App.Metrics.PixelRatio,
      unit = App.Unit,
      mid = this.cy;
    // The fields slide with their page and, like the canvas, are cut off at the tabs' foot (owner,
    // 2026-11-18: the name showed above the tabs as SAVE / SHARE lifted out).
    const clipTop = this.OffsetY + 60 * unit;
    const at = (el: HTMLElement, top: number, shownHeight: number) => {
      el.style.top = `${top / pr}px`;
      const hidden = Math.max(0, Math.min(shownHeight, clipTop - top));
      el.style.clipPath = hidden > 0 ? `inset(${hidden / pr}px 0 0 0)` : '';
      el.style.visibility = hidden >= shownHeight ? 'hidden' : '';
    };
    at(this.TitleContainer, mid - unit * 132, unit * 42);
    // The link: v1's large URL box under the video; on SAVE / SHARE small, on a rule, to COPY LINK.
    const video = this.Tab === 0 && this.View === 'video',
      url = this.UrlContainer.style;
    const font = video ? App.Metrics.TxtUrl : `300 ${Math.round((unit * 12) / pr)}px Dosis`,
      width = video ? unit * 400 : this.urlWidth(),
      height = unit * (video ? 40 : 30);
    if (url.font !== font) url.font = font;
    url.width = `${width / pr}px`;
    url.height = `${height / pr}px`;
    url.lineHeight = `${height / pr}px`;
    url.left = `${(video ? App.Width * 0.5 - unit * 200 : this.margin) / pr}px`;
    url.opacity = video || this.linkOnly ? '' : '0.6';
    at(this.UrlContainer, video ? this.videoLink().box : this.urlTop(), height);
    if (this.player) at(this.player, this.playerBox().y, this.playerBox().h);
    // v1 StyleDom(…, 152): 42 above the rule
    at(this.SearchContainer, this.galleryLayout().rule - unit * 42, unit * 42);
  }
  /** The name field shows on the SAVE tab; the link field when there is a link (v1 ShowDom). */
  protected showDom(): void {
    const on = this.shown,
      link = this.Tab === 0 && on && !this.Saving ? this.link : null;
    this.TitleContainer.style.display =
      on && this.Tab === 0 && this.View !== 'video' && !this.Opening ? 'block' : 'none';
    this.SearchContainer.style.display =
      on && this.Tab === 2 && this.View !== 'confirm' && !this.Opening ? 'block' : 'none';
    this.UrlContainer.style.display =
      link && (this.View !== 'video' || this.web) ? 'block' : 'none';
    if (this.player)
      this.player.style.display =
        on && this.Tab === 0 && this.View === 'video' && this.VideoState === 'ready'
          ? 'block'
          : 'none';
    // an unchanged link keeps its selection
    if (link && this.UrlInput.value !== link.url) this.UrlInput.value = link.url;
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
    if (!this.domReady) return;
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
    // The gallery search: v1 SoundcloudPanel StyleDom(SearchInputContainer, 300, 42, 210, 152).
    const search = this.SearchContainer.style;
    search.font = App.Metrics.TxtHeaderPR;
    search.width = `${(unit * 300) / pr}px`;
    search.height = `${(unit * 42) / pr}px`;
    search.lineHeight = `${(unit * 42) / pr}px`;
    search.left = `${(App.Width / pr) * 0.5 - (unit * 210) / pr}px`;
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
