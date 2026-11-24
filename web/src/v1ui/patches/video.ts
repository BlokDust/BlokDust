// SAVE / SHARE's video (CHG-0022): made, played and shared.
import { App } from '../shim.ts';
import { COPY } from './copy.ts';
import { PatchesDrawParts } from './drawParts.ts';

export abstract class PatchesVideo extends PatchesDrawParts {
  /** The video: SharePanel's spinner while it renders (CANCEL under it), then the portrait player with SHARE VIDEO
   * (DOWNLOAD VIDEO on desktop) under it; BACK at the top right. */
  protected drawVideo(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      width = App.Width,
      txt = App.Palette[App.ThemeManager.Txt],
      menu = App.ThemeManager.MenuOrder;
    this.drawBack();
    const m = this.videoMain(),
      pb = this.playerBox(),
      mid = pb.y + pb.h / 2;
    // The player's frame, in every state (the DOM video sits inside it once made; its edge in the rule colour, as the
    // URL box), so the page keeps its shape while the video is made.
    App.StrokeColor(ctx, App.Palette[1]);
    ctx.lineWidth = 2;
    ctx.strokeRect(pb.x - 1, pb.y - 1, pb.w + 2, pb.h + 2);
    App.FillColor(ctx, txt);
    if (this.VideoState === 'making') {
      ctx.font = App.Metrics.TxtMid;
      ctx.textAlign = 'center';
      ctx.fillText(
        `${COPY.rendering}... ${Math.floor(this.VideoProgress.done * 100)}%`.toUpperCase(),
        width * 0.5,
        mid + 25 * unit,
      );
      App.AnimationsLayer.DrawSprite(ctx, 'loading', width * 0.5, mid, 16, true);
      this.filled(m, App.Palette[1], COPY.cancelVideo, !!this.roll.make);
    } else if (this.VideoState === 'ready') {
      this.filled(
        m,
        App.Palette[menu[3]],
        this.shareFiles ? COPY.shareVideo : COPY.downloadVideo,
        !!this.roll.shareVideo,
      );
    } else {
      const line =
        this.VideoState === 'error'
          ? this.VideoMessage
          : !this.host.hasBlocks()
            ? App.L10n.UI.SharePanel.NoBlocks
            : '';
      if (line) {
        ctx.font = App.Metrics.TxtItalic2;
        ctx.textAlign = 'left';
        this.wordWrap(line, pb.x + 10 * unit, mid, 14 * unit, pb.w - 20 * unit);
      }
      this.filled(
        m,
        App.Palette[this.host.hasBlocks() ? menu[3] : 1],
        this.VideoState === 'error' ? COPY.tryAgain : COPY.makeVideo,
        !!this.roll.make && this.host.hasBlocks(),
      );
    }
    // THE LINK, to share on its own (v1 SharePanel's line + URL box; the field over it copies on a click) //
    if (this.link && this.web) {
      const L = this.videoLink();
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      this.wordWrap(this.label('url', COPY.linkLine), this.margin, L.line, 14 * unit, this.pageW);
      App.FillColor(ctx, App.Palette[1]);
      ctx.fillRect(this.margin, L.box, this.pageW, 40 * unit);
    }
  }

  /** Make the video (portrait, videoSeconds long) and show it; on desktop it also downloads once made. */
  protected async makeVideo(): Promise<void> {
    const v = this.host.video;
    if (!v || this.VideoState === 'making' || !this.host.hasBlocks()) return;
    this.View = 'video';
    this.dropPlayer();
    const abort = (this.videoAbort = new AbortController());
    this.VideoState = 'making';
    this.VideoProgress = { phase: 'preparing', done: 0 };
    this.videoFile = null;
    this.VideoMessage = '';
    this.showDom();
    // Only the current render may change the panel: a cancelled one winds down on its own (CANCEL takes effect at once).
    const current = () => this.videoAbort === abort;
    try {
      const file = await v.make(
        { shape: 'portrait', seconds: v.seconds() },
        (videoProgressInfo) => {
          if (current()) this.VideoProgress = videoProgressInfo;
        },
        abort.signal,
      );
      if (!current()) return;
      this.videoFile = file;
      this.VideoState = 'ready';
      this.showPlayer(file);
      // Where the share sheet can't take files (desktop browsers), it downloads at once (owner, 2026-11-15).
      if (!this.shareFiles) await v.share(file).catch(() => {});
    } catch (error) {
      if (current()) {
        this.VideoState = 'error';
        this.VideoMessage = (error as Error).message || 'The video could not be made.';
      }
    } finally {
      if (current()) this.videoAbort = null;
      this.settled();
      this.showDom();
    }
  }
  /** CANCEL: the panel is free at once; the render stops at its next check. */
  protected cancelVideo(): void {
    this.videoAbort?.abort();
    this.videoAbort = null;
    this.VideoState = 'idle';
    this.VideoMessage = '';
  }
  protected showPlayer(file: File): void {
    const el = this.player;
    if (!el) return;
    if (this.playerUrl) URL.revokeObjectURL(this.playerUrl);
    this.playerUrl = URL.createObjectURL(file);
    el.src = this.playerUrl;
    void el.play().catch(() => {});
  }
  protected dropPlayer(): void {
    const el = this.player;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    if (this.playerUrl) {
      URL.revokeObjectURL(this.playerUrl);
      this.playerUrl = '';
    }
  }
}
