import { SUPPORT, diagnosticText, type Diagnostic, type DiagnosticKind } from '../../../shared/support.ts';

/** UI-thread only; no engine timing, filesystem access, persistent logs or arbitrary object serialisation. */
export class Diagnostics {
  private events: Diagnostic[] = [];
  onError?: (event: Diagnostic) => void;
  add(kind: DiagnosticKind, value: unknown): void {
    const event = { at: Date.now(), kind, message: diagnosticText(value) };
    this.events = [...this.recent(), event].slice(-SUPPORT.events);
    this.onError?.(event);
  }
  recent(): Diagnostic[] {
    this.events = this.events.filter(e => e.at >= Date.now() - SUPPORT.windowMs);
    return this.events.map(e => ({ ...e }));
  }
  install(): void {
    window.addEventListener('error', e => { if (e instanceof ErrorEvent) this.add('error', e.message); });
    window.addEventListener('unhandledrejection', e => this.add('unhandledrejection', e.reason instanceof Error ? e.reason.message : e.reason));
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      original(...args);
      this.add('console', args.map(a => a instanceof Error ? diagnosticText(a.message) : typeof a === 'string' ? diagnosticText(a) : '[non-text diagnostic]').join(' '));
    };
  }
}
export const diagnostics = new Diagnostics();
diagnostics.install();
