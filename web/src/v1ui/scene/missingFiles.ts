// LOCATE FILE for a sampler whose sound is missing.
import { OptionSample } from '../ported/UI/Options/OptionSample';
import type { V1Scene } from './v1Scene.ts';

/** The track line of a sampler whose sound is missing (app/samples/userSamples.ts markMissing). */
const MISSING = 'MISSING · ';

type RowDraw = (this: OptionSample, ctx: CanvasRenderingContext2D, ...rest: unknown[]) => void;

/** A missing file is relinked by dropping a file on the block or with LOCATE FILE (CHG-0005): v1's
 * LOAD NEW SAMPLE, renamed while it draws, opening the file picker (host.loadSample) not search. */
export function locateMissingFiles(scene: V1Scene): void {
  const sampleRow = OptionSample.prototype,
    // v1's own Draw, called below with each row as `this`
    draw = Reflect.get(sampleRow, 'Draw') as RowDraw;
  sampleRow.Draw = function (
    this: OptionSample,
    ctx: CanvasRenderingContext2D,
    ...rest: unknown[]
  ) {
    const track = (this.Track as string | undefined) ?? '';
    if (!track.startsWith(MISSING)) {
      draw.call(this, ctx, ...rest);
      return;
    }
    ctx.fillText = function (text: string, x: number, y: number, maxWidth?: number) {
      const label = text === 'LOAD NEW SAMPLE' ? 'LOCATE FILE' : text;
      CanvasRenderingContext2D.prototype.fillText.call(this, label, x, y, maxWidth);
    };
    try {
      draw.call(this, ctx, ...rest);
    } finally {
      // back to the prototype's fillText
      Reflect.deleteProperty(ctx, 'fillText');
    }
  };
  // The picker is the browser's, or the plugin's native one, which keeps the region.
  const search = scene.SoundcloudPanel,
    open = search.OpenPanel.bind(search);
  search.OpenPanel = () => {
    const block = scene.OptionsPanel.SelectedBlock,
      trackName = block?.Params.trackName;
    if (block && typeof trackName === 'string' && trackName.startsWith(MISSING))
      scene.host.loadSample(block.Id);
    else open();
  };
}
