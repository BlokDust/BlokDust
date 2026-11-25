// The header's Share slot (it opens Patches) and the Share panel's warning.

/** The Share panel's warning (v1 l10n UI.SharePanel.SaveWarning, reworded: SoundCloud is gone; local files added). */
export const SAVE_WARNING =
  "Note: Recorder recordings and your own audio samples aren't saved in the link. " +
  'To share audio, download a recording from its options panel or use samples from Freesound.'; // owner, PR #1 review 2026-11-12

/**
 * The header's Share slot reads PATCHES (CHG-0005): the Patches panel opens from it on the web and in the plugin (the
 * plugin had no Share, CHG-0004). v1's Header is ported verbatim, so its text is substituted while it draws and hit-
 * tests: it sizes the button, hover triangle and chevron from measureText("SHARE"), so measuring the new label keeps
 * them all centred on it.
 */
const SHARE_SLOT_LABEL = 'PATCHES';
export function relabelShareButton(header: any): void {
  const wrap = (fn: () => void) => {
    const ctx = header.Ctx as CanvasRenderingContext2D,
      { fillText, measureText } = ctx;
    ctx.fillText = function (text: string, x: number, y: number, w?: number) {
      fillText.call(this, text === 'SHARE' ? SHARE_SLOT_LABEL : text, x, y, w);
    };
    ctx.measureText = function (text: string) {
      return measureText.call(this, text === 'SHARE' ? SHARE_SLOT_LABEL : text);
    };
    // Remove the overrides rather than assigning the originals back: an own property left on the
    // context would shadow CanvasRenderingContext2D.prototype from then on.
    try {
      fn();
    } finally {
      delete (ctx as any).fillText;
      delete (ctx as any).measureText;
    }
  };
  const draw = header.Draw.bind(header),
    hit = header.HitTests.bind(header);
  header.Draw = () => {
    wrap(draw);
  };
  header.HitTests = (point: unknown) => {
    wrap(() => hit(point));
  };
}
