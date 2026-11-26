// The header's Share slot (it opens Patches) and the Share panel's warning.
import type { Header } from '../ported/UI/Header';

/** The Share panel's warning (v1 UI.SharePanel.SaveWarning; SoundCloud gone, own files added). */
export const SAVE_WARNING =
  "Note: Recorder recordings and your own audio samples aren't saved in the link. " +
  'To share audio, download a recording from its options panel or use samples from Freesound.';

/** The header's Share slot reads PATCHES and opens Patches (CHG-0005). v1's Header sizes its
 * button from measureText("SHARE"), so the label is swapped while it draws and hit-tests. */
const SHARE_SLOT_LABEL = 'PATCHES';
const relabel = (text: string) => (text === 'SHARE' ? SHARE_SLOT_LABEL : text);
export function relabelShareButton(header: Header): void {
  const wrap = (run: () => void) => {
    const ctx = header.Ctx,
      canvas = CanvasRenderingContext2D.prototype;
    ctx.fillText = function (text: string, x: number, y: number, maxWidth?: number) {
      canvas.fillText.call(this, relabel(text), x, y, maxWidth);
    };
    ctx.measureText = function (text: string) {
      return canvas.measureText.call(this, relabel(text));
    };
    // Remove the overrides rather than assigning the originals back: an own property left on the
    // context would shadow CanvasRenderingContext2D.prototype from then on.
    try {
      run();
    } finally {
      Reflect.deleteProperty(ctx, 'fillText');
      Reflect.deleteProperty(ctx, 'measureText');
    }
  };
  const draw = header.Draw.bind(header),
    hit = header.HitTests.bind(header);
  header.Draw = () => {
    wrap(draw);
  };
  header.HitTests = (point: unknown) => {
    wrap(() => {
      hit(point);
    });
  };
}
