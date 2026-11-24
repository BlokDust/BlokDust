// Settings › ABOUT and DOWNLOAD: the words, links and published installers.
import { App } from '../shim.ts';
import RELEASES from '../../releases.json';

/** Settings › About (owner, 2026-11-10, reworded 2026-11-11): v1's text named the Web Audio API and Tone.js, which v2
 * doesn't use. "DAW plugin" becomes a link to the downloads once they exist (CHG-0005 task 12). */
/** Luke Phillips's credit in About (owner, 2026-11-16): v1's roles, plus V2, which he built alone; his site is funputs.com.
 * At most three lines in its column: v1 draws the website 42 units below the blurb's first line. */
export const PHILLIPS = {
  blurb: 'Luke Phillips - audio/musical interaction. V2 architecture & full-stack development.',
  url: 'funputs.com',
};
export const ABOUT =
  'BlokDust is a collaboration between Luke Twyman, Luke Phillips and Ed Silverton, developed in Brighton, UK, ' +
  'and released in 2016. This rebuild was released in 2026, built by Luke Phillips, now available as a DAW plugin.';
/** The code (owner: people can read it and send pull requests), where v1 had "Chrome Recommended". */
export const SOURCE_LINK = {
  label: 'View the code on GitHub',
  url: 'https://github.com/BlokDust/BlokDust',
};
/** The published plugin installers (`pnpm bd release publish` writes it; null until the first release). */
export type Release = {
  file: string;
  url: string;
  sha256: string;
  bytes: number;
  store?: boolean;
} | null;
export let RELEASE = RELEASES as { version: string | null; macos: Release; windows: Release };
/** Settings › DOWNLOAD (web, CHG-0005 task 12; owner 2026-11-11: a tab of its own rather than About). The intro is two
 * paragraphs, each starting on its own line (owner, 2026-11-12, CHG-0010). The unsigned-Windows note moved into the
 * Windows zip's README.txt (CHG-0010). */
export const DOWNLOAD = {
  intro: [
    'Download the standalone app or VST3/AU plugins to use in your DAW, or get the iPad app with its AUv3 plugin.',
    'BlokDust can be used as both an instrument and an effect.',
  ],
  macos: 'macOS 11 or later, Apple silicon and Intel. VST3, Audio Unit and the standalone app.',
  windows: 'Windows 10 or 11, 64-bit. VST3 and the standalone app.',
  ipad: 'iPadOS 16 or later. AUv3 for AUM, GarageBand, Logic Pro and other hosts, and the standalone app.',
  soon: 'Coming soon.',
};
/** The iPad app's App Store page (CHG-0025): null until it is listed; the iPad button says Coming soon until then. */
export const IPAD_APP_STORE_URL: string | null = null;
/** The About footer: the code (owner, 2026-11-11: the licences are viewable there, NOTICE.md, so no separate links;
 * every build also carries NOTICE.txt and LICENSE.txt). */
export const FOOTER_LINKS = [SOURCE_LINK]; // no Privacy link until the page exists (owner, 2026-11-16)
/** The footer links shown: none where links can't open (App.NoLinks). */
export const footerLinks = () => (App.NoLinks ? [] : FOOTER_LINKS);

/**
 * Owner (2026-11-16, CHG-0025): a plugin inside another iPad app can't open Safari, so it shows no links: no footer
 * link, and About's websites and Twitter names are gone (v1 draws and hit-tests them from the Attribution strings, so
 * empty strings draw nothing and take no press). The iPad app itself opens them.
 */
export function hideLinks(): void {
  App.NoLinks = true;
  for (const who of Object.values(App.L10n.Attribution as Record<string, any>))
    if (who && typeof who === 'object') {
      who.url = '';
      who.twitter = '';
    }
}
/** The usage stats switch's words (SHARING-0010; owner 2026-11-16: very small, beside the version number). */
export const USAGE_STATS = (on: boolean) => `Anonymous usage stats: ${on ? 'on' : 'off'}`;

/** Tests: show the DOWNLOAD page as it will be once a release is published. */
export function setRelease(release: typeof RELEASE): void {
  RELEASE = release;
}
