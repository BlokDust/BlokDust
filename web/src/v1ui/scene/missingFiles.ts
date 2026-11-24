// LOCATE FILE for a sampler whose sound is missing.
import { OptionSample } from '../ported/UI/Options/OptionSample';
import type { V1Scene } from './v1Scene.ts';

/** The track line of a sampler whose sound can't be found (main.ts markMissing). */
const MISSING = 'MISSING · ';
/**
 * Owner (2026-11-08, CHG-0005): a missing file is relinked by dropping a file on the block or with a button that opens
 * the file picker. While the selected sampler is missing, v1's LOAD NEW SAMPLE button reads LOCATE FILE and opens the
 * picker (host.loadSample: the browser's, or the plugin's native one, which keeps the region) instead of the sample
 * search. v1's option is ported verbatim, so its label is substituted while it draws.
 */
export function locateMissingFiles(scene: V1Scene): void {
  const proto = OptionSample.prototype as any,
    draw = proto.Draw;
  proto.Draw = function (ctx: CanvasRenderingContext2D, ...rest: unknown[]) {
    if (!String(this.Track ?? '').startsWith(MISSING)) return draw.call(this, ctx, ...rest);
    ctx.fillText = function (t: string, x: number, y: number, w?: number) {
      CanvasRenderingContext2D.prototype.fillText.call(
        this,
        t === 'LOAD NEW SAMPLE' ? 'LOCATE FILE' : t,
        x,
        y,
        w,
      );
    };
    try {
      return draw.call(this, ctx, ...rest);
    } finally {
      delete (ctx as any).fillText;
    }
  };
  const search = scene.SoundcloudPanel as any,
    open = search.OpenPanel.bind(search);
  search.OpenPanel = () => {
    const b = scene.OptionsPanel.SelectedBlock;
    if (b && String(b.Params?.trackName ?? '').startsWith(MISSING)) scene.host.loadSample(b.Id);
    else open();
  };
}
