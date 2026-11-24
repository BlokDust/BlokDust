// Where the page reaches the server (SPEC-SHARING-BACKEND). The website's page: the server it came from (relative to
// the page; embeds pin <base>). The plugins' page (inside JUCE's WebView, `juce://juce.backend`): the public site,
// chosen when the web build is made (`BLOKDUST_PLUGIN_SITE_URL`: review builds use staging, releases the live site;
// tools/plugin). The server allows only the plugins' origins, and never with cookies (CHG-0039).
declare const __BD_PLUGIN_SITE__: string;

export const inPlugin = (): boolean => !!(window as unknown as { __JUCE__?: unknown }).__JUCE__;
/** The plugins' server, with a trailing slash. Tests may point a page at a local server first (`__bd_pluginSite`). */
export const PLUGIN_SITE: string =
  (window as unknown as { __bd_pluginSite?: string }).__bd_pluginSite ??
  (typeof __BD_PLUGIN_SITE__ === 'string' && __BD_PLUGIN_SITE__
    ? __BD_PLUGIN_SITE__
    : 'https://blokdust.funputs.com/');
/** The URL of API path `path` for this page. */
export const apiUrl = (path: string): string =>
  new URL(`api/${path}`, inPlugin() ? PLUGIN_SITE : document.baseURI).toString();
