import {
  supportPatch,
  supportSystem,
  type Diagnostic,
  type SupportReport,
} from '../../../shared/support.ts';
import { diagnostics } from './diagnostics.ts';

/** Read each time: the connection can drop while a report is being sent. */
const isOffline = () => !navigator.onLine;
const CONSENT_KEY = 'blokdust2.automaticErrors';
export interface SupportContext {
  patch(): unknown;
  system(): Record<string, unknown>;
  plugin: boolean;
}
export class SupportClient {
  private fingerprints = new Set<string>();
  private automaticTimes: number[] = [];
  private automaticPending = false;
  private enabled = false;
  constructor(private context: SupportContext) {
    // Connect's attachment switch is independent of automatic-error consent; never reinterpret the
    // old preference.
    this.enabled = false;
    diagnostics.onError = (diagnostic) => {
      void this.automatic(diagnostic);
    };
  }
  get consent(): boolean {
    return this.enabled;
  }
  set consent(value: boolean) {
    this.enabled = value;
    try {
      localStorage.setItem(CONSENT_KEY, value ? 'yes' : 'no');
    } catch {
      /* session-only in private modes */
    }
  }
  report(
    message: string,
    email: string,
    kind: SupportReport['kind'] = 'feedback',
    includeContext = true,
  ): SupportReport {
    return {
      schema: 1,
      kind,
      message,
      email,
      version: import.meta.env.BD_VERSION,
      build: import.meta.env.BD_BUILD,
      includeContext,
      patch: includeContext ? supportPatch(this.context.patch()) : null,
      diagnostics: includeContext ? diagnostics.recent() : [],
      system: includeContext
        ? supportSystem({
            surface: this.context.plugin ? 'plugin' : 'web',
            os: navigator.platform,
            browser: navigator.userAgent,
            cores: navigator.hardwareConcurrency,
            width: innerWidth,
            height: innerHeight,
            pixelRatio: devicePixelRatio,
            ...this.context.system(),
          })
        : {},
    };
  }
  async send(report: SupportReport, website = ''): Promise<string> {
    if (isOffline())
      throw new Error('You need to be connected to the internet to send this support query.');
    const configured = import.meta.env.BD_SUPPORT_URL;
    if (this.context.plugin && !configured)
      throw new Error('Support is not configured in this build.');
    const endpoint = this.context.plugin
      ? configured
      : new URL('api/support', document.baseURI).href;
    const controller = new AbortController(),
      timeout = setTimeout(() => {
        controller.abort();
      }, 15000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'omit',
        signal: controller.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...report,
          website,
          consent: report.kind === 'automatic' && this.consent,
        }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? 'Too many reports. Please try again later.'
            : 'Your support query couldn’t be sent. Please try again.',
        );
      const result = (await response.json()) as { id?: unknown };
      if (typeof result.id !== 'string' || !/^[a-f0-9-]{36}$/.test(result.id))
        throw new Error('Your support query couldn’t be sent. Please try again.');
      return result.id;
    } catch (error) {
      if (isOffline())
        throw new Error('You need to be connected to the internet to send this support query.', {
          cause: error,
        });
      if (error instanceof Error && error.message.startsWith('Too many reports')) throw error;
      throw new Error('Your support query couldn’t be sent. Please try again.', { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }
  private async automatic(event: Diagnostic): Promise<void> {
    if (!this.consent || !navigator.onLine || this.automaticPending) return;
    const key = `${event.kind}:${event.message}`;
    this.automaticTimes = this.automaticTimes.filter(
      (automaticTime) => automaticTime > Date.now() - 3600000,
    );
    if (this.fingerprints.has(key) || this.automaticTimes.length >= 3) return;
    this.fingerprints.add(key);
    this.automaticTimes.push(Date.now());
    this.automaticPending = true;
    try {
      await this.send(
        this.report(event.message || 'Unexpected application error', '', 'automatic'),
      );
    } catch {
      /* best effort; never queue, retry or recursively log submission failures */
    } finally {
      this.automaticPending = false;
    }
  }
}
