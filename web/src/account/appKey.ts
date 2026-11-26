// A signed-in plugin's key (SHARING-0011), from the plugin's user-only file via `bd_account`, sent
// as `Authorization: Bearer bdk_…`. The website never has one: it uses its session cookie.
let key: string | null = null;
export const appKey = (): string | null => key;
export function setAppKey(k: string | null): void {
  key = k && /^bdk_[A-Za-z0-9_-]{20,64}$/.test(k) ? k : null;
}
/** The header that signs a request in, when this plugin is signed in. */
export const keyHeader = (): Record<string, string> =>
  key ? { authorization: `Bearer ${key}` } : {};
