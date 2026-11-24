// Liking someone else's patch from the corner star (SPEC-SHARING-GALLERY).
import * as gallery from '../../gallery/client.ts';
import { load as loadShared } from '../../patch/server.ts';
import { stage } from '../boot/pixi.ts';
import { openAccountSettings } from '../scene/hostParts.ts';
import { scene } from '../scene/scene.ts';
import { accountPage, credit } from './corners.ts';

/** Likes (SPEC-SHARING-GALLERY R8): the latest wish shows at once; one request per patch at a time,
 * then one more only if the wish changed, so fast presses settle without flicker. */
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
    openAccountSettings();
    return;
  }
  const want = !liked;
  likeWish.set(id, want);
  showLike(id, want, Math.max(0, likes + (want ? 1 : -1)));
  if (likeSent.has(id)) return;
  likeSent.add(id);
  void (async () => {
    const answer = await sendLikeWishes(id, want);
    likeSent.delete(id);
    likeWish.delete(id);
    if (answer) showLike(id, answer.liked, answer.likes);
    else {
      // It failed: the server's state shows again.
      const loadedPatch = await loadShared(id).catch(() => null);
      if (loadedPatch) showLike(id, !!loadedPatch.liked, loadedPatch.likes ?? 0);
    }
  })();
}

/** Sends the wish, again while it changed meanwhile; the last answer, or null if one failed. */
async function sendLikeWishes(
  id: string,
  firstWish: boolean,
): Promise<{ liked: boolean; likes: number } | null> {
  try {
    for (;;) {
      const wish = likeWish.get(id) ?? firstWish;
      const answer = await gallery.like(id, wish);
      if (likeWish.get(id) === wish) return answer;
    }
  } catch {
    return null;
  }
}

export function likeCredit(): void {
  if (credit) wantLike(credit.id, credit.liked, credit.likes);
}
