// Where the page reaches the server (SPEC-SHARING-BACKEND): the website, the server it came from;
// the plugins (JUCE WebView), the site chosen at build time, without cookies (CHG-0039).

declare global {
  interface Window {
    /** The plugin's WebView bridge (JUCE), absent on the website. */
    __JUCE__?: unknown;
    /** Tests point a page at a local plugin server with this. */
    __bd_pluginSite?: string;
  }
}

export const inPlugin = (): boolean => !!window.__JUCE__;
/** The plugins' server, with a trailing slash. Tests may point a page at a local server first
 * (`__bd_pluginSite`). */
export const PLUGIN_SITE: string =
  window.__bd_pluginSite ?? (import.meta.env.BD_PLUGIN_SITE || 'https://blokdust.funputs.com/');
/** The URL of API path `path` for this page. */
export const apiUrl = (path: string): string =>
  new URL(`api/${path}`, inPlugin() ? PLUGIN_SITE : document.baseURI).toString();
