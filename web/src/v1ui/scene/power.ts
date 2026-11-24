// The power switch (not in v1), with the plugins' HOST cell.
import { App, Dimensions } from '../shim.ts';
import { V1SceneSplash } from './splash.ts';

export abstract class V1ScenePower extends V1SceneSplash {
  // ---- the power switch (owner, 2026-11-11; not in v1) ----
  worldPower = true;
  protected powerHover = false;
  setWorldPower(on: boolean): void {
    this.worldPower = on;
    this.host.setWorldPower(on);
  }
  /**
   * DAW plugins (owner, 2026-11-16, CHG-0025): a third cell, HOST, hands the power to the DAW's transport: powered
   * while it plays, off while it is stopped. Its icon shows the transport (▷ stopped, ■ playing). A plugin can't press
   * the DAW's play (AUv3, AU and VST3 give it no way), so pressing HOST again says where play is.
   */
  hostPower = false;
  powerMode: 0 | 1 | 2 = 1;
  hostPlaying = false;
  protected hostHintUntil = 0;
  protected hintDrawn = false;
  setPowerMode(mode: 0 | 1 | 2): void {
    this.powerMode = mode;
    this.host.setPowerMode?.(mode); // first: the processor drops the page's power commands in host mode
    if (mode < 2) this.setWorldPower(mode === 1);
    else this.worldPower = this.hostPlaying;
  }
  /** The processor's mode and the DAW's play state (bd_patch, bd_hostState). */
  setHostState(mode: number, playing: boolean): void {
    this.powerMode = mode === 2 ? 2 : mode === 0 ? 0 : 1;
    this.hostPlaying = playing;
    if (this.powerMode === 2) this.worldPower = playing;
  }
  protected pressPower(x: number): void {
    if (!this.hostPower) {
      this.setWorldPower(!this.worldPower);
      return;
    }
    const r = this.powerRect(),
      cell = Math.max(0, Math.min(2, Math.floor((x - r.x) / (r.w / 3)))) as 0 | 1 | 2;
    if (cell === 2 && this.powerMode === 2) {
      this.hostHintUntil = performance.now() + 2500;
      return;
    }
    this.setPowerMode(cell);
  }
  /** Bottom centre, between the zoom buttons and the trash: v1's off/on switch (OptionSwitch, "offOn"), at its own size
   * (a 60u options row, 60u wide; 90u with HOST's cell). Its dash and diamond sit level with +, − and the trash (30u up,
   * v1 ZoomButtons and TrashCan); the label goes above it, where v1's zoom shows its percentage (50u up), as below
   * would meet the edge. */
  protected powerRect() {
    const unit = App.Unit,
      w = (this.hostPower ? 90 : 60) * unit,
      h = 60 * unit;
    return { x: App.Width * 0.5 - w * 0.5, y: App.Height - 30 * unit - h * 0.35, w, h };
  }
  protected powerHit(p: { x: number; y: number }): boolean {
    if (
      this.SharePanel.Open ||
      this.SettingsPanel.Open ||
      this.SoundcloudPanel.Open ||
      this.PatchesPanel.Open
    )
      return false;
    const unit = App.Unit,
      r = this.powerRect();
    return Dimensions.hitRect(r.x, App.Height - 66 * unit, r.w, 66 * unit, p.x, p.y);
  }
  /** Hosts: the HOST hint is showing (the stage keeps redrawing until it goes). */
  protected get hostHinting(): boolean {
    return this.hostHintUntil > performance.now();
  }
  /**
   * v1 OptionSwitch (style 1, "offOn"), its proportions unchanged: dividers from 0.15h to 0.55h, the dash (off),
   * diamond (on) and HOST's ▷/■ at 0.35h, the chosen cell underlined at 0.55h. The label: POWER; when off, POWER OFF
   * on the red of v1's record button (its right half, palette 13), so a stopped world is never mistaken for a broken
   * one; HOST with the host stopped reads SYNCED TO HOST on the same red (owner, 2026-11-20). Space toggles it too (web).
   */
  protected drawPower(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      { x, y, w, h } = this.powerRect(),
      menu = App.ThemeManager.MenuOrder;
    const txt = App.Palette[App.ThemeManager.Txt],
      cy = y + h * 0.35,
      cells = this.hostPower ? 3 : 2,
      cw = w / cells;
    const mode = this.hostPower ? this.powerMode : this.worldPower ? 1 : 0;
    App.StrokeColor(ctx, App.Palette[1]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < cells; i++) {
      ctx.moveTo(Math.round(x + cw * i), y + h * 0.15);
      ctx.lineTo(Math.round(x + cw * i), y + h * 0.55);
    }
    ctx.stroke();
    const red = 13,
      stopped = mode === 0 || (mode === 2 && !this.hostPlaying);
    App.FillColor(ctx, App.Palette[stopped ? red : menu[2]]);
    ctx.fillRect(x + cw * mode, y + h * 0.55, cw, h * 0.05 + (this.powerHover ? unit : 0));
    const lx = x + cw * 0.5,
      rx = x + cw * 1.5,
      hx = x + cw * 2.5;
    ctx.lineWidth = 2;
    App.StrokeColor(ctx, txt);
    ctx.beginPath();
    ctx.moveTo(lx - 5 * unit, cy);
    ctx.lineTo(lx + 5 * unit, cy);
    ctx.moveTo(rx + 5 * unit, cy);
    ctx.lineTo(rx, cy - 5 * unit);
    ctx.lineTo(rx - 5 * unit, cy);
    ctx.lineTo(rx, cy + 5 * unit);
    ctx.lineTo(rx + 5 * unit, cy);
    if (this.hostPower && this.hostPlaying)
      ctx.rect(hx - 4.5 * unit, cy - 4.5 * unit, 9 * unit, 9 * unit);
    else if (this.hostPower) {
      ctx.moveTo(hx - 4 * unit, cy - 5 * unit);
      ctx.lineTo(hx + 5 * unit, cy);
      ctx.lineTo(hx - 4 * unit, cy + 5 * unit);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    const hosted = mode === 2;
    const label = this.hostHinting
      ? "USE THE HOST'S PLAY BUTTON"
      : mode === 0
        ? 'POWER OFF'
        : !hosted
          ? 'POWER'
          : this.hostPlaying
            ? 'POWER · HOST PLAYING'
            : 'SYNCED TO HOST';
    const fill = this.hostHinting ? menu[1] : stopped ? red : null;
    ctx.font = App.Metrics.TxtMid;
    ctx.textAlign = 'center';
    let base = App.Height - 50 * unit;
    if (fill !== null) {
      const textMetrics = ctx.measureText(label),
        boxY = base - 11 * unit,
        boxH = 15 * unit;
      App.FillColor(ctx, App.Palette[fill]);
      ctx.fillRect(
        x + w * 0.5 - textMetrics.width * 0.5 - 6 * unit,
        boxY,
        textMetrics.width + 12 * unit,
        boxH,
      );
      // The letters sit in the middle of the fill (owner, 2026-11-13: they sat a pixel or two high).
      base =
        boxY +
        boxH * 0.5 +
        (textMetrics.actualBoundingBoxAscent - textMetrics.actualBoundingBoxDescent) * 0.5;
    }
    App.FillColor(ctx, txt);
    ctx.fillText(label, x + w * 0.5, base);
  }
}
