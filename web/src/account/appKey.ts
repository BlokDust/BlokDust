// A signed-in plugin's key (CHG-0039, SHARING-0011). The plugin keeps it in a file only this user can read
// (plugin/src/AccountStore) and hands it to the page when the page opens (`bd_account`); the page sends it with its
// requests as `Authorization: Bearer bdk_…`. The website never has one: it signs in with its own session cookie.
let key: string | null = null;
export const appKey = (): string | null => key;
export function setAppKey(k: string | null): void { key = k && /^bdk_[A-Za-z0-9_-]{20,64}$/.test(k) ? k : null; }
/** The header that signs a request in, when this plugin is signed in. */
export const keyHeader = (): Record<string, string> => (key ? { authorization: `Bearer ${key}` } : {});
