// Where each sampler is playing, drawn over its waveform.
import type { V1Block } from '../blocks/v1Block.ts';
import { App } from '../shim.ts';
import { panelView } from '../waveZoom.ts';
import { V1ScenePower } from './power.ts';

export abstract class V1ScenePlayheads extends V1ScenePower {
  /**
   * Where each sampler is playing (owner, Phase 3 review; not in v1): the engine's playheads, packed
   * [blockId, seconds]*. While a block's options are open, its waveform shows a thin line per sounding voice (one per
   * grain for Granular).
   */
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
  /** The open panel's playheads as fractions of its waveform's width, and the waveform's rect (panel coordinates). */
  playheadLines(): { xs: number[]; x: number; y: number; width: number; height: number } | null {
    const optionsPanel = this.OptionsPanel as any,
      v1Block = optionsPanel.SelectedBlock as V1Block | null;
    if (!v1Block || optionsPanel.Scale !== 1) return null;
    const secs = this.playheads.get(v1Block.Id);
    const w = (optionsPanel.Options ?? []).find(
      (q: any) => q.Type === 'waveregion' || q.Type === 'waveslider' || q.Type === 'waveimage',
    );
    const dur = v1Block.GetDuration();
    if (!secs?.length || !w || !(dur > 0) || !(w.Waveform?.length > 0)) return null;
    // A zoomed waveform (waveZoom.ts) shows only the playheads inside its window.
    const view = panelView(optionsPanel) ?? { f0: 0, f1: 1 };
    const xs = secs
      .map((sec) => Math.max(0, Math.min(1, sec / dur)))
      .map((f) => (f - view.f0) / (view.f1 - view.f0))
      .filter((f) => f >= 0 && f <= 1);
    return {
      xs,
      x: optionsPanel.Margin,
      y: w.Position.y,
      width: optionsPanel.Range,
      height: w.Size.height,
    };
  }
  protected drawPlayheads(): void {
    const l = this.playheadLines();
    this.playheadsShown = !!l;
    if (!l) return;
    const optionsPanel = this.OptionsPanel as any,
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
    for (const f of l.xs) {
      const x = Math.round(l.x + f * l.width) + 0.5;
      ctx.moveTo(x, l.y);
      ctx.lineTo(x, l.y + l.height);
    }
    ctx.stroke();
    ctx.restore();
  }
}
