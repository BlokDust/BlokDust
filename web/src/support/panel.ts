import type { Theme } from '../generated/palettes.gen.ts';
import { SUPPORT } from '../../../shared/support.ts';
import type { SupportClient } from './client.ts';
import './support.css';

/** New surface, using v1's full-frame panel, Dosis type, palette, square controls and outlined actions. */
export class FeedbackPanel {
  private dialog = document.createElement('dialog');
  private previousFocus: HTMLElement | null = null;
  constructor(private client: SupportClient, private theme: () => Theme) {
    this.dialog.id = 'feedback-panel';
    this.dialog.setAttribute('aria-labelledby', 'feedback-title');
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    // Static markup only; submitted content is never interpreted as HTML.
    this.dialog.innerHTML = `<form id="feedback-form">
      <header><h1 id="feedback-title">FEEDBACK & SUPPORT</h1><button type="button" id="feedback-close" aria-label="Close feedback">×</button></header>
      <div class="feedback-content">
        <p class="feedback-intro">A suggestion, a question, or something that didn’t work?</p>
        <label for="feedback-message">YOUR MESSAGE</label>
        <textarea id="feedback-message" name="message" required maxlength="${SUPPORT.messageChars}" rows="5" placeholder="Tell us what happened, or what you’d like to see…"></textarea>
        <label for="feedback-email">EMAIL <span>(optional, if you’d like a reply)</span></label>
        <input id="feedback-email" name="email" type="email" maxlength="254" autocomplete="email">
        <div class="feedback-honey" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="feedback-disclosure">Includes your current patch and technical diagnostics. Audio is never included.</p>
        <label class="feedback-consent"><input id="feedback-automatic" type="checkbox"> Automatically report unexpected errors</label>
        <p class="feedback-detail">When enabled, error reports include your current patch and diagnostics. You can turn this off here at any time.</p>
        <div class="feedback-actions"><button id="feedback-send" type="submit">SEND</button><p id="feedback-status" role="status" aria-live="polite"></p></div>
      </div>
    </form>`;
    document.body.appendChild(this.dialog);
    const get = <T extends HTMLElement>(id: string) => this.dialog.querySelector<T>(`#${id}`)!;
    const close = () => { if (!get<HTMLButtonElement>('feedback-send').disabled) this.close(); };
    get('feedback-close').onclick = close;
    this.dialog.addEventListener('cancel', e => { if (get<HTMLButtonElement>('feedback-send').disabled) e.preventDefault(); });
    this.dialog.addEventListener('close', () => this.previousFocus?.focus());
    // The canvas opens Settings actions on pointerdown; its default focus can occur after open().
    // Native modals make the stage inert, while legacy WebViews need this explicit focus guard.
    document.addEventListener('focusin', e => {
      if (this.dialog.hasAttribute('open') && !this.dialog.contains(e.target as Node)) get<HTMLTextAreaElement>('feedback-message').focus();
    });
    // Keep music shortcuts out of the entire modal, including focused buttons. Native dialog supplies focus trapping.
    this.dialog.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape' && typeof this.dialog.showModal !== 'function') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const fields = [...this.dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([tabindex="-1"]), textarea')];
        const first = fields[0], last = fields.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    });
    this.dialog.addEventListener('keyup', e => e.stopPropagation());
    const consent = get<HTMLInputElement>('feedback-automatic');
    consent.onchange = () => { this.client.consent = consent.checked; };
    get<HTMLFormElement>('feedback-form').onsubmit = async e => {
      e.preventDefault();
      const send = get<HTMLButtonElement>('feedback-send'), status = get('feedback-status');
      if (send.disabled) return;
      const message = get<HTMLTextAreaElement>('feedback-message'), email = get<HTMLInputElement>('feedback-email');
      if (!message.value.trim()) { message.setCustomValidity('Please enter a message.'); message.reportValidity(); return; }
      send.disabled = true; status.textContent = 'Sending…';
      try {
        const id = await this.client.send(this.client.report(message.value.trim(), email.value.trim()), this.dialog.querySelector<HTMLInputElement>('[name="website"]')!.value);
        status.textContent = `Thank you. Your support reference is ${id}.`;
        message.value = ''; email.value = '';
      } catch (error) { status.textContent = error instanceof Error ? error.message : 'Your support query couldn’t be sent. Please try again.'; }
      finally { send.disabled = false; }
    };
    get('feedback-message').oninput = () => { get<HTMLTextAreaElement>('feedback-message').setCustomValidity(''); get('feedback-status').textContent = ''; };
  }
  private close(): void {
    if (typeof this.dialog.close === 'function') this.dialog.close();
    else { this.dialog.removeAttribute('open'); this.previousFocus?.focus(); }
  }
  open(): void {
    if (this.dialog.hasAttribute('open')) return;
    const t = this.theme();
    this.dialog.style.setProperty('--support-bg', t.colors[2]);
    this.dialog.style.setProperty('--support-text', t.colors[t.roles.txt]);
    this.dialog.style.setProperty('--support-line', t.colors[1]);
    this.dialog.style.setProperty('--support-accent', t.colors[t.roles.menu[0]]);
    this.dialog.querySelector<HTMLInputElement>('#feedback-automatic')!.checked = this.client.consent;
    this.previousFocus = document.activeElement as HTMLElement;
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', ''); // Older system WebViews (macOS 11) lack native dialog support.
    // Release keys held before opening, as on a normal focus loss.
    window.dispatchEvent(new Event('blur'));
    const focus = () => { if (this.dialog.hasAttribute('open')) this.dialog.querySelector<HTMLTextAreaElement>('textarea')!.focus(); };
    focus();
    if (typeof this.dialog.showModal !== 'function') setTimeout(focus, 0);
  }
}
