// Error reports for the web app (SHARING-0010, SPEC-SHARING-USAGE-ANALYTICS R9): Sentry, EU region, loaded only when the
// Worker names a DSN and the user hasn't turned usage stats off. No cookies, no IPs (dataCollection off; the project also drops IPs), no session
// replay, no breadcrumbs (they would carry share links, titles and file names), and URLs lose their query strings.
import { analyticsAllowed } from './client.ts';
import { VERSION } from '../version.ts';

/** Strip what could identify a patch or a file: query strings and fragments; the path keeps only its shape. */
export function scrubUrl(u: string): string {
  try { const x = new URL(u, location.href); return `${x.origin}${x.pathname.replace(/\/embed\/[^/]+/, '/embed/:id')}`; } catch { return ''; }
}
/** File and sample names, share ids and home-folder user names in messages ("… unavailable: kick.wav") become a placeholder. */
export const scrubText = (s: string) => s.replace(/[^\s"'`/\\:]+\.(wav|mp3|aif|aiff|flac|ogg|m4a|blokdust|json)\b/gi, '<file>').replace(/[?&]c=[^&\s]+/g, '?c=<id>')
  .replace(/([/\\](?:Users|home)[/\\])[^/\\\s]+/gi, '$1<user>');

export async function startSentry(surface: string): Promise<void> {
  const dsn = document.querySelector<HTMLMetaElement>('meta[name="blokdust-sentry"]')?.content;
  if (!dsn || !analyticsAllowed()) return;
  const env = document.querySelector<HTMLMetaElement>('meta[name="blokdust-sentry-env"]')?.content || 'production';
  const Sentry = await import('@sentry/browser');
  Sentry.init({
    dsn, environment: env, release: `blokdust@${VERSION}`,
    // Collect nothing about the person or the request (Sentry 11's dataCollection; `sendDefaultPii` before it).
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    // Errors only: no performance tracing, no replay.
    tracesSampleRate: 0,
    sampleRate: 1,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    ignoreErrors: ['ResizeObserver loop', 'AbortError', 'NotAllowedError'],
    initialScope: { tags: { surface } },
    beforeSend(event) {
      if (!analyticsAllowed()) return null;  // turned off since
      if (event.request) { event.request.url = scrubUrl(event.request.url ?? ''); delete event.request.headers; delete event.request.cookies; delete event.request.query_string; }
      delete event.user;
      for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrubText(ex.value);
      if (event.message) event.message = scrubText(event.message);
      return event;
    },
  });
}
