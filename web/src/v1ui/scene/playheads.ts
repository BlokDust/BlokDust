// Where each sampler is playing, drawn over its waveform.
import { App } from '../shim.ts';
import { panelView } from '../waveZoom.ts';
import { V1ScenePower } from './power.ts';

export abstract class V1ScenePlayheads extends V1ScenePower {
  /** Where each sampler plays (not in v1): the engine's playheads, [blockId, seconds]*. An open
   * panel's waveform shows a thin line per sounding voice (per grain for Granular). */
  protected playheads = new Map<number, number[]>();
  protected playheadsShown = false;
  setPlayheads(packed: Float32Array): void {
    this.playheads.clear();
    for (let i = 0; i + 1 < packed.length; i += 2) {
      const id = packed[i],
        list = this.playheads.get(id);
      if (list) list.push(packed[i + 1]);
      else this.playheads.set(id, [packed[i + 1]]);
    }
  }
  /** The open panel's playheads as fractions of its waveform's width, and the waveform's rect
   * (panel coordinates). */
  playheadLines(): { xs: number[]; x: number; y: number; width: number; height: number } | null {
    const optionsPanel = this.OptionsPanel,
      v1Block = optionsPanel.SelectedBlock;
    if (!v1Block || optionsPanel.Scale !== 1) return null;
    const secs = this.playheads.get(v1Block.Id);
    const wave = optionsPanel.Options.find(
      (row) => row.Type === 'waveregion' || row.Type === 'waveslider' || row.Type === 'waveimage',
    );
    const dur = v1Block.GetDuration();
    if (!secs?.length || !wave || !(dur > 0) || !wave.Waveform?.length) return null;
    // A zoomed waveform (waveZoom.ts) shows only the playheads inside its window.
    const view = panelView(optionsPanel) ?? { f0: 0, f1: 1 };
    const xs = secs
      .map((sec) => Math.max(0, Math.min(1, sec / dur)))
      .map((fraction) => (fraction - view.f0) / (view.f1 - view.f0))
      .filter((fraction) => fraction >= 0 && fraction <= 1);
    return {
      xs,
      x: optionsPanel.Margin,
      y: wave.Position.y,
      width: optionsPanel.Range,
      height: wave.Size.height,
    };
  }
  protected drawPlayheads(): void {
    const lines = this.playheadLines();
    this.playheadsShown = !!lines;
    if (!lines) return;
    const optionsPanel = this.OptionsPanel,
      ctx = this.Ctx,
      unit = App.Unit;
    ctx.save();
    ctx.setTransform(
      optionsPanel.Scale,
      0,
      0,
      optionsPanel.Scale,
      optionsPanel.Position.x,
      optionsPanel.Position.y,
    );
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(1, unit);
    ctx.beginPath();
    for (const fraction of lines.xs) {
      const x = Math.round(lines.x + fraction * lines.width) + 0.5;
      ctx.moveTo(x, lines.y);
      ctx.lineTo(x, lines.y + lines.height);
    }
    ctx.stroke();
    ctx.restore();
  }
}
