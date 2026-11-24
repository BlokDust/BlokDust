// SAVE's two ways to a share link (SHARING-0011): the website's, and the plugin's through the site.
import { toPatch } from '../model/toPatch.ts';
import { appKey } from '../../account/appKey.ts';
import { PUBLIC_SITE } from '../../patch/samples.ts';
import { encodePatch } from '../../patch/share.ts';
import type { PatchesHost } from '../../v1ui/patches.ts';
import { juce } from '../boot/page.ts';
import { ios } from '../model/engineLink.ts';
import { contentOf, shareLink } from '../model/unsavedChanges.ts';
import { makeLink } from '../share/ownLink.ts';
import { shareWarning } from '../share/signInReturn.ts';
import { scene } from './scene.ts';

export type LinkWay = NonNullable<PatchesHost['links']>;

/** Made once each, so a page holding one keeps it. */
export const linkWays: { plugin?: LinkWay; web?: LinkWay } = {};

/** iPad: the share menu sends the link itself, the patch inside it (CHG-0025). */
function shareFromIpad(link: string, title: string): void {
  const at = scene.PatchesPanel.centreOf('share'); // the menu points at the button
  juce?.emitEvent('bd_share', {
    url: link,
    title,
    x: Math.round(at?.[0] ?? innerWidth / 2),
    y: Math.round(at?.[1] ?? innerHeight / 2),
  });
}

// The plugin's page can't run the site's bot check, so the public site makes the link.
const pluginWay = (): LinkWay => ({
  external: true,
  current: () => null,
  make: async (_mode: 'save' | 'saveAs', title: string) => {
    const link = `${PUBLIC_SITE}?c=${await encodePatch(toPatch())}&t=${encodeURIComponent(title)}`;
    if (ios) shareFromIpad(link, title);
    else juce?.emitEvent('bd_openUrl', { url: `${link}&share=1` });
  },
  warning: () => shareWarning(),
});

const webWay = (): LinkWay => ({
  current: () =>
    shareLink
      ? { url: shareLink.url, owned: shareLink.owned, stale: contentOf(toPatch()) !== shareLink.at }
      : null,
  make: (mode: 'save' | 'saveAs', title: string, gallery?: boolean) =>
    makeLink(mode, title, gallery),
  warning: () => shareWarning(),
});

/** Signed in (SHARING-0011), the plugin saves to the account as the website does. */
export function currentLinkWay(): LinkWay {
  return juce && !appKey() ? (linkWays.plugin ??= pluginWay()) : (linkWays.web ??= webWay());
}
