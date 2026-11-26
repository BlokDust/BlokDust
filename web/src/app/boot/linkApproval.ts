// A plugin's code to approve (SHARING-0011): `?link=CODE`, kept while the person signs in.
import { embedId, juce, params } from './page.ts';

const LINK_KEY = 'blokdust2.link';
/** Signing in with Google or Apple leaves the page and comes back; the code waits that long. */
const LINK_KEPT_MS = 600_000;

export let linkArrival: string | null = null;

export const pendingLink = (): string | null => {
  try {
    const kept = JSON.parse(sessionStorage.getItem(LINK_KEY) ?? 'null') as {
      code: string;
      at: number;
    } | null;
    return kept && Date.now() - kept.at < LINK_KEPT_MS ? kept.code : null;
  } catch {
    return linkArrival;
  }
};

export const forgetLink = () => {
  try {
    sessionStorage.removeItem(LINK_KEY);
  } catch {
    /* nothing kept */
  }
};

/** Keep the code from the address, and take it out of the address. */
export function takeLinkFromAddress(): void {
  linkArrival = !juce && !embedId ? params.get('link') : null;
  if (linkArrival === null) return;
  try {
    sessionStorage.setItem(
      LINK_KEY,
      JSON.stringify({ code: linkArrival.slice(0, 16), at: Date.now() }),
    );
  } catch {
    /* private window: the code goes with this page only */
  }
  params.delete('link');
  history.replaceState(
    null,
    '',
    `${location.pathname}${params.size ? `?${params.toString()}` : ''}`,
  );
}
