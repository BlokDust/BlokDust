// Liking someone else's patch from the corner star (SPEC-SHARING-GALLERY).
import * as gallery from '../../gallery/client.ts';
import { load as loadShared } from '../../patch/server.ts';
import { stage } from '../boot/pixi.ts';
import { scene } from '../scene/scene.ts';
import { accountPage, credit } from './corners.ts';

/**
 * Likes (SPEC-SHARING-GALLERY R8), from the stage or a gallery row: the user's latest wish shows at once, on both;
 * one request per patch at a time, and when it lands another only if the wish changed meanwhile, so fast presses
 * settle on the last without flicker (bug, owner review 3: a double press flipped back and forth as the answers
 * arrived) and send at most two requests. If it fails, the server's state shows again.
 */
export const likeWish = new Map<string, boolean>(),
  likeSent = new Set<string>();

export function showLike(id: string, liked: boolean, likes: number): void {
  if (credit?.id === id) {
    credit.liked = liked;
    credit.likes = likes;
  }
  for (const it of scene.PatchesPanel.GalleryItems)
    if (it.id === id) {
      it.liked = liked;
      it.likes = likes;
    }
  stage.redraw();
}

export function wantLike(id: string, liked: boolean, likes: number): void {
  if (!accountPage()?.Account) {
    scene.PatchesPanel.ClosePanel();
    (scene.SettingsPanel as any).openAccount?.();
    return;
  }
  const want = !liked;
  likeWish.set(id, want);
  showLike(id, want, Math.max(0, likes + (want ? 1 : -1)));
  if (likeSent.has(id)) return;
  likeSent.add(id);
  void (async () => {
    let r: { liked: boolean; likes: number } | null = null;
    try {
      for (;;) {
        const w = likeWish.get(id)!;
        r = await gallery.like(id, w);
        if (likeWish.get(id) === w) break;
      }
    } catch {
      r = null;
    }
    likeSent.delete(id);
    likeWish.delete(id);
    if (r) showLike(id, r.liked, r.likes);
    else {
      const p = await loadShared(id).catch(() => null);
      if (p) showLike(id, !!p.liked, p.likes ?? 0);
    }
  })();
}

export function likeCredit(): void {
  if (credit) wantLike(credit.id, credit.liked, credit.likes);
}
