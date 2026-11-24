// Back from signing in during SAVE / SHARE (CHG-0035).
import { SAVE_WARNING } from '../../v1ui/scene/shareSlot.ts';
import { isPortable } from '../../patch/samples.ts';
import { AFTER_SIGN_IN } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { model } from '../model/patchModel.ts';
import { scene } from '../scene/scene.ts';
import { accountPage } from '../stage/corners.ts';

/** Signed in after SAVE / SHARE › SIGN IN: Settings closes and SAVE opens again, ADD TO GALLERY on, the name kept. */
export function backToSave(): void {
  let want: { to?: string; title?: string; at?: number } | null = null;
  try {
    want = JSON.parse(sessionStorage.getItem(AFTER_SIGN_IN) ?? 'null');
    sessionStorage.removeItem(AFTER_SIGN_IN);
  } catch {
    want = null;
  }
  // Only a sign-in finished soon after (10 minutes): one begun from SAVE and given up on is forgotten.
  if (want?.to !== 'save' || !(Date.now() - (want.at ?? 0) < 10 * 60_000)) return;
  const t0 = performance.now();
  const go = () => {
    // once the account page knows who is signed in (the switch reads it)
    if (!accountPage()?.Account && performance.now() - t0 < 8000) {
      setTimeout(go, 150);
      return;
    }
    (scene.SettingsPanel as any).ClosePanel?.();
    const pp = scene.PatchesPanel;
    if (want?.title) pp.setTitle(want.title);
    pp.GalleryOn = true;
    pp.OpenPanel(0);
    stage.redraw();
  };
  go();
}

export function shareWarning(): string | null {
  return [...model.values()].some(
    (b) => b.type === 'source.recorder' || !isPortable(b.params.track),
  )
    ? SAVE_WARNING
    : null;
}
