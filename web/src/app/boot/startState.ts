// The opened patch's unsaved baseline, title, own link and credit, and who is signed in.
import { activity } from '../../account/activity.ts';
import * as account from '../../account/client.ts';
import { loadSession } from '../../patch/share.ts';
import { App } from '../../v1ui/shim.ts';
import { handleSignInArrival } from '../account/signInArrival.ts';
import { setCountActivity, toPatch } from '../model/patchModel.ts';
import {
  BASELINE_KEY,
  contentOf,
  replaceBaseline,
  setBaseline,
  setShareLink,
} from '../model/unsavedChanges.ts';
import { scene } from '../scene/scene.ts';
import { checkOwnDirty } from '../share/ownLink.ts';
import { accountPage, setCredit } from '../stage/corners.ts';
import { startFrameLoop } from '../stage/frameLoop.ts';
import { embedId, juce, params, start } from './page.ts';
import { stage } from './pixi.ts';

/** Unsaved changes count from what was opened; restored work from where it was last saved. */
function setStartBaseline(): void {
  const opened =
    Boolean(start.id) ||
    params.has('c') ||
    params.has('v1') ||
    params.has('demo') ||
    start.source === 'demo';
  // A missing patch opens blank: nothing unsaved, and the kept baseline stays the autosave's.
  if (start.missing) replaceBaseline(contentOf(toPatch()));
  else if (opened) setBaseline();
  else
    try {
      replaceBaseline(localStorage.getItem(BASELINE_KEY) ?? '');
    } catch {
      /* private mode */
    }
}

/** This browser's own link (COPY LINK, or UPDATE LINK once changed), or someone else's credit. */
function showWhoseLinkItIs(title: string): void {
  if (start.id && App.SessionId && !embedId)
    setShareLink({
      url: `${location.origin}${location.pathname}?c=${start.id}${title ? `&t=${encodeURIComponent(title)}` : ''}`,
      owned: true,
      at: loadSession().dirty ? '' : contentOf(toPatch()),
      title,
    });
  // Someone else's: "TITLE BY @NAME" in the corner. Yours: the gallery switch says if published.
  if (start.by && !start.mine && !embedId && start.id)
    setCredit({
      id: start.id,
      title: start.title || 'Untitled',
      by: start.by,
      published: !!start.published,
      liked: !!start.liked,
      likes: start.likes ?? 0,
      views: start.views ?? 0,
    });
  if (start.mine) scene.PatchesPanel.galleryKnown(!!start.published);
  checkOwnDirty(); // restored edits to this device's own link show UNSAVED at once
}

/** Who is signed in (corner, Settings, gallery switch), and their activity totals (R16). */
function watchAccount(): void {
  const page = accountPage();
  if (!page || juce || embedId) return;
  const previous = page.onChange;
  page.onChange = () => {
    previous();
    stage.redraw();
  };
  void page.refresh(false);
  // Kept while the page is hidden; sent in one request when it closes (saves carry them too).
  setCountActivity(true);
  account.watchActivityBeacon();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') activity.keep();
  });
  addEventListener('pagehide', () => {
    account.sendActivityOnClose(!!page.Account);
  });
}

/** The plugin's CREATE SHARE LINK arrives as `?c=p…&share=1`: SAVE makes the link here, once. */
function makeLinkAskedForByPlugin(title: string): void {
  if (!params.has('share') || juce || embedId) return;
  params.delete('share'); // first, so a reload doesn't make another
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
  requestAnimationFrame(() => {
    void scene.host.links?.make('saveAs', title || 'Untitled').catch((error: unknown) => {
      console.warn('BlokDust: making the share link failed', error);
    });
  });
}

export function init(): void {
  setStartBaseline();
  const title = params.get('t') ?? start.title ?? '';
  if (title) scene.PatchesPanel.setTitle(title);
  showWhoseLinkItIs(title);
  watchAccount();
  makeLinkAskedForByPlugin(title);
  handleSignInArrival();
  startFrameLoop();
}
