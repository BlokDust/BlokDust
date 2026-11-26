// Settings › ABOUT and DOWNLOAD: the words, links and published installers.
import { App } from '../shim.ts';
import RELEASES from '../../releases.json';

/** Luke Phillips's About credit: v1's roles plus V2, and his site; at most three lines in its
 * column, as v1 draws the website 42 units below the blurb's first line. */
export const PHILLIPS = {
  blurb: 'Luke Phillips - audio/musical interaction. V2 architecture & full-stack development.',
  url: 'funputs.com',
};
/** Settings › About: v1's text named the Web Audio API and Tone.js, which v2 doesn't use. */
export const ABOUT =
  'BlokDust is a collaboration between Luke Twyman, Luke Phillips and Ed Silverton, developed in Brighton, UK, ' +
  'and released in 2016. This rebuild was released in 2026, built by Luke Phillips, now available as a DAW plugin.';
/** The code, to read and send pull requests to, where v1 had "Chrome Recommended". */
export const SOURCE_LINK = {
  label: 'View the code on GitHub',
  url: 'https://github.com/BlokDust/BlokDust',
};
/** About's link to the guide (CHG-0047), in v1's Connect words and button: never the old
 * guide.blokdust.com, which now serves spam. */
export const GUIDE = {
  line: 'Visit the BlokDust 2 guide for information, tutorials & more.',
  label: 'BlokDust 2 Guide',
  url: 'https://blokdust.funputs.com/guide/',
};
/** The published installers (`pnpm bd release publish` writes them; null before a release). */
export type Release = {
  file: string;
  url: string;
  sha256: string;
  bytes: number;
  store?: boolean;
} | null;
export let RELEASE = RELEASES as { version: string | null; macos: Release; windows: Release };
/** Settings › DOWNLOAD (web, CHG-0005 task 12): an intro of two paragraphs (CHG-0010); the unsigned
 * Windows note is in the Windows zip's README.txt. */
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
/** The iPad app's App Store page (CHG-0025); null until listed (its button says Coming soon). */
export const IPAD_APP_STORE_URL: string | null = null;
/** About's footer: the code, where the licences are (NOTICE.md; builds carry NOTICE.txt and
 * LICENSE.txt). A Privacy link waits for its page. */
export const FOOTER_LINKS = [SOURCE_LINK];
/** The footer links shown: none where links can't open (App.NoLinks). */
export const footerLinks = () => (App.NoLinks ? [] : FOOTER_LINKS);

/** A plugin inside another iPad app can't open Safari (CHG-0025): no links; About's people get
 * empty websites and Twitter names, which v1 won't draw or hit-test. The iPad app opens them. */
export function hideLinks(): void {
  App.NoLinks = true;
  for (const who of Object.values(App.L10n.Attribution))
    if (typeof who === 'object') {
      who.url = '';
      who.twitter = '';
    }
}
/** The usage stats switch's words (SHARING-0010), small, beside the version number. */
export const USAGE_STATS = (on: boolean) => `Anonymous usage stats: ${on ? 'on' : 'off'}`;

/** Tests: show the DOWNLOAD page as it will be once a release is published. */
export function setRelease(release: typeof RELEASE): void {
  RELEASE = release;
}
